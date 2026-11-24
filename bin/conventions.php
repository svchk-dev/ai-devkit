<?php

declare(strict_types=1);

use Symfony\Component\Process\Process;

$toolkitRoot = dirname(__DIR__);
$repositoryRoot = realpath(getcwd());

if ($repositoryRoot === false) {
    fwrite(STDERR, "Run from the consumer project root.\n");
    exit(2);
}

$singleAdapter = $repositoryRoot . '/.devkit';
$legacyAdapter = $repositoryRoot . '/devkit.json';

if (is_link($singleAdapter) || (is_file($singleAdapter) && is_file($legacyAdapter))) {
    fwrite(STDERR, "Select one regular .devkit or legacy devkit.json adapter.\n");
    exit(2);
}

$adapterPath = realpath(is_file($singleAdapter) ? $singleAdapter : $legacyAdapter);

if ($adapterPath === false || !is_file($adapterPath)
    || !str_starts_with($adapterPath, $repositoryRoot . '/')
    || in_array('.git', explode('/', substr($adapterPath, strlen($repositoryRoot) + 1)), true)) {
    fwrite(STDERR, "Run from a consumer with .devkit or devkit.json.\n");
    exit(2);
}

if (!is_file($repositoryRoot . '/vendor/autoload.php')) {
    fwrite(STDERR, "Install the consumer's locked development dependencies first." . PHP_EOL);
    exit(2);
}

require $repositoryRoot . '/vendor/autoload.php';

$adapter = json_decode(file_get_contents($adapterPath), true, flags: JSON_THROW_ON_ERROR);
$stateDirectory = $adapter['stateDirectory'] ?? 'tmp/devkit';

if (!is_string($stateDirectory) || $stateDirectory === '' || str_starts_with($stateDirectory, '/') || preg_match('~(?:^|/)(?:\\.\\.|\\.git)(?:/|$)~', $stateDirectory) === 1) {
    fwrite(STDERR, 'State directory must stay inside the consumer.' . PHP_EOL);
    exit(2);
}

$statePath = $repositoryRoot . '/' . $stateDirectory;
$existingParent = $statePath;

while (!file_exists($existingParent)) {
    if (is_link($existingParent)) {
        fwrite(STDERR, 'Invalid state directory link.' . PHP_EOL);
        exit(2);
    }

    $existingParent = dirname($existingParent);
}

$resolvedParent = realpath($existingParent);

if ($resolvedParent === false || ($resolvedParent !== $repositoryRoot && !str_starts_with($resolvedParent, $repositoryRoot . '/'))) {
    fwrite(STDERR, 'State directory leaves the consumer.' . PHP_EOL);
    exit(2);
}

if (in_array('.git', explode('/', substr($resolvedParent, strlen($repositoryRoot) + 1)), true)
    || (file_exists($statePath) && realpath($statePath) === $repositoryRoot)) {
    fwrite(STDERR, 'State directory must remain outside Git state and the repository root.' . PHP_EOL);
    exit(2);
}

$options = getopt('', ['path:']);
$defaultSourceRoot = in_array('laravel-package', $adapter['profiles'] ?? [], true) ? 'src' : 'app';
$requestedPaths = (array) ($options['path'] ?? ($adapter['sourceRoots'] ?? [$defaultSourceRoot]));
$baseline = [];
$scopeFile = getenv($adapter['environment']['scopeVariable'] ?? 'DEVKIT_AGENT_SCOPE_FILE');

if (is_string($scopeFile) && $scopeFile !== '') {
    $scopePath = realpath($repositoryRoot . '/' . $scopeFile);

    if ($scopePath === false || !str_starts_with($scopePath, $repositoryRoot . '/' . $stateDirectory . '/')) {
        fwrite(STDERR, "Invalid task convention scope file.\n");
        exit(2);
    }

    $scopeContents = file_get_contents($scopePath);

    if ($scopeContents === false) {
        fwrite(STDERR, "Cannot read task convention scope.\n");
        exit(2);
    }

    $scope = json_decode($scopeContents, true, flags: JSON_THROW_ON_ERROR);

    if (!is_array($scope) || !is_array($scope['paths'] ?? null) || !is_array($scope['baseline'] ?? null)) {
        fwrite(STDERR, "Malformed task convention scope.\n");
        exit(2);
    }

    $requestedPaths = $scope['paths'];
    $baseline = $scope['baseline'];
}

$selectedFiles = [];

