import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { prepareReview, reviewInputs, reviewIsCurrent } from '../../agent-runtime/review.mjs';
import { completionRequirements } from '../../agent-runtime/completion.mjs';
import { currentReceipts, runCheck } from '../../agent-runtime/runner.mjs';
import { activeTask, mutateState, readState } from '../../agent-runtime/state.mjs';
import { amendScope, registerTask, requestCheckpoint } from '../../agent-runtime/tasks.mjs';
import { event, fixture, handleEvent } from './support.mjs';

const executeFile = promisify(execFile);

async function startTask(root, options = {}) {
    await handleEvent(event(root, 'SessionStart', { source: 'startup' }));

    return registerTask(root, 'session-a', { id: 'task-a', mode: 'change', profile: 'docs', paths: ['README.md'], ...options });
}

async function reviewedTask(root) {
    await runCheck(root, 'session-a', 'docs');
    const request = await prepareReview(root, 'session-a');
    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'spawn_agent', tool_input: { agent_type: 'project_reviewer', message: request.marker },
        tool_response: { agent_id: 'reviewer-a' },
    }));
    const result = {
        schemaVersion: 1, requestId: request.id, taskId: request.taskId, baseline: request.baseline,
        snapshotId: request.snapshotId, ruleIdentity: request.ruleIdentity, checkReceiptIds: request.checkReceiptIds,
        reviewedPaths: request.paths, verdict: 'passed', findings: [], limitations: [],
    };
    await handleEvent(event(root, 'SubagentStop', {
        agent_id: 'reviewer-a', last_assistant_message: '```devkit-review-result\n' + JSON.stringify(result) + '\n```',
    }));

    return request;
}

async function checkedRuntimeTask(context) {
    const root = await fixture(context, {
        Makefile: [
            'include make/docker.mk',
            'check:\n\t@node -e \'const fs=require("fs"); fs.appendFileSync("tmp/full-runs", "x"); fs.writeFileSync("tmp/full-selection.json", JSON.stringify({baseline:process.env.DEVKIT_RELEASE_BASELINE ?? null,candidate:process.env.DEVKIT_RELEASE_CANDIDATE ?? null}))\'',
            'check-docs:\n\t@node -e "process.exit(0)"',
            'format-check:\n\t@node -e "process.exit(0)"',
            'agent-identity:\n\t@node -e \'console.log(JSON.stringify({php:"fixture",packages:{}}))\'',
            'agent-conventions:\n\t@node -e \'console.log(JSON.stringify({diagnostics:[],errors:[]}))\'',
        ].join('\n') + '\n',
        'make/docker.mk': '# Maintained Docker commands.\n',
        'src/Probe.js': 'export const value = 1;\n',
        'tests/Fixtures/runtime-input.md': 'Runtime fixture data.\n',
        'composer.lock': '{}\n',
        'docs/coding-standards.md': 'Implementation standard.\n',
        'docs/ui-style.md': 'Feature delivery standard.\n',
        'docs/verification.md': 'Observed checks.\n',
        'openspec/changes/example/specs/example/spec.md': 'Required runtime behavior.\n',
        'openspec/changes/example/tasks.md': '- [ ] Actual task\n',
        'openspec/changes/example/evidence.md': '# Evidence\n',
    });
    await startTask(root, {
        profile: 'runtime', change: 'example',
        paths: ['src', 'tests', 'docs', 'make', 'openspec/changes/example', 'README.md', 'AGENTS.md', 'composer.lock'],
    });

    for (const checkId of ['full', 'docs', 'conventions', 'format']) {
        assert.equal((await runCheck(root, 'session-a', checkId)).outcome, 'passed');
    }

    return root;
}

test('completes a command-local release selection without repeating the full check', async (context) => {
    const names = ['DEVKIT_RELEASE_BASELINE', 'DEVKIT_RELEASE_CANDIDATE'];
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));

    try {
        process.env.DEVKIT_RELEASE_BASELINE = 'v0.1.0';
        process.env.DEVKIT_RELEASE_CANDIDATE = 'candidate-a';

        const root = await checkedRuntimeTask(context);

        const full = activeTask(readState(root, 'session-a')).receipts.full;
        const selection = { baseline: 'v0.1.0', candidate: 'candidate-a' };

        assert.deepEqual(JSON.parse(readFileSync(join(root, 'tmp/full-selection.json'), 'utf8')), selection);
        assert.deepEqual(full.releaseConfiguration, selection);

        for (const name of names) delete process.env[name];

        for (const [name, value] of [
            ['DEVKIT_RELEASE_BASELINE', 'v0.2.0'],
            ['DEVKIT_RELEASE_CANDIDATE', 'candidate-b'],
        ]) {
            process.env[name] = value;

            const state = readState(root, 'session-a');

            assert.equal((await currentReceipts(root, state, activeTask(state))).full, null);

            delete process.env[name];
        }

        process.env.DEVKIT_RELEASE_BASELINE = 'v0.1.0';

        let state = readState(root, 'session-a');

        assert.equal((await currentReceipts(root, state, activeTask(state))).full.id, full.id);

        delete process.env.DEVKIT_RELEASE_BASELINE;

        await reviewedTask(root);

        await requestCheckpoint(root, 'session-a', 'complete');

        assert.deepEqual(await handleEvent(event(root, 'Stop')), {});

        state = readState(root, 'session-a');

        assert.equal(state.activeTask, null);
        assert.equal(readFileSync(join(root, 'tmp/full-runs'), 'utf8'), 'x');
    } finally {
        for (const name of names) {
            if (previous[name] === undefined) delete process.env[name];
            else process.env[name] = previous[name];
        }
    }
});

