import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { test } from 'node:test';
import { toolkitRoot } from '../../agent-runtime/resources.mjs';

const reference = 'a'.repeat(40);
const pluginId = 'ai-devkit@svchk-dev';
const cli = join(toolkitRoot, 'bin/devkit.mjs');

const commands = `#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const [executable, ...args] = process.argv.slice(1);
const name = basename(executable);
const client = process.env.CODEX_HOME;
const catalogFile = join(client, 'catalog.json');
const pluginFile = join(client, 'plugin.json');
const log = join(client, 'commands.jsonl');
const record = JSON.stringify({ name, args, cwd: process.cwd() });
const argumentsList = args.join(' ');

writeFileSync(log, record + '\\n', { flag: 'a' });

if (name === 'git' && args[0] === 'clone') {
    mkdirSync(args.at(-1));
} else if (name === 'git' && argumentsList === 'rev-parse HEAD') {
    console.log(process.env.FIXTURE_TAG_REFERENCE);
} else if (name === 'git' && args[0] === 'checkout-index') {
    const catalog = args.find((argument) => argument.startsWith('--prefix=')).slice(9);
    mkdirSync(join(catalog, '.agents/plugins'), { recursive: true });
    writeFileSync(join(catalog, '.agents/plugins/marketplace.json'), '{"name":"svchk-dev"}');
} else if (argumentsList === 'plugin list --marketplace svchk-dev --json') {
    const installed = existsSync(pluginFile) ? [JSON.parse(readFileSync(pluginFile, 'utf8'))] : [];
    console.log(JSON.stringify({ installed }));
} else if (argumentsList === 'plugin marketplace list --json') {
    const marketplaces = existsSync(catalogFile) ? [JSON.parse(readFileSync(catalogFile, 'utf8'))] : [];
    console.log(JSON.stringify({ marketplaces }));
} else if (args.slice(0, 3).join(' ') === 'plugin marketplace add' && args.length === 5) {
    if (!existsSync(join(args[3], '.agents/plugins/marketplace.json'))) process.exit(2);
    const catalog = { name: 'svchk-dev', root: args[3] };
    writeFileSync(catalogFile, JSON.stringify(catalog));
    console.log(JSON.stringify({ marketplaceName: catalog.name }));
} else if (argumentsList === 'plugin add ai-devkit@svchk-dev --json' && !process.env.FIXTURE_PLUGIN_FAILURE) {
    const plugin = { pluginId: 'ai-devkit@svchk-dev', enabled: true, installed: true };
    writeFileSync(pluginFile, JSON.stringify(plugin));
    console.log(JSON.stringify(plugin));
} else {
    console.error('Fixture command failed.');
    process.exit(2);
}
`;

function fixture(t) {
    const sandbox = mkdtempSync(join(tmpdir(), 'devkit setup '));
    const client = join(sandbox, 'client');
    const executables = join(sandbox, 'bin');

    t.after(() => rmSync(sandbox, { recursive: true, force: true }));
    mkdirSync(executables);
    writeFileSync(join(executables, 'codex'), commands, { mode: 0o700 });
    writeFileSync(join(executables, 'git'), commands, { mode: 0o700 });

    const env = {
        ...process.env,
        CODEX_HOME: client,
        FIXTURE_TAG_REFERENCE: reference,
        PATH: executables + delimiter + process.env.PATH,
    };

    return {
        client,
        log: () => readFileSync(join(client, 'commands.jsonl'), 'utf8').trim().split('\n').map(JSON.parse),
        project(name, version = 'v0.4.0') {
            const root = join(sandbox, name);
            const selection = { name: 'svchk-dev/ai-devkit', version, source: {
                url: 'https://github.com/svchk-dev/ai-devkit.git', reference,
            } };
            const run = (operation, overrides = {}) => spawnSync(process.execPath, [cli, ...operation.split(' ')], {
                cwd: root, env: { ...env, ...overrides }, encoding: 'utf8',
            });
            const adapter = join(root, '.devkit');

            mkdirSync(join(root, 'vendor/composer'), { recursive: true });
            writeFileSync(join(root, 'composer.json'), JSON.stringify({ 'require-dev': { [selection.name]: version } }));
            writeFileSync(join(root, 'composer.lock'), JSON.stringify({ 'packages-dev': [selection] }));
            writeFileSync(join(root, 'vendor/composer/installed.json'), JSON.stringify({
                packages: [{ ...selection, 'install-path': toolkitRoot }],
            }));
            writeFileSync(adapter, JSON.stringify({ schemaVersion: 1, namespace: 'Example\\Project', profiles: [] }));

            const sync = run('sync');

            assert.equal(sync.status, 0, sync.stderr);

            return { root, run, adapter: () => JSON.parse(readFileSync(adapter, 'utf8')) };
        },
    };
}

