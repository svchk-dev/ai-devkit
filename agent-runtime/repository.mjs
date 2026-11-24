import { toolkitIdentity } from './resources.mjs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);

export async function git(root, argumentsList, options = {}) {
    const { stdout } = await executeFile('git', ['-C', root, ...argumentsList], {
        encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 5000, ...options,
    });

    return stdout;
}

export async function repositoryRoot(cwd) {
    return realpathSync((await git(cwd, ['rev-parse', '--show-toplevel'])).trim());
}

export function digest(value) {
    return createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
}

export function repositoryPath(root, path) {
    if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\0')) {
        throw new Error('Expected a repository-relative path.');
    }

    const resolved = resolve(root, path);
    const local = relative(root, resolved);

    if (!local || local === '..' || local.startsWith(`..${sep}`)) {
        throw new Error('Path must remain inside the repository.');
    }

    return { absolute: resolved, relative: local.split(sep).join('/') };
}

export async function maintainedPaths(root) {
    return [...new Set((await git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])).split('\0').filter(Boolean))].sort();
}

export function fileIdentity(root, path) {
    const selected = repositoryPath(root, path);
    let stat;

    try {
        stat = lstatSync(selected.absolute);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;

        throw error;
    }

    if (!stat.isFile() && !stat.isSymbolicLink()) {
        throw new Error(`Unsupported maintained input: ${selected.relative}`);
    }

    const target = realpathSync(selected.absolute);

    if (target !== root && !target.startsWith(root + sep)) {
        throw new Error(`Maintained input leaves the repository: ${selected.relative}`);
    }

    return {
        path: selected.relative,
        target: relative(root, target).split(sep).join('/'),
        executable: Boolean(stat.mode & 0o111),
        hash: digest(readFileSync(target)),
    };
}

export async function snapshot(root, select = () => true) {
    const files = (await maintainedPaths(root)).filter(select).map((path) => [path, fileIdentity(root, path)]);

    return { hash: digest(files), files };
}

export function coveragePolicyIdentity(inputs, client) {
    return digest([process.version, toolkitIdentity(), client, inputs.files.filter(([path]) => path === '.devkit' || path === 'devkit.json' || path.startsWith('agent-runtime/') || path.startsWith('scripts/agent-hooks/')
        || path.startsWith('tooling/phpstan/') || path.startsWith('.codex/')
        || path === 'scripts/agent-conventions.php' || path === 'scripts/agent-tool-identity.php')]);
}