test('rejects malformed recorded release selections without inferring legacy context', async (context) => {
    const previous = process.env.DEVKIT_RELEASE_BASELINE;

    try {
        process.env.DEVKIT_RELEASE_BASELINE = 'v0.1.0';

        const root = await checkedRuntimeTask(context);

        delete process.env.DEVKIT_RELEASE_BASELINE;

        for (const configuration of [null, [], {}, { baseline: 1, candidate: null }]) {
            await mutateState(root, 'session-a', (state) => {
                activeTask(state).receipts.full.releaseConfiguration = configuration;
            });

            const state = readState(root, 'session-a');

            assert.equal((await currentReceipts(root, state, activeTask(state))).full, null);
        }

        await mutateState(root, 'session-a', (state) => {
            delete activeTask(state).receipts.full.releaseConfiguration;
        });

        let state = readState(root, 'session-a');

        assert.equal((await currentReceipts(root, state, activeTask(state))).full, null);

        process.env.DEVKIT_RELEASE_BASELINE = 'v0.1.0';
        state = readState(root, 'session-a');

        assert.equal((await currentReceipts(root, state, activeTask(state))).full.outcome, 'passed');
    } finally {
        if (previous === undefined) delete process.env.DEVKIT_RELEASE_BASELINE;
        else process.env.DEVKIT_RELEASE_BASELINE = previous;
    }
});

for (const mutation of ['edit', 'add', 'rename', 'delete']) {
    test(`invalidates applicable check, policy and review evidence after included Make definitions ${mutation}`, async (context) => {
        const root = await checkedRuntimeTask(context);
        await reviewedTask(root);
        const previous = activeTask(readState(root, 'session-a'));
        const definition = join(root, 'make/docker.mk');

        if (mutation === 'edit') writeFileSync(definition, '# Changed command definition.\n');
        if (mutation === 'add') writeFileSync(join(root, 'make/new.mk'), '# New command definition.\n');
        if (mutation === 'rename') renameSync(definition, join(root, 'make/renamed.mk'));
        if (mutation === 'delete') rmSync(definition);

        const state = readState(root, 'session-a');
        const task = activeTask(state);

        assert.equal(await reviewIsCurrent(root, task), false);
        assert.notEqual((await reviewInputs(root, task)).ruleIdentity, previous.review.ruleIdentity);

        if (mutation === 'rename' || mutation === 'delete') {
            await assert.rejects(currentReceipts(root, state, task), /No rule to make target/u);

            // A missing required include makes tool identity unavailable until repaired.
            writeFileSync(definition, '# Restored command definition.\n');
        }

        const receipts = await currentReceipts(root, state, task);

        for (const checkId of ['full', 'docs', 'format', 'conventions']) {
            assert.equal(receipts[checkId], null, `${mutation}: ${checkId}`);
        }

        const renewed = await runCheck(root, 'session-a', 'docs');

        assert.equal(renewed.outcome, 'passed');
        assert.notEqual(renewed.policyIdentity, previous.receipts.docs.policyIdentity);
    });
}

test('rejects an included Make definition changed and restored while a check runs', async (context) => {
    const root = await fixture(context, {
        Makefile: 'include make/docker.mk\ncheck-docs:\n\t@node -e "require(\'fs\').writeFileSync(\'tmp/started\', \'yes\'); setTimeout(() => {}, 350)"\n',
        'make/docker.mk': '# Original definition.\n',
    });
    await startTask(root);
    const checking = runCheck(root, 'session-a', 'docs');

    for (let attempt = 0; attempt < 100 && !existsSync(join(root, 'tmp/started')); attempt++) await delay(10);

    assert.ok(existsSync(join(root, 'tmp/started')));
    writeFileSync(join(root, 'make/docker.mk'), '# Transient changed definition.\n');
    await delay(30);
    writeFileSync(join(root, 'make/docker.mk'), '# Original definition.\n');

    const receipt = await checking;

    assert.equal(receipt.exitCode, 0);
    assert.equal(receipt.outcome, 'unstable');
    assert.ok(receipt.observation.changedPaths.includes('make/docker.mk'));
});

test('refreshes reporting and review without re-executing an unchanged runtime suite', async (context) => {
    const root = await checkedRuntimeTask(context);
    await reviewedTask(root);
    const original = activeTask(readState(root, 'session-a')).receipts.full;

    writeFileSync(join(root, 'README.md'), '# Verified local delivery\n');
    writeFileSync(join(root, 'docs', 'new-report.md'), '# New observed report\n');
    mkdirSync(join(root, 'openspec/changes/example/screenshots'));
    writeFileSync(join(root, 'openspec/changes/example/screenshots/narrow.png'), 'reporting artifact');
    let state = readState(root, 'session-a');
    const current = await currentReceipts(root, state, activeTask(state));

    assert.equal(current.full.id, original.id);
    assert.equal(current.docs, null);
    assert.ok(current.format);
    assert.ok(current.conventions);
    assert.equal(await reviewIsCurrent(root, activeTask(state)), false);
    const missing = await completionRequirements(root, state, activeTask(state));

    assert.ok(missing.some((message) => message.includes('check --check docs')));
    assert.ok(missing.some((message) => message.includes('independent project review')));
    assert.ok(missing.every((message) => !message.includes('check --check full')));

    await reviewedTask(root);
    await requestCheckpoint(root, 'session-a', 'complete');

    assert.deepEqual(await handleEvent(event(root, 'Stop')), {});
    state = readState(root, 'session-a');
    assert.equal(state.activeTask, null);
    assert.equal(readFileSync(join(root, 'tmp/full-runs'), 'utf8'), 'x');
});

