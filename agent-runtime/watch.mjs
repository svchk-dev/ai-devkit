import childProcess from 'node:child_process';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileIdentity, git, maintainedPaths } from './repository.mjs';

async function ignoredEventPaths(root, paths) {
    const stdout = await new Promise((resolve, reject) => {
        const child = childProcess.execFile('git', ['-C', root, 'check-ignore', '--stdin', '-z'], {
            encoding: 'utf8', timeout: 30000, maxBuffer: 64 * 1024 * 1024,
        }, (error, output) => {
            if (error && error.code !== 1) reject(error);
            else resolve(output);
        });

        child.stdin.on('error', reject);
        child.stdin.end(paths.join('\0') + '\0');
    });

    return new Set(stdout.split('\0').filter(Boolean));
}

function includeAncestors(paths) {
    const result = new Set(paths);

    for (const path of paths) {
        const segments = path.split('/');

        while (segments.length > 1) {
            segments.pop();
            result.add(segments.join('/'));
        }
    }

    return result;
}

async function untrackedDirectories(root) {
    let pending = (await git(root, ['ls-files', '--others', '--exclude-standard', '--directory', '-z']))
        .split('\0').filter((path) => path.endsWith('/')).map((path) => path.slice(0, -1));
    const directories = new Set();

    while (pending.length) {
        const ignored = await ignoredEventPaths(root, pending);
        const next = [];

        for (const directory of pending) {
            if (ignored.has(directory) || directories.has(directory)) continue;

            directories.add(directory);

            try {
                for (const entry of fs.readdirSync(join(root, directory), { withFileTypes: true })) {
                    if (entry.isDirectory()) next.push(directory + '/' + entry.name);
                }
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }

        pending = next;
    }

    return directories;
}

export async function watchInputs(root, select, requiredIgnoredInputs = []) {
    let paths = [];
    const targets = new Set();
    const events = new Set();
    const renamedPaths = new Set();
    const errors = [];
    const watchers = [];
    const watchedDirectories = new Set();

    function watchDirectory(directory) {
        if (watchedDirectories.has(directory)) return;

        const absolute = join(root, directory);

        try {
            // A migration can replace a tracked directory with a file. Its parent
            // still observes changes to that path and the removed descendants.
            if (!fs.statSync(absolute).isDirectory()) return;
        } catch (error) {
            if (!['ENOENT', 'ENOTDIR'].includes(error.code)) errors.push('Could not inspect a declared input directory.');
            return;
        }

        try {
            const watcher = fs.watch(absolute, { recursive: false }, (kind, filename) => {
                if (!filename) {
                    errors.push('Input watcher lost a filename.');
                    return;
                }

                const path = (directory === '.' ? filename.toString() : directory + '/' + filename).replaceAll('\\', '/');

                if (path.startsWith('.git/') || path === '.git') return;

                events.add(path);
                if (kind === 'rename') renamedPaths.add(path);
            });

            watcher.on('error', () => errors.push('Input watcher lost coverage.'));
            watchers.push(watcher);
            watchedDirectories.add(directory);
        } catch {
            errors.push('Input watcher could not cover a declared directory.');
        }
    }

    watchDirectory('.');

    try {
        const allPaths = await maintainedPaths(root);
        paths = allPaths.filter(select);

        for (const path of [...paths, ...requiredIgnoredInputs]) {
            const target = fileIdentity(root, path)?.target;

            if (target) targets.add(target);
        }

        const directories = includeAncestors([...allPaths, ...targets, ...requiredIgnoredInputs].map((path) => dirname(path)));

        for (const directory of directories) {
            if (directory !== '.') watchDirectory(directory);
        }

        for (const directory of await untrackedDirectories(root)) watchDirectory(directory);
    } catch (error) {
        for (const watcher of watchers) watcher.close();

        throw error;
    }

    const declaredEvents = includeAncestors([...paths, ...targets, ...requiredIgnoredInputs]);

    return {
        async outcome() {
            const relevantEvents = [];
            let observedCount = 0;

            while (observedCount < events.size) {
                const batch = [...events].slice(observedCount);
                observedCount += batch.length;
                let ignored;

                try {
                    ignored = await ignoredEventPaths(root, batch);
                } catch {
                    errors.push('Could not resolve input events.');
                    break;
                }

                for (const path of batch) {
                    if (declaredEvents.has(path) || (!ignored.has(path)
                        && (select(path) || renamedPaths.has(path) || !path.split('/').at(-1).includes('.')))) {
                        relevantEvents.push(path);
                    }
                }
            }

            return {
                generation: relevantEvents.length, changedPaths: relevantEvents.sort().slice(0, 20),
                complete: errors.length === 0, errors: [...errors],
            };
        },
        close() {
            for (const watcher of watchers) watcher.close();
        },
    };
}
