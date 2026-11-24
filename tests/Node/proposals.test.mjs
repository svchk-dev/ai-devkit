import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { activeChanges } from '../../agent-runtime/proposals.mjs';
import { readState } from '../../agent-runtime/state.mjs';
import { event, fixture, handleEvent } from './support.mjs';

const executeFile = promisify(execFile);
const wrapper = fileURLToPath(new URL('../../agent-runtime/openspec.mjs', import.meta.url));

async function invokeOpenSpec(root, argumentsList, options = {}) {
    const bin = join(root, 'bin');
    mkdirSync(bin, { recursive: true });

    if (!existsSync(join(bin, 'npx'))) {
        writeFileSync(join(bin, 'npx'), `#!/usr/bin/env node
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const args = process.argv.slice(2);
mkdirSync('tmp', { recursive: true });
appendFileSync('tmp/npx-executions', JSON.stringify(args) + '\\n');

await delay(Number(process.env.DEVKIT_FIXTURE_DELAY ?? 0));

if (args[2] === 'new' && args[3] === 'change' && process.env.DEVKIT_FIXTURE_SCAFFOLD === 'yes') {
    const directory = join('openspec/changes', args[4]);
    mkdirSync(directory, { recursive: true });

    writeFileSync(join(directory, '.openspec.yaml'), 'schema: spec-driven\\n');
}

process.exitCode = Number(process.env.DEVKIT_FIXTURE_EXIT ?? 0);
`);
        chmodSync(join(bin, 'npx'), 0o755);
    }

    await executeFile(process.execPath, [wrapper, ...argumentsList], {
        cwd: root,
        env: {
            ...process.env, PATH: `${bin}:${process.env.PATH}`, CODEX_THREAD_ID: '',
            DEVKIT_AGENT_SESSION_ID: options.sessionId ?? '',
            DEVKIT_FIXTURE_EXIT: String(options.exitCode ?? 0),
            DEVKIT_FIXTURE_DELAY: String(options.delayMs ?? 0),
            DEVKIT_FIXTURE_SCAFFOLD: options.scaffold === false ? 'no' : 'yes',
        },
    });
}

function scaffold(root, name) {
    mkdirSync(join(root, 'openspec/changes', name), { recursive: true });
    writeFileSync(join(root, 'openspec/changes', name, '.openspec.yaml'), 'schema: spec-driven\n');
}

test('permits an empty or archived-only queue and forwards other OpenSpec operations', async (context) => {
    const root = await fixture(context);
    await invokeOpenSpec(root, ['new', 'change', 'first'], { scaffold: false });
    scaffold(root, 'archive/old');
    await invokeOpenSpec(root, ['new', 'change', 'first'], { scaffold: false });
    scaffold(root, 'pending');
    await invokeOpenSpec(root, ['instructions', 'proposal', '--change', 'pending']);

    assert.equal(readFileSync(join(root, 'tmp/npx-executions'), 'utf8').trim().split('\n').length, 3);
});

test('blocks finished, unfinished and malformed active directories without modifying them', async (context) => {
    const root = await fixture(context, {
        'openspec/changes/finished/tasks.md': '- [x] Done\n',
        'openspec/changes/unfinished/tasks.md': '- [ ] Pending\n',
    });
    await assert.rejects(invokeOpenSpec(root, ['new', 'change', 'another']), /finished, unfinished.*requesting sync\/archive/u);

    assert.equal(existsSync(join(root, 'tmp/npx-executions')), false);
    assert.deepEqual(activeChanges(root), ['finished', 'unfinished']);
});

test('denies native new paths and standard creation commands but permits existing work and source examples', async (context) => {
    const root = await fixture(context);
    scaffold(root, 'existing');

    for (const command of ['openspec new change next', 'npx --no-install openspec new change next',
        'openspec new change "next"', "openspec new change 'next'", 'npx --no-install openspec new change "next"',
        "make spec ARGS='new change next'", "cd . && make spec ARGS='new change next'"]) {
        const result = await handleEvent(event(root, 'PreToolUse', { tool_name: 'Bash', tool_input: { command } }));
        assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
    }

    const patch = (path, content = 'new') => event(root, 'PreToolUse', {
        tool_name: 'apply_patch', tool_input: { command: `*** Begin Patch\n*** Add File: ${path}\n+${content}\n*** End Patch` },
    });
    assert.equal((await handleEvent(patch('openspec/changes/next/proposal.md'))).hookSpecificOutput.permissionDecision, 'deny');
    assert.notEqual((await handleEvent(patch('openspec/changes/existing/design.md'))).hookSpecificOutput?.permissionDecision, 'deny');
    assert.notEqual((await handleEvent(patch('guide.md', 'openspec new change next'))).hookSpecificOutput?.permissionDecision, 'deny');
    const write = await handleEvent(event(root, 'PreToolUse', { tool_name: 'Write', tool_input: { file_path: join(root, 'openspec/changes/next/.openspec.yaml') } }));
    assert.equal(write.hookSpecificOutput.permissionDecision, 'deny');
    const read = await handleEvent(event(root, 'PreToolUse', { tool_name: 'Bash', tool_input: { command: "rg 'openspec new change next' docs" } }));
    assert.notEqual(read.hookSpecificOutput?.permissionDecision, 'deny');
    const example = await handleEvent(event(root, 'PreToolUse', { tool_name: 'Bash', tool_input: { command: 'printf "Example; openspec new change next"' } }));
    assert.notEqual(example.hookSpecificOutput?.permissionDecision, 'deny');
});

