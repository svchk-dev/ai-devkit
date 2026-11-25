import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { adapterName, containedPath } from '../../agent-runtime/adapter.mjs';
import { packageReference, synchronize, toolkitSelection } from '../../agent-runtime/resources.mjs';

const packageName = 'svchk-dev/ai-devkit';
const repository = 'https://github.com/svchk-dev/ai-devkit.git';
const marketplace = 'svchk-dev';
const pluginId = 'ai-devkit@svchk-dev';

function verifyProject(root) {
    if (adapterName(root) !== '.devkit') {
        throw new Error('Run vendor/bin/devkit.mjs sync to prepare the project .devkit first.');
    }

    const manifest = JSON.parse(readFileSync(containedPath(root, 'composer.json'), 'utf8'));
    const lock = JSON.parse(readFileSync(containedPath(root, 'composer.lock'), 'utf8'));
    const locked = lock['packages-dev']?.find((entry) => entry.name === packageName);
    const installed = toolkitSelection(root);

    if (!Object.hasOwn(manifest['require-dev'] ?? {}, packageName) || !locked?.version || !packageReference(locked)
        || locked.version !== installed.version || packageReference(locked) !== installed.reference) {
        throw new Error('Install AI Devkit directly from the project Composer development lock before adding Codex.');
    }

    synchronize(root, { check: true });

    return locked;
}

function canonicalLocation(path) {
    if (existsSync(path)) return realpathSync(path);

    return join(canonicalLocation(dirname(path)), basename(path));
}

function checkoutRoot(path) {
    let directory = path;

    while (true) {
        const marker = join(directory, '.git');
        const entry = lstatSync(marker, { throwIfNoEntry: false });

        if (entry && (!entry.isDirectory() || readdirSync(marker).length > 0)) return directory;

        const parent = dirname(directory);

        if (parent === directory) return null;

        directory = parent;
    }
}

function includesPath(parent, target) {
    const path = relative(parent, target);

    return !isAbsolute(path) && path !== '..' && !path.startsWith('..' + sep);
}

function clientLocations(root) {
    const projectRoot = realpathSync(root);
    const checkout = checkoutRoot(projectRoot);

    if (checkout && checkout !== projectRoot) throw new Error('Run add-to-codex from the Git repository root.');

    const temporaryDirectory = realpathSync(tmpdir());
    const clientDirectory = canonicalLocation(resolve(process.env.CODEX_HOME || join(homedir(), '.codex')));
    const catalogDirectory = canonicalLocation(join(clientDirectory, 'ai-devkit', 'catalogs'));

    if (includesPath(projectRoot, clientDirectory)) throw new Error('CODEX_HOME must be outside the project checkout.');
    if (!includesPath(clientDirectory, catalogDirectory) || includesPath(projectRoot, catalogDirectory)) {
        throw new Error('The AI Devkit catalog directory must stay inside the Codex profile and outside the project checkout.');
    }
    if (includesPath(projectRoot, temporaryDirectory) || checkoutRoot(temporaryDirectory)) {
        throw new Error('The temporary directory must be outside any Git checkout. Set TMPDIR to a separate directory.');
    }

    return { temporaryDirectory, clientDirectory, catalogDirectory };
}

function run(command, args, cwd, env) {
    try {
        return execFileSync(command, args, { cwd, env, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
        if (error.code === 'ENOENT') throw new Error('Install ' + command + ' and make it available on PATH.');

        const details = error.stderr?.trim();

        throw new Error(command + ' ' + args.slice(0, command === 'codex' ? 3 : 1).join(' ') + ' failed.'
            + (details ? '\n' + details : ' ' + error.message), { cause: error });
    }
}

function installCatalog(locked, cwd, catalogDirectory, codex) {
    const version = /^v?(\d+\.\d+\.\d+)$/u.exec(locked.version)?.[1];
    const reference = locked.source?.reference;

    if (!version || locked.source?.url !== repository || !/^[a-f0-9]{40}$/u.test(reference ?? '')) {
        throw new Error('A published AI Devkit release is required to register a new Codex marketplace.');
    }

    const tag = 'v' + version;
    const checkout = join(cwd, 'release');

    run('git', ['clone', '--quiet', '--depth', '1', '--branch', tag, repository, checkout], cwd);

    if (run('git', ['rev-parse', 'HEAD'], checkout).trim() !== reference) {
        throw new Error('The AI Devkit tag does not match the project Composer lock.');
    }

    mkdirSync(catalogDirectory, { recursive: true, mode: 0o700 });

    const catalog = mkdtempSync(join(catalogDirectory, tag + '-'));

    try {
        run('git', ['checkout-index', '--all', '--prefix=' + catalog.split(sep).join('/') + '/'], checkout);
    } catch (error) {
        rmSync(catalog, { recursive: true, force: true });

        throw error;
    }

    codex('plugin', 'marketplace', 'add', catalog);
}

export function addToCodex(root) {
    const locked = verifyProject(root);
    const { temporaryDirectory, clientDirectory, catalogDirectory } = clientLocations(root);
    const clientEnvironment = { ...process.env };

    if (process.env.CODEX_HOME) {
        mkdirSync(clientDirectory, { recursive: true, mode: 0o700 });
        clientEnvironment.CODEX_HOME = clientDirectory;
    }

    const directory = mkdtempSync(join(temporaryDirectory, 'ai-devkit-codex-'));
    const codex = (...args) => JSON.parse(run('codex', [...args, '--json'], directory, clientEnvironment));
    const pluginEnabled = () => codex('plugin', 'list', '--marketplace', marketplace)
        .installed.some((plugin) => plugin.pluginId === pluginId && plugin.installed && plugin.enabled);
    let installed = false;

    try {
        if (!pluginEnabled()) {
            const catalogs = codex('plugin', 'marketplace', 'list').marketplaces;

            if (!catalogs.some((catalog) => catalog.name === marketplace)) {
                installCatalog(locked, directory, catalogDirectory, codex);
            }

            codex('plugin', 'add', pluginId);

            if (!pluginEnabled()) throw new Error('Enable ' + pluginId + ' in Codex, then rerun add-to-codex.');

            installed = true;
        }
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }

    verifyProject(root);

    const { changed } = synchronize(root, { enableCodex: true });

    return {
        plugin: pluginId,
        pluginStatus: installed ? 'installed' : 'reused',
        projectUpdated: changed,
        next: 'Trust the project and review the plugin hooks in Codex, then start a new session.',
    };
}
