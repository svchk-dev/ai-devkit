import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { containedPath, readAdapter } from './adapter.mjs';
import { pintSettings, toolkitRoot } from './resources.mjs';

function phpstanSettings(root, adapter, directory) {
    const options = adapter.quality?.phpstan ?? {};
    const portable = (absolute) => relative(directory, absolute).replaceAll('\\', '/');
    const projectPaths = (paths) => paths.map((path) => portable(containedPath(root, path)));
    const includes = [portable(join(toolkitRoot, 'config/phpstan.neon')), ...projectPaths(options.includes ?? [])];
    const lines = ['includes:', ...includes.map((path) => '    - ' + JSON.stringify(path)), 'parameters:'];
    lines.push('    paths: ' + JSON.stringify(projectPaths(options.paths ?? adapter.sourceRoots)));
    lines.push('    tmpDir: ' + JSON.stringify('phpstan'));

    for (const name of ['level', 'phpVersion']) {
        if (options[name] !== undefined) lines.push(`    ${name}: ${options[name]}`);
    }
    for (const name of ['bootstrapFiles', 'excludePaths', 'configDirectories', 'databaseMigrationsPath']) {
        if (options[name] !== undefined) lines.push(`    ${name}: ${JSON.stringify(projectPaths(options[name]))}`);
    }

    return lines.join('\n') + '\n';
}

export function runQuality(root, operation, args) {
    const adapter = readAdapter(root);
    const directory = containedPath(root, adapter.stateDirectory);
    const formatter = operation === 'format';
    const tool = formatter ? 'pint' : 'phpstan';
    const dependency = formatter ? 'laravel/pint' : 'phpstan/phpstan';
    const binary = `vendor/bin/${tool}`;

    if (!existsSync(containedPath(root, binary))) {
        throw new Error(`Install ${dependency} in the project's locked development dependencies before running ${operation}.`);
    }
    if (args.some((arg) => arg === '--no-config' || arg === '--config' || arg === '--configuration' || /^--(?:config|configuration)=/u.test(arg) || /^-c/u.test(arg))) {
        throw new Error('Set the quality configuration in .devkit.');
    }

    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const configuration = join(directory, `${tool}-${randomUUID()}.${formatter ? 'json' : 'neon'}`);
    const content = formatter
        ? JSON.stringify({ in: adapter.sourceRoots, ...pintSettings(adapter) }) + '\n'
        : phpstanSettings(root, adapter, dirname(configuration));
    writeFileSync(configuration, content, { flag: 'wx', mode: 0o600 });

    try {
        const [executable, ...prefix] = adapter.quality?.php ?? ['php'];
        const option = formatter ? '--config=' : '--configuration=';
        const parameters = [binary, ...(formatter ? [] : ['analyse']), option + relative(root, configuration), ...args];
        const result = spawnSync(executable, [...prefix, ...parameters], { cwd: root, stdio: 'inherit' });

        if (result.error) throw result.error;

        return result.status ?? 1;
    } finally {
        rmSync(configuration, { force: true });
    }
}