test('completes observed receipt and checkbox recording with documentation validation alone', async (context) => {
    const root = await checkedRuntimeTask(context);
    await reviewedTask(root);
    const full = activeTask(readState(root, 'session-a')).receipts.full;

    writeFileSync(join(root, 'openspec/changes/example/tasks.md'), '- [x] Actual task\n');
    writeFileSync(join(root, 'openspec/changes/example/evidence.md'), `# Evidence\n<!-- devkit-check-receipt:${full.id} -->\n`);
    let state = readState(root, 'session-a');

    assert.equal(await reviewIsCurrent(root, activeTask(state)), true);
    assert.equal((await currentReceipts(root, state, activeTask(state))).full.id, full.id);
    assert.deepEqual(await completionRequirements(root, state, activeTask(state)), [
        'Run node vendor/svchk-dev/ai-devkit/agent-runtime/cli.mjs check --check docs with the current --session.',
    ]);

    assert.equal((await runCheck(root, 'session-a', 'docs')).outcome, 'passed');
    await requestCheckpoint(root, 'session-a', 'complete');

    assert.deepEqual(await handleEvent(event(root, 'Stop')), {});
    state = readState(root, 'session-a');
    assert.equal(state.activeTask, null);
    assert.equal(readFileSync(join(root, 'tmp/full-runs'), 'utf8'), 'x');
});

for (const path of [
    'src/Probe.js', 'tests/Fixtures/runtime-input.md', 'composer.lock', 'AGENTS.md',
    'docs/coding-standards.md', 'docs/ui-style.md', 'openspec/changes/example/specs/example/spec.md',
]) {
    test(`invalidates runtime verification after changing ${path}`, async (context) => {
        const root = await checkedRuntimeTask(context);
        writeFileSync(join(root, path), 'Changed runtime input.\n');
        const state = readState(root, 'session-a');

        assert.equal((await currentReceipts(root, state, activeTask(state))).full, null);
        await assert.rejects(prepareReview(root, 'session-a'), /Current checks required.*full/u);
    });
}

for (const betweenTurns of [false, true]) {
    test(`detects unregistered indirect writes at final reconciliation${betweenTurns ? ' across a user prompt' : ''}`, async (context) => {
        const root = await fixture(context);
        await handleEvent(event(root, 'SessionStart', { source: 'startup' }));
        writeFileSync(join(root, 'indirect.js'), 'export const changed = true;\n');

        assert.deepEqual(await handleEvent(event(root, 'PostToolUse', {
            tool_name: 'Bash', tool_input: { command: 'python3 helper.py' },
        })), {});

        if (betweenTurns) await handleEvent(event(root, 'UserPromptSubmit', { turn_id: 'turn-b' }));

        const result = await handleEvent(event(root, 'Stop', { turn_id: betweenTurns ? 'turn-b' : 'turn-a' }));

        assert.equal(result.decision, 'block');
        assert.match(result.reason, /Register the authorized task scope/u);
        assert.equal(readState(root, 'session-a').unregisteredChanges, true);
    });
}

test('registers explicit scope while preserving pre-existing edits and isolating sessions', async (context) => {
    const root = await fixture(context, { 'foreign.md': 'before\n' });
    writeFileSync(join(root, 'foreign.md'), 'existing user edit\n');

    const task = await startTask(root);

    assert.ok(task.preexistingPaths.includes('foreign.md'));
    await assert.rejects(startTask(root), /already exists/u);
    assert.equal(readState(root, 'another-session').activeTask, null);

    await registerTask(root, 'session-b', { id: 'task-b', mode: 'change', profile: 'docs', paths: ['README.md'] });

    assert.equal(activeTask(readState(root, 'session-b')).id, 'task-b');
    assert.equal(activeTask(readState(root, 'session-a')).id, 'task-a');
});

test('restores live context and retains required full code-task reading', async (context) => {
    const root = await fixture(context, {
        'docs/coding-standards.md': 'Full coding standards.\n', '.ai/rules/src.md': 'Current source rules.\n',
    });
    await startTask(root, { paths: ['src'], profile: 'runtime' });

    const output = await handleEvent(event(root, 'SessionStart', { source: 'compact' }));

    assert.match(output.hookSpecificOutput.additionalContext, /docs\/coding-standards\.md/u);
    assert.match(output.hookSpecificOutput.additionalContext, /full coding standards/u);
    assert.match(output.hookSpecificOutput.additionalContext, /\.ai\/rules\/src\.md/u);
});

test('refreshes changed scoped guidance and includes selected specifications and administrative standards', async (context) => {
    const root = await fixture(context, {
        'docs/coding-standards.md': 'Current coding rules.\n', 'docs/admin-interface.md': 'Administrative standard.\n',
        '.ai/rules/src.md': 'Source rules before edit.\n',
        'openspec/changes/example/specs/example/spec.md': 'Selected contract.\n',
        'openspec/specs/example/spec.md': 'Permanent contract.\n',
    });
    await startTask(root, { paths: ['src/Admin'], profile: 'runtime', change: 'example' });
    const edit = event(root, 'PreToolUse', { tool_name: 'apply_patch', tool_input: { command: '*** Update File: src/Admin/Probe.php' } });

    const first = await handleEvent(edit);
    const repeated = await handleEvent(edit);
    writeFileSync(join(root, '.ai/rules/src.md'), 'Updated source rules.\n');
    const refreshed = await handleEvent(edit);

    assert.match(first.hookSpecificOutput.additionalContext, /docs\/admin-interface\.md/u);
    assert.match(first.hookSpecificOutput.additionalContext, /openspec\/changes\/example\/specs\/example\/spec\.md/u);
    assert.match(first.hookSpecificOutput.additionalContext, /openspec\/specs\/example\/spec\.md/u);
    assert.deepEqual(repeated, {});
    assert.ok(refreshed.hookSpecificOutput.additionalContext);
});

