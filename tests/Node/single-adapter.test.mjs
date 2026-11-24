import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAdapter } from '../../agent-runtime/adapter.mjs';
import { selectsInput, isCodePath } from '../../agent-runtime/checks.mjs';
import { fileIdentity } from '../../agent-runtime/repository.mjs';
import { watchInputs } from '../../agent-runtime/watch.mjs';
import { projectContext } from '../../agent-runtime/context.mjs';
import { synchronize, toolkitRoot } from '../../agent-runtime/resources.mjs';

test('sync refreshes one adapter file while keeping project settings', () => {
    const root = mkdtempSync(join(tmpdir(), 'devkit single-file '));

    try {
        writeFileSync(join(root, 'composer.json'), '{}');
        mkdirSync(join(root, 'vendor/composer'), { recursive: true });
        const installed = join(root, 'vendor/composer/installed.json');
        const selection = (version) => JSON.stringify({ packages: [{
            name: 'svchk-dev/ai-devkit', version, 'install-path': toolkitRoot,
        }] });
        writeFileSync(installed, selection('0.2.0'));

        assert.throws(() => synchronize(root, { check: true }), /missing or.*stale/u);
        assert.equal(synchronize(root).changed, true);
        assert.deepEqual(readdirSync(root).sort(), ['.devkit', 'composer.json', 'vendor']);
        assert.equal(fileIdentity(root, '.devkit/instructions.md'), null);
        const path = join(root, '.devkit');
        const policy = JSON.parse(readFileSync(path, 'utf8'));

        assert.equal(policy.toolkit.version, '0.2.0');
        policy.namespace = 'Example\\Application';
        policy.profiles = ['codex'];
        policy.sourceRoots = ['lib'];
        writeFileSync(path, JSON.stringify(policy));
        writeFileSync(installed, selection('0.2.1'));

        assert.throws(() => synchronize(root, { check: true }), /stale/u);
        assert.equal(synchronize(root).changed, true);
        const refreshed = JSON.parse(readFileSync(path, 'utf8'));

        assert.equal(refreshed.toolkit.version, '0.2.1');
        assert.match(refreshed.toolkit.hooks, /adapters\/codex\/hooks\.json$/u);
        assert.equal(refreshed.namespace, 'Example\\Application');
        assert.deepEqual(readAdapter(root).sourceRoots, ['lib']);
        assert.equal(synchronize(root).changed, false);
        assert.equal(synchronize(root, { check: true }).changed, false);
        assert.match(projectContext(root, {}, { hook_event_name: 'SessionStart' }), /standards\/rule-ownership\.md/u);
        assert.throws(() => synchronize(root, { remove: true }), /project-owned/u);

        writeFileSync(path, JSON.stringify({ ...refreshed, quality: { phpstan: { level: 9 } } }));
        assert.throws(() => synchronize(root), /Move quality settings/u);
        writeFileSync(path, JSON.stringify(refreshed));
        writeFileSync(join(root, 'devkit.json'), '{"schemaVersion":1}');
        assert.throws(() => synchronize(root), /Both/u);
        assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), refreshed);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('sync rejects foreign .devkit directories and symlinks before writing', () => {
    const root = mkdtempSync(join(tmpdir(), 'devkit path conflict '));

    try {
        writeFileSync(join(root, 'composer.json'), '{}');
        const target = join(root, '.devkit');
        mkdirSync(target);

        assert.throws(() => synchronize(root), /regular .devkit file/u);
        rmSync(target, { recursive: true });
        symlinkSync(join(root, 'composer.json'), target);

        assert.throws(() => synchronize(root), /regular .devkit file/u);
        assert.equal(readFileSync(join(root, 'composer.json'), 'utf8'), '{}');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('single-file policy and OpenSpec images affect the applicable check receipts', () => {
    const root = mkdtempSync(join(tmpdir(), 'devkit check inputs '));

    try {
        writeFileSync(join(root, '.devkit'), JSON.stringify({ schemaVersion: 1, checks: { docs: ['true'] } }));

        assert.equal(isCodePath('.devkit'), true);
        assert.equal(selectsInput('docs', '.devkit', root), true);
        assert.equal(selectsInput('docs', 'openspec/changes/test/screenshots/current.png', root), true);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('verification observes a new adapter over tracked legacy snapshot paths', async () => {
    const root = mkdtempSync(join(tmpdir(), 'devkit indexed snapshot '));
    let watcher;

    try {
        const git = (...args) => execFileSync('git', args, { cwd: root });
        const path = join(root, '.devkit');

        git('init', '--quiet');
        mkdirSync(join(path, 'standards'), { recursive: true });
        writeFileSync(join(path, 'standards/index.md'), '# Legacy snapshot\n');
        git('add', '.devkit');
        rmSync(path, { recursive: true });
        writeFileSync(path, '{"schemaVersion":1}\n');

        watcher = await watchInputs(root, () => true);
        assert.equal((await watcher.outcome()).complete, true);

        writeFileSync(path, '{"schemaVersion":1,"namespace":"Example"}\n');
        await new Promise((resolve) => setTimeout(resolve, 30));

        const observed = await watcher.outcome();
        assert.equal(observed.complete, true);
        assert.ok(observed.changedPaths.includes('.devkit'));
    } finally {
        watcher?.close();
        rmSync(root, { recursive: true, force: true });
    }
});
