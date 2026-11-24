import { execFile, spawn } from 'node:child_process';
import { parseArgs, promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { coveragePolicyIdentity, repositoryRoot, snapshot } from './repository.mjs';
import { readState, stateDirectory } from './state.mjs';

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
    return new Promise((resolve, reject) => {
        const child = spawn('codex', ['app-server', '--stdio'], { cwd: root, stdio: ['pipe', 'pipe', 'ignore'] });
        let buffered = '';
        let settled = false;
        const timeout = setTimeout(() => finish(new Error('Local Codex hook inventory timed out.')), timeoutMs);

        function finish(error, result) {
            if (settled) return;

            settled = true;
            clearTimeout(timeout);
            child.stdin.end();
            child.kill();
            if (error) reject(error);
            else resolve(result);
        }

        child.on('error', () => finish(new Error('Local Codex hook inventory is unavailable.')));
        child.on('close', () => {
            if (!settled) finish(new Error('Local Codex closed before returning its hook inventory.'));
        });
        child.stdin.on('error', () => finish(new Error('Local Codex hook inventory connection closed.')));
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            buffered += chunk;

            if (Buffer.byteLength(buffered) > 4 * 1024 * 1024) {
                finish(new Error('Local Codex hook inventory exceeded its limit.'));
                return;
            }

            let newline;

            while ((newline = buffered.indexOf('\n')) !== -1) {
                const line = buffered.slice(0, newline);
                buffered = buffered.slice(newline + 1);
                let message;

                try { message = JSON.parse(line); } catch { finish(new Error('Local Codex returned an invalid protocol message.')); return; }

                if (message.id === 1) {
                    if (message.error) { finish(new Error('Local Codex initialization failed.')); return; }

                    child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
                    child.stdin.write(JSON.stringify({ id: 2, method: 'hooks/list', params: { cwds: [root] } }) + '\n');
                }

                if (message.id === 2) {
                    if (message.error) finish(new Error('Installed Codex does not provide a usable hooks/list operation.'));
                    else finish(null, message.result);
                }
            }
        });

        child.stdin.write(JSON.stringify({ id: 1, method: 'initialize', params: {
            clientInfo: { name: 'devkit-hook-rehearsal', version: '1.0.0' }, capabilities: { experimentalApi: true },
        } }) + '\n');
    });
}

export function activationStatus(root, inventory) {
    const entries = inventory.data ?? [];
    const entry = entries.find((candidate) => candidate.cwd === root);
    const hooks = entry?.hooks.filter((hook) => hook.source === 'project' && hook.sourcePath === root + '/.codex/hooks.json') ?? [];
    const missing = requiredEvents.filter((eventName) => !hooks.some((hook) => hook.eventName === eventName
        && hook.enabled && ['trusted', 'managed'].includes(hook.trustStatus)));

    return {
        active: missing.length === 0 && !entry?.errors.length,
        missing, errors: (entry?.errors ?? []).map((error) => error.message),
        hooks: hooks.map((hook) => ({ event: hook.eventName, enabled: hook.enabled, trust: hook.trustStatus, hash: hook.currentHash })),
    };
}

export async function installedClientIdentity(root, timeoutMs = 15000) {
    const [version, inventory] = await Promise.all([
        executeFile('codex', ['--version'], { timeout: Math.min(5000, timeoutMs) }), inspectHooks(root, timeoutMs),
    ]);

    return { version: version.stdout.trim(), activation: activationStatus(root, inventory) };
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
