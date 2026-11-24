import { existsSync, readFileSync, realpathSync, lstatSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep, dirname, join } from 'node:path';

export const profiles = ['laravel-application', 'laravel-package', 'filament', 'openspec', 'codex'];

export function containedPath(root, name) {
    if (typeof name !== 'string' || !name || name.includes('\0') || isAbsolute(name)) {
        throw new Error('Expected a nonempty repository-relative path.');
    }

    const base = realpathSync(root);
    const path = resolve(base, name);
    const local = relative(base, path);

    if (!local || local === '..' || local.startsWith('..' + sep) || local.split(sep).includes('.git')) {
        throw new Error('Path must remain inside the repository and outside Git state.');
    }

    let parent = path;

    while (!existsSync(parent)) {
        try {
            if (lstatSync(parent).isSymbolicLink()) throw new Error('Dangling symlink in managed path.');
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        parent = dirname(parent);
    }

    const target = realpathSync(parent);

    if (relative(base, target).split(sep).includes('.git')) throw new Error('Canonical path must remain outside Git state.');

    if (target !== base && !target.startsWith(base + sep)) throw new Error('Path resolves outside the repository.');

    return path;
}

export function command(value) {
    if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string' || !item || item.includes('\0'))) {
        throw new Error('Commands must be nonempty argv arrays.');
    }

    return value;
}

export function adapterName(root) {
    const singleFile = containedPath(root, '.devkit');
    const legacy = existsSync(containedPath(root, 'devkit.json'));

    if (existsSync(singleFile)) {
        const entry = lstatSync(singleFile);

        if (legacy && entry.isDirectory()) return 'devkit.json';
        if (!entry.isFile()) throw new Error('Expected a regular .devkit file. Follow the legacy migration guide if .devkit is a directory.');
        if (legacy) throw new Error('Both .devkit and devkit.json exist. Retain one adapter.');
        return '.devkit';
    }

    return legacy ? 'devkit.json' : null;
}

export function selectsCodexPlugin(root) {
    const path = join(root, '.devkit');

    if (!lstatSync(path, { throwIfNoEntry: false })?.isFile()) return false;

    const { profiles } = JSON.parse(readFileSync(path, 'utf8'));

    return Array.isArray(profiles) && profiles.includes('codex');
}

