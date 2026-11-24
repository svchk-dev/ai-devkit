import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readAdapter, containedPath } from './adapter.mjs';

function escaped(value) {
    return value.replace(/[.*+?^{}$()|[\]\\]/gu, '\\$&');
}

export function areaConfiguration(root, adapter, configurationDirectory) {
    const prefix = escaped(adapter.namespace + '\\');
    const areas = ['Main', 'Admin', 'Web', 'Console', 'Api', ...(adapter.architecture.additionalAreas ?? [])];
    const compositionRoots = adapter.architecture.compositionRoots ?? [];
    const collector = (value) => ({ type: 'classNameRegex', value: '#' + value + '#u' });
    const layers = areas.map((name) => ({
        name, collectors: [collector('^' + prefix + escaped(name) + '\\\\')],
    }));
    const project = collector('^' + prefix);
    const composition = compositionRoots.map((name) => collector('^' + escaped(name) + '$'));
    const external = { name: 'External', collectors: [{ type: 'bool', must_not: [project], must: [collector('.*')] }] };
    const unassigned = {
        name: 'Unassigned',
        collectors: [{ type: 'bool', must: [project], must_not: [
            ...areas.map((name) => collector('^' + prefix + escaped(name) + '\\\\')), ...composition,
        ] }],
    };
    layers.push(external, unassigned);

    if (composition.length) layers.push({ name: 'Composition', collectors: composition });

    const ruleset = Object.fromEntries(areas.map((name) => [name, name === 'Main' ? ['External'] : ['Main', 'External']]));
    ruleset.External = [];
    ruleset.Unassigned = [];

    if (composition.length) ruleset.Composition = [...areas, 'External'];

    return { deptrac: {
        paths: adapter.sourceRoots.map((name) => relative(configurationDirectory, containedPath(root, name)).replaceAll('\\', '/')),
        analyser: { types: ['class', 'use', 'file', 'function'] },
        layers, ruleset,
    } };
}

export function checkArchitecture(root) {
    const adapter = readAdapter(root);

    if (adapter.architecture.mode === 'custom') {
        const [executable, ...args] = adapter.architecture.command;
        const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit' });

        if (result.error) throw result.error;

        return result.status ?? 1;
    }

    const directory = containedPath(root, adapter.stateDirectory);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const configuration = resolve(directory, 'architecture-' + randomUUID() + '.yaml');
    writeFileSync(configuration, JSON.stringify(areaConfiguration(root, adapter, dirname(configuration)), null, 2) + '\n', { flag: 'wx' });

    try {
        const [executable, ...args] = adapter.architecture.command ?? ['php', 'vendor/bin/deptrac', 'analyse'];

        if (!adapter.architecture.command && !existsSync(containedPath(root, 'vendor/bin/deptrac'))) {
            throw new Error('Install deptrac/deptrac as a root development dependency or declare an architecture command.');
        }

        const result = spawnSync(executable, [...args, '--config-file=' + relative(root, configuration), '--no-progress', '--no-cache', '--fail-on-uncovered'], { cwd: root, stdio: 'inherit' });

        if (result.error) throw result.error;

        return result.status ?? 1;
    } finally { rmSync(configuration, { force: true }); }
}
