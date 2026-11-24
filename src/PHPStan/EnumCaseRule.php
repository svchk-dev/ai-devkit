<?php

declare(strict_types=1);

namespace Svchk\Devkit\PHPStan;

use PhpParser\Node;
use PhpParser\Node\Stmt\EnumCase;
use PHPStan\Analyser\Scope;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

/** @implements Rule<EnumCase> */
final class EnumCaseRule implements Rule
{
    public function getNodeType(): string
    {
        return EnumCase::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (preg_match('/^[a-z][a-zA-Z0-9]*$/', $node->name->toString()) === 1) {
            return [];
        }

        $declaration = ($scope->getClassReflection()?->getName() ?? $scope->getNamespace() ?? '') . '::' . $node->name->toString();

        return [RuleErrorBuilder::message('[DEVKIT-ENUM-CASE] ' . $declaration . ': enum case names must use camelCase.')
            ->identifier('devkit.enumCase')
            ->tip('standards/coding.md#php-syntax-and-mechanical-style')
            ->build()];
    }
}
