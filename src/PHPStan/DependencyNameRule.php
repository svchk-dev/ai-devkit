<?php

declare(strict_types=1);

namespace Svchk\Devkit\PHPStan;

use PhpParser\Node;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\FunctionLike;
use PhpParser\Node\Name;
use PhpParser\Node\NullableType;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Property;
use PHPStan\Analyser\Scope;
use PHPStan\Reflection\MethodReflection;
use PHPStan\Reflection\ReflectionProvider;
use PHPStan\Rules\IdentifierRuleError;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

/** @implements Rule<Node> */
final class DependencyNameRule implements Rule
{
    public function __construct(
        private ReflectionProvider $reflectionProvider,
        private string $projectNamespace = 'App'
    ) {}

    public function getNodeType(): string
    {
        return Node::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if ($node instanceof Property) {
            $names = [];

            foreach ($node->props as $property) {
                $names[] = $property->name->toString();
            }

            return $this->checkNames($node->type, $names, $scope, null);
        }

        if (!$node instanceof FunctionLike) {
            return [];
        }

        $errors = [];
        $methodName = $node instanceof ClassMethod ? $node->name->toString() : null;

        foreach ($node->getParams() as $parameter) {
            if (!$parameter->var instanceof Variable || !is_string($parameter->var->name)) {
                continue;
            }

            $errors = [...$errors, ...$this->checkNames($parameter->type, [$parameter->var->name], $scope, $methodName)];
        }

        return $errors;
    }

    /**
     * @param  list<string>  $names
     * @return list<IdentifierRuleError>
     */
    private function checkNames(?Node $type, array $names, Scope $scope, ?string $methodName): array
    {
        $type = $type instanceof NullableType ? $type->type : $type;

        if (!$type instanceof Name) {
            return [];
        }

        $typeName = $scope->resolveName($type);
        $shortName = substr($typeName, (int) strrpos('\\' . $typeName, '\\'));

        if (!$this->isCollaborator($typeName, $shortName)) {
            return [];
        }

        $errors = [];

        foreach ($names as $actual) {
            if ($methodName !== null && $this->requiresExternalName($scope, $actual, $typeName, $methodName)) {
                continue;
            }

            if ($actual === 'events' && $methodName === 'subscribe'
                && in_array($typeName, ['Illuminate\\Events\\Dispatcher', 'Illuminate\\Contracts\\Events\\Dispatcher'], true)) {
                continue;
            }

            $expected = lcfirst($shortName);

            if ($actual === $expected || preg_match('/^[a-z][a-zA-Z0-9]*' . preg_quote(ucfirst($expected), '/') . '$/', $actual) === 1) {
                continue;
            }

            $declaration = ($scope->getClassReflection()?->getName() ?? $scope->getNamespace() ?? '')
                . '::' . ($methodName ?? $scope->getFunction()?->getName() ?? 'property');
            $errors[] = RuleErrorBuilder::message('[DEVKIT-DEPENDENCY-NAME] ' . $declaration . ': name ' . $shortName . ' $' . $expected . ' instead of $' . $actual . '.')
                ->identifier('devkit.dependencyName')
                ->tip('standards/coding.md#dependency-and-variable-names; preserve required external-contract argument names.')
                ->build();
        }

        return $errors;
    }

    private function isCollaborator(string $typeName, string $shortName): bool
    {
        if (!$this->reflectionProvider->hasClass($typeName)) {
            return false;
        }

        $classReflection = $this->reflectionProvider->getClass($typeName);
        $knownRole = preg_match('/(?:Service|Repository|Registry|Factory|Renderer|Sanitizer|Manager|Generator|Resolver|Normalizer|Validator|Presenter|Formatter|Storage|Dispatcher|Provider)$/', $shortName) === 1
            || ($classReflection->isInterface() && str_starts_with($typeName, $this->projectNamespace . '\\')
                && !str_contains($typeName, '\\Data\\') && !str_contains($typeName, '\\ViewModels\\'));

        return $knownRole && !$classReflection->isSubclassOf('Illuminate\\Database\\Eloquent\\Model')
            && !$classReflection->isSubclassOf('Illuminate\\Support\\Collection');
    }

    private function requiresExternalName(Scope $scope, string $name, string $typeName, string $methodName): bool
    {
        $classReflection = $scope->getClassReflection();

        if ($classReflection === null || !$classReflection->hasNativeMethod($methodName)) {
            return false;
        }

        $functionReflection = $classReflection->getNativeMethod($methodName);
        $prototype = $functionReflection->getPrototype();

        if (!$prototype instanceof MethodReflection || $prototype->getDeclaringClass()->getName() === $functionReflection->getDeclaringClass()->getName()
            || str_starts_with($prototype->getDeclaringClass()->getName(), $this->projectNamespace . '\\')) {
            return false;
        }

        foreach ($prototype->getVariants() as $variant) {
            foreach ($variant->getParameters() as $parameterReflection) {
                if ($parameterReflection->getName() === $name && in_array($typeName, $parameterReflection->getType()->getObjectClassNames(), true)) {
                    return true;
                }
            }
        }

        return false;
    }
}