foreach ($requestedPaths as $requestedPath) {
    if (!is_string($requestedPath)) {
        fwrite(STDERR, "Convention paths must be strings.\n");
        exit(2);
    }

    $absolutePath = realpath($repositoryRoot . '/' . $requestedPath);

    if ($absolutePath === false) {
        continue;
    }

    if (!str_starts_with($absolutePath, $repositoryRoot . '/')) {
        fwrite(STDERR, "Convention scope leaves the repository.\n");
        exit(2);
    }

    $entries = is_dir($absolutePath)
        ? new RecursiveIteratorIterator(new RecursiveDirectoryIterator($absolutePath, FilesystemIterator::SKIP_DOTS))
        : [new SplFileInfo($absolutePath)];

    foreach ($entries as $entry) {
        $filePath = $entry->getRealPath();

        if ($filePath === false || !$entry->isFile() || $entry->getExtension() !== 'php') {
            continue;
        }

        $relativePath = substr($filePath, strlen($repositoryRoot) + 1);

        if (!str_starts_with($filePath, $repositoryRoot . '/') || preg_match('~(?:^|/)(?:vendor|node_modules|storage|bootstrap/cache|database/migrations)(?:/|$)~', $relativePath) === 1) {
            continue;
        }

        $selectedFiles[$filePath] = $filePath;
    }
}

if ($selectedFiles === []) {
    echo json_encode(['diagnostics' => [], 'preexisting' => [], 'errors' => []], JSON_THROW_ON_ERROR) . "\n";
    exit(0);
}

$configurationDirectory = $statePath;

if (!is_dir($configurationDirectory)) {
    mkdir($configurationDirectory, 0700, true);
}

$configurationPath = $configurationDirectory . '/conventions-' . bin2hex(random_bytes(8)) . '.neon';
$namespace = json_encode($adapter['namespace'] ?? 'App', JSON_THROW_ON_ERROR);
$areaLayout = ($adapter['architecture']['mode'] ?? 'areas') === 'areas' ? 'true' : 'false';
$includes = json_encode($toolkitRoot . '/config/conventions.neon', JSON_THROW_ON_ERROR);
$cache = json_encode($configurationDirectory . '/phpstan', JSON_THROW_ON_ERROR);
$configuration = "includes:\n    - " . $includes . "\nparameters:\n    level: null\n    customRulesetUsed: true\n    tmpDir: " . $cache . "\n    devkitNamespace: " . $namespace . "\n    devkitAreaLayout: " . $areaLayout . "\n";
file_put_contents($configurationPath, $configuration);

$process = new Process(
    [
        PHP_BINARY,
        $repositoryRoot . '/vendor/bin/phpstan',
        'analyse',
        '--autoload-file=' . $repositoryRoot . '/vendor/autoload.php',
        '--configuration=' . $configurationPath,
        '--no-progress',
        '--error-format=json',
        '--memory-limit=1G',
        ...array_values($selectedFiles),
    ],
    $repositoryRoot,
    timeout: 120
);

try {
    $process->run();
} finally {
    unlink($configurationPath);
}

try {
    $report = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
} catch (JsonException) {
    fwrite(STDERR, "Convention analysis did not return a valid report.\n");
    exit(2);
}

if (!is_array($report) || !is_array($report['files'] ?? null) || !is_array($report['errors'] ?? null)
    || !in_array($process->getExitCode(), [0, 1], true)) {
    fwrite(STDERR, "Convention analysis is incomplete.\n");
    exit(2);
}

$diagnostics = [];

foreach ($report['files'] ?? [] as $filePath => $fileReport) {
    foreach ($fileReport['messages'] ?? [] as $message) {
        $diagnostics[] = [
            'file' => str_replace($repositoryRoot . '/', '', $filePath),
            'line' => $message['line'] ?? 1,
            'rule' => $message['identifier'] ?? 'phpstan.analysis',
            'message' => $message['message'],
            'source' => $message['tip'] ?? 'standards/coding.md',
        ];
    }
}

$preexisting = [];
$baselineCounts = [];

foreach ($baseline as $diagnostic) {
    $identity = json_encode([$diagnostic['file'], $diagnostic['rule'], $diagnostic['message']], JSON_THROW_ON_ERROR);
    $baselineCounts[$identity] = ($baselineCounts[$identity] ?? 0) + 1;
}

$newDiagnostics = [];
$projectRuleIdentifiers = ['devkit.dependencyName', 'devkit.eventJobName', 'devkit.enumCase', 'devkit.componentService'];

foreach ($diagnostics as $diagnostic) {
    $identity = json_encode([$diagnostic['file'], $diagnostic['rule'], $diagnostic['message']], JSON_THROW_ON_ERROR);

    if (in_array($diagnostic['rule'], $projectRuleIdentifiers, true) && ($baselineCounts[$identity] ?? 0) > 0) {
        $baselineCounts[$identity]--;
        $preexisting[] = $diagnostic;
    } else {
        $newDiagnostics[] = $diagnostic;
    }
}

$errors = $report['errors'] ?? [];
echo json_encode(['diagnostics' => $newDiagnostics, 'preexisting' => $preexisting, 'errors' => $errors], JSON_THROW_ON_ERROR) . "\n";

exit($newDiagnostics === [] && $errors === [] ? 0 : 1);