export function readAdapter(root) {
    const name = adapterName(root);

    if (name === null) throw new Error('Run vendor/bin/devkit.mjs sync to create .devkit.');

    const adapter = JSON.parse(readFileSync(containedPath(root, name), 'utf8'));
    const keys = ['$schema', 'schemaVersion', 'toolkit', 'profiles', 'namespace', 'sourceRoots', 'architecture', 'quality', 'checks', 'verificationProfiles', 'references', 'inputSets', 'environment', 'reviewer', 'stateDirectory', 'resourceDirectory', 'specializedReferences', 'objectiveRuleIdentifiers', 'openspec'];

    if (!adapter || Array.isArray(adapter) || adapter.schemaVersion !== 1 || Object.keys(adapter).some((key) => !keys.includes(key))) {
        throw new Error('Unsupported adapter schema or setting.');
    }

    if (adapter.$schema !== undefined && typeof adapter.$schema !== 'string') throw new Error('Schema reference must be a string.');

    for (const key of ['architecture', 'quality', 'checks', 'verificationProfiles', 'inputSets', 'environment', 'reviewer', 'openspec']) {
        if (adapter[key] !== undefined && (!adapter[key] || typeof adapter[key] !== 'object' || Array.isArray(adapter[key]))) {
            throw new Error(key + ' must be an object.');
        }
    }
    for (const key of ['profiles', 'sourceRoots', 'references', 'specializedReferences', 'objectiveRuleIdentifiers']) {
        if (adapter[key] !== undefined && !Array.isArray(adapter[key])) throw new Error(key + ' must be an array.');
    }

    adapter.profiles ??= [];

    if (!Array.isArray(adapter.profiles) || adapter.profiles.some((profile) => !profiles.includes(profile)) || new Set(adapter.profiles).size !== adapter.profiles.length) {
        throw new Error('Unknown or repeated integration profile.');
    }
    if (adapter.profiles.includes('laravel-application') && adapter.profiles.includes('laravel-package')) {
        throw new Error('Select one Laravel project profile.');
    }

    adapter.namespace ??= 'App';

    if (typeof adapter.namespace !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)*$/u.test(adapter.namespace)) {
        throw new Error('Supply a valid project namespace.');
    }

    adapter.sourceRoots ??= [adapter.profiles.includes('laravel-package') ? 'src' : 'app'];

    if (!Array.isArray(adapter.sourceRoots) || !adapter.sourceRoots.length) throw new Error('Supply source roots.');
    for (const name of adapter.sourceRoots) containedPath(root, name);

    if (name === 'devkit.json') {
        adapter.resourceDirectory ??= '.devkit';
        containedPath(root, adapter.resourceDirectory);
    } else if (adapter.resourceDirectory !== undefined) {
        throw new Error('The .devkit adapter reads shared resources from the installed package.');
    }

    adapter.stateDirectory ??= 'tmp/devkit';
    containedPath(root, adapter.stateDirectory);
    adapter.architecture ??= { mode: 'areas' };

    if (!['areas', 'custom'].includes(adapter.architecture.mode)) throw new Error('Unknown architecture mode.');
    if (adapter.architecture.mode === 'custom') {
        const rules = containedPath(root, adapter.architecture.rules);

        if (!existsSync(rules)) throw new Error('An architecture override must reference existing local rules.');

        command(adapter.architecture.command);
    }

    if (adapter.architecture.command) command(adapter.architecture.command);
    const compositionRoots = adapter.architecture.compositionRoots ?? [];

    if (!Array.isArray(compositionRoots) || compositionRoots.some((name) => typeof name !== 'string' || !name.startsWith(adapter.namespace + '\\') || !/^[A-Za-z_][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)*$/u.test(name))) {
        throw new Error('Composition roots must name project classes explicitly.');
    }

    const areas = adapter.architecture.additionalAreas ?? [];

    if (!Array.isArray(areas) || new Set(areas).size !== areas.length || areas.some((area) => typeof area !== 'string' || !/^[A-Z][A-Za-z0-9]*$/u.test(area) || ['Main', 'Admin', 'Web', 'Console', 'Api'].includes(area))) {
        throw new Error('Additional areas must have concrete names.');
    }


    const object = (value, name) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(name + ' must be an object.');
    };
    const knownKeys = (value, names, label) => {
        object(value, label);

        if (Object.keys(value).some((key) => !names.includes(key))) throw new Error('Unknown ' + label + ' setting.');
    };

    knownKeys(adapter.architecture, ['mode', 'rules', 'command', 'additionalAreas', 'compositionRoots'], 'architecture');
    knownKeys(adapter.quality ?? {}, ['php', 'pint', 'phpstan'], 'quality');
    if (adapter.quality?.php !== undefined) command(adapter.quality.php);
    object(adapter.quality?.pint ?? {}, 'Pint settings');
    knownKeys(adapter.quality?.phpstan ?? {}, [
        'level', 'phpVersion', 'paths', 'includes', 'bootstrapFiles', 'excludePaths', 'configDirectories', 'databaseMigrationsPath',
    ], 'PHPStan');
    const phpstan = adapter.quality?.phpstan ?? {};

    if (phpstan.level !== undefined && (!Number.isInteger(phpstan.level) || phpstan.level < 0 || phpstan.level > 10)) throw new Error('Invalid PHPStan level.');

    if (phpstan.phpVersion !== undefined && (!Number.isInteger(phpstan.phpVersion) || phpstan.phpVersion < 1)) {
        throw new Error('PHPStan phpVersion must be a positive PHP version identifier.');
    }

    for (const key of ['paths', 'includes', 'bootstrapFiles', 'excludePaths', 'configDirectories', 'databaseMigrationsPath']) {
        if (phpstan[key] !== undefined && !Array.isArray(phpstan[key])) throw new Error('PHPStan paths must be arrays.');
        for (const name of phpstan[key] ?? []) containedPath(root, name);
    }

    if (adapter.quality?.pint?.['cache-file'] !== undefined) containedPath(root, adapter.quality.pint['cache-file']);
    if (name === '.devkit' && adapter.quality?.pint?.in !== undefined) {
        if (!Array.isArray(adapter.quality.pint.in) || !adapter.quality.pint.in.length) throw new Error('Pint in must be a nonempty path array.');
        for (const path of adapter.quality.pint.in) {
            if (path !== '.') containedPath(root, path);
        }
    }

    knownKeys(adapter.inputSets ?? {}, ['implementationGuidance', 'codePaths'], 'inputSets');

    for (const key of ['implementationGuidance', 'codePaths']) {
        const paths = adapter.inputSets?.[key];

        if (paths === undefined) continue;
        if (!Array.isArray(paths)) throw new Error(`${key} must be a path array.`);
        const resolved = paths.map((path) => containedPath(root, path));

        if (key === 'codePaths') adapter.inputSets.codePaths = resolved.map((path) => relative(root, path).split(sep).join('/'));
    }

    object(adapter.checks ?? {}, 'checks');
    object(adapter.verificationProfiles ?? {}, 'verificationProfiles');
    knownKeys(adapter.environment ?? {}, ['checks', 'identityCommand', 'inputs', 'scopeVariable', 'baselineVariable', 'candidateVariable', 'sessionVariable'], 'environment');
    if (adapter.environment?.inputs !== undefined && !Array.isArray(adapter.environment.inputs)) throw new Error('Environment inputs must be a path array.');
    knownKeys(adapter.reviewer ?? {}, ['references'], 'reviewer');
    if (adapter.reviewer?.references !== undefined && !Array.isArray(adapter.reviewer.references)) throw new Error('Reviewer references must be a path array.');
    for (const name of adapter.reviewer?.references ?? []) {
        if (!existsSync(containedPath(root, name))) throw new Error('Reviewer rules must exist.');
    }
    if (adapter.objectiveRuleIdentifiers !== undefined && (!Array.isArray(adapter.objectiveRuleIdentifiers) || adapter.objectiveRuleIdentifiers.some((name) => typeof name !== 'string' || !name))) throw new Error('Objective rule identifiers must be strings.');
    if (adapter.specializedReferences !== undefined && !Array.isArray(adapter.specializedReferences)) throw new Error('Scoped references must be an array.');

    for (const value of Object.values(adapter.checks ?? {})) command(value);
    if (adapter.references && (!Array.isArray(adapter.references) || adapter.references.some((name) => typeof name !== 'string'))) throw new Error('References must be paths.');
    for (const name of adapter.references ?? []) containedPath(root, name);

    for (const value of Object.values(adapter.verificationProfiles ?? {})) {
        if (!Array.isArray(value) || !value.length || value.some((id) => typeof id !== 'string' || !adapter.checks?.[id])) {
            throw new Error('Verification profiles must name declared checks.');
        }
    }
    if (adapter.environment?.checks !== undefined && (!Array.isArray(adapter.environment.checks)
        || adapter.environment.checks.some((id) => typeof id !== 'string' || !adapter.checks?.[id]))) {
        throw new Error('Environment checks must name declared checks.');
    }
    if (adapter.environment?.identityCommand) command(adapter.environment.identityCommand);
    for (const path of adapter.environment?.inputs ?? []) containedPath(root, path);
    for (const key of ['scopeVariable', 'baselineVariable', 'candidateVariable', 'sessionVariable']) {
        const value = adapter.environment?.[key];

        if (value !== undefined && (typeof value !== 'string' || !/^[A-Z_][A-Z0-9_]*$/u.test(value))) throw new Error('Invalid environment variable mapping.');
    }
    if (adapter.openspec && (Object.keys(adapter.openspec).some((key) => key !== 'archiveFirst') || typeof adapter.openspec.archiveFirst !== 'boolean')) throw new Error('Invalid OpenSpec profile policy.');
    for (const entry of adapter.specializedReferences ?? []) {
        containedPath(root, entry.path);

        if (!Array.isArray(entry.references)) throw new Error('Scoped references must be paths.');
        for (const path of entry.references) containedPath(root, path);
    }

    return adapter;
}

export function assertPrerequisites(root, adapter) {
    const packages = { 'laravel-application': 'laravel/framework', 'laravel-package': 'orchestra/testbench', filament: 'filament/filament' };

    for (const profile of adapter.profiles) {
        const dependency = packages[profile];

        if (dependency && !existsSync(containedPath(root, 'vendor/' + dependency + '/composer.json'))) {
            throw new Error('Profile ' + profile + ' requires the installed ' + dependency + ' development dependency.');
        }
        if (profile === 'openspec' && !existsSync(containedPath(root, 'openspec/config.yaml')) && !existsSync(containedPath(root, 'openspec/config.yml'))) {
            throw new Error('The OpenSpec integration requires an explicitly initialized project.');
        }
    }
}
