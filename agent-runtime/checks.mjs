import { readAdapter } from './adapter.mjs';

export const checkCommands = Object.freeze({
    docs: ['make', ['check-docs']], format: ['make', ['format-check']],
    conventions: ['make', ['agent-conventions']], analyse: ['make', ['analyse']],
    full: ['make', ['check']], tooling: ['make', ['agent-test']],
    'php-rules': ['make', ['test']], compatibility: ['make', ['agent-rehearsal']],
});
export const objectiveRuleIdentifiers = ['devkit.dependencyName', 'devkit.eventJobName', 'devkit.enumCase', 'devkit.componentService'];
const defaults = { docs: ['docs'], php: ['full', 'docs', 'conventions', 'format'], runtime: ['full', 'docs', 'conventions', 'format'], tooling: ['docs', 'tooling', 'format', 'analyse', 'php-rules', 'compatibility', 'conventions'] };

export function configuredCommands(root) {
    return Object.fromEntries(Object.entries(readAdapter(root).checks ?? {}).map(([id, argv]) => [id, [argv[0], argv.slice(1)]]));
}

export function isMakeDefinition(path) {
    return path === 'Makefile' || /^make\/.+\.mk$/u.test(path);
}

function matchesCodePath(path, codePaths) {
    return codePaths.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

export function isCodePath(path, codePaths = []) {
    return /\.(?:php|mjs|js|ts|css|scss|vue|sh|mk)$/u.test(path) || isMakeDefinition(path)
        || /^(?:src|app|config|database|docker)(?:\/|$)/u.test(path)
        || matchesCodePath(path, codePaths)
        || ['compose.yaml', 'Dockerfile', 'package.json', 'package-lock.json', 'composer.json', 'composer.lock', '.devkit', 'devkit.json', '.codex/hooks.json'].includes(path);
}

export function requiredChecks(task, root) {
    const adapter = root ? readAdapter(root) : {};
    const selected = adapter.verificationProfiles ?? defaults;
    const codePaths = adapter.inputSets?.codePaths ?? [];

    if (!selected[task.profile]) throw new Error('Unknown verification profile.');
    if (task.profile === 'docs' && (task.containsCode || task.paths.some((path) => isCodePath(path, codePaths)
        || codePaths.some((prefix) => prefix.startsWith(path + '/'))))) {
        throw new Error('The documentation profile does not cover this code scope.');
    }
    if (!Array.isArray(selected[task.profile]) || selected[task.profile].some((id) => typeof id !== 'string')) throw new Error('Invalid verification profile.');

    return selected[task.profile];
}

export function selectsInput(checkId, path, root) {
    const adapter = root ? readAdapter(root) : {};
    const selected = root ? configuredCommands(root) : checkCommands;

    if (!selected[checkId]) throw new Error('Unknown check id.');
    if (/^(?:\.git|\.idea|\.vscode|tmp|vendor|node_modules|storage)(?:\/|$)/u.test(path)) return false;
    if (adapter.stateDirectory && (path === adapter.stateDirectory || path.startsWith(adapter.stateDirectory + '/'))) return false;
    if (/(?:^|\/)(?:auth\.json|\.env(?:\..*)?)$/u.test(path) && !path.endsWith('.env.example')) return false;
    if (isMakeDefinition(path) || path === '.devkit' || path === 'devkit.json' || path.startsWith('.ai/') || path.startsWith('.codex/') || path.startsWith('.agents/') || path.startsWith('agent-runtime/')) return true;
    if (path.startsWith((adapter.resourceDirectory ?? '.devkit') + '/') || ['AGENTS.md', '.gitignore', '.nvmrc'].includes(path)) return true;
    if (checkId === 'docs') {
        return /\.(?:md|yaml|yml)$/u.test(path) || path.startsWith('openspec/')
            || ['package.json', 'package-lock.json', 'scripts/check-docs.mjs', 'tooling/check-docs.mjs'].includes(path);
    }
    if ((adapter.inputSets?.implementationGuidance ?? ['standards/coding.md', 'standards/architecture.md', 'standards/laravel.md', 'standards/testing.md', 'standards/workflow.md']).includes(path)) return true;
    if (matchesCodePath(path, adapter.inputSets?.codePaths ?? [])) return true;
    if (path.endsWith('.md')) {
        const roots = [...(adapter.sourceRoots ?? ['src', 'app']), 'tests', 'config', 'database', 'resources', 'scripts', 'tooling'];

        return roots.some((prefix) => path.startsWith(prefix + '/')) || path.startsWith('openspec/specs/')
            || /^openspec\/changes\/(?:archive\/[^/]+|[^/]+)\/specs\//u.test(path);
    }
    if (/^openspec\/changes\/(?:archive\/[^/]+|[^/]+)\/screenshots\//u.test(path)) return false;

    return true;
}
