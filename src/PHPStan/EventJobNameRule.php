<?php

declare(strict_types=1);

namespace Svchk\Devkit\PHPStan;

use PhpParser\Node;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\TraitUse;
use PHPStan\Analyser\Scope;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

/** @implements Rule<Class_> */
final class EventJobNameRule implements Rule
{
    public function __construct(private string $projectNamespace = 'App') {}

    public function getNodeType(): string
    {
        return Class_::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        $namespace = $scope->getNamespace() ?? '';

        if ($node->name === null || !str_starts_with($namespace, $this->projectNamespace . '\\')) {
            return [];
        }

        $traits = [];

        foreach ($node->stmts as $statement) {
            if (!$statement instanceof TraitUse) {
                continue;
            }

            foreach ($statement->traits as $trait) {
                $traits[] = $scope->resolveName($trait);
            }
        }

        $isEvent = str_ends_with($namespace, '\\Events') || in_array('Illuminate\\Foundation\\Events\\Dispatchable', $traits, true);
        $isJob = str_ends_with($namespace, '\\Jobs') || array_intersect($traits, ['Illuminate\\Foundation\\Bus\\Dispatchable', 'Illuminate\\Foundation\\Queue\\Queueable']) !== [];
        $suffix = $isEvent ? 'Event' : ($isJob ? 'Job' : null);

        if ($suffix === null) {
            return [];
        }

        $className = $node->name->toString();

        if (str_ends_with($className, $suffix) && basename($scope->getFile(), '.php') === $className) {
            return [];
        }

        return [RuleErrorBuilder::message('[DEVKIT-EVENT-JOB-NAME] ' . $namespace . '\\' . $className . ': use the ' . $suffix . ' suffix and an identical class/filename.')
            ->identifier('devkit.eventJobName')
            ->tip('standards/coding.md#php-syntax-and-mechanical-style')
            ->build()];
    }
}
