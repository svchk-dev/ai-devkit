import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { watchInputs } from '../../agent-runtime/watch.mjs';

const executeFile = promisify(execFile);

test('detects an input edit even when its original bytes are restored', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-watch-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    writeFileSync(join(root, 'source.php'), 'before');
    const watcher = await watchInputs(root, (path) => path.endsWith('.php'));
    context.after(() => watcher.close());

    writeFileSync(join(root, 'source.php'), 'during');
    await nextTurn();
    writeFileSync(join(root, 'source.php'), 'before');
    await nextTurn();
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.ok(observation.generation > 0);
});

test('reports unavailable watcher coverage without treating it as stable', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-watch-failure-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    context.mock.method(fs, 'watch', () => { throw Object.assign(new Error('watch overflow'), { code: 'ENOSPC' }); });

    const watcher = await watchInputs(root, () => true);
    const observation = await watcher.outcome();
    watcher.close();

    assert.equal(observation.complete, false);
    assert.equal(observation.errors.length, 1);
});

test('tracks declared symlink targets even when the target directory is ignored', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-target-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    writeFileSync(join(root, '.gitignore'), '/tmp/\n');
    mkdirSync(join(root, 'tmp'));
    writeFileSync(join(root, 'tmp', 'source.md'), 'before');
    symlinkSync('tmp/source.md', join(root, 'linked.md'));
    const watcher = await watchInputs(root, (path) => path.endsWith('.md'));
    context.after(() => watcher.close());

    writeFileSync(join(root, 'tmp', 'source.md'), 'during');
    await nextTurn();
    writeFileSync(join(root, 'tmp', 'source.md'), 'before');
    await nextTurn();
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.ok(observation.generation > 0);
});

test('resolves a large ignored installation batch without one Git process per event', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-volume-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    writeFileSync(join(root, '.gitignore'), '/tmp/\n');
    let emit;
    let ignoreCommands = 0;
    const execFile = childProcess.execFile;
    context.mock.method(childProcess, 'execFile', (...argumentsList) => {
        if (argumentsList[1].includes('check-ignore')) ignoreCommands++;

        return execFile(...argumentsList);
    });
    context.mock.method(fs, 'watch', (_root, _options, callback) => {
        emit = callback;

        return { on() {}, close() {} };
    });
    const watcher = await watchInputs(root, () => true);
    context.after(() => watcher.close());

    for (let index = 0; index < 5000; index++) {
        emit('change', `tmp/consumer ${index}/vendor/source.php`);
    }

    emit('change', 'new source\nwith newline.php');
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.equal(observation.generation, 1);
    assert.deepEqual(observation.changedPaths, ['new source\nwith newline.php']);
    assert.equal(ignoreCommands, 1);
});

test('detects restored ignored configuration even when it did not exist at startup', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-config-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    writeFileSync(join(root, '.gitignore'), '/.env\n');
    const watcher = await watchInputs(root, () => false, ['.env']);
    context.after(() => watcher.close());

    writeFileSync(join(root, '.env'), 'temporary configuration');
    await delay(25);
    rmSync(join(root, '.env'));
    await nextTurn();
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.deepEqual(observation.changedPaths, ['.env']);
});

test('includes input events delivered while an earlier ignore batch is resolving', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-late-event-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    let emit;
    let added = false;
    const execFile = childProcess.execFile;
    context.mock.method(childProcess, 'execFile', (...argumentsList) => {
        if (argumentsList[1].includes('check-ignore') && !added) {
            added = true;
            emit('change', 'late.php');
        }

        return execFile(...argumentsList);
    });
    context.mock.method(fs, 'watch', (_root, _options, callback) => {
        emit = callback;

        return { on() {}, close() {} };
    });
    const watcher = await watchInputs(root, () => true);
    context.after(() => watcher.close());

    emit('change', 'early.php');
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.deepEqual(observation.changedPaths, ['early.php', 'late.php']);
});

test('rejects incomplete ignore resolution and bounds changed-path diagnostics', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-ignore-failure-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    let emit;
    context.mock.method(fs, 'watch', (_root, _options, callback) => {
        emit = callback;

        return { on() {}, close() {} };
    });
    const watcher = await watchInputs(root, () => true);
    context.after(() => watcher.close());

    for (let index = 0; index < 25; index++) {
        emit('change', `source-${index}.php`);
    }

    const complete = await watcher.outcome();

    assert.equal(complete.generation, 25);
    assert.equal(complete.changedPaths.length, 20);

    rmSync(join(root, '.git'), { recursive: true });
    const incomplete = await watcher.outcome();

    assert.equal(incomplete.complete, false);
    assert.deepEqual(incomplete.errors, ['Could not resolve input events.']);
});

