import assert from 'node:assert/strict';
import test from 'node:test';
import { commandEnvironment, environmentIdentity, ignoredInputs } from '../../agent-runtime/environment.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixture } from './support.mjs';

test('expires full-gate identity when the selected release baseline or candidate changes', async (context) => {
    const root = await fixture(context);
    const names = ['DEVKIT_RELEASE_BASELINE', 'DEVKIT_RELEASE_CANDIDATE'];
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    const installed = Promise.resolve({ php: 'fixture', packages: {} });

    try {
        process.env.DEVKIT_RELEASE_BASELINE = 'v0.17.0';
        process.env.DEVKIT_RELEASE_CANDIDATE = 'candidate-a';
        const original = await environmentIdentity(root, 'full', installed);

        process.env.DEVKIT_RELEASE_BASELINE = 'v0.16.0';
        assert.notEqual(await environmentIdentity(root, 'full', installed), original);

        process.env.DEVKIT_RELEASE_BASELINE = 'v0.17.0';
        process.env.DEVKIT_RELEASE_CANDIDATE = 'candidate-b';
        assert.notEqual(await environmentIdentity(root, 'full', installed), original);
    } finally {
        for (const name of names) {
            if (previous[name] === undefined) delete process.env[name];
            else process.env[name] = previous[name];
        }
    }
});


test('declared JSON commands work when the runner is launched by nested Make', async (context) => {
    const root = await fixture(context);
    writeFileSync(join(root, 'Makefile'), 'identity:\n\t@node -e \'console.log(JSON.stringify({actual:true}))\'\n');
    const previous = process.env.MAKELEVEL;
    process.env.MAKELEVEL = '3';

    try {
        const output = execFileSync('make', ['--silent', 'identity'], { cwd: root, encoding: 'utf8', env: commandEnvironment() });

        assert.deepEqual(JSON.parse(output), { actual: true });
    } finally {
        if (previous === undefined) delete process.env.MAKELEVEL;
        else process.env.MAKELEVEL = previous;
    }
});


test('custom declared checks bind tools and ignored local inputs unless explicitly scoped out', async (context) => {
    const root = await fixture(context, { '.env': 'LOCAL_MODE=one\n' });
    const path = join(root, 'devkit.json');
    const adapter = JSON.parse(readFileSync(path, 'utf8'));
    delete adapter.environment.checks;
    adapter.checks.consumers = [process.execPath, '-e', 'process.exit(0)'];
    writeFileSync(path, JSON.stringify(adapter));
    const tools = Promise.resolve({ php: '8.5.11', packages: { fixture: '1.0' } });
    const identity = await environmentIdentity(root, 'consumers', tools);

    assert.notEqual(await environmentIdentity(root, 'consumers', Promise.resolve({ php: '8.5.12', packages: { fixture: '2.0' } })), identity);
    assert.ok(ignoredInputs('consumers', root).includes('.env'));
    writeFileSync(join(root, '.env'), 'LOCAL_MODE=two\n');

    assert.notEqual(await environmentIdentity(root, 'consumers', tools), identity);
    adapter.environment.checks = ['full'];
    writeFileSync(path, JSON.stringify(adapter));
    const independent = await environmentIdentity(root, 'docs', tools);

    assert.deepEqual(ignoredInputs('docs', root), []);
    assert.equal(await environmentIdentity(root, 'docs', Promise.resolve({ php: 'different', packages: {} })), independent);
});
