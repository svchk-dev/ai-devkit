import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { digest, fileIdentity } from './repository.mjs';
import { toolkitIdentity } from './resources.mjs';
import { readAdapter } from './adapter.mjs';
import { installedClientIdentity, observedClientCoverage } from './compatibility.mjs';

const executeFile = promisify(execFile);
function usesProjectEnvironment(root, checkId) {
    const settings = readAdapter(root).environment ?? {};

    return settings.checks ? settings.checks.includes(checkId) : true;
}

export function commandEnvironment(sessionId, root) {
    const environment = { ...process.env };

    for (const name of ['MAKEFLAGS', 'MFLAGS', 'MAKEOVERRIDES', 'MAKELEVEL', 'ARGS']) delete environment[name];
    if (sessionId) {
        environment.DEVKIT_AGENT_SESSION_ID = sessionId;
        const variable = root ? readAdapter(root).environment?.sessionVariable : null;

        if (variable) environment[variable] = sessionId;
    }

    return environment;
}

export function ignoredInputs(checkId, root) {
    return usesProjectEnvironment(root, checkId) ? readAdapter(root).environment?.inputs ?? ['.env', 'bootstrap/cache/config.php'] : [];
}

export function releaseConfiguration(environment = process.env, root) {
    const settings = root ? readAdapter(root).environment ?? {} : {};

    return {
        baseline: environment[settings.baselineVariable ?? 'DEVKIT_RELEASE_BASELINE'] ?? null,
        candidate: environment[settings.candidateVariable ?? 'DEVKIT_RELEASE_CANDIDATE'] ?? null,
    };
}

export function receiptReleaseConfiguration(recorded, root) {
    const explicit = releaseConfiguration(process.env, root);

    if (recorded === undefined) return explicit;
    if (!recorded || Array.isArray(recorded) || typeof recorded !== 'object'
        || !['baseline', 'candidate'].every((key) => recorded[key] === null || typeof recorded[key] === 'string')) return null;

    return { baseline: explicit.baseline ?? recorded.baseline, candidate: explicit.candidate ?? recorded.candidate };
}

export async function environmentIdentity(root, checkId, phpIdentity, selectedRelease = releaseConfiguration(process.env, root)) {
    if (checkId === 'compatibility') {
        const client = await installedClientIdentity(root);
        const { policy, unobserved } = await observedClientCoverage(root, client);

        return digest([toolkitIdentity(), client, policy, unobserved]);
    }

    const settings = readAdapter(root).environment ?? {};
    const installed = usesProjectEnvironment(root, checkId) && settings.identityCommand ? await (phpIdentity ?? installedPhpIdentity(root)) : null;
    const local = ignoredInputs(checkId, root).map((path) => [path, fileIdentity(root, path)]);
    const release = checkId === 'full' ? [selectedRelease.baseline, selectedRelease.candidate] : null;

    return digest([process.version, installed, local, release, toolkitIdentity()]);
}

export async function installedPhpIdentity(root) {
    const argv = readAdapter(root).environment?.identityCommand;

    if (!argv) return null;

    const { stdout } = await executeFile(argv[0], argv.slice(1), { cwd: root, env: commandEnvironment(), timeout: 15000, maxBuffer: 1024 * 1024 });
    const identity = JSON.parse(stdout);

    if (typeof identity.php !== 'string' || !identity.packages || Array.isArray(identity.packages)) throw new Error('Installed PHP tool identity is unavailable.');

    return identity;
}