test('Codex setup installs one client plugin and opts in each project without repinning the client', (t) => {
    const setup = fixture(t);
    const first = setup.project('first');
    const previous = first.adapter();

    const installed = first.run('add-to-codex');

    assert.equal(installed.status, 0, installed.stderr);
    assert.deepEqual(JSON.parse(installed.stdout), {
        plugin: pluginId, pluginStatus: 'installed', projectUpdated: true,
        next: 'Trust the project and review the plugin hooks in Codex, then start a new session.',
    });
    const optedIn = first.adapter();

    assert.deepEqual(optedIn.profiles, ['codex']);
    assert.equal(optedIn.namespace, previous.namespace);
    assert.equal(optedIn.toolkit.version, previous.toolkit.version);
    assert.match(optedIn.toolkit.hooks, /plugin-hooks\.json$/u);
    assert.equal(first.run('sync --check').status, 0);
    assert.deepEqual(readdirSync(first.root).sort(), ['.devkit', 'composer.json', 'composer.lock', 'vendor']);
    assert.equal(JSON.parse(first.run('add-to-codex').stdout).projectUpdated, false);

    const second = setup.project('second', 'v0.3.0');
    const reused = second.run('add-to-codex');

    assert.equal(reused.status, 0, reused.stderr);
    assert.equal(JSON.parse(reused.stdout).pluginStatus, 'reused');
    assert.deepEqual(second.adapter().profiles, ['codex']);
    const calls = setup.log();

    assert.equal(calls.filter(({ args }) => args[0] === 'clone').length, 1);
    assert.ok(calls.some(({ args }) => args.includes('v0.4.0')));
    assert.equal(calls.filter(({ args }) => args.slice(0, 2).join(' ') === 'plugin add').length, 1);
    assert.ok(calls.every(({ cwd }) => cwd !== first.root && cwd !== second.root));
    const { root: catalog } = JSON.parse(readFileSync(join(setup.client, 'catalog.json'), 'utf8'));

    assert.deepEqual(readdirSync(catalog), ['.agents']);
});

test('a failed plugin installation preserves the adapter and retries with the registered catalog', (t) => {
    const setup = fixture(t);
    const project = setup.project('retry');
    const previous = project.adapter();

    const failed = project.run('add-to-codex', { FIXTURE_PLUGIN_FAILURE: '1' });

    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /codex plugin add/u);
    assert.deepEqual(project.adapter(), previous);

    const retried = project.run('add-to-codex');

    assert.equal(retried.status, 0, retried.stderr);
    assert.deepEqual(project.adapter().profiles, ['codex']);
    assert.equal(setup.log().filter(({ args }) => args[0] === 'clone').length, 1);
});

test('Codex setup rejects an unexpected release identity before registering a catalog', (t) => {
    const setup = fixture(t);
    const project = setup.project('mismatch');
    const previous = project.adapter();

    const failed = project.run('add-to-codex', { FIXTURE_TAG_REFERENCE: 'b'.repeat(40) });

    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /tag does not match/u);
    assert.deepEqual(project.adapter(), previous);
    assert.ok(setup.log().every(({ args }) => !args.includes('add')));
});

test('Codex setup keeps the user profile and subprocess working directory outside the project', (t) => {
    const setup = fixture(t);
    const project = setup.project('scope');
    const previous = project.adapter();

    const localClient = project.run('add-to-codex', { CODEX_HOME: join(project.root, '.codex') });
    const localTemporaryDirectory = project.run('add-to-codex', { TMPDIR: project.root });

    assert.equal(localClient.status, 1);
    assert.match(localClient.stderr, /CODEX_HOME must be outside/u);
    assert.equal(localTemporaryDirectory.status, 1);
    assert.match(localTemporaryDirectory.stderr, /temporary directory must be outside/u);

    mkdirSync(setup.client);
    symlinkSync(project.root, join(setup.client, 'ai-devkit'), 'dir');

    const redirectedCatalog = project.run('add-to-codex');

    assert.equal(redirectedCatalog.status, 1);
    assert.match(redirectedCatalog.stderr, /catalog directory must stay inside/u);

    mkdirSync(join(dirname(project.root), '.git'));

    const nestedProject = project.run('add-to-codex');

    assert.equal(nestedProject.status, 1);
    assert.match(nestedProject.stderr, /from the Git repository root/u);
    assert.deepEqual(project.adapter(), previous);
    assert.ok(!existsSync(join(setup.client, 'commands.jsonl')));
    assert.deepEqual(readdirSync(project.root).sort(), ['.devkit', 'composer.json', 'composer.lock', 'vendor']);
});