test('does not repeat unchanged context across tool paths or user prompts but restores it after resume', async (context) => {
    const root = await fixture(context, { '.ai/rules/src.md': 'Source rules.\n' });
    await startTask(root, { paths: ['src', 'docs'], profile: 'runtime' });

    const first = await handleEvent(event(root, 'PreToolUse', {
        tool_name: 'apply_patch', tool_input: { command: '*** Update File: docs/example.md' },
    }));
    const nextTool = await handleEvent(event(root, 'PreToolUse', { tool_name: 'Bash' }));
    const nextPrompt = await handleEvent(event(root, 'UserPromptSubmit'));
    const resumed = await handleEvent(event(root, 'SessionStart', { source: 'resume' }));

    assert.match(first.hookSpecificOutput.additionalContext, /\.ai\/rules\/src\.md/u);
    assert.deepEqual(nextTool, {});
    assert.deepEqual(nextPrompt, {});
    assert.ok(resumed.hookSpecificOutput.additionalContext);
});

test('requires a new checkpoint after progress and a subsequent edited turn', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    await requestCheckpoint(root, 'session-a', 'progress', 'Implementation continues.');

    assert.deepEqual(await handleEvent(event(root, 'Stop')), {});

    writeFileSync(join(root, 'README.md'), 'later edit\n');
    const later = await handleEvent(event(root, 'Stop', { turn_id: 'turn-b' }));

    assert.equal(later.decision, 'block');
    assert.equal(activeTask(readState(root, 'session-a')).checkpoint, null);

    const repeat = await handleEvent(event(root, 'Stop', { turn_id: 'turn-b', stop_hook_active: true }));

    assert.match(repeat.systemMessage, /incomplete/u);
    assert.equal(activeTask(readState(root, 'session-a')).status, 'active');
});

test('isolates reviewer turns and Stop from the parent checkpoint', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    const checkpoint = await requestCheckpoint(root, 'session-a', 'progress', 'Parent implementation continues.');
    const child = { agent_id: 'reviewer-a', agent_type: 'project_reviewer', turn_id: 'reviewer-turn' };
    await handleEvent(event(root, 'PreToolUse', { ...child, tool_name: 'Bash', tool_input: { command: 'git diff' } }));
    await handleEvent(event(root, 'UserPromptSubmit', { ...child, prompt: 'Review the current changes.' }));

    assert.deepEqual(await handleEvent(event(root, 'Stop', child)), {});
    const state = readState(root, 'session-a');
    assert.equal(state.turnId, 'turn-a');
    assert.equal(activeTask(state).checkpoint.id, checkpoint.id);
    assert.equal(state.coverage['Stop:subagent'], 1);
    assert.equal(state.coverage.Stop, undefined);

    assert.deepEqual(await handleEvent(event(root, 'Stop')), {});
    assert.equal(activeTask(readState(root, 'session-a')).checkpoint, null);
});

test('credits actual successful checks and rejects stale receipts after an unobserved edit', async (context) => {
    const root = await fixture(context);
    await startTask(root);

    const receipt = await runCheck(root, 'session-a', 'docs');

    assert.equal(receipt.outcome, 'passed');

    writeFileSync(join(root, 'README.md'), 'changed outside native edit notifications\n');
    await requestCheckpoint(root, 'session-a', 'complete');
    const output = await handleEvent(event(root, 'Stop'));

    assert.match(output.reason, /agent-runtime\/cli\.mjs check --check docs/u);
    await assert.rejects(runCheck(root, 'session-a', 'echo passed'), /arbitrary commands/u);
});

test('retains failed check outcomes without creating successful evidence', async (context) => {
    const root = await fixture(context, { Makefile: 'check-docs:\n\t@node -e "process.exit(7)"\n' });
    await startTask(root);

    const receipt = await runCheck(root, 'session-a', 'docs');

    assert.equal(receipt.outcome, 'failed');
    assert.notEqual(receipt.exitCode, 0);
    await assert.rejects(prepareReview(root, 'session-a'), /Current checks required/u);
});

test('does not forward the agent CLI Make arguments into the nested check command', async (context) => {
    const cli = fileURLToPath(new URL('../../agent-runtime/cli.mjs', import.meta.url));
    const root = await fixture(context, {
        Makefile: `agent-check:\n\t@node "${cli}" check $(ARGS)\nformat-check:\n\t@test -z "$(ARGS)"\n`
            + 'agent-identity:\n\t@node -e \'console.log(JSON.stringify({php:"fixture",packages:{}}))\'\n',
    });
    await startTask(root);

    await executeFile('make', ['agent-check', 'ARGS=--session session-a --check format'], { cwd: root });

    assert.equal(activeTask(readState(root, 'session-a')).receipts.format.outcome, 'passed');
});

test('accepts only observed completed reviewer results for the matching snapshot', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    await runCheck(root, 'session-a', 'docs');
    const request = await prepareReview(root, 'session-a');
    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'spawn_agent', tool_input: { agent_type: 'project_reviewer', message: request.marker },
        tool_response: { agent_id: 'reviewer-a' },
    }));
    const result = {
        schemaVersion: 1, requestId: request.id, taskId: request.taskId, baseline: request.baseline,
        snapshotId: request.snapshotId, ruleIdentity: request.ruleIdentity, checkReceiptIds: request.checkReceiptIds,
        reviewedPaths: request.paths, verdict: 'passed', findings: [], limitations: [],
    };

    await handleEvent(event(root, 'SubagentStop', {
        agent_id: 'unrelated-agent', last_assistant_message: '```devkit-review-result\n' + JSON.stringify(result) + '\n```',
    }));

    assert.equal(activeTask(readState(root, 'session-a')).review, null);

    await handleEvent(event(root, 'SubagentStop', {
        agent_id: 'reviewer-a', last_assistant_message: '```devkit-review-result\n' + JSON.stringify(result) + '\n```',
    }));
    await requestCheckpoint(root, 'session-a', 'complete');
    const output = await handleEvent(event(root, 'Stop'));

    assert.deepEqual(output, {});
    assert.equal(readState(root, 'session-a').activeTask, null);
    await assert.rejects(registerTask(root, 'session-a', { id: 'task-a', mode: 'read-only', paths: [] }), /already exists/u);
});

