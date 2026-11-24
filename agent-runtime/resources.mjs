import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, rmSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAdapter, containedPath, assertPrerequisites } from './adapter.mjs';

export const toolkitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const hash = (content) => createHash('sha256').update(content).digest('hex');
const manifestName = 'devkit.resources.json';

export function distributionFiles(directory = toolkitRoot) {
    const files = [];

    for (const item of readdirSync(directory, { withFileTypes: true })) {
        if (['.git', '.idea', '.vscode', '.agents', '.github', '.devkit', 'tests', 'node_modules', 'vendor', 'tmp'].includes(item.name)) continue;
        if (['composer.lock', 'package-lock.json', '.deptrac.cache', manifestName, 'auth.json'].includes(item.name) || /^\.env(?:\.|$)/u.test(item.name) || item.name.endsWith('.log')) continue;

        const path = join(directory, item.name);

        if (item.isSymbolicLink()) throw new Error('Distribution resources must not be symlinks.');
        if (item.isDirectory()) files.push(...distributionFiles(path));
        else files.push(path);
    }

    return files.sort();
}

export function toolkitIdentity() {
    const inputs = distributionFiles().filter((path) => !/^openspec\/changes\/.+\/(?:tasks|evidence)\.md$/u.test(relative(toolkitRoot, path).replaceAll('\\\\', '/')));

    return hash(JSON.stringify(inputs.map((path) => [relative(toolkitRoot, path), hash(readFileSync(path))])));
}

function toolkitSelection(root) {
    const installedPath = containedPath(root, 'vendor/composer/installed.json');

    if (existsSync(installedPath)) {
        const metadata = JSON.parse(readFileSync(installedPath, 'utf8'));
        const packages = Array.isArray(metadata) ? metadata : metadata.packages;
        const selected = packages?.find((item) => item.name === 'svchk-dev/ai-devkit');

        if (selected && selected['install-path']
            && realpathSync(resolve(dirname(installedPath), selected['install-path'])) === realpathSync(toolkitRoot)) {
            return { version: selected.version, reference: selected.source?.reference ?? selected.dist?.reference ?? null };
        }
    }

    return { version: 'development', reference: null };
}

export function resourcePlan(root, adapter) {
    const prefix = adapter.resourceDirectory;
    const output = new Map();

    for (const name of readdirSync(join(toolkitRoot, 'standards')).sort()) {
        output.set(prefix + '/standards/' + name, readFileSync(join(toolkitRoot, 'standards', name), 'utf8'));
    }

    const pint = JSON.parse(readFileSync(join(toolkitRoot, 'config/pint.json'), 'utf8'));
    const local = adapter.quality?.pint ?? {};
    output.set(prefix + '/pint.json', JSON.stringify({ ...pint, ...local, rules: { ...pint.rules, ...local.rules } }, null, 4) + '\n');
    const configurationDirectory = resolve(root, prefix);
    const portable = (path) => relative(configurationDirectory, path).replaceAll('\\', '/');
    const quote = (value) => JSON.stringify(value);
    const lines = [
        'includes:',
        '    - ' + quote(portable(join(toolkitRoot, 'config/phpstan.neon'))),
        '    - ' + quote(portable(join(toolkitRoot, 'config/conventions.neon'))),
        'parameters:',
        '    devkitNamespace: ' + quote(adapter.namespace),
        '    devkitAreaLayout: ' + (adapter.architecture.mode === 'areas'),
        '    tmpDir: state/phpstan',
        '    paths:',
        ...adapter.sourceRoots.map((name) => '        - ' + quote(portable(containedPath(root, name)))),
    ];
    const phpstan = adapter.quality?.phpstan ?? {};

    if (phpstan.level !== undefined) lines.push('    level: ' + phpstan.level);

    for (const setting of ['bootstrapFiles', 'excludePaths']) {
        if (!phpstan[setting]?.length) continue;

        lines.push('    ' + setting + ':', ...phpstan[setting].map((name) => '        - ' + quote(portable(containedPath(root, name)))));
    }

    output.set(prefix + '/phpstan.neon', lines.join('\n') + '\n');
    output.set(prefix + '/.gitignore', 'state/\ntmp/\n');
    output.set(prefix + '/instructions.md', '# AI Devkit\n\n'
        + 'AI Devkit is a separate versioned development package, svchk-dev/ai-devkit.\n'
        + 'Read [shared standards](standards/index.md), [rule ownership](standards/rule-ownership.md) and local rules.\n'
        + 'Before recording a rule, explain whether its owner is AI Devkit, an optional profile or this project.\n'
        + 'Change reusable rules in the authorized toolkit source repository; if unavailable, prepare an upstream proposal.\n'
        + 'Keep business rules and explicit exceptions local. Do not silently accumulate shared defaults locally.\n'
        + 'Never edit vendor files or managed snapshots. Adopt shared changes through a selected version and explicit refresh.\n'
        + 'Architecture mode: ' + adapter.architecture.mode + '.\n');

    if (adapter.profiles.includes('codex')) {
        for (const name of ['hooks.json', 'project_reviewer.toml']) {
            output.set(prefix + '/codex/' + name, readFileSync(join(toolkitRoot, 'adapters/codex', name), 'utf8'));
        }
    }

    for (const name of output.keys()) containedPath(root, name);

    return output;
}

