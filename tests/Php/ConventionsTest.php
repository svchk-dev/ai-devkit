<?php

declare(strict_types=1);

namespace Svchk\Devkit\Tests\Php;

use Illuminate\Filesystem\Filesystem;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Process\Process;

final class ConventionsTest extends TestCase
{
    /** @return iterable<string, array{string, string, string|null}> */
    public static function examples(): iterable
    {
        yield 'dependency name' => ['Probe.php', 'class BodySanitizer {} class Probe { public function __construct(BodySanitizer $sanitizer) {} }', 'devkit.dependencyName'];
        yield 'full dependency name' => ['Probe.php', 'class BodySanitizer {} class Probe { public function __construct(BodySanitizer $bodySanitizer) {} }', null];
        yield 'interface collaborator' => ['Probe.php', 'interface AssetUrl {} class Probe { public function __construct(AssetUrl $url) {} }', 'devkit.dependencyName'];
        yield 'external parameter contract' => ['Probe.php', 'class Probe extends \Illuminate\Support\ServiceProvider { public function __construct($app) { parent::__construct($app); } }', null];
        yield 'enum case' => ['Probe.php', 'enum Choice { case Invalid; }', 'devkit.enumCase'];
        yield 'valid enum case' => ['Probe.php', 'enum Choice { case validCase; }', null];
        yield 'event suffix' => ['Changed.php', 'class Changed { use \Illuminate\Foundation\Events\Dispatchable; }', 'devkit.eventJobName'];
        yield 'event filename' => ['Other.php', 'class ChangedEvent { use \Illuminate\Foundation\Events\Dispatchable; }', 'devkit.eventJobName'];
        yield 'valid event' => ['ChangedEvent.php', 'class ChangedEvent { use \Illuminate\Foundation\Events\Dispatchable; }', null];
        yield 'component service' => ['Probe.php', 'namespace Example\\Product\\Api\\Probe\\Services; class ProbeService {}', 'devkit.componentService'];
        yield 'job suffix' => ['Rebuild.php', 'class Rebuild { use \Illuminate\Foundation\Queue\Queueable; }', 'devkit.eventJobName'];
    }

    public function test_direct_convention_entry_point_rejects_a_link_into_git_state(): void
    {
        $root = dirname(__DIR__, 2);
        $directory = $root . '/tmp/state-boundary-' . bin2hex(random_bytes(8));
        mkdir($directory . '/.git', 0755, true);
        file_put_contents($directory . '/.git/HEAD', 'preserved');
        file_put_contents($directory . '/devkit.json', json_encode([
            'schemaVersion' => 1,
            'stateDirectory' => 'state',
        ], JSON_THROW_ON_ERROR));
        symlink($directory . '/.git', $directory . '/state');
        symlink($root . '/vendor', $directory . '/vendor');

        try {
            $process = new Process(
                [PHP_BINARY, $root . '/bin/conventions.php'],
                $directory,
                timeout: 30
            );
            $process->run();

            self::assertSame(2, $process->getExitCode());
            self::assertStringContainsString('Git state', $process->getErrorOutput());
            self::assertSame('preserved', file_get_contents($directory . '/.git/HEAD'));
            self::assertSame(['HEAD'], array_values(array_diff(scandir($directory . '/.git'), ['.', '..'])));
        } finally {
            $filesystem = new Filesystem;
            $filesystem->deleteDirectory($directory);
        }
    }

    #[DataProvider('examples')]
    public function test_reports_conventions_in_an_independent_namespace(string $filename, string $declaration, ?string $expected): void
    {
        $root = dirname(__DIR__, 2);
        $directory = $root . '/tmp/conventions-' . bin2hex(random_bytes(8));
        mkdir($directory, 0755, true);
        file_put_contents($directory . '/' . $filename, "<?php\nnamespace Example\\Product\\Main\\Probe;\n" . $declaration . "\n");
        $configuration = "includes:\n    - " . $root . "/config/conventions.neon\nparameters:\n    customRulesetUsed: true\n    level: null\n    tmpDir: " . $directory . "/cache\n    devkitNamespace: Example\\Product\n";
        file_put_contents($directory . '/phpstan.neon', $configuration);

        try {
            $process = new Process(
                [
                    PHP_BINARY,
                    $root . '/vendor/bin/phpstan',
                    'analyse',
                    '--configuration=' . $directory . '/phpstan.neon',
                    '--autoload-file=' . $root . '/vendor/autoload.php',
                    '--no-progress',
                    '--error-format=json',
                    $directory . '/' . $filename,
                ],
                $root,
                timeout: 60
            );
            $process->run();

            $report = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);

            self::assertSame([], $report['errors'], $process->getErrorOutput());
            self::assertSame($expected === null ? 0 : 1, $process->getExitCode(), $process->getOutput() . $process->getErrorOutput());

            if ($expected !== null) {
                self::assertSame($expected, $report['files'][$directory . '/' . $filename]['messages'][0]['identifier']);
            }
        } finally {
            $filesystem = new Filesystem;
            $filesystem->deleteDirectory($directory);
        }
    }
}
