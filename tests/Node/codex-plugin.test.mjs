import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { toolkitIdentity } from '../../agent-runtime/resources.mjs';
import { activationStatus } from '../../agent-runtime/compatibility.mjs';
import { event, fixture } from './support.mjs';

const plugin = fileURLToPath(new URL('../../adapters/codex/plugin.mjs', import.meta.url));
const compatibility = fileURLToPath(new URL('../../agent-runtime/compatibility.mjs', import.meta.url));
const packageName = 'svchk-dev/ai-devkit';
const reference = 'a'.repeat(40);
const hookNames = ['sessionStart', 'userPromptSubmit', 'preToolUse', 'postToolUse', 'subagentStop', 'stop', 'interrupt'];

function pluginHooks() {
    return hookNames.map((eventName) => ({
        eventName, source: 'plugin', pluginId: 'ai-devkit@fixture', command: 'node /client/adapters/codex/plugin.mjs',
        enabled: true, trustStatus: 'trusted', currentHash: 'definition',
    }));
}

function write(root, path, contents) {
    writeFileSync(join(root, path), JSON.stringify(contents));
}

async function project(context, version, userTrust = 'trusted') {
    const root = await fixture(context);
    const installed = join(root, 'vendor', packageName);
    rmSync(join(root, 'devkit.json'));
    mkdirSync(join(installed, 'agent-runtime'), { recursive: true });
    mkdirSync(join(root, 'vendor/composer'), { recursive: true });
    mkdirSync(join(root, 'tmp/bin'), { recursive: true });
    const source = version === '0.3.0' ? { source: { reference } } : { dist: { shasum: reference } };
    write(root, 'composer.json', { 'require-dev': { [packageName]: version } });
    write(root, 'composer.lock', { 'packages-dev': [{ name: packageName, version, ...source }] });
    write(root, 'vendor/composer/installed.json', { packages: [{ name: packageName, version, ...source, 'install-path': '../' + packageName }] });
    write(installed, 'composer.json', { name: packageName });
    writeFileSync(join(installed, 'agent-runtime/dispatcher.mjs'), `import {writeFileSync} from 'node:fs';
export function handleEvent(event) {
    writeFileSync(event.cwd + '/tmp/dispatched', 'yes');
    return {systemMessage:${JSON.stringify(version)}};
}
`);
    write(root, '.devkit', { schemaVersion: 1, profiles: ['codex'], toolkit: { version, reference, sourceIdentity: toolkitIdentity(installed) } });
    const client = join(root, 'tmp/bin/codex');
    writeFileSync(client, `#!/usr/bin/env node
const {createInterface}=require('node:readline');
const {writeFileSync}=require('node:fs');
if (process.argv.includes('--version')) { console.log('fixture Codex'); process.exit(0); }
createInterface({input:process.stdin}).on('line', line=>{
    const request=JSON.parse(line);
    if(request.id===1) console.log(JSON.stringify({id:1,result:{}}));
    if(request.method==='hooks/list') {
        const result={data:[{cwd:request.params.cwds[0],hooks:${JSON.stringify(pluginHooks())}}]};
        console.log(JSON.stringify({id:request.id,result}));
    }
    if(request.method==='config/read') {
        writeFileSync('tmp/trust-queried','yes');
        const projects=(trust_level)=>({[request.params.cwd]:{trust_level}});
        const result={config:{projects:projects('trusted')},layers:[{name:{type:'user'},config:{projects:projects(${JSON.stringify(userTrust)})}}]};
        console.log(JSON.stringify({id:request.id,result}));
    }
});
`);
    chmodSync(client, 0o755);

    return { root, installed };
}

function invoke(root, argumentsList = [plugin]) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, argumentsList, {
            cwd: root, env: { ...process.env, PATH: join(root, 'tmp/bin') + ':' + process.env.PATH }, stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
        child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
        child.once('error', reject);
        child.once('close', (code) => resolve({ code, stdout, stderr }));
        child.stdin.end(argumentsList[0] === plugin ? JSON.stringify(event(root, 'SessionStart', { source: 'startup' })) : undefined);
    });
}

test('one shared client hook dispatches to the exact installed version of each opted-in project', async (context) => {
    for (const version of ['0.3.0', '0.4.1']) {
        const { root } = await project(context, version);

        const result = await invoke(root);

        assert.equal(result.code, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), { systemMessage: version });
        assert.equal(existsSync(join(root, '.codex')), false);
    }
});

test('the selected package owns validation of its adapter settings', async (context) => {
    const { root } = await project(context, '0.4.1');
    const adapter = JSON.parse(readFileSync(join(root, '.devkit'), 'utf8'));
    write(root, '.devkit', { ...adapter, futureSetting: true });

    const result = await invoke(root);

    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { systemMessage: '0.4.1' });
});

test('a project-layer trust claim and modified toolkit code cannot dispatch', async (context) => {
    const untrusted = await project(context, '0.3.0', 'untrusted');
    const stale = await project(context, '0.3.0');
    writeFileSync(join(stale.installed, 'changed.txt'), 'unexpected content');

    const refused = await invoke(untrusted.root);
    const rejected = await invoke(stale.root);

    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /trusted in Codex/u);
    assert.equal(rejected.code, 1);
    assert.match(rejected.stderr, /selection changed/u);

    for (const { root } of [untrusted, stale]) assert.equal(existsSync(join(root, 'tmp/dispatched')), false);
});

test('the shared hook skips projects without the Codex profile before querying client settings', async (context) => {
    const { root } = await project(context, '0.3.0');
    write(root, '.devkit', { schemaVersion: 1, profiles: ['laravel-package'] });

    const result = await invoke(root);

    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {});
    assert.equal(existsSync(join(root, 'tmp/trust-queried')), false);
    assert.equal(existsSync(join(root, 'tmp/dispatched')), false);
});

test('compatibility accepts the trusted package plugin and rejects simultaneous project activation', () => {
    const root = '/tmp/project';
    const hooks = pluginHooks();
    const inventory = { data: [{ cwd: root, hooks, errors: [] }] };

    assert.equal(activationStatus(root, inventory).active, true);

    hooks.push({ ...hooks[0], source: 'project', sourcePath: root + '/.codex/hooks.json' });

    assert.equal(activationStatus(root, inventory).active, false);
    assert.match(activationStatus(root, inventory).errors[0], /both project and client hooks/u);
});

test('compatibility requires project opt-in and trust even with all client hooks trusted', async (context) => {
    const trusted = await project(context, '0.3.0');
    const untrusted = await project(context, '0.3.0', 'untrusted');
    const optedOut = await project(context, '0.3.0');
    write(optedOut.root, '.devkit', { schemaVersion: 1, profiles: ['laravel-package'] });

    const [active, refused, skipped] = await Promise.all([trusted, untrusted, optedOut].map(async ({ root }) => {
        const result = await invoke(root, [compatibility, '--inventory']);

        assert.equal(result.code, 0, result.stderr);

        return JSON.parse(result.stdout).activation;
    }));

    assert.equal(active.active, true);
    assert.deepEqual(refused.hooks, active.hooks);
    assert.equal(refused.active, false);
    assert.match(refused.errors[0], /Trust this project/u);
    assert.equal(skipped.active, false);
    assert.match(skipped.errors[0], /Select the codex profile/u);
});
