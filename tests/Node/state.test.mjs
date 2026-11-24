import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { activeTask, mutateState, observeRuntime, readState, recoverState } from '../../agent-runtime/state.mjs';

const executeFile = promisify(execFile);

test('isolates sessions and serializes concurrent updates without losing findings', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-state-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    writeFileSync(join(root, 'devkit.json'), JSON.stringify({ schemaVersion: 1 }));

    await Promise.all(Array.from({ length: 8 }, (_, number) => mutateState(root, 'session-a', (state) => {
        state.failures.push(`finding-${number}`);
    })));

    assert.equal(readState(root, 'session-a').failures.length, 8);
    assert.equal(readState(root, 'session-b').failures.length, 0);
});

test('expires checkpoints after a runtime turn, edit or interruption', () => {
    const state = {
        activeTask: 'task-a', turnId: 'turn-a', inputHash: 'initial', generation: 0, coverage: {},
        tasks: { 'task-a': { id: 'task-a', status: 'active', checkpoint: { outcome: 'progress' } } },
    };

    observeRuntime(state, { hook_event_name: 'PreToolUse', turn_id: 'turn-b' }, 'initial');

    assert.equal(activeTask(state).checkpoint, null);
    assert.equal(state.generation, 0);

    activeTask(state).checkpoint = { outcome: 'complete' };
    observeRuntime(state, { hook_event_name: 'PostToolUse', turn_id: 'turn-b' }, 'changed');

    assert.equal(activeTask(state).checkpoint, null);
    assert.equal(state.generation, 1);

    activeTask(state).checkpoint = { outcome: 'progress' };
    observeRuntime(state, { hook_event_name: 'Interrupt', turn_id: 'turn-b' }, 'changed');

    assert.equal(activeTask(state).checkpoint, null);
});

test('recovers corrupt state explicitly without crediting old evidence or clearing valid findings', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-recover-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(root, 'devkit.json'), JSON.stringify({ schemaVersion: 1 }));
    await mutateState(root, 'session-a', (state) => { state.failures.push('Unresolved finding.'); });

    await assert.rejects(recoverState(root, 'session-a'), /Valid state cannot be reset/u);

    const directory = join(root, 'tmp', 'devkit');
    const stateFile = readdirSync(directory).find((name) => name.endsWith('.json'));
    writeFileSync(join(directory, stateFile), '{');

    assert.throws(() => readState(root, 'session-a'), /cannot be decoded/u);

    const result = await recoverState(root, 'session-a');

    assert.equal(result.outcome, 'incomplete');
    assert.equal(readState(root, 'session-a').activeTask, null);
    assert.equal(readState(root, 'session-a').unregisteredChanges, true);
    assert.ok(readdirSync(directory).some((name) => name.endsWith('.quarantined')));
});