test('does not recursively watch ignored dependency output while observing maintained inputs', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-directories-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    writeFileSync(join(root, '.gitignore'), '/tmp/\n/scratch/vendor/\n');
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'source.php'), 'before');
    await executeFile('git', ['-C', root, 'add', '.']);
    mkdirSync(join(root, 'tmp', 'install', 'vendor'), { recursive: true });
    mkdirSync(join(root, 'scratch', 'vendor', 'package'), { recursive: true });
    const watch = fs.watch;
    const watched = [];
    context.mock.method(fs, 'watch', (directory, options, callback) => {
        watched.push({ path: relative(root, directory), recursive: options.recursive });

        return watch(directory, options, callback);
    });
    const watcher = await watchInputs(root, () => true);
    context.after(() => watcher.close());

    writeFileSync(join(root, 'tmp', 'install', 'vendor', 'generated.php'), 'ignored');
    writeFileSync(join(root, 'src', 'source.php'), 'during');
    await nextTurn();
    writeFileSync(join(root, 'src', 'source.php'), 'before');
    await nextTurn();
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.ok(observation.changedPaths.includes('src/source.php'));
    assert.ok(watched.every(({ recursive: enabled }) => enabled === false));
    assert.ok(watched.every(({ path }) => !path.startsWith('tmp') && !path.startsWith('scratch/vendor')));
});

test('observes transient new inputs inside an existing untracked empty directory', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-empty-directory-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    mkdirSync(join(root, 'spare', 'nested'), { recursive: true });
    const watcher = await watchInputs(root, (path) => path.endsWith('.php'));
    context.after(() => watcher.close());

    writeFileSync(join(root, 'spare', 'nested', 'new.php'), 'temporary input');
    await delay(25);
    rmSync(join(root, 'spare', 'nested', 'new.php'));
    await nextTurn();
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.ok(observation.changedPaths.includes('spare/nested/new.php'));
});

test('observes new selected inputs inside a directory containing only other maintained file types', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-new-type-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'source.php'), 'existing nonselected input');
    await executeFile('git', ['-C', root, 'add', '.']);
    const watcher = await watchInputs(root, (path) => path.endsWith('.md'));
    context.after(() => watcher.close());

    writeFileSync(join(root, 'src', 'new.md'), 'temporary selected input');
    await delay(25);
    rmSync(join(root, 'src', 'new.md'));
    await nextTurn();
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.ok(observation.changedPaths.includes('src/new.md'));
});

test('detects a maintained parent directory renamed away and restored', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-rename-directory-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'source.php'), 'before');
    const watcher = await watchInputs(root, (path) => path.endsWith('.php'));
    context.after(() => watcher.close());

    renameSync(join(root, 'src'), join(root, 'moved'));
    await nextTurn();
    renameSync(join(root, 'moved'), join(root, 'src'));
    await nextTurn();
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.ok(observation.changedPaths.includes('src'));
});

test('rejects a transient new directory with a dotted name before its child can be watched', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-transient-directory-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    const watcher = await watchInputs(root, (path) => path.endsWith('.php'));
    context.after(() => watcher.close());

    mkdirSync(join(root, 'transient.source'));
    writeFileSync(join(root, 'transient.source', 'new.php'), 'temporary input');
    rmSync(join(root, 'transient.source'), { recursive: true });
    await delay(25);
    const observation = await watcher.outcome();

    assert.equal(observation.complete, true);
    assert.ok(observation.changedPaths.includes('transient.source'));
});

test('ignores removed machine configuration without masking other transient directories', async (context) => {
    const root = mkdtempSync(join(tmpdir(), 'devkit-hook-machine-config-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);
    writeFileSync(join(root, '.gitignore'), '/.aws\n');
    const watcher = await watchInputs(root, () => true);
    context.after(() => watcher.close());

    mkdirSync(join(root, '.aws'));
    rmSync(join(root, '.aws'), { recursive: true });
    await delay(25);
    const ignored = await watcher.outcome();

    assert.equal(ignored.complete, true);
    assert.equal(ignored.generation, 0);

    mkdirSync(join(root, '.source'));
    rmSync(join(root, '.source'), { recursive: true });
    await delay(25);
    const changed = await watcher.outcome();

    assert.equal(changed.complete, true);
    assert.deepEqual(changed.changedPaths, ['.source']);
});