test('rejects a writing reviewer even after original bytes are restored', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    const request = await reviewedTask(root);
    const child = { agent_id: 'reviewer-a', agent_type: 'project_reviewer', turn_id: 'reviewer-turn', tool_name: 'apply_patch' };
    writeFileSync(join(root, 'README.md'), 'reviewer edit\n');
    await handleEvent(event(root, 'PostToolUse', child));
    writeFileSync(join(root, 'README.md'), '# Fixture\n');
    await handleEvent(event(root, 'PostToolUse', child));

    const result = {
        schemaVersion: 1, requestId: request.id, taskId: request.taskId, baseline: request.baseline,
        snapshotId: request.snapshotId, ruleIdentity: request.ruleIdentity, checkReceiptIds: request.checkReceiptIds,
        reviewedPaths: request.paths, verdict: 'passed', findings: [], limitations: [],
    };

    await assert.rejects(handleEvent(event(root, 'SubagentStop', {
        agent_id: 'reviewer-a', last_assistant_message: '```devkit-review-result\n' + JSON.stringify(result) + '\n```',
    })), /reviewer changed repository inputs/u);
    assert.equal(activeTask(readState(root, 'session-a')).review, null);
});

test('accepts only the observed completed collaboration reviewer matching its prepared request', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    await runCheck(root, 'session-a', 'docs');
    const request = await prepareReview(root, 'session-a');
    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationspawn_agent', tool_input: { agent_type: 'project_reviewer', message: request.marker },
        tool_response: { task_name: '/root/reviewer-a' },
    }));
    const result = {
        schemaVersion: 1, requestId: request.id, taskId: request.taskId, baseline: request.baseline,
        snapshotId: request.snapshotId, ruleIdentity: request.ruleIdentity, checkReceiptIds: request.checkReceiptIds,
        reviewedPaths: request.paths, verdict: 'passed', findings: [], limitations: [],
    };
    const message = '```devkit-review-result\n' + JSON.stringify(result) + '\n```';
    const status = (agents, toolName = 'collaborationlist_agents') => handleEvent(event(root, 'PostToolUse', {
        tool_name: toolName, tool_response: { agents },
    }));

    await status([{ agent_name: '/root/reviewer-a', agent_status: 'running' }]);
    await status([{ agent_name: '/root/unknown', agent_status: { completed: message } }]);
    await status([{ agent_name: '/root/reviewer-a', agent_status: { completed: message } }], 'Bash');
    assert.equal(activeTask(readState(root, 'session-a')).review, null);
    await assert.rejects(status([{ agent_name: '/root/reviewer-a', agent_status: { completed: 'Looks good.' } }]), /no structured result/u);

    await status([{ agent_name: '/root/reviewer-a', agent_status: { completed: message } }]);

    const state = readState(root, 'session-a');
    assert.equal(activeTask(state).review.completionSource, 'collaboration-status');
    assert.equal(await reviewIsCurrent(root, activeTask(state)), true);
    assert.equal(state.coverage['ReviewerCompletion:collaboration'], 1);
});

test('observing client reviewer support alone does not create a task review receipt or accept self-review', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    await assert.rejects(handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationspawn_agent', tool_input: { agent_type: 'project_reviewer', message: 'Review current work.' },
        tool_response: { task_name: '/root' },
    })), /separate correlatable/u);
    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationspawn_agent', tool_input: { agent_type: 'project_reviewer', message: 'Review current work.' },
        tool_response: { task_name: '/root/reviewer-a' },
    }));
    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationlist_agents', tool_response: { agents: [{ agent_name: '/root/reviewer-a', agent_status: { completed: 'Read-only review finished; current task evidence remains incomplete.' } }] },
    }));

    const state = readState(root, 'session-a');
    assert.equal(state.coverage['ReviewerCompletion:collaboration'], 1);
    assert.equal(activeTask(state).review, null);
});

test('correlates opaque assignment text only through the exact request task name and observed reviewer role', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    await runCheck(root, 'session-a', 'docs');
    const request = await prepareReview(root, 'session-a');
    const spawn = (taskName, agentType = 'project_reviewer') => handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationspawn_agent',
        tool_input: { task_name: taskName, agent_type: agentType, message: 'opaque-client-assignment' },
        tool_response: { task_name: `/root/${taskName}` },
    }));

    await spawn('another_review');
    await spawn(request.taskName, 'default');

    assert.equal(activeTask(readState(root, 'session-a')).reviewRequest.agentId, null);

    await spawn(request.taskName);

    assert.equal(activeTask(readState(root, 'session-a')).reviewRequest.agentId, `/root/${request.taskName}`);

    const nextRequest = await prepareReview(root, 'session-a');

    await spawn(request.taskName);

    assert.notEqual(nextRequest.taskName, request.taskName);
    assert.equal(activeTask(readState(root, 'session-a')).reviewRequest.agentId, null);
});

test('correlates follow-up only to a previously observed separate reviewer in the current policy', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    await runCheck(root, 'session-a', 'docs');
    const request = await prepareReview(root, 'session-a');
    const followup = (target) => handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationfollowup_task', tool_input: { target, message: request.marker }, tool_response: {},
    }));
    await followup('/root/unknown');
    assert.equal(activeTask(readState(root, 'session-a')).reviewRequest.agentId, null);

    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationspawn_agent', tool_input: { agent_type: 'project_reviewer', message: 'Read-only preliminary review.' },
        tool_response: { task_name: '/root/reviewer-a' },
    }));
    await followup('/root/reviewer-a');

    assert.equal(activeTask(readState(root, 'session-a')).reviewRequest.agentId, '/root/reviewer-a');
});

