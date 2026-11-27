import { pathToFileURL } from 'node:url';
import { assessCompletion } from './completion.mjs';
import { installedClientIdentity } from './compatibility.mjs';
import { projectContext } from './context.mjs';
import { agentCommand, contextOutput, failureOutput, readEvent } from './protocol.mjs';
import { coveragePolicyIdentity, repositoryRoot, snapshot } from './repository.mjs';
import { completeReviewer, observeReviewerInvocation, observeReviewerStatus } from './review.mjs';
import { activeTask, isSubagentEvent, mutateState, observeRuntime, readState } from './state.mjs';
import { phpFeedbackInputs, taskContainsCode } from './tasks.mjs';

export async function handleEvent(event) {
    if (!relevantEvent(event)) return {};

    const root = await repositoryRoot(event.cwd);

    if (event.hook_event_name === 'PreToolUse') return toolPreflight(root, event);

    const advisoryWrite = event.hook_event_name === 'PostToolUse' && !reviewerTools.has(event.tool_name);
    const cachedClient = advisoryWrite ? readState(root, event.session_id).clientIdentity : null;
    const client = cachedClient ?? await installedClientIdentity(root, 1500);

    return dispatchEvent(root, event, client);
}

const reviewerTools = new Set([
    'Agent', 'spawn_agent', 'collaborationspawn_agent', 'collaboration.spawn_agent',
    'collaborationfollowup_task', 'collaboration.followup_task',
    'collaborationlist_agents', 'collaboration.list_agents', 'list_agents',
]);

function shellCommands(source) {
    const commands = [];
    let words = [];
    let word = '';
    let quote = null;
    let escaped = false;
    let comment = false;
    let writes = false;
    const flushWord = () => { if (word) words.push(word); word = ''; };
    const flushCommand = () => {
        flushWord();
        if (words.length) commands.push({ words, writes });
        words = [];
        writes = false;
    };

    for (const character of source) {
        if (comment) {
            if (character === '\n') { comment = false; flushCommand(); }

            continue;
        }

        if (escaped) {
            word += character;
            escaped = false;

            continue;
        }

        if (character === '\\' && quote !== "'") {
            escaped = true;

            continue;
        }

        if (quote) {
            if (character === quote) quote = null;
            else word += character;

            continue;
        }

        if (character === '#' && !word) { comment = true; continue; }
        if (character === "'" || character === '"') {
            quote = character;

            continue;
        }

        if (character === '>') writes = true;

        if (/[;&|\n]/u.test(character)) {
            flushCommand();

            continue;
        }

        if (/\s/u.test(character)) {
            flushWord();

            continue;
        }

        word += character;
    }

    if (quote || escaped) return [];

    flushCommand();

    return commands;
}

function supportedWrite(event) {
    if (/(?:apply_patch|Edit|Write)$/u.test(event.tool_name ?? '')) return true;
    if (!/(?:Bash|exec_command)$/u.test(event.tool_name ?? '')) return false;

    const input = event.tool_input;
    const command = typeof input === 'string' ? input : input?.command ?? input?.cmd ?? '';

    return typeof command === 'string' && shellCommands(command).some(({ words, writes }) =>
        writes || ['cp', 'mv', 'rm', 'mkdir', 'touch', 'tee', 'install', 'rsync'].includes(words[0])
        || (['sed', 'perl'].includes(words[0]) && words.slice(1).some((word) => /^-[^-]*i/u.test(word)))
        || (words[0] === 'make' && words.includes('format')));
}

export function relevantEvent(event) {
    if (!['PreToolUse', 'PostToolUse'].includes(event.hook_event_name)) return true;
    if (event.hook_event_name === 'PostToolUse' && reviewerTools.has(event.tool_name)) return true;

    return supportedWrite(event);
}

async function toolPreflight(root, event) {
    return mutateState(root, event.session_id, (state) => {
        observeRuntime(state, event, state.inputHash);

        return contextOutput(event, projectContext(root, state, event, activeTask(state)));
    });
}

