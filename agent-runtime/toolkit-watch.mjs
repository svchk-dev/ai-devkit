import { watch } from 'node:fs';
import { toolkitRoot } from './resources.mjs';

export function watchToolkit() {
    const changes = new Set();
    const errors = [];
    const excluded = new Set(['.git', '.idea', '.vscode', '.agents', '.github', '.devkit', 'tests', 'node_modules', 'vendor', 'tmp']);
    const watcher = watch(toolkitRoot, { recursive: true }, (_kind, filename) => {
        if (!filename) {
            errors.push('Toolkit watcher lost a filename.');

            return;
        }

        const path = filename.toString().replaceAll('\\', '/');

        if (excluded.has(path.split('/')[0]) || ['composer.lock', 'package-lock.json', '.deptrac.cache', 'devkit.resources.json'].includes(path)) return;

        if (/^openspec\/changes\/.+\/(?:tasks|evidence)\.md$/u.test(path)) return;

        changes.add('@devkit/' + path);
    });
    watcher.on('error', () => errors.push('Toolkit watcher lost coverage.'));

    return {
        outcome: () => ({ generation: changes.size, changedPaths: [...changes].sort().slice(0, 20), complete: !errors.length }),
        close: () => watcher.close(),
    };
}