test('consumes a completed collaboration result once and cannot replay it after a failed rerun', async (context) => {
    const root = await fixture(context, { Makefile: 'check-docs:\n\t@test ! -f tmp/fail-check\n' });
    await startTask(root);
    await runCheck(root, 'session-a', 'docs');
    const request = await prepareReview(root, 'session-a');
    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationspawn_agent', tool_input: { agent_type: 'project_reviewer', message: request.marker },
        tool_response: { task_name: '/root/reviewer-a' },
    }));
    const result = {
        schemaVersion: 1, requestId: request.id, taskId: request.taskId, baseline: request.baseline,
        snapshotId: request.snapshotId, ruleIdentity: request.ruleIdentity, checkReceiptIds: request.checkReceiptIds,
        reviewedPaths: request.paths, verdict: 'passed', findings: [], limitations: [],
    };
    const report = () => handleEvent(event(root, 'PostToolUse', {
        tool_name: 'collaborationlist_agents', tool_response: { agents: [{ agent_name: '/root/reviewer-a',
            agent_status: { completed: '```devkit-review-result\n' + JSON.stringify(result) + '\n```' } }] },
    }));
    await report();
    const checkpoint = await requestCheckpoint(root, 'session-a', 'progress', 'Further work continues.');
    await report();

    assert.equal(activeTask(readState(root, 'session-a')).checkpoint.id, checkpoint.id);

    writeFileSync(join(root, 'tmp/fail-check'), 'fail\n');
    assert.equal((await runCheck(root, 'session-a', 'docs')).outcome, 'failed');
    rmSync(join(root, 'tmp/fail-check'));
    await runCheck(root, 'session-a', 'docs');
    await report();

    assert.equal(activeTask(readState(root, 'session-a')).review, null);
    assert.equal(readState(root, 'session-a').coverage['ReviewerCompletion:collaboration'], 1);
});

for (const changedPath of ['openspec/specs/example/spec.md', 'openspec/changes/example/design.md', 'src/Caller.php']) {
    test(`requires follow-up review after ${changedPath} changes and checks pass again`, async (context) => {
        const root = await fixture(context, { [changedPath]: 'Original applicable input.\n' });
        await startTask(root, { change: 'example' });
        await reviewedTask(root);

        writeFileSync(join(root, changedPath), 'Changed applicable input.\n');
        await runCheck(root, 'session-a', 'docs');
        const state = readState(root, 'session-a');

        assert.equal((await currentReceipts(root, state, activeTask(state))).docs.outcome, 'passed');
        assert.equal(await reviewIsCurrent(root, activeTask(state)), false);
    });
}

test('does not resurrect an earlier pass or review after a runner exception', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    await reviewedTask(root);
    symlinkSync('/etc/hosts', join(root, 'unsupported.md'));

    await assert.rejects(runCheck(root, 'session-a', 'docs'), /leaves the repository/u);
    rmSync(join(root, 'unsupported.md'));
    const state = readState(root, 'session-a');

    assert.equal(activeTask(state).receipts.docs.outcome, 'unavailable');
    assert.equal(activeTask(state).review, null);
    assert.equal((await currentReceipts(root, state, activeTask(state))).docs, null);
});

test('waits for terminal process completion and rejects transient edits restored during a check', async (context) => {
    const root = await fixture(context, { Makefile: 'check-docs:\n\t@node -e "require(\'fs\').writeFileSync(\'tmp/started\', \'yes\'); setTimeout(() => {}, 350)"\n' });
    await startTask(root);
    const checking = runCheck(root, 'session-a', 'docs');

    for (let attempt = 0; attempt < 100 && !existsSync(join(root, 'tmp/started')); attempt++) await delay(10);
    assert.equal(activeTask(readState(root, 'session-a')).receipts.docs.outcome, 'running');
    await assert.rejects(prepareReview(root, 'session-a'), /Current checks required/u);
    writeFileSync(join(root, 'README.md'), 'transient edit\n');
    await delay(30);
    writeFileSync(join(root, 'README.md'), '# Fixture\n');

    const receipt = await checking;

    assert.equal(receipt.exitCode, 0);
    assert.equal(receipt.outcome, 'unstable');
    assert.ok(receipt.observation.generation > 0);
});

test('records interrupted execution and never accepts printed success as a receipt', async (context) => {
    const root = await fixture(context, { Makefile: 'check-docs:\n\t@node -e "console.log(\'passed\'); setTimeout(() => {}, 200)"\n' });
    await startTask(root);
    const abortController = new AbortController();
    const checking = runCheck(root, 'session-a', 'docs', abortController.signal);
    setTimeout(() => abortController.abort(), 50);

    const receipt = await checking;

    assert.equal(receipt.outcome, 'interrupted');
    assert.equal((await currentReceipts(root, readState(root, 'session-a'), activeTask(readState(root, 'session-a')))).docs, null);
});

test('retains unchanged receipts across read-only tools and ignored output but isolates a changed scope', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    const receipt = await runCheck(root, 'session-a', 'docs');
    writeFileSync(join(root, 'tmp/generated-output'), 'not an input\n');
    await handleEvent(event(root, 'PostToolUse', { tool_name: 'Bash', tool_input: { command: 'git status' } }));
    let state = readState(root, 'session-a');

    assert.equal((await currentReceipts(root, state, activeTask(state))).docs.id, receipt.id);
    await amendScope(root, 'session-a', { paths: ['README.md', 'AGENTS.md'] });
    state = readState(root, 'session-a');
    assert.deepEqual(activeTask(state).receipts, {});
});

