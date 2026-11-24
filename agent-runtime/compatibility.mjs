import { execFile } from 'node:child_process';
import { parseArgs, promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { coveragePolicyIdentity, repositoryRoot, snapshot } from './repository.mjs';
import { readState, stateDirectory } from './state.mjs';
import { projectIsTrusted, requestCodex } from '../adapters/codex/native-client.mjs';
import { selectsCodexPlugin } from './adapter.mjs';

const executeFile = promisify(execFile);
const requiredEvents = ['sessionStart', 'userPromptSubmit', 'preToolUse', 'postToolUse', 'subagentStop', 'stop', 'interrupt'];
const expectedCoverage = [
    'SessionStart:startup', 'SessionStart:resume', 'SessionStart:compact',
    'PreToolUse:apply_patch', 'PostToolUse:apply_patch', 'PreToolUse:Bash', 'PostToolUse:Bash',
    'Stop', 'Interrupt',
];

export async function observedClientCoverage(root, client) {
    const policy = coveragePolicyIdentity(await snapshot(root), client);
    const directory = stateDirectory(root);
    const coverage = {};
    const sessions = [];

    for (const filename of existsSync(directory) ? readdirSync(directory) : []) {
        if (!/^[a-f0-9]{64}\.json$/u.test(filename)) continue;

        let candidate;

        try { candidate = JSON.parse(readFileSync(join(directory, filename), 'utf8')); } catch { continue; }

        if (candidate.root !== root || candidate.coveragePolicyIdentity !== policy || typeof candidate.sessionId !== 'string') continue;

        const state = readState(root, candidate.sessionId);

        if (state.coveragePolicyIdentity !== policy) continue;

        sessions.push(state.sessionId);

        for (const [name, count] of Object.entries(state.coverage)) {
            if (Number.isSafeInteger(count) && count > 0) coverage[name] = (coverage[name] ?? 0) + count;
        }
    }

    const unobserved = expectedCoverage.filter((name) => !coverage[name]);

    if (!coverage.SubagentStop && !coverage['ReviewerCompletion:collaboration']) {
        unobserved.push('Reviewer completion (SubagentStop or observed collaboration status)');
    }

    return { policy, coverage, sessions: sessions.sort(), unobserved };
}

export async function inspectHooks(root, timeoutMs = 15000) {
    return requestCodex(root, 'hooks/list', { cwds: [root] }, timeoutMs);
}

export function activationStatus(root, inventory) {
    const entries = inventory.data ?? [];
    const entry = entries.find((candidate) => candidate.cwd === root);
    const hooks = entry?.hooks.filter((hook) => (hook.source === 'project' && hook.sourcePath === root + '/.codex/hooks.json')
        || (hook.source === 'plugin' && hook.pluginId?.split('@')[0] === 'ai-devkit'
            && hook.command?.includes('/adapters/codex/plugin.mjs'))) ?? [];
    const activeHooks = hooks.filter((hook) => hook.enabled && ['trusted', 'managed'].includes(hook.trustStatus));
    const missing = requiredEvents.filter((eventName) => !activeHooks.some((hook) => hook.eventName === eventName));
    const errors = (entry?.errors ?? []).map((error) => error.message);

    if (new Set(activeHooks.map((hook) => hook.source)).size > 1) {
        errors.push('AI Devkit is active in both project and client hooks. Select one source.');
    }

    return {
        active: missing.length === 0 && errors.length === 0,
        source: activeHooks[0]?.source ?? null,
        missing, errors,
        hooks: hooks.map((hook) => ({ event: hook.eventName, enabled: hook.enabled, trust: hook.trustStatus, hash: hook.currentHash })),
    };
}

export async function installedClientIdentity(root, timeoutMs = 15000) {
    const [version, inventory] = await Promise.all([
        executeFile('codex', ['--version'], { timeout: Math.min(5000, timeoutMs) }), inspectHooks(root, timeoutMs),
    ]);

    const activation = activationStatus(root, inventory);

    if (activation.active && activation.source === 'plugin') {
        try {
            if (!selectsCodexPlugin(root)) activation.errors.push('Select the codex profile in .devkit to enable this project.');
            else if (!(await projectIsTrusted(root, timeoutMs))) activation.errors.push('Trust this project in Codex before enabling AI Devkit.');
        } catch {
            activation.errors.push('Cannot verify the project selection and trust for AI Devkit.');
        }

        activation.active = activation.errors.length === 0;
    }

    return { version: version.stdout.trim(), activation };
}

async function main() {
    const { values } = parseArgs({ options: { inventory: { type: 'boolean' }, session: { type: 'string' } } });
    const root = await repositoryRoot(process.cwd());
    const client = await installedClientIdentity(root);
    const { version, activation } = client;
    const sessionId = values.session ?? process.env.DEVKIT_AGENT_SESSION_ID;
    if (sessionId) readState(root, sessionId);

    const { coverage, unobserved, sessions } = await observedClientCoverage(root, client);
    const outcome = activation.active && sessionId && !unobserved.length ? 'passed' : 'incomplete';

    process.stdout.write(JSON.stringify({ client: version, outcome, activation, observedEvents: coverage, observedSessions: sessions,
        unobserved, limitations: ['Event counts alone do not establish nested-tool, delayed-command or end-to-end behavior; record those actual rehearsals separately.'],
    }, null, 2) + '\n');

    if (!values.inventory && outcome !== 'passed') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { await main(); } catch {
        process.stderr.write('Devkit hook compatibility is incomplete: local client inventory or observed session coverage is unavailable.\n');
        process.exitCode = 1;
    }
}
