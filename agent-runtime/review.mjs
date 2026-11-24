import { readAdapter } from './adapter.mjs';
import { toolkitIdentity } from './resources.mjs';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMakeDefinition, requiredChecks } from './checks.mjs';
import { digest, snapshot } from './repository.mjs';
import { currentReceipts } from './runner.mjs';
import { activeTask, mutateState } from './state.mjs';
import { ownsPath } from './tasks.mjs';

function isRule(path, task) {
    return path === '.devkit' || path === 'devkit.json' || path.startsWith('.devkit/') || path === 'AGENTS.md' || path.startsWith('.ai/') || path.startsWith('.codex/')
        || path.startsWith('scripts/') || path.startsWith('tooling/')
        || path.startsWith('docs/') || path.startsWith('openspec/specs/')
        || (task.change && path.startsWith(`openspec/changes/${task.change}/`) && !/(?:^|\/)(?:tasks|evidence)\.md$/u.test(path))
        || isMakeDefinition(path) || /^(?:composer|package)(?:-lock)?\.(?:json|lock)$/u.test(path);
}

export async function reviewInputs(root, task) {
    const inputs = await snapshot(root);
    const exceptionFiles = {};

    for (const [path, identity] of inputs.files) {
        if (identity && ownsPath(task, path) && /(?:^|\/)(?:tasks|evidence)\.md$/u.test(path)) {
            exceptionFiles[path] = readFileSync(join(root, path), 'utf8');
        }
    }

    return { ...inputs, hash: digest([inputs.hash, toolkitIdentity()]), exceptionFiles, ruleIdentity: digest([toolkitIdentity(), inputs.files.filter(([path]) => isRule(path, task))]) };
}

export async function prepareReview(root, sessionId) {
    return mutateState(root, sessionId, async (state) => {
        const task = activeTask(state);

        if (!task || task.mode !== 'change') throw new Error('A change task is required for independent review.');

        const receipts = await currentReceipts(root, state, task);
        const missing = requiredChecks(task, root).filter((checkId) => !receipts[checkId]);

        if (missing.length) throw new Error(`Current checks required before review: ${missing.join(', ')}.`);

        const inputs = await reviewInputs(root, task);
        task.reviewRequest = {
            schemaVersion: 1, id: randomUUID(), taskId: task.id, baseline: task.baseline,
            snapshotId: inputs.hash, ruleIdentity: inputs.ruleIdentity,
            paths: inputs.files.filter(([path]) => ownsPath(task, path)).map(([path]) => path),
            checkReceiptIds: requiredChecks(task, root).map((checkId) => receipts[checkId].id),
            inputs, agentId: null,
        };
        task.reviewRequest.taskName = `devkit_review_${task.reviewRequest.id.replaceAll('-', '')}`;
        task.review = null;
        task.checkpoint = null;

        const { inputs: _inputs, ...request } = task.reviewRequest;

        return { ...request, reviewerReferences: readAdapter(root).reviewer?.references ?? [], marker: `DEVKIT_REVIEW_REQUEST:${task.reviewRequest.id}` };
    });
}

function toolResponse(response) {
    if (typeof response === 'string') {
        try { return JSON.parse(response); } catch { return {}; }
    }

    if (response && Array.isArray(response.content)) {
        const text = response.content.find((item) => item.type === 'text')?.text;

        return toolResponse(text);
    }

    return response ?? {};
}

export function observeReviewerInvocation(task, event, state) {
    const request = task?.reviewRequest;
    const followup = ['collaborationfollowup_task', 'collaboration.followup_task'].includes(event.tool_name);
    const knownTarget = followup ? state.observedReviewers?.[event.tool_input?.target] : null;

    if (!followup && !['spawn_agent', 'Agent', 'collaboration.spawn_agent', 'collaborationspawn_agent'].includes(event.tool_name)) return;
    if (followup && knownTarget?.policyIdentity !== state.coveragePolicyIdentity) return;

    const message = event.tool_input?.message ?? event.tool_input?.prompt ?? '';
    const usesReviewer = Boolean(knownTarget) || event.tool_input?.agent_type === 'project_reviewer' || message.includes('.codex/agents/project_reviewer.toml');

    if (!usesReviewer) return;

    const response = toolResponse(event.tool_response);
    const agentId = followup ? event.tool_input.target : response.agent_id ?? response.id ?? response.task_name;

    if (typeof agentId !== 'string' || !agentId || agentId === state.sessionId || agentId === '/root') {
        throw new Error('Reviewer invocation returned no separate correlatable runtime agent id.');
    }

    state.observedReviewers ??= {};
    state.observedReviewers[agentId] = { policyIdentity: state.coveragePolicyIdentity, completed: false };

    const matchesTaskName = !followup && request?.taskName && event.tool_input?.task_name === request.taskName;

    if (request && (matchesTaskName || message.includes(`DEVKIT_REVIEW_REQUEST:${request.id}`))) request.agentId = agentId;
}

