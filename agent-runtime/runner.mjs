import { watchToolkit } from './toolkit-watch.mjs';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { configuredCommands, isMakeDefinition, selectsInput } from './checks.mjs';
import { checkConventions } from './conventions.mjs';
import { commandEnvironment, environmentIdentity, ignoredInputs, installedPhpIdentity, receiptReleaseConfiguration, releaseConfiguration } from './environment.mjs';
import { digest, snapshot } from './repository.mjs';
import { activeTask, mutateState } from './state.mjs';
import { watchInputs } from './watch.mjs';

async function executeCommand(command, argumentsList, root, signal, environment, quiet) {
    return new Promise((resolve) => {
        const child = spawn(command, argumentsList, {
            cwd: root, stdio: quiet ? 'ignore' : 'inherit', signal,
            env: environment,
        });
        let errorCode = null;

        child.on('error', (error) => { errorCode = error.name === 'AbortError' ? 'interrupted' : 'unavailable'; });
        child.on('close', (exitCode, exitSignal) => resolve({ exitCode, signal: exitSignal, errorCode }));
    });
}

export async function runCheck(root, sessionId, checkId, signal, options = {}) {
    const selected = configuredCommands(root)[checkId];

    if (!selected) throw new Error('Unknown check id; arbitrary commands cannot create receipts.');

    const environment = commandEnvironment(sessionId, root);
    const selectedRelease = checkId === 'full' ? releaseConfiguration(environment, root) : undefined;

    const request = await mutateState(root, sessionId, (state) => {
        const task = activeTask(state);

        if (!task || task.mode !== 'change') throw new Error('Register a change task before running a check.');

        const requestId = randomUUID();
        task.receipts[checkId] = {
            schemaVersion: 1, id: requestId, taskId: task.id, root, sessionId,
            scopeRevision: task.scopeRevision, checkId, command: selected, outcome: 'running',
        };
        task.checkpoint = null;

        return { id: requestId, taskId: task.id, scopeRevision: task.scopeRevision, task };
    });
    let watcher;
    let toolkitWatcher;

    try {
        toolkitWatcher = watchToolkit();
        watcher = await watchInputs(root, (path) => selectsInput(checkId, path, root), ignoredInputs(checkId, root));
        const before = await snapshot(root, (path) => selectsInput(checkId, path, root));
        const startedEnvironment = await environmentIdentity(root, checkId, undefined, selectedRelease);
        const outcome = checkId === 'conventions' ? await checkConventions(root, request.task)
            : await executeCommand(selected[0], selected[1], root, signal, environment, options.quiet);
        const after = await snapshot(root, (path) => selectsInput(checkId, path, root));
        const endedEnvironment = await environmentIdentity(root, checkId);
        const observed = await watcher.outcome();
        const toolkitObserved = toolkitWatcher.outcome();
        const observation = {
            generation: observed.generation + toolkitObserved.generation,
            complete: observed.complete && toolkitObserved.complete,
            changedPaths: [...observed.changedPaths, ...toolkitObserved.changedPaths].sort().slice(0, 20),
        };
        const stable = before.hash === after.hash && startedEnvironment === endedEnvironment
            && observation.complete && observation.generation === 0;
        const receipt = {
            schemaVersion: 1, id: request.id, taskId: request.taskId, root, sessionId,
            scopeRevision: request.scopeRevision, checkId, command: selected,
            inputHash: after.hash, startedInputHash: before.hash,
            environmentIdentity: endedEnvironment,
            ...(checkId === 'full' ? { releaseConfiguration: selectedRelease } : {}),
            policyIdentity: digest([selected, process.version, before.files.filter(([path]) => isMakeDefinition(path) || /(?:lock|checks\.mjs)$/u.test(path))]),
            outcome: outcome.exitCode === 0 && !outcome.errorCode && stable ? 'passed'
                : outcome.errorCode ?? (stable ? 'failed' : 'unstable'),
            exitCode: outcome.exitCode, signal: outcome.signal,
            observation: {
                generation: observation.generation, complete: observation.complete,
                changedPaths: observation.changedPaths,
            },
            diagnostics: outcome.diagnostics ?? [], preexisting: outcome.preexisting ?? [],
        };

        await mutateState(root, sessionId, (state) => {
            const task = activeTask(state);

            if (!task || task.id !== request.taskId || task.scopeRevision !== request.scopeRevision
                || task.receipts[checkId]?.id !== request.id) {
                throw new Error('Task changed during verification; receipt cannot be credited.');
            }

            task.receipts[checkId] = receipt;
            task.checkpoint = null;
            if (receipt.outcome !== 'passed') task.review = null;
            if (checkId === 'conventions') task.conventionsDirty = receipt.outcome !== 'passed';
        });

        return receipt;
    } catch (error) {
        await mutateState(root, sessionId, (state) => {
            const task = activeTask(state);

            if (task?.id === request.taskId && task.scopeRevision === request.scopeRevision
                && task.receipts[checkId]?.id === request.id) {
                task.receipts[checkId].outcome = error.name === 'AbortError' ? 'interrupted' : 'unavailable';
                task.review = null;
                task.checkpoint = null;
            }
        });

        throw error;
    } finally {
        watcher?.close();
        toolkitWatcher?.close();
    }
}

export async function currentReceipts(root, state, task) {
    const current = {};
    const allInputs = await snapshot(root);
    const needsPhp = Object.keys(task.receipts).some((checkId) => ignoredInputs(checkId, root).length);
    const phpIdentity = needsPhp ? installedPhpIdentity(root) : null;

    if (phpIdentity) await phpIdentity;

    for (const [checkId, receipt] of Object.entries(task.receipts)) {
        if (!configuredCommands(root)[checkId]) continue;

        const selectedRelease = checkId === 'full' ? receiptReleaseConfiguration(receipt.releaseConfiguration, root) : undefined;

        if (selectedRelease === null) {
            current[checkId] = null;

            continue;
        }

        const inputHash = digest(allInputs.files.filter(([path]) => selectsInput(checkId, path, root)));
        const currentEnvironment = await environmentIdentity(root, checkId, phpIdentity, selectedRelease);
        const valid = receipt.schemaVersion === 1 && receipt.root === root && receipt.sessionId === state.sessionId
            && receipt.taskId === task.id && receipt.scopeRevision === task.scopeRevision
            && receipt.outcome === 'passed' && receipt.inputHash === inputHash
            && receipt.environmentIdentity === currentEnvironment;

        current[checkId] = valid ? receipt : null;
    }

    return current;
}
