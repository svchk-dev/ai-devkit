#!/usr/bin/env node
import { checkArchitecture } from '../agent-runtime/architecture.mjs';
import { synchronize } from '../agent-runtime/resources.mjs';
import { readAdapter, assertPrerequisites } from '../agent-runtime/adapter.mjs';
import { runQuality } from '../agent-runtime/quality.mjs';
import { addToCodex } from '../adapters/codex/setup.mjs';

try {
    const [operation, ...options] = process.argv.slice(2);
    const root = process.cwd();
    let result;

    switch (operation) {
        case 'sync':
            if (options.some((option) => option !== '--check')) throw new Error('Use sync [--check].');
            result = synchronize(root, { check: options.includes('--check') });
            break;
        case 'add-to-codex':
            if (options.length) throw new Error('Use add-to-codex without additional arguments.');
            result = addToCodex(root);
            break;
        case 'remove':
            if (options.length) throw new Error('Use remove without additional arguments.');
            result = synchronize(root, { remove: true });
            break;
        case 'architecture':
            if (options.length) throw new Error('Use architecture without additional arguments.');
            process.exitCode = checkArchitecture(root);
            break;
        case 'doctor': {
            const adapter = readAdapter(root);
            assertPrerequisites(root, adapter);
            result = { profiles: adapter.profiles, architecture: adapter.architecture.mode, sourceRoots: adapter.sourceRoots };
            break;
        }
        case 'format':
        case 'analyse':
            process.exitCode = runQuality(root, operation, options[0] === '--' ? options.slice(1) : options);
            break;
        default:
            throw new Error('Use devkit sync [--check], add-to-codex, remove, doctor, architecture, format or analyse.');
    }

    if (result !== undefined) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} catch (error) {
    process.stderr.write('Devkit: ' + error.message + '\n');
    process.exitCode = 1;
}
