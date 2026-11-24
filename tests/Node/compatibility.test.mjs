import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { activationStatus, inspectHooks, observedClientCoverage } from '../../agent-runtime/compatibility.mjs';
import { coveragePolicyIdentity } from '../../agent-runtime/repository.mjs';
import { event, fixture, handleEvent } from './support.mjs';

test('does not credit untrusted, modified, disabled or unrelated hook definitions', () => {
    const root = '/tmp/project';
    const eventNames = ['sessionStart', 'userPromptSubmit', 'preToolUse', 'postToolUse', 'subagentStop', 'stop', 'interrupt'];
    const hooks = eventNames.map((eventName) => ({
        eventName, source: 'project', sourcePath: root + '/.codex/hooks.json', enabled: true, trustStatus: 'trusted', currentHash: 'definition',
    }));
    const inventory = { data: [{ cwd: root, hooks, errors: [] }] };

    assert.equal(activationStatus(root, inventory).active, true);

    for (const trustStatus of ['untrusted', 'modified']) {
        hooks[0].trustStatus = trustStatus;

        assert.equal(activationStatus(root, inventory).active, false);
    }

    hooks[0].trustStatus = 'trusted';
    hooks[0].enabled = false;

    assert.equal(activationStatus(root, inventory).active, false);

    hooks[0].enabled = true;
    hooks[0].source = 'user';

    assert.equal(activationStatus(root, inventory).active, false);
});

test('expires observed coverage after a client version or trust inventory change without source edits', () => {
    const inputs = { files: [] };
    const client = { version: 'one', activation: { active: true, hooks: [{ hash: 'definition', trust: 'trusted' }] } };
    const identity = coveragePolicyIdentity(inputs, client);

    assert.notEqual(identity, coveragePolicyIdentity(inputs, { ...client, version: 'two' }));
    assert.notEqual(identity, coveragePolicyIdentity(inputs, { ...client, activation: { active: false } }));
    assert.equal(identity, coveragePolicyIdentity(inputs, structuredClone(client)));
});

test('combines only current worktree/client observations while keeping child coverage distinct', async (context) => {
    const root = await fixture(context);
    const client = { version: 'synthetic-test-client', activation: { active: true } };
    await handleEvent(event(root, 'SessionStart', { source: 'startup' }));
    await handleEvent(event(root, 'SessionStart', { source: 'resume', session_id: 'session-b' }));
    await handleEvent(event(root, 'SessionStart', { source: 'compact', agent_id: 'child-a' }));

    const current = await observedClientCoverage(root, client);

    assert.deepEqual(current.sessions, ['session-a', 'session-b']);
    assert.equal(current.coverage['SessionStart:startup'], 1);
    assert.equal(current.coverage['SessionStart:resume'], 1);
    assert.ok(current.unobserved.includes('SessionStart:compact'));
    assert.equal(current.coverage['SessionStart:compact:subagent'], 1);

    const upgraded = await observedClientCoverage(root, { ...client, version: 'upgraded-client' });

    assert.deepEqual(upgraded.sessions, []);
    assert.deepEqual(upgraded.coverage, {});
});

test('decodes hook inventory paths across multibyte stdout chunk boundaries', async (context) => {
    const directory = await fixture(context);
    const root = join(directory, 'проект');
    const bin = join(directory, 'bin');
    mkdirSync(root);
    mkdirSync(bin);
    const inventory = { data: [{ cwd: root, hooks: [], errors: [] }] };
    const response = JSON.stringify({ id: 2, result: inventory });
    writeFileSync(join(bin, 'codex'), `#!/usr/bin/env node
import readline from 'node:readline';
const input = readline.createInterface({ input: process.stdin });

input.on('line', (line) => {
    const message = JSON.parse(line);

    if (message.id === 1) process.stdout.write(JSON.stringify({ id: 1, result: {} }) + '\\n');

    if (message.id === 2) {
        const bytes = Buffer.from(${JSON.stringify(response)} + '\\n');
        const split = bytes.indexOf(Buffer.from('п')) + 1;

        process.stdout.write(bytes.subarray(0, split));

        setTimeout(() => process.stdout.write(bytes.subarray(split)), 20);
    }
});
`);
    chmodSync(join(bin, 'codex'), 0o755);
    const previousPath = process.env.PATH;
    process.env.PATH = `${bin}:${previousPath}`;

    try {
        assert.deepEqual(await inspectHooks(root), inventory);
    } finally {
        process.env.PATH = previousPath;
    }
});
