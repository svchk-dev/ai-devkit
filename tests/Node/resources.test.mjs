import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, symlinkSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { synchronize } from '../../agent-runtime/resources.mjs';
import { readAdapter, containedPath } from '../../agent-runtime/adapter.mjs';

function fixture(configuration = {}) {
    const root = mkdtempSync(join(tmpdir(), 'devkit consumer '));
    writeFileSync(join(root, 'devkit.json'), JSON.stringify({ schemaVersion: 1, profiles: [], ...configuration }));

    return root;
}

test('preparation is repeatable, detects edits and removes only owned output', () => {
    const root = fixture();

    try {
        writeFileSync(join(root, 'AGENTS.md'), 'Local owner policy\n');
        assert.equal(synchronize(root).changed, true);
        const manifest = readFileSync(join(root, 'devkit.resources.json'), 'utf8');
        const pint = readFileSync(join(root, '.devkit/pint.json'), 'utf8');

        assert.equal(synchronize(root).changed, false);
        assert.equal(synchronize(root, { check: true }).changed, false);
        assert.equal(readFileSync(join(root, 'devkit.resources.json'), 'utf8'), manifest);
        writeFileSync(join(root, '.devkit/local-notes.md'), 'Local addition\n');
        writeFileSync(join(root, '.devkit/pint.json'), '{}\n');

        assert.throws(() => synchronize(root), /local edits/u);
        assert.throws(() => synchronize(root, { remove: true }), /local edits/u);
        assert.equal(readFileSync(join(root, 'devkit.resources.json'), 'utf8'), manifest);

        assert.match(readFileSync(join(root, '.devkit/standards/coding.md'), 'utf8'), /Production and test boundaries/u);
        writeFileSync(join(root, '.devkit/pint.json'), pint);
        synchronize(root, { remove: true });

        assert.equal(existsSync(join(root, 'devkit.resources.json')), false);
        assert.equal(existsSync(join(root, '.devkit/standards/coding.md')), false);
        assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), 'Local owner policy\n');
        assert.equal(readFileSync(join(root, '.devkit/local-notes.md'), 'utf8'), 'Local addition\n');
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test('foreign files and outside symlinks fail without taking ownership', () => {
    const root = fixture();
    const outside = fixture();

    try {
        mkdirSync(join(root, '.devkit'));
        writeFileSync(join(root, '.devkit/pint.json'), 'foreign');

        assert.throws(() => synchronize(root), /ownership/u);
        assert.equal(existsSync(join(root, 'devkit.resources.json')), false);
        assert.equal(readFileSync(join(root, '.devkit/pint.json'), 'utf8'), 'foreign');

        symlinkSync(outside, join(root, 'outside'));

        assert.throws(() => containedPath(root, 'outside/new-file'), /outside/u);
        assert.throws(() => containedPath(root, '../escape'), /inside/u);
        assert.throws(() => containedPath(root, '.git/config'), /Git/u);

        mkdirSync(join(root, '.git'));
        symlinkSync(join(root, '.git'), join(root, 'managed-git'));

        assert.throws(() => containedPath(root, 'managed-git/new-file'), /Git/u);

    } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
    }
});

test('profile prerequisites and explicit architecture overrides are checked', () => {
    const root = fixture({ profiles: ['filament'] });

    try {
        assert.throws(() => synchronize(root), /requires.*filament/u);
        writeFileSync(join(root, 'devkit.json'), JSON.stringify({ schemaVersion: 1, architecture: { mode: 'custom', rules: 'architecture.md', command: ['make', 'architecture'] } }));

        assert.throws(() => readAdapter(root), /existing local rules/u);

        writeFileSync(join(root, 'architecture.md'), 'Framework-native architecture\n');

        assert.equal(readAdapter(root).architecture.mode, 'custom');
        assert.equal(synchronize(root).changed, true);
        assert.equal(existsSync(join(root, 'app')), false);

        writeFileSync(join(root, 'devkit.json'), JSON.stringify({ schemaVersion: 1, namespace: 'Other\\Product', sourceRoots: ['lib domain'] }));

        assert.equal(readAdapter(root).sourceRoots[0], 'lib domain');
        assert.throws(() => synchronize(root, { check: true }), /stale/u);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test('failed resource relocation restores the previous usable managed set', () => {
    const root = fixture();

    try {
        synchronize(root);
        const manifest = readFileSync(join(root, 'devkit.resources.json'), 'utf8');
        const document = readFileSync(join(root, '.devkit/standards/coding.md'), 'utf8');
        writeFileSync(join(root, 'devkit.json'), JSON.stringify({ schemaVersion: 1, resourceDirectory: 'generated' }));
        mkdirSync(join(root, 'generated'));
        writeFileSync(join(root, 'generated/standards'), 'Foreign blocking file\n');

        assert.throws(() => synchronize(root), /EEXIST|ENOTDIR/u);
        assert.equal(readFileSync(join(root, 'devkit.resources.json'), 'utf8'), manifest);
        assert.equal(readFileSync(join(root, '.devkit/standards/coding.md'), 'utf8'), document);
        assert.equal(readFileSync(join(root, 'generated/standards'), 'utf8'), 'Foreign blocking file\n');
        assert.equal(existsSync(join(root, 'generated/pint.json')), false);
    } finally { rmSync(root, { recursive: true, force: true }); }
});


test('architecture composition roots use the consumer namespace and reject external classes', () => {
    const root = fixture({ namespace: 'Northwind\\Journal', architecture: { mode: 'areas', compositionRoots: ['Northwind\\Journal\\ProjectServiceProvider'] } });

    try {
        assert.deepEqual(readAdapter(root).architecture.compositionRoots, ['Northwind\\Journal\\ProjectServiceProvider']);
        writeFileSync(join(root, 'devkit.json'), JSON.stringify({ schemaVersion: 1, namespace: 'Northwind\\Journal', architecture: { mode: 'areas', compositionRoots: ['Other\\ProjectServiceProvider'] } }));

        assert.throws(() => readAdapter(root), /project classes/u);
    } finally { rmSync(root, { recursive: true, force: true }); }
});
