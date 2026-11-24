import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { containedPath, selectsCodexPlugin } from '../../agent-runtime/adapter.mjs';
import { relevantEvent } from '../../agent-runtime/dispatcher.mjs';
import { readEvent } from '../../agent-runtime/protocol.mjs';
import { repositoryRoot } from '../../agent-runtime/repository.mjs';
import { packageReference, toolkitIdentity, toolkitSelection } from '../../agent-runtime/resources.mjs';
import { projectIsTrusted } from './native-client.mjs';

const packageName = 'svchk-dev/ai-devkit';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function selectedDispatcher(root) {
    const manifest = readJson(containedPath(root, 'composer.json'));
    const lock = readJson(containedPath(root, 'composer.lock'));
    const { toolkit } = readJson(containedPath(root, '.devkit'));
    const locked = lock['packages-dev']?.find((entry) => entry.name === packageName);
    const reference = packageReference(locked);

    if (!Object.hasOwn(manifest['require-dev'] ?? {}, packageName) || !reference || !locked?.version) {
        throw new Error('Select AI Devkit directly in Composer development dependencies and install its lock.');
    }

    const directory = realpathSync(containedPath(root, `vendor/${packageName}`));
    const installed = toolkitSelection(root, directory);

    if (installed.reference !== reference || installed.version !== locked.version
        || toolkit?.reference !== reference || toolkit?.version !== locked.version
        || toolkit?.sourceIdentity !== toolkitIdentity(directory)) {
        throw new Error('AI Devkit selection changed. Install the locked dependencies and run vendor/bin/devkit.mjs sync.');
    }

    return pathToFileURL(join(directory, 'agent-runtime/dispatcher.mjs')).href;
}

async function projectDirectory(event) {
    try {
        return await repositoryRoot(event.cwd);
    } catch {
        return null;
    }
}

export async function dispatchPluginEvent(event) {
    if (!relevantEvent(event)) return {};

    const root = await projectDirectory(event);

    if (!root || !selectsCodexPlugin(root)) return {};
    if (!(await projectIsTrusted(root))) {
        throw new Error('AI Devkit requires the current project to be explicitly trusted in Codex.');
    }

    const { handleEvent } = await import(selectedDispatcher(root));

    return handleEvent(event);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const event = await readEvent(process.stdin, AbortSignal.timeout(8000));
        const output = await dispatchPluginEvent(event);

        process.stdout.write(JSON.stringify(output) + '\n');
    } catch (error) {
        process.stderr.write(`AI Devkit Codex integration: ${error.message}\n`);
        process.stdout.write(JSON.stringify({ systemMessage: 'AI Devkit hook failed. Inspect its Codex diagnostics and verify the project with vendor/bin/devkit.mjs doctor.' }) + '\n');
        process.exitCode = 1;
    }
}