export async function dispatchEvent(root, event, client) {
    if (!relevantEvent(event)) return {};
    if (event.hook_event_name === 'PreToolUse') return toolPreflight(root, event);

    const inputs = await snapshot(root);

    const output = await mutateState(root, event.session_id, async (state) => {
        state.clientIdentity = client;
        const policyIdentity = coveragePolicyIdentity(inputs, client);

        if (state.coveragePolicyIdentity !== policyIdentity) {
            state.coverage = {};
            state.observedReviewers = {};
            state.coveragePolicyIdentity = policyIdentity;
        }

        const previousHash = state.inputHash;
        const subagent = isSubagentEvent(event);
        const observation = observeRuntime(state, event, inputs.hash);
        const task = activeTask(state);

        if (!task && previousHash && observation.changed) state.unregisteredChanges = true;

        if (subagent && event.hook_event_name === 'Stop') return {};

        if (task) {
            task.containsCode = taskContainsCode(root, task, inputs);
        }

        if (event.hook_event_name === 'SessionStart' || event.hook_event_name === 'UserPromptSubmit') {
            return contextOutput(event, projectContext(root, state, event, task));
        }

        if (event.hook_event_name === 'Interrupt') {
            if (task) task.lastHandoff = { outcome: 'incomplete', reason: 'User interruption.' };

            return {};
        }

        if (event.hook_event_name === 'PostToolUse') {
            if (!subagent) {
                observeReviewerInvocation(task, event, state);
                observeReviewerStatus(task, event, state);
            }

            if (subagent && observation.changed && supportedWrite(event)
                && (event.agent_type === 'project_reviewer' || task?.reviewRequest?.agentId === event.agent_id)) {
                if (task?.reviewRequest) task.reviewRequest.reviewerWrote = true;
                if (task) task.review = null;

                return contextOutput(event, 'The independent reviewer wrote repository inputs. Its result cannot satisfy read-only independent review; preserve the edit, establish its ownership and obtain a new separate review.');
            }

            const phpInputs = task ? phpFeedbackInputs(inputs, task) : [];
            const previousPhp = new Map(task?.feedbackPhpInputs ?? []);
            const currentPhp = new Map(phpInputs);
            const changedPhp = [...new Set([...previousPhp.keys(), ...currentPhp.keys()])]
                .filter((path) => previousPhp.get(path) !== currentPhp.get(path));

            if (task) task.feedbackPhpInputs = phpInputs;
            if (!observation.changed && !changedPhp.length) return {};

            if (!task) {
                state.unregisteredChanges = true;

                return contextOutput(event, 'Repository inputs changed without an active task. Register the authorized scope and preserve pre-existing edits before successful completion.');
            }

            if (task.mode === 'read-only' && supportedWrite(event)) {
                task.mode = 'change';
                task.scopeMissing = true;

                return contextOutput(event, `Repository inputs changed during a read-only task. Establish the actual owned scope and verification profile with ${agentCommand} scope. Preserve other actors' edits.`);
            }

            if (task.mode === 'read-only' || task.mode === 'review') {
                return contextOutput(event, 'Repository inputs changed outside a supported task write. Refresh the reading context and preserve external edits; this read-only/review task does not adopt them.');
            }

            if (task.profile === 'docs' && task.containsCode) {
                task.scopeMissing = true;

                return contextOutput(event, `The documentation profile no longer covers the owned code inputs. Establish the appropriate code verification profile with ${agentCommand} scope.`);
            }

            if (changedPhp.length) {
                task.conventionsDirty = true;
            }

            return {};
        }

        if (event.hook_event_name === 'SubagentStop') {
            completeReviewer(task, event);

            return {};
        }

        if (event.hook_event_name === 'Stop') {
            if (!task && state.unregisteredChanges && previousHash) {
                if (state.unregisteredStopRequested || event.stop_hook_active) {
                    return { systemMessage: 'Devkit work is incomplete: changed repository files have no registered task scope.' };
                }

                state.unregisteredStopRequested = true;

                return { decision: 'block', reason: `Register the authorized task scope with ${agentCommand} start, then provide a current completion or honest non-success checkpoint.` };
            }

            return assessCompletion(root, state, task, event);
        }

        return {};
    });

    return output;
}

async function main() {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(new Error('Hook input timed out.')), 8000);

    try {
        const event = await readEvent(process.stdin, abortController.signal);
        const output = await handleEvent(event);

        process.stdout.write(JSON.stringify(output) + '\n');
    } catch {
        process.stderr.write('DEVKIT-HOOK-FAILURE: hook input, state or execution failed; no successful evidence was created.\n');
        process.stdout.write(JSON.stringify(failureOutput()) + '\n');
        process.exitCode = 1;
    } finally {
        clearTimeout(timeout);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
