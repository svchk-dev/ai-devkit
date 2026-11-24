import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import { fixture } from './support.mjs';
import { distributionFiles, toolkitRoot } from '../../agent-runtime/resources.mjs';

function packageCopy(target) {
    for (const source of distributionFiles()) {
        const destination = join(target, relative(toolkitRoot, source));
        mkdirSync(dirname(destination), { recursive: true });
        copyFileSync(source, destination);
    }
}

async function installedFixture(context, linked) {
    const root = await fixture(context, { '.gitignore': '/tmp/\n/vendor/\n/linked-source/\n' });
    const target = join(root, linked ? 'linked-source' : 'vendor/devkit');
    packageCopy(target);

    if (linked) {
        mkdirSync(join(root, 'vendor'), { recursive: true });
        symlinkSync(target, join(root, 'vendor/devkit'));
    }

    const adapter = JSON.parse(readFileSync(join(root, 'devkit.json'), 'utf8'));
    adapter.checks.docs = [process.execPath, '-e', "require('node:fs').mkdirSync('tmp',{recursive:true});require('node:fs').writeFileSync('tmp/running','1');setTimeout(()=>{},400)"];
    writeFileSync(join(root, 'devkit.json'), JSON.stringify(adapter));
    const module = (name) => import(pathToFileURL(join(root, 'vendor/devkit/agent-runtime/' + name)).href);
    const { registerTask } = await module('tasks.mjs');
    await registerTask(root, 'installed-session', { id: 'installed-toolkit', mode: 'change', profile: 'docs', paths: ['README.md'] });

    return { root, target, module };
}

for (const linked of [false, true]) {
    test('installed toolkit rejects changed-and-restored inputs' + (linked ? ' through a declared development link' : ''), async (context) => {
        const { root, target, module } = await installedFixture(context, linked);
        const { runCheck } = await module('runner.mjs');
        const running = runCheck(root, 'installed-session', 'docs', undefined, { quiet: true });

        for (let attempt = 0; attempt < 100 && !existsSync(join(root, 'tmp/running')); attempt++) await setTimeout(10);

        assert.equal(existsSync(join(root, 'tmp/running')), true, 'The actual check started.');
        const path = join(target, 'standards/coding.md');
        const original = readFileSync(path);
        writeFileSync(path, 'Temporarily changed installed rules\n');
        await setTimeout(30);
        writeFileSync(path, original);
        const receipt = await running;

        assert.equal(receipt.outcome, 'unstable');
        assert.ok(receipt.observation.changedPaths.includes('@devkit/standards/coding.md'));
    });
}

test('installed source changes invalidate saved check and review identities', async (context) => {
    const { root, target, module } = await installedFixture(context, false);
    const { runCheck, currentReceipts } = await module('runner.mjs');
    const { readState, activeTask } = await module('state.mjs');
    const { reviewInputs } = await module('review.mjs');
    const receipt = await runCheck(root, 'installed-session', 'docs', undefined, { quiet: true });
    const state = readState(root, 'installed-session');
    const task = activeTask(state);
    const before = await reviewInputs(root, task);

    assert.equal(receipt.outcome, 'passed');
    assert.ok((await currentReceipts(root, state, task)).docs);
    writeFileSync(join(target, 'standards/coding.md'), 'A new immutable installed version\n');

    assert.equal((await currentReceipts(root, state, task)).docs, null);
    const after = await reviewInputs(root, task);
    assert.notEqual(after.hash, before.hash);
    assert.notEqual(after.ruleIdentity, before.ruleIdentity);
});