function readManifest(root) {
    const path = containedPath(root, manifestName);

    if (!existsSync(path)) return null;
    if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error('The ownership manifest must be a regular file.');

    const manifest = JSON.parse(readFileSync(path, 'utf8'));

    if (manifest.schemaVersion !== 1 || manifest.owner !== 'svchk-dev/ai-devkit' || !manifest.files || Array.isArray(manifest.files)) {
        throw new Error('Invalid resource ownership manifest.');
    }

    containedPath(root, manifest.resourceDirectory);

    for (const [name, digest] of Object.entries(manifest.files)) {
        containedPath(root, name);

        if (!name.startsWith(manifest.resourceDirectory + '/') || !/^[a-f0-9]{64}$/u.test(digest)) throw new Error('Invalid managed resource entry.');
    }

    return manifest;
}

function verifyTargets(root, previous, files) {
    const paths = new Set([...Object.keys(previous?.files ?? {}), ...files.keys()]);

    for (const name of paths) {
        const path = containedPath(root, name);
        const expected = previous?.files[name];

        if (existsSync(path)) {
            if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error('Managed target must be a regular file: ' + name);
            if (!expected || hash(readFileSync(path)) !== expected) throw new Error('Conflicting ownership or local edits: ' + name);
        } else if (expected) throw new Error('Managed target was removed locally: ' + name);
    }

    return paths;
}

function applyFiles(root, adapter, files, paths, manifest) {
    const staging = containedPath(root, adapter.resourceDirectory + '/tmp/resources-' + randomUUID());
    mkdirSync(staging, { recursive: true, mode: 0o700 });
    const backups = new Map();

    try {
        const staged = new Map();

        for (const [name, content] of files) {
            const path = join(staging, String(staged.size));
            writeFileSync(path, content, { flag: 'wx' });
            staged.set(name, path);
        }
        for (const name of [...paths, manifestName]) {
            const target = containedPath(root, name);
            backups.set(name, existsSync(target) ? readFileSync(target) : null);
        }

        try {
            for (const name of paths) {
                const target = containedPath(root, name);

                if (files.has(name)) {
                    mkdirSync(dirname(target), { recursive: true });
                    renameSync(staged.get(name), target);
                } else rmSync(target);
            }

            if (manifest) {
                const stagedManifest = join(staging, 'manifest.json');
                writeFileSync(stagedManifest, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
                renameSync(stagedManifest, containedPath(root, manifestName));
            } else rmSync(containedPath(root, manifestName));
        } catch (error) {
            const failures = [];

            for (const [name, content] of backups) {
                try {
                    const target = containedPath(root, name);

                    if (content === null) rmSync(target, { force: true });
                    else writeFileSync(target, content);
                } catch (failure) { failures.push(name + ': ' + failure.message); }
            }

            if (failures.length) throw new Error('Resource update failed; manual recovery required: ' + failures.join('; '), { cause: error });

            throw error;
        }
    } finally { rmSync(staging, { recursive: true, force: true }); }
}

export function synchronize(root, { remove = false, check = false } = {}) {
    const adapter = readAdapter(root);

    if (!remove) assertPrerequisites(root, adapter);

    const previous = readManifest(root);
    const files = remove ? new Map() : resourcePlan(root, adapter);
    const paths = verifyTargets(root, previous, files);
    const manifest = {
        schemaVersion: 1, owner: 'svchk-dev/ai-devkit', sourceIdentity: toolkitIdentity(),
        resourceDirectory: adapter.resourceDirectory,
        selection: toolkitSelection(root),
        adapterIdentity: hash(readFileSync(containedPath(root, 'devkit.json'))),
        files: Object.fromEntries([...files].map(([name, content]) => [name, hash(content)])),
    };
    const current = !remove && previous && JSON.stringify(previous) === JSON.stringify(manifest);

    if (check) {
        if (!current) throw new Error('Managed toolkit resources are stale; run devkit sync.');

        return { changed: false, files: files.size, sourceIdentity: manifest.sourceIdentity };
    }
    if (current || (remove && !previous)) return { changed: false, files: files.size, sourceIdentity: manifest.sourceIdentity };

    applyFiles(root, adapter, files, paths, remove ? null : manifest);

    return { changed: true, files: files.size, sourceIdentity: manifest.sourceIdentity };
}
