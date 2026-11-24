import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileIdentity, repositoryPath, repositoryRoot, snapshot } from '../../agent-runtime/repository.mjs';

const executeFile = promisify(execFile);

test('fingerprints tracked and new files while preserving ignored outputs and paths with spaces', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit hook inputs '));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    writeFileSync(join(root, '.gitignore'), '/tmp/\n');
    writeFileSync(join(root, 'source.php'), '<?php return 1;\n');
    await executeFile('git', ['-C', root, 'add', '.']);

    const before = await snapshot(root);
    writeFileSync(join(root, 'new.php'), '<?php return 2;\n');
    const added = await snapshot(root);
    mkdirSync(join(root, 'tmp'));
    writeFileSync(join(root, 'tmp', 'receipt.json'), '{}');

    assert.notEqual(added.hash, before.hash);
    assert.equal((await snapshot(root)).hash, added.hash);
    assert.equal(await repositoryRoot(root), root);
    assert.throws(() => repositoryPath(root, '../foreign'));

    rmSync(join(root, 'source.php'));

    assert.notEqual((await snapshot(root)).hash, added.hash);
});

test('rejects symlink inputs that leave the repository', (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-link-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    symlinkSync('/etc/hosts', join(root, 'foreign.php'));

    assert.throws(() => fileIdentity(root, 'foreign.php'), /leaves the repository/u);
});
