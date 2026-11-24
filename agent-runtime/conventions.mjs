import { readAdapter } from './adapter.mjs';
import { stateDirectory } from './state.mjs';
import { relative } from 'node:path';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { commandEnvironment } from './environment.mjs';

const executeFile = promisify(execFile);

export async function checkConventions(root, task) {
    const scopePath = relative(root, join(stateDirectory(root), 'scope-' + randomUUID() + '.json'));
    const absoluteScopePath = join(root, scopePath);
    const adapter = readAdapter(root);
    const argv = adapter.checks?.conventions;

    if (!argv) throw new Error('Configure the conventions command before running it.');

    writeFileSync(absoluteScopePath, JSON.stringify({ paths: task.paths, baseline: task.conventionBaseline ?? [] }), { mode: 0o600, flag: 'wx' });
    let stdout;
    let exitCode = 0;

    try {
        try {
            const output = await executeFile(argv[0], argv.slice(1), {
                cwd: root, env: { ...commandEnvironment(), [adapter.environment?.scopeVariable ?? 'DEVKIT_AGENT_SCOPE_FILE']: scopePath }, maxBuffer: 4 * 1024 * 1024, timeout: 20000,
            });
            stdout = output.stdout;
        } catch (error) {
            if (typeof error.code !== 'number' || typeof error.stdout !== 'string') throw new Error('Convention check is unavailable.');

            stdout = error.stdout;
            exitCode = error.code;
        }

        const report = JSON.parse(stdout);

        if (!Array.isArray(report.diagnostics) || !Array.isArray(report.errors)) throw new Error('Convention check returned an invalid report.');

        return { exitCode, signal: null, errorCode: null, diagnostics: report.diagnostics, preexisting: report.preexisting ?? [], errors: report.errors };
    } finally {
        rmSync(absoluteScopePath, { force: true });
    }
}
