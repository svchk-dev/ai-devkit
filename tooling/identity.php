<?php

declare(strict_types=1);

use Composer\InstalledVersions;

require dirname(__DIR__) . '/vendor/autoload.php';

$packages = [];

foreach (InstalledVersions::getInstalledPackages() as $package) {
    $packages[$package] = [
        'version' => InstalledVersions::getPrettyVersion($package),
        'reference' => InstalledVersions::getReference($package),
    ];
}

ksort($packages);

echo json_encode(['php' => PHP_VERSION, 'packages' => $packages], JSON_THROW_ON_ERROR) . "\n";
