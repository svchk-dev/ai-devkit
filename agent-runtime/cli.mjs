import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { completionRequirements } from './completion.mjs';
import { prepareReview } from './review.mjs';
import { runCheck } from './runner.mjs';
import { activeTask, readState, recoverState } from './state.mjs';
import { repositoryRoot } from './repository.mjs';
import { amendScope, registerTask, requestCheckpoint } from './tasks.mjs';

async function main() {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: {
            session: { type: 'string' }, id: { type: 'string' }, mode: { type: 'string' },
            profile: { type: 'string' }, path: { type: 'string', multiple: true }, change: { type: 'string' },
            baseline: { type: 'string' }, outcome: { type: 'string' }, reason: { type: 'string' }, check: { type: 'string' },
        },
    });
    const root = await repositoryRoot(process.cwd());

    if (!values.session) throw new Error('Supply --session using the current runtime session id from hook context.');

    let result;

    switch (positionals[0]) {
        case 'start':
            result = await registerTask(root, values.session, { ...values, paths: values.path });
            break;
        case 'status': {
            const state = readState(root, values.session);
            result = { sessionId: state.sessionId, turnId: state.turnId, task: activeTask(state), coverage: state.coverage };
            break;
        }
        case 'checkpoint': {
            if (values.outcome === 'complete') {
                let state = readState(root, values.session);
                const task = activeTask(state);

                if (task?.conventionsDirty) {
                    await runCheck(root, values.session, 'conventions');
                    await runCheck(root, values.session, 'format');
                    state = readState(root, values.session);
                }

                const missing = await completionRequirements(root, state, activeTask(state));

                if (missing.length) throw new Error(missing.join(' '));
            }

            result = await requestCheckpoint(root, values.session, values.outcome, values.reason);
            break;
        }
        case 'scope':
            result = await amendScope(root, values.session, { ...values, paths: values.path });
            break;
        case 'recover':
            result = await recoverState(root, values.session);
            break;
        case 'review':
            result = await prepareReview(root, values.session);
            break;
        case 'check': {
            const abortController = new AbortController();
            const interrupt = () => abortController.abort();
            process.once('SIGINT', interrupt);
            process.once('SIGTERM', interrupt);

            try {
                result = await runCheck(root, values.session, values.check, abortController.signal);
                if (result.outcome !== 'passed') process.exitCode = 1;
            } finally {
                process.removeListener('SIGINT', interrupt);
                process.removeListener('SIGTERM', interrupt);
            }

            break;
        }
        default:
            throw new Error('Use start, scope, status, checkpoint, review, check or recover.');
    }

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        await main();
    } catch (error) {
        process.stderr.write(`Devkit agent workflow: ${error.message}\n`);
        process.exitCode = 1;
    }
}
