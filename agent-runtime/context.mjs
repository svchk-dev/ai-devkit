import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from './resources.mjs';
import { digest } from './repository.mjs';
import { readAdapter, containedPath } from './adapter.mjs';

function specificationReferences(root, directory) {
    const path = containedPath(root, directory);

    if (!existsSync(path)) return [];

    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
        ? specificationReferences(root, directory + '/' + entry.name)
        : entry.name.endsWith('.md') ? [directory + '/' + entry.name] : []);
}

export function projectContext(root, state, event, task) {
    const adapter = readAdapter(root);
    const references = ['AGENTS.md', ...(adapter.references ?? []), ...(adapter.reviewer?.references ?? [])];
    const standards = ['index.md', 'rule-ownership.md'];

    if (task && task.profile !== 'docs') standards.push('coding.md');
    if (adapter.resourceDirectory) references.push(...standards.map((name) => adapter.resourceDirectory + '/standards/' + name));
    if (adapter.architecture.mode === 'custom') references.push(adapter.architecture.rules);
    if (task?.change && adapter.profiles.includes('openspec')) {
        for (const name of ['proposal.md', 'design.md', 'tasks.md']) references.push('openspec/changes/' + task.change + '/' + name);

        const specs = specificationReferences(root, 'openspec/changes/' + task.change + '/specs');
        references.push(...specs);
        references.push(...specs.map((path) => path.replace('openspec/changes/' + task.change + '/specs/', 'openspec/specs/')));
    }
    for (const entry of adapter.specializedReferences ?? []) {
        if (task?.paths.some((path) => path === entry.path || path.startsWith(entry.path + '/') || entry.path.startsWith(path + '/'))) references.push(...entry.references);
    }

    const available = [...new Set(references)].filter((path) => existsSync(containedPath(root, path)));
    const contents = available.map((path) => [path, readFileSync(join(root, path), 'utf8')]);

    if (!adapter.resourceDirectory) {
        for (const name of standards) {
            const path = join(toolkitRoot, 'standards', name);
            contents.push([path, readFileSync(path, 'utf8')]);
        }
    }

    const identity = digest([task?.id, task?.scopeRevision, task?.mode, task?.profile, contents]);

    if (event.hook_event_name !== 'SessionStart' && state.deliveredContext === identity) return '';

    state.deliveredContext = identity;

    const summary = task
        ? 'Current task: ' + task.id + '; mode: ' + task.mode + '; profile: ' + task.profile + '; scope: ' + task.paths.join(', ') + '. Task metadata does not expand user authorization.'
        : 'No active task is registered. Register authorized scope before editing. Runtime session: ' + state.sessionId + '.';

    return ['AI Devkit context:', summary, 'Read current project sources: ' + contents.map(([path]) => path).join(', ') + '.',
        'Code tasks require the full coding standards and all applicable specialized standards. Delivered references do not prove reading or comprehension.',
        'Before recording a rule, explain its owner: reusable defaults belong in AI Devkit source; business rules and deliberate exceptions stay local. Never edit installed/generated toolkit resources or silently duplicate shared defaults.',
        'Use actual checks and completed independent review. Preserve unrelated edits.'].join('\n');
}