test('rejects another task receipt without copying ignored credentials or transcripts into state', async (context) => {
    const root = await fixture(context, {
        '.gitignore': '/tmp/\n.env\n',
        Makefile: 'check-docs:\n\t@mkdir -p tmp\n\t@node -e "require(\'fs\').writeFileSync(\'tmp/generated\', \'generated\'); console.log(\'console-only-result\')"\n',
    });
    writeFileSync(join(root, '.env'), 'SECRET=private-fixture-value\n');
    await startTask(root);
    const receipt = await runCheck(root, 'session-a', 'docs');
    await registerTask(root, 'session-b', { id: 'another-task', mode: 'change', profile: 'docs', paths: ['README.md'] });
    await mutateState(root, 'session-b', (state) => { activeTask(state).receipts.docs = receipt; });
    const state = readState(root, 'session-b');

    assert.equal(receipt.outcome, 'passed');
    assert.equal((await currentReceipts(root, state, activeTask(state))).docs, null);
    assert.doesNotMatch(JSON.stringify([state, readState(root, 'session-a')]), /private-fixture-value|console-only-result/u);
    assert.equal(readFileSync(join(root, '.env'), 'utf8'), 'SECRET=private-fixture-value\n');
});

test('invalidates verification after an untracked input, rename or deletion', async (context) => {
    const root = await fixture(context);
    await startTask(root);

    const current = async () => {
        const state = readState(root, 'session-a');

        return (await currentReceipts(root, state, activeTask(state))).docs;
    };

    await runCheck(root, 'session-a', 'docs');
    writeFileSync(join(root, 'new-input.md'), 'new maintained input\n');
    assert.equal(await current(), null);
    await runCheck(root, 'session-a', 'docs');
    renameSync(join(root, 'new-input.md'), join(root, 'renamed-input.md'));
    assert.equal(await current(), null);
    await runCheck(root, 'session-a', 'docs');
    rmSync(join(root, 'README.md'));
    assert.equal(await current(), null);
});

test('accepts only checkbox completion and observed receipt annotations as review-only exceptions', async (context) => {
    const root = await fixture(context, { 'openspec/changes/example/tasks.md': '- [ ] Actual task\n', 'openspec/changes/example/evidence.md': '# Evidence\n' });
    await startTask(root, { paths: ['openspec/changes/example'], change: 'example' });
    await reviewedTask(root);
    writeFileSync(join(root, 'openspec/changes/example/tasks.md'), '- [x] Actual task\n');
    let task = activeTask(readState(root, 'session-a'));
    const receiptId = task.receipts.docs.id;
    writeFileSync(join(root, 'openspec/changes/example/evidence.md'), `# Evidence\n<!-- devkit-check-receipt:${receiptId} -->\n`);

    assert.equal(await reviewIsCurrent(root, task), true);
    assert.equal((await currentReceipts(root, readState(root, 'session-a'), task)).docs, null);
    await runCheck(root, 'session-a', 'docs');
    task = activeTask(readState(root, 'session-a'));
    assert.equal(await reviewIsCurrent(root, task), true);
    // Receipt annotations remain grounded in actual retained runs, including an
    // earlier run superseded only by the documentation refresh.
    writeFileSync(join(root, 'openspec/changes/example/evidence.md'), '# Evidence\nAn unreviewed narrative change.\n');
    assert.equal(await reviewIsCurrent(root, task), false);
});

test('rejects missing, malformed, wrong-task and unresolved reviewer results', async (context) => {
    const root = await fixture(context);
    await startTask(root);
    await runCheck(root, 'session-a', 'docs');
    const request = await prepareReview(root, 'session-a');
    const result = {
        schemaVersion: 1, requestId: request.id, taskId: request.taskId, baseline: request.baseline,
        snapshotId: request.snapshotId, ruleIdentity: request.ruleIdentity, checkReceiptIds: request.checkReceiptIds,
        reviewedPaths: request.paths, verdict: 'passed', findings: [], limitations: [],
    };
    const stopped = (message) => event(root, 'SubagentStop', { agent_id: 'reviewer-a', last_assistant_message: message });
    const report = (value) => '```devkit-review-result\n' + JSON.stringify(value) + '\n```';

    await handleEvent(stopped(report(result)));
    assert.equal(activeTask(readState(root, 'session-a')).review, null);
    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'spawn_agent', tool_input: { agent_type: 'project_reviewer', message: request.marker },
        tool_response: { agent_id: 'reviewer-a' },
    }));
    await assert.rejects(handleEvent(stopped('Looks good.')), /no structured result/u);
    await assert.rejects(handleEvent(stopped(report({ ...result, taskId: 'another-task' }))), /does not match/u);
    await handleEvent(stopped(report({ ...result, findings: ['Unresolved issue.'] })));
    assert.equal(await reviewIsCurrent(root, activeTask(readState(root, 'session-a'))), false);

    const unavailableRequest = await prepareReview(root, 'session-a');
    await handleEvent(event(root, 'PostToolUse', {
        tool_name: 'spawn_agent', tool_input: { agent_type: 'project_reviewer', message: unavailableRequest.marker },
        tool_response: { agent_id: 'reviewer-a' },
    }));
    await handleEvent(stopped(report({ ...result, requestId: unavailableRequest.id,
        snapshotId: unavailableRequest.snapshotId, ruleIdentity: unavailableRequest.ruleIdentity,
        checkReceiptIds: unavailableRequest.checkReceiptIds, limitations: ['Required evidence unavailable.'] })));

    assert.deepEqual(activeTask(readState(root, 'session-a')).review.findings, []);
    assert.deepEqual(activeTask(readState(root, 'session-a')).review.limitations, ['Required evidence unavailable.']);
    assert.equal(await reviewIsCurrent(root, activeTask(readState(root, 'session-a'))), false);
});

test('promotes a read-only task after a write and requires actual scope without successful completion', async (context) => {
    const root = await fixture(context);
    await startTask(root, { mode: 'read-only' });
    writeFileSync(join(root, 'README.md'), 'unexpected write\n');
    const feedback = await handleEvent(event(root, 'PostToolUse', { tool_name: 'apply_patch' }));
    assert.match(feedback.hookSpecificOutput.additionalContext, /Establish the actual owned scope/u);
    await requestCheckpoint(root, 'session-a', 'complete');
    const stop = await handleEvent(event(root, 'Stop'));
    assert.equal(stop.decision, 'block');
    assert.match(stop.reason, /authorized change scope/u);
});

