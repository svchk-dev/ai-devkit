# Coding standards

Apply these defaults to maintained source, tests, templates and executable
fixtures. Keep changes focused on the authorized behavior. Preserve explicit
framework contracts and the consumer's documented local exceptions.

## Readability and responsibility

Use concrete domain names, explicit dependencies and straightforward control
flow. Keep methods focused without arbitrary line limits. Extract cohesive private
helpers for substantial internal steps and focused collaborators for independent
responsibilities with their own dependencies. Do not split a small workflow into
one class per statement. Keep useful protected extension contracts intact.

Use pragmatic SOLID: introduce interfaces, base classes, repositories and layers
for a current responsibility or supported extension, not by symmetry. Eloquent
can serve straightforward persistence directly. A repository is useful for a
meaningful data-access boundary, repeated domain queries or shared lock ordering;
avoid generic CRUD wrappers and universal base repositories.

Prefer Laravel facilities and maintained compatible packages before custom
infrastructure. Check installed versions and official documentation. Propose a
missing dependency with its purpose, compatibility and runtime/development scope.
Do not infer runtime availability from the development environment.

Validate external inputs, permissions and business invariants at supported
boundaries. Repeat a guard where another entry point requires it; avoid redundant
guards for conditions guaranteed by types or contracts. Catch failures where they
can be handled meaningfully, not to hide them behind empty catches or fallbacks.

## Production and test boundaries

Every production method must serve a current runtime workflow, required framework
or extension contract, or substantive supported business operation. Do not add
accessors, forwarding wrappers, flags, branches or callbacks solely for tests.
Keep test support in tests. Symmetry, hypothetical callers and tests alone do not
justify an API. Inspect indirect consumers before removing a method: routes,
bindings, callbacks, templates, configured dispatch and supported extensions.

Preserve behavior coverage at the actual production boundary. Remove obsolete
test-only APIs together with assertions of their declaration/delegation; document
supported API removals and named-argument adoption in the project's upgrade notes.

## Dependency and variable names

Name collaborator properties, parameters, locals and closure captures after the
complete declared class/contract short name in lower camel case:

```php
PublicationService $publicationService;
BodySanitizer $bodySanitizer;
ManagedImageUrl $managedImageUrl;
```

Retain `Service` only when it is part of the type name. Use role prefixes for two
instances, such as `$primaryPublicationService`. Repositories, registries,
factories and managers keep their actual role names. Data objects, models and
collections are not services merely because services return them. Use concrete
domain/unit names for other values; plural collections and descriptive booleans.
Concise conventional names remain appropriate when their meaning is clear.

Preserve externally evaluated callback names and interface parameter contracts,
including Filament utilities such as `$record`, `$data` and `$livewire`. Renames
must update captures, properties, PHPDoc, named arguments, bindings and implicit
exported keys. Replace a renamed `compact()` entry with an explicit key when
needed to preserve the external view/payload contract.

## Logical blocks and long expressions

Separate preparation, validation/authorization, transformation, persistence and
feedback/return with one blank line. Separate independent guards, conditional
transformations, initialization from its consuming loop and independent test
scenarios. Keep related statements together, not a blank line after every line.

```php
$account = $accountRepository->find($accountId);

if (!$account->canPublish()) {
    throw new DomainException('Publishing is unavailable.');
}

$publication = $publicationService->publish($account);

return $publication;
```

Write long signatures and calls vertically, one parameter/argument per line,
including nested calls and constructor promotion. Short readable calls may stay
on one line. Do not compress unrelated work to reduce line count. After Pint,
manually read every changed method/callback and complete new file for grouping.

## Classes and typed objects

Name classes for their actual responsibility/result. Keep typed objects local to
their owning feature. Use ViewModels/*ViewModel for prepared template input,
Snapshots/*Snapshot for captured entity facts, Contexts/*Context for passive
operation environment, Inputs/*Input for validated input and Results with concrete
nouns such as Receipt/Preview. Reuse meaningful Delivery, Owners, Descriptors,
Sources, Targets and References groups. Avoid generic Data/Dto/Transport roots,
empty groups, a global DTO layer or an interface for every value type.

Classify by producer/consumer role: readonly syntax, caching and serialization do
not determine that role. Behavior-bearing contexts stay behavior-bearing. Keep
simple scalars, natural maps/lists, models and collections in their existing types.
Prefer immutable named typed properties for genuinely structured service results;
document stream/resource cleanup. Adapt to external arrays only at integration
boundaries. Use `<ResultType>Factory::make()` for DTO construction; preserve useful
input constructors such as `make()` and descriptive validating `fromInput()`.

## PHP syntax and mechanical style

Use explicit parameter/return types and native language features supported by the
consumer's minimum PHP version. Import classes, including PHPDoc references;
use meaningful aliases for collisions. Type class constants where supported.
Use braces for control structures. Use static closures when neither `$this` nor
framework callback binding is needed. Put spaces around concatenation operators.

Group members by trait uses/enum cases, constants, properties, then methods.
For constants/properties/methods, public comes before protected before private;
preserve order within each visibility group. Constructors, magic methods and
test lifecycle methods have no special priority. Keep annotations with members.

Use native enums for finite domain choices, PascalCase enum types and camelCase
cases. Preserve backed values and external contracts. Arbitrary text and open
data-driven sets remain data. Prefer a shared enum for repeated date-format
templates when the project has one; do not invent unused format cases.

For PHP 8.5 consumers, prefer `clone($this, [...])` for simple copy-with updates
and a vertical pipe operator for a clear sequence of transformations. Preserve
order, types and exceptions. Keep direct calls for simple operations and named
helpers/intermediate values when they explain branching more clearly.

## Model, builder and template types

Document actual cast/nullability/relationship values on Eloquent models.
Use writable `@property` and read-only `@property-read`, accurate collection and
relationship generics, immutable date types where applicable and concrete fluent
builder types. Do not repeat explicit native declarations without added value.

Preserve fluent types through scopes, relation callbacks, repository returns and
collection transformations. Use accurate `@mixin`, supported custom-builder
registration and typed locals when framework callbacks erase concrete types.
Do not invent impossible unions/intersections or remove runtime validation to
satisfy an annotation. Configured class/instance dispatch must retain selected
runtime subtypes and explicit `class-string<BaseType>`/instance PHPDoc.

Start maintained Blade templates with non-rendering PHP imports and PHPDoc for
referenced inputs and loop variables, including collection/paginator generics.
Declare variable-free templates explicitly rather than inventing inputs.

## Comments, documentation and scope

Comments explain reasons and constraints; code and names express obvious actions.
Keep unrelated formatting/refactors out of the task. Update relevant technical
documentation with behavior and write it in English using portable commands and
repository-relative links. Do not include secrets, workstation paths, transcripts
or generated dependencies. Never edit vendor code or rewrite applied migrations.
