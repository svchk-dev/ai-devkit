import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { dispatchEvent, handleEvent } from '../../agent-runtime/dispatcher.mjs';
import { registerTask } from '../../agent-runtime/tasks.mjs';
import { activeTask, readState } from '../../agent-runtime/state.mjs';
import { event, fixture } from './support.mjs';

function unavailableClient(context, root) {
    const directory = join(root, 'tmp', 'bin');
    const marker = join(root, 'tmp', 'client-inventory-called');
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'codex'), `#!/usr/bin/env node
require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'called');
process.exit(1);
`);
    chmodSync(join(directory, 'codex'), 0o755);
    const previousPath = process.env.PATH;
    process.env.PATH = directory + ':' + previousPath;
    context.after(() => { process.env.PATH = previousPath; });

    return marker;
}

test('ordinary tools return before repository discovery, client inventory or scanning', async () => {
    for (const hook_event_name of ['PreToolUse', 'PostToolUse']) {
        for (const tool of [
            { tool_name: 'Bash', tool_input: { command: 'git status --short' } },
            { tool_name: 'exec_command', tool_input: { cmd: 'rg --files src' } },
            { tool_name: 'Bash', tool_input: { command: 'make agent-check ARGS=--check-docs' } },
            { tool_name: 'Bash', tool_input: { command: 'printf "Example: > README.md"' } },
            { tool_name: 'read_file', tool_input: { path: 'src/Example.php' } },
        ]) {
            assert.deepEqual(await handleEvent({
                hook_event_name, cwd: '/nonexistent/devkit-hook-read-probe', session_id: 'read-only', ...tool,
            }), {});
        }
    }
});

test('edit preflight supplies guidance without client inventory or a repository snapshot', async (context) => {
    const root = await fixture(context, {
        '.ai/rules/src.md': 'Use project source guidance.\n',
        '.devkit/standards/coding.md': 'Use the shared coding standards.\n',
    });
    symlinkSync('/etc/hosts', join(root, 'unsupported-input.php'));
    const marker = unavailableClient(context, root);

    const result = await handleEvent(event(root, 'PreToolUse', {
        tool_name: 'apply_patch', tool_input: { command: '*** Add File: ' + join(root, 'src', 'Example.php') },
    }));

    assert.match(result.hookSpecificOutput.additionalContext, /AGENTS\.md/u);
    assert.match(result.hookSpecificOutput.additionalContext, /\.ai\/rules\/src\.md/u);
    assert.match(result.hookSpecificOutput.additionalContext, /standards\/coding\.md/u);
    assert.equal(existsSync(marker), false);
});

test('write bookkeeping defers PHP checks and uses cached advisory identity', async (context) => {
    const root = await fixture(context, {
        Makefile: 'agent-conventions:\n\t@touch tmp/conventions-called\n\t@exit 99\n',
    });
    await dispatchEvent(root, event(root, 'SessionStart', { source: 'startup' }), {
        version: 'synthetic-test-client', activation: { active: true },
    });
    await registerTask(root, 'session-a', { id: 'task-a', mode: 'change', profile: 'runtime', paths: ['src'] });
    const marker = unavailableClient(context, root);
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'Example.php'), '<?php enum Choice { case Invalid; }\n');

    assert.deepEqual(await handleEvent(event(root, 'PostToolUse', { tool_name: 'apply_patch' })), {});

    assert.equal(existsSync(marker), false);
    assert.equal(existsSync(join(root, 'tmp', 'conventions-called')), false);
    assert.equal(activeTask(readState(root, 'session-a')).conventionsDirty, true);
    assert.deepEqual(activeTask(readState(root, 'session-a')).receipts, {});
});