export function observeReviewerStatus(task, event, state) {
    if (!['collaborationlist_agents', 'collaboration.list_agents', 'list_agents'].includes(event.tool_name)) return;

    const agents = toolResponse(event.tool_response).agents;

    if (!Array.isArray(agents)) throw new Error('Agent status tool returned no runtime agent list.');

    for (const [agentId, observation] of Object.entries(state.observedReviewers ?? {})) {
        if (observation.policyIdentity !== state.coveragePolicyIdentity || observation.completed) continue;

        const matches = agents.filter((agent) => agent.agent_name === agentId);

        if (matches.length > 1) throw new Error('Agent status result contains duplicate reviewer identities.');

        const message = matches[0]?.agent_status?.completed;

        if (typeof message !== 'string' || !message.trim()) continue;

        if (task?.reviewRequest?.agentId === agentId) {
            completeReviewer(task, { agent_id: agentId, last_assistant_message: message }, 'collaboration-status');
        }

        if (!observation.completed) {
            state.coverage['ReviewerCompletion:collaboration'] = (state.coverage['ReviewerCompletion:collaboration'] ?? 0) + 1;
            observation.completed = true;
        }
    }
}

export function completeReviewer(task, event, completionSource = 'SubagentStop') {
    const request = task?.reviewRequest;

    if (!request || !request.agentId || request.agentId !== event.agent_id) return false;
    if (request.reviewerWrote) throw new Error('The reviewer changed repository inputs; obtain a fresh read-only independent review.');
    if (request.completedResultConsumed) return false;

    const match = event.last_assistant_message?.match(/```devkit-review-result\s*\n([\s\S]*?)\n```/u);

    if (!match) throw new Error('Completed reviewer supplied no structured result.');

    const result = JSON.parse(match[1]);
    const matches = result.schemaVersion === 1 && result.requestId === request.id && result.taskId === task.id
        && result.snapshotId === request.snapshotId && result.baseline === request.baseline
        && result.ruleIdentity === request.ruleIdentity
        && digest(result.checkReceiptIds) === digest(request.checkReceiptIds)
        && Array.isArray(result.reviewedPaths) && request.paths.every((path) => result.reviewedPaths.includes(path))
        && Array.isArray(result.findings) && Array.isArray(result.limitations);

    if (!matches) throw new Error('Reviewer result does not match the requested scope or evidence.');
    if (!['passed', 'changes required', 'incomplete'].includes(result.verdict)) throw new Error('Unsupported review verdict.');

    task.review = { ...result, agentId: event.agent_id, observedCompletion: true, completionSource, inputs: request.inputs };
    request.completedResultConsumed = true;
    task.checkpoint = null;

    return true;
}

function evidenceOnly(previous, current, task, path) {
    if (path.endsWith('/tasks.md')) {
        const previousLines = previous.split('\n');
        const currentLines = current.split('\n');

        return previousLines.length === currentLines.length && previousLines.every((line, index) => line === currentLines[index]
            || (line.startsWith('- [ ] ') && currentLines[index] === line.replace('- [ ] ', '- [x] ')));
    }

    if (!current.startsWith(previous)) return false;

    const appended = current.slice(previous.length).split('\n').filter((line) => line.trim());
    const receiptIds = new Set([
        ...task.review.checkReceiptIds,
        ...Object.values(task.receipts).filter((receipt) => receipt.outcome === 'passed').map((receipt) => receipt.id),
    ]);

    return appended.every((line) => {
        const match = line.match(/^<!-- devkit-check-receipt:([a-zA-Z0-9-]+) -->$/u);

        return match && receiptIds.has(match[1]);
    });
}

export async function reviewIsCurrent(root, task) {
    const review = task.review;

    if (!review?.observedCompletion || review.verdict !== 'passed' || review.findings.length || review.limitations.length) return false;

    const current = await reviewInputs(root, task);

    if (current.hash === review.inputs.hash) return true;
    if (current.ruleIdentity !== review.inputs.ruleIdentity) return false;

    const previousFiles = new Map(review.inputs.files);
    const currentFiles = new Map(current.files);

    for (const path of new Set([...previousFiles.keys(), ...currentFiles.keys()])) {
        if (digest(previousFiles.get(path) ?? null) === digest(currentFiles.get(path) ?? null)) continue;

        const before = review.inputs.exceptionFiles[path];
        const after = current.exceptionFiles[path];

        if (before === undefined || after === undefined || !evidenceOnly(before, after, task, path)) return false;
    }

    return true;
}
