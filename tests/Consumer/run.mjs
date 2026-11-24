import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, copyFileSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { distributionFiles, toolkitRoot, hash, toolkitIdentity } from '../../agent-runtime/resources.mjs';

const base = mkdtempSync(join(toolkitRoot, 'tmp/consumer-'));
const archives = join(base, 'archives');
mkdirSync(archives, { recursive: true });
const image = process.env.DEVKIT_PHP_IMAGE ?? 'ai-devkit-php:local';
const results = [];

function write(root, path, content) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n');
}

function execute(command, args, cwd, expected = 0) {
    let output = '';
    let status = 0;

    try { output = execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe', timeout: 300000, maxBuffer: 16 * 1024 * 1024 }); }
    catch (error) {
        status = error.status ?? 1;
        output = String(error.stdout ?? '') + String(error.stderr ?? '');
    }

    if (expected === 0) assert.equal(status, 0, output.slice(-6000));
    else assert.notEqual(status, 0, 'A controlled violation must fail: ' + output);

    return output;
}

function dockerCommand(directory) {
    return ['run', '--rm', '--user', process.getuid() + ':' + process.getgid(),
        '--mount', 'type=bind,src=' + toolkitRoot + ',dst=/app',
        '--workdir', '/app/' + relative(toolkitRoot, directory),
        '--env', 'COMPOSER_HOME=/tmp/composer',
        '--env', 'COMPOSER_CACHE_DIR=/app/tmp/consumer-composer-cache', image];
}

function php(directory, args, expected = 0) {
    return execute('docker', [...dockerCommand(directory), 'php', '-d', 'display_errors=stderr', ...args], directory, expected);
}

function composer(directory, args) {
    return execute('docker', [...dockerCommand(directory), 'composer', ...args, '--no-interaction', ...(args[0] === 'archive' ? [] : ['--no-progress'])], directory);
}

function cli(directory, ...args) {
    return execute(join(directory, 'vendor/bin/devkit.mjs'), args, directory);
}

function exportedVersion(version, changed = false) {
    const directory = join(base, 'source-' + version);

    for (const path of distributionFiles()) {
        const name = relative(toolkitRoot, path);
        mkdirSync(dirname(join(directory, name)), { recursive: true });
        copyFileSync(path, join(directory, name));
    }

    const metadata = JSON.parse(readFileSync(join(directory, 'composer.json'), 'utf8'));
    metadata.version = version; // Synthetic local artifact only; source metadata has no manual version.
    write(directory, 'composer.json', metadata);

    if (changed) {
        const path = join(directory, 'standards/coding.md');
        writeFileSync(path, readFileSync(path, 'utf8') + '\nSynthetic update fixture.\n');
    }

    composer(directory, ['archive', '--format=zip', '--dir=' + '../archives', '--file=ai-devkit-' + version]);
}

function install(name, { packageProfile = false, alternative = false } = {}) {
    const directory = join(base, name);
    mkdirSync(directory);
    const namespace = packageProfile ? 'Acme\\Catalog' : alternative ? 'App' : 'Northwind\\Journal';
    const sourceRoot = packageProfile ? 'lib' : alternative ? 'app' : 'domain code';
    const requirements = { php: '^8.5' };
    const dev = {
        'svchk-dev/ai-devkit': '0.1.0',
        'laravel/pint': '1.32.1',
        'deptrac/deptrac': '4.7.2',
        'laravel/boost': '2.10.3',
    };

    if (packageProfile) {
        requirements['illuminate/support'] = '13.44.1';
        dev['laravel/framework'] = '13.44.1';
        dev['orchestra/testbench'] = '11.3.0';
        dev['phpunit/phpunit'] = '13.4.4';
    } else requirements['laravel/framework'] = '13.44.1';

    write(directory, 'composer.json', {
        name: 'example/' + name, license: 'MIT', type: packageProfile ? 'library' : 'project',
        repositories: [{ type: 'artifact', url: '../archives' }],
        require: requirements, 'require-dev': dev,
        autoload: { 'psr-4': { [namespace + '\\']: sourceRoot + '/' } },
        scripts: packageProfile ? {} : { 'post-autoload-dump': ['Illuminate\\Foundation\\ComposerScripts::postAutoloadDump'] },
        config: { 'sort-packages': true },
    });
    write(directory, 'AGENTS.md', 'Local project rules remain local.\n');
    write(directory, 'local-policy.md', 'Preserved local policy.\n');
    write(directory, 'data/record.txt', 'Preserved application data.\n');
    const architecture = alternative
        ? { mode: 'custom', rules: 'local-policy.md', command: [process.execPath, 'verify-native-layout.mjs'] }
        : { mode: 'areas', compositionRoots: [namespace + '\\ProjectServiceProvider'],
            command: ['docker', ...dockerCommand(directory), 'php', 'vendor/bin/deptrac', 'analyse'] };

    write(directory, 'devkit.json', {
        schemaVersion: 1, profiles: [packageProfile ? 'laravel-package' : 'laravel-application'],
        namespace, sourceRoots: [sourceRoot], architecture,
        references: ['AGENTS.md', 'local-policy.md'],
        checks: { docs: [process.execPath, '-e', 'process.exit(0)'] },
        verificationProfiles: { docs: ['docs'] },
    });
    const namespaceLine = 'namespace ' + namespace;
    const path = alternative ? 'Models' : 'Main/Entries';
    write(directory, sourceRoot + '/' + path + '/Title.php',
        '<?php\n\ndeclare(strict_types=1);\n\n' + namespaceLine + '\\' + path.replaceAll('/', '\\') + ';\n\nfinal class Title\n{\n    public static function text(): string\n    {\n        return \'Portable\';\n    }\n}\n');

    if (alternative) {
        write(directory, 'verify-native-layout.mjs', "import { existsSync } from 'node:fs';\nif (!existsSync('app/Models/Title.php') || existsSync('app/Main')) process.exit(1);\n");
    } else {
        write(directory, sourceRoot + '/Web/Entries/Page.php',
            '<?php\n\ndeclare(strict_types=1);\n\n' + namespaceLine + '\\Web\\Entries;\n\nuse ' + namespace + '\\Main\\Entries\\Title;\n\nfinal class Page\n{\n    public static function title(): string\n    {\n        return Title::text();\n    }\n}\n');
        write(directory, sourceRoot + '/ProjectServiceProvider.php',
            '<?php\n\ndeclare(strict_types=1);\n\n' + namespaceLine + ';\n\nuse Illuminate\\Support\\ServiceProvider;\nuse ' + namespace + '\\Main\\Entries\\Title;\n\nfinal class ProjectServiceProvider extends ServiceProvider\n{\n    public function register(): void\n    {\n        $this->app->singleton(Title::class);\n    }\n}\n');
    }

    composer(directory, ['install', '--prefer-dist']);
    const lock = readFileSync(join(directory, 'composer.lock'), 'utf8');
    composer(directory, ['install', '--prefer-dist']);
    assert.equal(readFileSync(join(directory, 'composer.lock'), 'utf8'), lock);
    assert.equal(existsSync(join(directory, 'vendor/filament')), false);
    assert.equal(existsSync(join(directory, 'openspec')), false);

    if (!packageProfile) assert.equal(existsSync(join(directory, 'vendor/orchestra/testbench')), false);

    cli(directory, 'doctor');
    cli(directory, 'sync');
    cli(directory, 'sync', '--check');
    const manifest = readFileSync(join(directory, 'devkit.resources.json'), 'utf8');
    cli(directory, 'sync');
    assert.equal(readFileSync(join(directory, 'devkit.resources.json'), 'utf8'), manifest);
    const instructions = readFileSync(join(directory, '.devkit/instructions.md'), 'utf8');
    assert.ok(instructions.includes('standards/rule-ownership.md'));
    php(directory, ['vendor/bin/pint', '--config=.devkit/pint.json', sourceRoot]);
    php(directory, ['vendor/bin/pint', '--test', '--config=.devkit/pint.json', sourceRoot]);
    php(directory, ['vendor/bin/phpstan', 'analyse', '--configuration=.devkit/phpstan.neon', '--no-progress']);
    cli(directory, 'architecture');
    assert.equal(existsSync(join(directory, sourceRoot, 'Api')), false);
    results.push({ name, namespace, sourceRoot, lockedInstall: true, quality: true, architecture: true });

    return { directory, namespace, sourceRoot, alternative, packageProfile };
}

function selectedAgentCheck(consumer) {
    const { directory, sourceRoot } = consumer;
    const path = join(directory, 'devkit.json');
    const adapter = JSON.parse(readFileSync(path, 'utf8'));
    adapter.checks.docs = ['docker', ...dockerCommand(directory), 'php', 'vendor/bin/pint', '--test', '--config=.devkit/pint.json', sourceRoot];
    adapter.environment = {
        identityCommand: ['docker', ...dockerCommand(directory), 'php', '-r',
            "require 'vendor/autoload.php'; echo json_encode(['php'=>PHP_VERSION,'packages'=>Composer\\InstalledVersions::getRawData()['versions']]);"],
        inputs: [],
    };
    write(directory, 'devkit.json', adapter);
    cli(directory, 'sync');
    write(directory, '.gitignore', '/vendor/\n/storage/\n/bootstrap/cache/\n/tmp/\n');
    execute('git', ['init', '--quiet'], directory);
    execute('git', ['add', '.'], directory);
    execute(
        'git',
        [
            '-c', 'user.name=Consumer fixture',
            '-c', 'user.email=fixture@example.invalid',
            'commit', '--quiet', '-m', 'Initialize disposable consumer',
        ],
        directory
    );

    const runner = 'vendor/svchk-dev/ai-devkit/agent-runtime/cli.mjs';
    const session = 'independent-consumer';

    execute(
        process.execPath,
        [
            runner, 'start', '--session', session, '--id', 'verify-consumer',
            '--mode', 'change', '--profile', 'docs', '--path', 'AGENTS.md',
        ],
        directory
    );
    const output = execute(process.execPath, [runner, 'check', '--session', session, '--check', 'docs'], directory);

    const start = output.lastIndexOf('\n{\n');
    const receipt = JSON.parse(start < 0 ? output : output.slice(start + 1));

    assert.equal(receipt.root, directory);
    assert.equal(receipt.outcome, 'passed');
    assert.equal(receipt.observation.complete, true);
    assert.equal(receipt.observation.generation, 0);
    assert.ok(receipt.environmentIdentity);
    results.push({ selectedAgentCheck: 'actual Pint argv through the installed runner', outcome: receipt.outcome });
}

function violations(consumer) {
    const { directory, namespace, sourceRoot, alternative } = consumer;
    const folder = alternative ? 'Models' : 'Main/Entries';
    const path = sourceRoot + '/' + folder + '/Broken.php';
    write(directory, path, '<?php\nnamespace ' + namespace + '\\' + folder.replaceAll('/', '\\') + '; enum Broken { case Wrong; }\n');
    php(directory, ['vendor/bin/pint', '--test', '--config=.devkit/pint.json', path], 1);
    const report = JSON.parse(php(directory, ['vendor/svchk-dev/ai-devkit/bin/conventions.php', '--path=' + path], 1));
    assert.ok(report.diagnostics.some((item) => item.rule === 'devkit.enumCase'));
    write(directory, path, '<?php\nnamespace ' + namespace + '\\' + folder.replaceAll('/', '\\') + '; final class Broken { public function value(): string { return 42; } }\n');
    php(directory, ['vendor/bin/phpstan', 'analyse', '--configuration=.devkit/phpstan.neon', '--no-progress'], 1);
    rmSync(join(directory, path));

    if (!alternative) {
        const main = sourceRoot + '/Main/Entries/Title.php';
        const original = readFileSync(join(directory, main), 'utf8');
        write(directory, main, original.replace("return 'Portable';", 'return \\' + namespace + '\\Web\\Entries\\Page::title();'));
        execute(process.execPath, ['vendor/svchk-dev/ai-devkit/bin/devkit.mjs', 'architecture'], directory, 1);
        write(directory, main, original);
        cli(directory, 'architecture');
    }
}

function packageRuntime(consumer) {
    const { directory, namespace } = consumer;
    const source = '<?php\nuse Orchestra\\Testbench\\TestCase;\nuse ' + namespace + '\\ProjectServiceProvider;\nuse ' + namespace + '\\Main\\Entries\\Title;\nfinal class ConsumerTest extends TestCase\n{\n    public function test_provider_boots_in_an_independent_host(): void\n    {\n        self::assertSame(\'Portable\', $this->app->make(Title::class)::text());\n    }\n    protected function getPackageProviders($app): array\n    {\n        return [ProjectServiceProvider::class];\n    }\n}\n';
    write(directory, 'ConsumerTest.php', source);
    php(directory, ['vendor/bin/phpunit', '--bootstrap=vendor/autoload.php', 'ConsumerTest.php']);
}

function applicationRuntime(consumer) {
    const { directory, namespace, alternative } = consumer;
    for (const path of ['bootstrap/cache', 'storage/framework/views', 'storage/logs']) mkdirSync(join(directory, path), { recursive: true });
    const model = namespace + (alternative ? '\\Models\\Title' : '\\Main\\Entries\\Title');
    write(directory, 'probe.php',
        '<?php\nrequire __DIR__ . \'/vendor/autoload.php\';\n$app = Illuminate\\Foundation\\Application::configure(basePath: __DIR__)->withRouting(using: static function (): void {\nIlluminate\\Support\\Facades\\Route::get(\'/devkit-probe\', static fn (): string => \\' + model + '::text());\n})->create();\n$kernel = $app->make(Illuminate\\Contracts\\Http\\Kernel::class);\n$request = Illuminate\\Http\\Request::create(\'/devkit-probe\');\n$response = $kernel->handle($request);\nif ($response->getStatusCode() !== 200 || $response->getContent() !== \'Portable\') { fwrite(STDERR, $response->getContent()); exit(1); }\n$kernel->terminate($request, $response);\necho "Independent HTTP probe passed\\n";\n');
    php(directory, ['probe.php']);
}

function boostDiscovery(consumer) {
    const { directory } = consumer;
    write(directory, 'boost-probe.php',
        '<?php\nrequire __DIR__ . \'/vendor/autoload.php\';\n$app = new Illuminate\\Foundation\\Application(__DIR__);\n$app->instance(\'config\', new Illuminate\\Config\\Repository);\n$project = new Laravel\\Roster\\ProjectManager;\n$project->fresh();\n$packages = Laravel\\Boost\\Install\\ThirdPartyPackage::discover($project);\n$package = $packages->get(\'svchk-dev/ai-devkit\');\nif (!$package?->hasGuidelines || !$package->hasSkills) { throw new RuntimeException(\'Direct dependency resources were not discovered.\'); }\n$skills = (new Laravel\\Boost\\Install\\SkillComposer($project))->skills();\nforeach ([\'devkit-commit-message\', \'devkit-review\', \'devkit-change-workflow\'] as $name) {\nif (!$skills->has($name)) { throw new RuntimeException(\'Missing discovered skill: \' . $name); }\n}\necho "Boost direct-dependency discovery passed\\n";\n');
    php(directory, ['boost-probe.php']);
}

function singleFileTransition(consumer) {
    const { directory, sourceRoot } = consumer;
    const legacy = join(directory, 'devkit.json');
    const snapshot = join(directory, '.devkit');
    const policy = JSON.parse(readFileSync(legacy, 'utf8'));

    cli(directory, 'remove');
    rmSync(snapshot, { recursive: true });
    rmSync(legacy);
    cli(directory, 'sync');
    const created = JSON.parse(readFileSync(snapshot, 'utf8'));

    assert.equal(created.toolkit.version, '0.1.0');
    assert.equal(existsSync(join(directory, 'devkit.resources.json')), false);
    const quality = {
        php: ['docker', ...dockerCommand(directory), 'php'],
        pint: { 'cache-file': 'tmp/consumer-pint.cache' },
        phpstan: { paths: [sourceRoot], phpVersion: 80511 },
    };
    write(directory, '.devkit', { ...created, ...policy, quality });

    const metadata = JSON.parse(readFileSync(join(directory, 'composer.json'), 'utf8'));
    metadata['require-dev']['svchk-dev/ai-devkit'] = '0.2.0';
    write(directory, 'composer.json', metadata);
    composer(directory, ['update', 'svchk-dev/ai-devkit', '--prefer-dist']);
    cli(directory, 'sync');
    cli(directory, 'sync', '--check');
    cli(directory, 'doctor');
    cli(directory, 'architecture');
    php(directory, ['vendor/svchk-dev/ai-devkit/bin/conventions.php']);
    const invalidPhp = '<?php function devkitQualityProbe( ): int { return "broken"."type"; }\n';
    const outsidePath = 'other/OutsideProbe.php';
    write(directory, outsidePath, invalidPhp);
    cli(directory, 'format', '--test', '--format', 'json');
    cli(directory, 'analyse', '--no-progress');

    const badPath = sourceRoot + '/QualityProbe.php';
    write(directory, badPath, invalidPhp);
    const executable = join(directory, 'vendor/bin/devkit.mjs');
    const styleFailure = execute(executable, ['format', '--test'], directory, 1);
    const typeFailure = execute(executable, ['analyse', '--no-progress', badPath], directory, 1);
    assert.match(styleFailure, /QualityProbe\.php/u);
    assert.doesNotMatch(styleFailure, /OutsideProbe\.php/u);
    assert.match(execute(executable, ['format', '--test', outsidePath], directory, 1), /OutsideProbe\.php/u);
    assert.match(execute(executable, ['format', '--test', '--no-config'], directory, 1), /quality configuration in \.devkit/u);
    assert.match(typeFailure, /should return int but returns string/u);

    const current = JSON.parse(readFileSync(snapshot, 'utf8'));
    const rootPint = { ...quality.pint, in: ['.'], exclude: ['vendor', 'other', 'storage', 'tmp'] };
    const rootOnlyPath = 'additional/RootProbe.php';
    write(directory, rootOnlyPath, invalidPhp);
    write(directory, '.devkit', { ...current, quality: { ...quality, pint: rootPint } });
    const rootFailure = execute(executable, ['format', '--test'], directory, 1);
    assert.match(rootFailure, /QualityProbe\.php/u);
    assert.match(rootFailure, /RootProbe\.php/u);
    assert.doesNotMatch(rootFailure, /OutsideProbe\.php/u);
    write(directory, '.devkit', current);
    rmSync(join(directory, badPath));
    rmSync(join(directory, outsidePath));
    rmSync(join(directory, rootOnlyPath));

    applicationRuntime(consumer);

    const refreshed = JSON.parse(readFileSync(snapshot, 'utf8'));
    assert.equal(refreshed.toolkit.version, '0.2.0');
    assert.notEqual(refreshed.toolkit.sourceIdentity, created.toolkit.sourceIdentity);
    assert.deepEqual(refreshed.architecture, policy.architecture);
    assert.deepEqual(refreshed.quality, quality);
    assert.equal(readFileSync(join(directory, 'AGENTS.md'), 'utf8'), 'Local project rules remain local.\n');
    assert.match(readFileSync(join(directory, refreshed.toolkit.standards), 'utf8'), /engineering standards/u);
    assert.match(readFileSync(join(directory, 'vendor/svchk-dev/ai-devkit/standards/coding.md'), 'utf8'), /Synthetic update fixture/u);
    results.push({ singleFileAdapter: true, versions: ['0.1.0', '0.2.0'], localPolicyPreserved: true, qualityCommands: true });
}

function transition(consumer) {
    const { directory } = consumer;
    const originalMetadata = readFileSync(join(directory, 'composer.json'), 'utf8');
    const originalLock = readFileSync(join(directory, 'composer.lock'), 'utf8');
    const originalManifest = JSON.parse(readFileSync(join(directory, 'devkit.resources.json'), 'utf8'));
    const metadata = JSON.parse(originalMetadata);
    metadata['require-dev']['svchk-dev/ai-devkit'] = '0.2.0';
    write(directory, 'composer.json', metadata);
    composer(directory, ['update', 'svchk-dev/ai-devkit', '--prefer-dist']);
    cli(directory, 'sync');
    assert.equal(originalManifest.selection.version, '0.1.0');
    const updatedManifest = JSON.parse(readFileSync(join(directory, 'devkit.resources.json'), 'utf8'));
    assert.notEqual(updatedManifest.sourceIdentity, originalManifest.sourceIdentity);
    assert.equal(updatedManifest.selection.version, '0.2.0');
    assert.ok(readFileSync(join(directory, '.devkit/standards/coding.md'), 'utf8').includes('Synthetic update fixture.'));
    write(directory, 'composer.json', originalMetadata);
    write(directory, 'composer.lock', originalLock);
    composer(directory, ['install', '--prefer-dist']);
    cli(directory, 'sync');
    assert.equal(JSON.parse(readFileSync(join(directory, 'devkit.resources.json'), 'utf8')).sourceIdentity, originalManifest.sourceIdentity);
    assert.equal(readFileSync(join(directory, 'local-policy.md'), 'utf8'), 'Preserved local policy.\n');
    assert.equal(readFileSync(join(directory, 'data/record.txt'), 'utf8'), 'Preserved application data.\n');
    write(directory, '.devkit/local.md', 'Local addition\n');
    cli(directory, 'remove');
    assert.equal(existsSync(join(directory, 'devkit.resources.json')), false);
    assert.equal(readFileSync(join(directory, '.devkit/local.md'), 'utf8'), 'Local addition\n');
    assert.equal(readFileSync(join(directory, 'AGENTS.md'), 'utf8'), 'Local project rules remain local.\n');
    cli(directory, 'sync');
    composer(directory, ['install', '--no-dev', '--prefer-dist']);
    assert.equal(existsSync(join(directory, 'vendor/svchk-dev/ai-devkit')), false);
    applicationRuntime(consumer);
    composer(directory, ['install', '--prefer-dist']);
    cli(directory, 'sync', '--check');
    results.push({ transitions: ['0.1.0', '0.2.0', 'saved 0.1.0'], resourcesRestored: true, localPolicyPreserved: true, runtimeWithoutToolkit: true });
}

try {
    console.log('Exporting synthetic immutable Composer artifacts.');
    exportedVersion('0.1.0');
    exportedVersion('0.2.0', true);
    console.log('Installing and checking the default application.');
    const application = install('application');
    applicationRuntime(application);
    boostDiscovery(application);
    violations(application);
    selectedAgentCheck(application);
    console.log('Installing and checking the explicit framework-native override.');
    const alternative = install('native-application', { alternative: true });
    applicationRuntime(alternative);
    violations(alternative);
    singleFileTransition(alternative);
    console.log('Installing and booting the independent package host.');
    const packageConsumer = install('package', { packageProfile: true });
    packageRuntime(packageConsumer);
    violations(packageConsumer);
    console.log('Rehearsing update, saved-lock restoration, removal and runtime-only installation.');
    transition(application);
    const evidence = { schemaVersion: 1, toolkitIdentity: toolkitIdentity(), image, results,
        artifacts: ['0.1.0', '0.2.0'].map((version) => ({ version, sha256: hash(readFileSync(join(archives, 'ai-devkit-' + version + '.zip'))) })) };
    write(toolkitRoot, 'tmp/consumer-evidence.json', evidence);
    console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
    console.error('Consumer acceptance failed in ' + relative(toolkitRoot, base));
    throw error;
}
