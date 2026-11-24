import { readAdapter } from './adapter.mjs';
import { randomUUID } from 'node:crypto';
import { isCodePath, objectiveRuleIdentifiers, requiredChecks } from './checks.mjs';
import { checkConventions } from './conventions.mjs';
import { digest, git, repositoryPath, snapshot } from './repository.mjs';
import { activeTask, mutateState } from './state.mjs';

export function ownsPath(task, path) {
    return task.paths.some((selected) => path === selected || path.startsWith(selected + '/'));
}

export function phpFeedbackInputs(inputs, task) {
    return inputs.files.filter(([path]) => ownsPath(task, path) && path.endsWith('.php'))
        .map(([path, identity]) => [path, digest(identity)]);
}

function statusPaths(porcelain) {
    const entries = porcelain.split('\0').filter(Boolean);
    const paths = [];

    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        paths.push(entry.slice(3));

        if (/[RC]/u.test(entry.slice(0, 2))) paths.push(entries[++index]);
    }

    return paths;
}

export async function registerTask(root, sessionId, options) {
    if (!options.id || !['change', 'read-only', 'review'].includes(options.mode)) {
        throw new Error('Task registration requires an id and a supported mode.');
    }

    const paths = [...new Set((options.paths ?? []).map((path) => repositoryPath(root, path).relative))];

    if (options.mode === 'change' && !paths.length) throw new Error('Change tasks require an explicit owned scope.');
    if (options.change && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(options.change)) throw new Error('Invalid OpenSpec change name.');

    let baseline;

    try {
        baseline = await git(root, ['rev-parse', '--verify', (options.baseline ?? 'HEAD') + '^{commit}']);
    } catch (error) {
        if (options.baseline) throw error;

        const branch = await git(root, ['symbolic-ref', 'HEAD']);
        const refs = await git(root, ['for-each-ref', '--format=%(objectname)', branch.trim()]);

        if (refs.trim()) throw error;

        baseline = 'unborn:' + branch.trim();
    }
    const inputs = await snapshot(root);
    const preexisting = await git(root, ['status', '--porcelain=v1', '-z']);
    const task = {
        id: options.id, mode: options.mode, profile: options.profile ?? 'docs',
        paths, change: options.change ?? null, baseline: baseline.trim(),
        scopeRevision: randomUUID(), initialInputHash: inputs.hash,
        preexistingIdentity: digest(preexisting), preexistingPaths: statusPaths(preexisting),
        status: 'active', receipts: {}, reviewRequest: null, review: null, checkpoint: null,
        failureSignature: null, lastHandoff: null,
        conventionBaseline: [],
    };
    task.containsCode = inputs.files.some(([path]) => ownsPath(task, path) && isCodePath(path));
    task.feedbackPhpInputs = phpFeedbackInputs(inputs, task);
    requiredChecks(task, root);

    await mutateState(root, sessionId, (state) => {
        if (state.tasks[task.id]) throw new Error('Task id already exists; use a fresh id instead of resetting evidence.');
        if (activeTask(state)) throw new Error('An active task already exists in this session; preserve its pending obligations.');

        state.tasks[task.id] = task;
        state.activeTask = task.id;
        state.inputHash = inputs.hash;
        state.unregisteredChanges = false;

        return task;
    });

    if (inputs.files.some(([path]) => ownsPath(task, path) && path.endsWith('.php'))) {
        const report = await checkConventions(root, task);
        const after = await snapshot(root);

        if (report.errors.length || report.diagnostics.some((diagnostic) => !(readAdapter(root).objectiveRuleIdentifiers ?? objectiveRuleIdentifiers).includes(diagnostic.rule))
            || after.hash !== inputs.hash) throw new Error('Convention baseline could not be established for stable, analyzable task inputs.');

        task.conventionBaseline = report.diagnostics;
        await mutateState(root, sessionId, (state) => {
            state.tasks[task.id].conventionBaseline = task.conventionBaseline;
        });
    }

    return task;
}

export async function amendScope(root, sessionId, options) {
    const paths = [...new Set((options.paths ?? []).map((path) => repositoryPath(root, path).relative))];

    if (!paths.length) throw new Error('Amending change scope requires explicit owned paths.');

    const inputs = await snapshot(root);

    return mutateState(root, sessionId, (state) => {
        const task = activeTask(state);

        if (!task) throw new Error('An active task is required.');

        const candidate = { ...task, mode: 'change', paths, profile: options.profile ?? task.profile };
        candidate.containsCode = inputs.files.some(([path]) => ownsPath(candidate, path) && isCodePath(path));
        candidate.feedbackPhpInputs = phpFeedbackInputs(inputs, candidate);
        requiredChecks(candidate, root);
        Object.assign(task, candidate, {
            scopeRevision: randomUUID(), scopeMissing: false, receipts: {}, review: null,
            reviewRequest: null, checkpoint: null,
        });

        return task;
    });
}

export async function requestCheckpoint(root, sessionId, outcome, reason) {
    if (!['complete', 'progress', 'waiting', 'incomplete'].includes(outcome)) throw new Error('Unsupported checkpoint outcome.');
    if (outcome !== 'complete' && !reason?.trim()) throw new Error('A non-success handoff requires a concrete reason.');

    const inputs = await snapshot(root);

    return mutateState(root, sessionId, (state) => {
        const task = activeTask(state);

        if (!task || !state.turnId) throw new Error('A current runtime turn and active task are required.');

        if (state.inputHash !== inputs.hash) {
            state.generation++;
            state.inputHash = inputs.hash;
        }

        task.checkpoint = {
            id: randomUUID(), sessionId, turnId: state.turnId, taskId: task.id,
            scopeRevision: task.scopeRevision, generation: state.generation,
            inputHash: inputs.hash, outcome, reason: reason ?? null,
        };

        return task.checkpoint;
    });
}
