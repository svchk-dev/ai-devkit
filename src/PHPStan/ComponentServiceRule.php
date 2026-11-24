<?php

declare(strict_types=1);

namespace Svchk\Devkit\PHPStan;

use PhpParser\Node;
use PhpParser\Node\Stmt\Class_;
use PHPStan\Analyser\Scope;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

/** @implements Rule<Class_> */
final class ComponentServiceRule implements Rule
{
    public function __construct(
        private string $projectNamespace = 'App',
        private bool $useAreaLayout = true
    ) {}

    public function getNodeType(): string
    {
        return Class_::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (!$this->useAreaLayout) {
            return [];
        }

        $prefix = preg_quote($this->projectNamespace, '/');
        $namespaceViolation = preg_match('/^' . $prefix . '\\\\[A-Z][A-Za-z0-9]*\\\\[^\\\\]+\\\\Services(?:\\\\|$)/', $scope->getNamespace() ?? '') === 1;

        if (!$namespaceViolation) {
            return [];
        }

        $declaration = ($scope->getNamespace() ?? '') . '\\' . ($node->name?->toString() ?? 'anonymous class');

        return [RuleErrorBuilder::message('[DEVKIT-COMPONENT-SERVICE] ' . $declaration . ': place service entry points at the component root without a Services subdirectory.')
            ->identifier('devkit.componentService')
            ->tip('standards/coding.md#classes-and-typed-objects')
            ->build()];
    }
}