test('preserves read-only exemption when another actor edits while the task only reads', async (context) => {
    const root = await fixture(context);
    await startTask(root, { mode: 'read-only' });
    writeFileSync(join(root, 'README.md'), 'external editor changes\n');
    await handleEvent(event(root, 'PostToolUse', { tool_name: 'Bash', tool_input: { command: 'git diff' } }));

    assert.equal(activeTask(readState(root, 'session-a')).mode, 'read-only');
    await requestCheckpoint(root, 'session-a', 'complete');
    assert.deepEqual(await handleEvent(event(root, 'Stop')), {});
    assert.equal(readState(root, 'session-a').activeTask, null);
});

for (const command of ['printf changed > README.md', 'cat <<EOF > README.md\nchanged\nEOF']) {
    test(`promotes direct shell writes in a read-only task: ${command.split('\n')[0]}`, async (context) => {
        const root = await fixture(context);
        await startTask(root, { mode: 'read-only' });
        writeFileSync(join(root, 'README.md'), 'changed\n');
        await handleEvent(event(root, 'PostToolUse', { tool_name: 'Bash', tool_input: { command } }));

        assert.equal(activeTask(readState(root, 'session-a')).mode, 'change');
        assert.equal(activeTask(readState(root, 'session-a')).scopeMissing, true);
    });
}

test('does not treat quoted redirection examples as a task write', async (context) => {
    const root = await fixture(context);
    await startTask(root, { mode: 'read-only' });
    writeFileSync(join(root, 'README.md'), 'external edit\n');
    await handleEvent(event(root, 'PostToolUse', { tool_name: 'Bash', tool_input: { command: 'printf "Example: > README.md"' } }));

    assert.equal(activeTask(readState(root, 'session-a')).mode, 'read-only');
});

for (const toolName of ['apply_patch', 'Bash']) {
    test(`defers ${toolName} convention findings to final verification and permits correction`, async (context) => {
        const root = await fixture(context, {
            Makefile: 'agent-identity:\n\t@node -e \'console.log(JSON.stringify({php:"fixture",packages:{}}))\'\n'
                + 'agent-conventions:\n\t@node convention-backend.mjs\nformat-check:\n\t@node -e "process.exit(0)"\n',
            'convention-backend.mjs': `import { readFileSync } from 'node:fs';

const bad = readFileSync('Probe.php', 'utf8').includes('Invalid');
const diagnostics = bad ? [{
    file: 'Probe.php', line: 1, rule: 'devkit.enumCase', message: 'Use camelCase.', source: 'docs/coding-standards.md',
}] : [];

console.log(JSON.stringify({ diagnostics, preexisting: [], errors: [] }));
process.exitCode = bad ? 1 : 0;
`,
            'Probe.php': '<?php enum Choice { case valid; }\n',
        });
        await startTask(root, { paths: ['Probe.php'], profile: 'tooling' });
        writeFileSync(join(root, 'Probe.php'), '<?php enum Choice { case Invalid; }\n');

        const tool = { tool_name: toolName, tool_input: { command: 'touch Probe.php' } };
        const feedback = await handleEvent(event(root, 'PostToolUse', tool));

        assert.deepEqual(feedback, {});
        assert.equal(activeTask(readState(root, 'session-a')).conventionsDirty, true);
        assert.equal(activeTask(readState(root, 'session-a')).receipts.conventions, undefined);

        const failed = await runCheck(root, 'session-a', 'conventions');

        assert.equal(failed.outcome, 'failed');
        assert.equal(failed.diagnostics[0].rule, 'devkit.enumCase');

        writeFileSync(join(root, 'Probe.php'), '<?php enum Choice { case valid; }\n');
        await handleEvent(event(root, 'PostToolUse', tool));

        const passed = await runCheck(root, 'session-a', 'conventions');

        assert.equal(passed.outcome, 'passed');
        assert.equal(activeTask(readState(root, 'session-a')).conventionsDirty, false);
    });
}

test('never starts PHP conventions or formatting from edit-time hooks', async (context) => {
    const root = await fixture(context, {
        Makefile: 'agent-conventions:\n\t@node convention-backend.mjs\nformat-check:\n\t@exit 99\n',
        'convention-backend.mjs': `import { readFileSync, writeFileSync } from 'node:fs';

const scope = JSON.parse(readFileSync(process.env.DEVKIT_AGENT_SCOPE_FILE, 'utf8'));

writeFileSync('tmp/last-batch.json', JSON.stringify(scope.paths));

console.log(JSON.stringify({ diagnostics: [], preexisting: [], errors: [] }));
`,
        'Probe space.php': '<?php enum Probe { case initial; }\n',
        'Other.php': '<?php enum Other { case initial; }\n',
    });
    await startTask(root, { paths: ['Probe space.php', 'Other.php', 'README.md'], profile: 'tooling' });
    rmSync(join(root, 'tmp/last-batch.json'));

    await handleEvent(event(root, 'PostToolUse', { tool_name: 'Bash' }));
    writeFileSync(join(root, 'README.md'), '# Documentation edit\n');
    await handleEvent(event(root, 'PostToolUse', { tool_name: 'apply_patch' }));

    assert.equal(existsSync(join(root, 'tmp/last-batch.json')), false);

    writeFileSync(join(root, 'Probe space.php'), '<?php enum Probe { case changed; }\n');

    const feedback = await handleEvent(event(root, 'PostToolUse', { tool_name: 'apply_patch' }));

    assert.equal(existsSync(join(root, 'tmp/last-batch.json')), false);
    assert.deepEqual(feedback, {});
    assert.equal(activeTask(readState(root, 'session-a')).conventionsDirty, true);
    assert.deepEqual(activeTask(readState(root, 'session-a')).receipts, {});
});