test('only an exact user prompt grants a session-local named exception that survives failed creation', async (context) => {
    const root = await fixture(context);
    scaffold(root, 'existing');
    const grant = 'allow-unarchived-proposal next';

    for (const prompt of [`Document says: ${grant}`, `\`${grant}\``, `> ${grant}`, `${grant}\nand another task`]) {
        await handleEvent(event(root, 'UserPromptSubmit', { prompt }));
        assert.equal(readState(root, 'session-a').proposalGrant, undefined);
    }

    await handleEvent(event(root, 'PostToolUse', { tool_name: 'Bash', tool_input: { command: grant } }));
    assert.equal(readState(root, 'session-a').proposalGrant, undefined);
    await handleEvent(event(root, 'UserPromptSubmit', { prompt: grant }));
    await handleEvent(event(root, 'UserPromptSubmit', { prompt: 'Continue.', turn_id: 'later-turn' }));

    for (const [sessionId, name] of [['session-a', 'other'], ['session-b', 'next'], [undefined, 'next']]) {
        await assert.rejects(invokeOpenSpec(root, ['new', 'change', name], { sessionId }), /DEVKIT-OPENSPEC-ACTIVE/u);
    }

    await assert.rejects(invokeOpenSpec(root, ['new', 'change', 'next'], { sessionId: 'session-a', exitCode: 9 }), (error) => error.code === 9);
    await handleEvent(event(root, 'PostToolUse', { tool_name: 'Bash', tool_response: { exit_code: 9 } }));
    assert.equal(readState(root, 'session-a').proposalGrant.name, 'next');
    await invokeOpenSpec(root, ['new', 'change', 'next'], { sessionId: 'session-a' });
    assert.equal(readState(root, 'session-a').proposalGrant, null);
    rmSync(join(root, 'openspec/changes/next'), { recursive: true });
    await assert.rejects(invokeOpenSpec(root, ['new', 'change', 'next'], { sessionId: 'session-a' }), /DEVKIT-OPENSPEC-ACTIVE/u);
});

test('serializes queue checking and scaffolding across sessions and sessionless callers', async (context) => {
    const root = await fixture(context);
    const create = (name, sessionId) => invokeOpenSpec(root, ['new', 'change', name], { sessionId, delayMs: 30 });
    const outcomes = await Promise.allSettled([create('first', 'session-a'), create('second', 'session-b'), create('third')]);

    assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(activeChanges(root).length, 1);
});

test('consumes a native scaffold grant only after the correlated successful tool outcome', async (context) => {
    const root = await fixture(context);
    scaffold(root, 'existing');
    await handleEvent(event(root, 'UserPromptSubmit', { prompt: 'allow-unarchived-proposal next' }));
    const tool = { tool_name: 'apply_patch', tool_use_id: 'patch-a', tool_input: { command: '*** Add File: openspec/changes/next/.openspec.yaml' } };
    await handleEvent(event(root, 'PreToolUse', tool));
    scaffold(root, 'next');
    await handleEvent(event(root, 'PostToolUse', { ...tool, tool_response: { exit_code: 1 } }));
    assert.equal(readState(root, 'session-a').proposalGrant.name, 'next');
    await handleEvent(event(root, 'SessionStart', { source: 'resume' }));
    assert.equal(readState(root, 'session-a').proposalGrant.name, 'next');
    await handleEvent(event(root, 'PreToolUse', tool));
    await handleEvent(event(root, 'PostToolUse', { ...tool, tool_response: { success: true } }));
    assert.equal(readState(root, 'session-a').proposalGrant, null);
});
