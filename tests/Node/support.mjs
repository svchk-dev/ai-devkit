import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { dispatchEvent } from '../../agent-runtime/dispatcher.mjs';

const executeFile = promisify(execFile);

export function handleEvent(event) {
    return dispatchEvent(event.cwd, event, { version: 'synthetic-test-client', activation: { active: true } });
}

export async function fixture(context, files = {}) {
    const root = mkdtempSync(join(tmpdir(), 'devkit hook workflow '));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    await executeFile('git', ['init', '--quiet', root]);

    for (const [path, content] of Object.entries({
        '.gitignore': '/tmp/\n', 'AGENTS.md': 'Read current project rules.\n',
        'README.md': '# Fixture\n',
        'devkit.json': JSON.stringify({ schemaVersion: 1, profiles: ['openspec'],
            references: ['docs/coding-standards.md', 'docs/development.md', '.ai/rules/index.md', '.ai/rules/general.md'],
            specializedReferences: [{ path: 'src', references: ['.ai/rules/src.md'] }, { path: 'src/Admin', references: ['docs/admin-interface.md'] }],
            inputSets: { implementationGuidance: ['docs/coding-standards.md', 'docs/development.md', 'docs/ui-style.md'] },
            checks: { docs: ['make', 'check-docs'], format: ['make', 'format-check'], conventions: ['make', 'agent-conventions'],
                full: ['make', 'check'], analyse: ['make', 'analyse'], tooling: ['make', 'agent-test'], 'php-rules': ['make', 'test'], compatibility: ['make', 'agent-rehearsal'] },
            environment: { checks: ['format', 'conventions', 'analyse', 'full', 'php-rules'], identityCommand: ['make', '--silent', '--no-print-directory', 'agent-identity'] } }),
        'openspec/config.yaml': 'schema: spec-driven\n', 'Makefile': 'check-docs:\n\t@node -e "process.exit(0)"\n', ...files,
    })) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), content);
    }

    await executeFile('git', ['-C', root, 'add', '.']);
    await executeFile('git', ['-C', root, '-c', 'user.name=Hook fixture', '-c', 'user.email=fixture@example.invalid',
        'commit', '--quiet', '-m', 'Initialize disposable hook fixture']);

    return root;
}

export function event(root, hookEventName, options = {}) {
    return { cwd: root, session_id: 'session-a', turn_id: 'turn-a', hook_event_name: hookEventName, ...options };
}
