import { readAdapter, containedPath } from './adapter.mjs';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { digest } from './repository.mjs';

const schemaVersion = 1;

class InvalidHookStateError extends Error {}

function emptyState(root, sessionId) {
    return {
        schemaVersion, root, sessionId, turnId: null, generation: 0,
        inputHash: null, activeTask: null, tasks: {}, coverage: {}, failures: [],
    };
}

export function stateDirectory(root) {
    const directory = containedPath(root, readAdapter(root).stateDirectory);
    mkdirSync(directory, { recursive: true, mode: 0o700 });

    return directory;
}

function statePath(root, sessionId) {
    if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 256) {
        throw new Error('A nonempty runtime session id is required.');
    }

    return join(stateDirectory(root), `${digest([root, sessionId])}.json`);
}

export function readState(root, sessionId) {
    const path = statePath(root, sessionId);

    if (!existsSync(path)) {
        return emptyState(root, sessionId);
    }

    let state;

    try {
        state = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;

        throw new InvalidHookStateError('Hook state cannot be decoded; use explicit recovery with fresh verification.');
    }

    if (!state || typeof state !== 'object' || Array.isArray(state)
        || state.schemaVersion !== schemaVersion || state.root !== root || state.sessionId !== sessionId
        || !state.tasks || Array.isArray(state.tasks) || !Array.isArray(state.failures)
        || (state.activeTask && !state.tasks[state.activeTask])) {
        throw new InvalidHookStateError('Hook state is invalid; use explicit recovery with fresh verification and review.');
    }

    return state;
}

async function acquireLock(path) {
    const lock = `${path}.lock`;
    let acquired = false;

    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            mkdirSync(lock);
            acquired = true;
            break;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;

            await delay(10);
        }
    }

    if (!acquired) throw new Error('Hook state is busy; no evidence was accepted.');

    return lock;
}

export async function withRepositoryLock(root, name, operation) {
    const lock = await acquireLock(join(stateDirectory(root), `repository-${name}`));

    try {
        return await operation();
    } finally {
        rmSync(lock, { recursive: true });
    }
}

export async function mutateState(root, sessionId, operation) {
    const path = statePath(root, sessionId);
    const lock = await acquireLock(path);
    const temporaryPath = `${path}.${randomUUID()}.pending`;

    try {
        const state = readState(root, sessionId);
        const result = await operation(state);

        writeFileSync(temporaryPath, JSON.stringify(state) + '\n', { mode: 0o600, flag: 'wx' });
        renameSync(temporaryPath, path);

        return result;
    } finally {
        rmSync(temporaryPath, { force: true });
        rmSync(lock, { recursive: true });
    }
}

export async function recoverState(root, sessionId) {
    const path = statePath(root, sessionId);
    const lock = await acquireLock(path);

    try {
        if (existsSync(path)) {
            try {
                readState(root, sessionId);
                throw new Error('Valid state cannot be reset; preserve its pending tasks and findings.');
            } catch (error) {
                if (!(error instanceof InvalidHookStateError)) throw error;
            }

            renameSync(path, `${path}.${randomUUID()}.quarantined`);
        }

        const state = emptyState(root, sessionId);
        state.unregisteredChanges = true;
        state.failures.push('Recovered state is incomplete. Re-register authorized scope and obtain fresh checks and independent review; previous receipts are uncredited.');
        const temporaryPath = `${path}.${randomUUID()}.pending`;
        writeFileSync(temporaryPath, JSON.stringify(state) + '\n', { mode: 0o600, flag: 'wx' });
        renameSync(temporaryPath, path);

        return { outcome: 'incomplete', requirements: state.failures };
    } finally {
        rmSync(lock, { recursive: true });
    }
}

export function activeTask(state) {
    const task = state.activeTask && state.tasks[state.activeTask];

    return task && task.status !== 'closed' ? task : null;
}

export function isSubagentEvent(event) {
    return event.hook_event_name !== 'SubagentStop' && typeof event.agent_id === 'string'
        && event.agent_id !== event.session_id;
}

export function observeRuntime(state, event, inputHash) {
    const task = activeTask(state);
    const subagent = isSubagentEvent(event);
    const changed = state.inputHash !== null && state.inputHash !== inputHash;
    const turnChanged = !subagent && Boolean(event.turn_id && state.turnId !== event.turn_id);

    if (changed) state.generation++;

    if (task && (changed || turnChanged || (!subagent && event.hook_event_name === 'Interrupt'))) {
        task.checkpoint = null;
    }

    if (!subagent && event.turn_id) state.turnId = event.turn_id;

    state.inputHash = inputHash;
    const coverageKey = event.hook_event_name + (event.tool_name ? `:${event.tool_name}` : '')
        + (event.source ? `:${event.source}` : '') + (subagent ? ':subagent' : '');
    state.coverage[coverageKey] = (state.coverage[coverageKey] ?? 0) + 1;

    return { task, changed, turnChanged };
}
