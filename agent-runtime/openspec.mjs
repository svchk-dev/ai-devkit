import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { repositoryRoot } from './repository.mjs';
import { mutateState, withRepositoryLock } from './state.mjs';
import { consumeProposalGrant, proposalBlockReason } from './proposals.mjs';

function executeOpenSpec(root, argumentsList) {
    return new Promise((resolve, reject) => {
        const child = spawn('npx', ['--no-install', 'openspec', ...argumentsList], { cwd: root, stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code, signal) => resolve(signal ? 1 : code ?? 1));
    });
}

async function runOpenSpec(argumentsList, sessionId) {
    const root = await repositoryRoot(process.cwd());

    if (argumentsList[0] !== 'new' || argumentsList[1] !== 'change') return executeOpenSpec(root, argumentsList);

    const create = async (state) => {
        const reason = proposalBlockReason(root, state, argumentsList[2] ?? '');

        if (reason) throw new Error(reason);

        const code = await executeOpenSpec(root, argumentsList);

        if (state && code === 0) consumeProposalGrant(root, state, argumentsList[2]);

        return code;
    };

    return withRepositoryLock(root, 'openspec-creation', () => sessionId ? mutateState(root, sessionId, create) : create(null));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        process.exitCode = await runOpenSpec(process.argv.slice(2), process.env.DEVKIT_AGENT_SESSION_ID || process.env.CODEX_THREAD_ID);
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
