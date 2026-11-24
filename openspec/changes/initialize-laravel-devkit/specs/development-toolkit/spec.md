# Spec Delta

## Purpose

Provide independently versioned engineering guidance and development tools that
Laravel applications and packages can adopt without another product's domain.

## ADDED Requirements

### Requirement: Reproducible development-only installation

The toolkit SHALL support explicit versioned installation as a project's
development dependency. Locked installation MUST reproduce the selected toolkit
without installing another product or changing application behavior. Runtime-only
consumer installation MUST remain independent of the toolkit.

#### Scenario: Install into an unrelated Laravel application

- **WHEN** a supported Laravel application installs the toolkit for development
- **THEN** its selected tooling is available without another product dependency or product-domain configuration
- **AND** no application records, routes, authentication defaults or deployment settings are changed

#### Scenario: Reinstall locked dependencies

- **WHEN** a project repeats installation from its committed dependency lock
- **THEN** it receives the same resolved toolkit version and selected resources
- **AND** no floating remote instructions are fetched as an implicit update

#### Scenario: Install application runtime dependencies only

- **WHEN** the application is installed without development dependencies
- **THEN** its normal runtime requires no toolkit, local agent configuration or development-tool service

### Requirement: Explicit and independent integration profiles

The toolkit SHALL separate common engineering policy from optional integration
profiles. Applications and packages MUST select their own paths, commands and
extensions. Unselected integrations MUST NOT impose their dependencies, product
structure or workflow requirements.

#### Scenario: Use the application profile

- **WHEN** a project selects common Laravel application tooling without package-host or specification tooling
- **THEN** quality checks use its application paths and declared commands
- **AND** no package Workbench or OpenSpec project is required and the shared architecture default remains explicitly overridable

#### Scenario: Use a package or optional integration profile

- **WHEN** a project explicitly selects a supported package, administrative UI, specification or agent integration
- **THEN** the integration uses its declared prerequisites and local adapter
- **AND** missing or incompatible prerequisites are reported rather than silently skipped

### Requirement: Discoverable shared standards and local policy

Consumers SHALL have a documented entry point to applicable shared standards and
their own rules. Shared resources MUST identify their source version and owner.
Local additions and explicit exceptions MUST remain distinguishable from shared
defaults without editing the installed toolkit.

#### Scenario: Resolve an affected concern

- **WHEN** an agent or developer follows the consumer's instructions for an affected path
- **THEN** the applicable common rules, selected profile and local requirements are discoverable
- **AND** the shared defaults contain no first-adopter business invariants

#### Scenario: Declare a local exception

- **WHEN** a consumer needs an explicit exception to a shared default
- **THEN** its adapter or local guidance records the exception and rationale
- **AND** unrelated shared rules and that consumer's own mandatory requirements remain applicable

### Requirement: Executable quality integrations

The toolkit SHALL provide reusable formatting, type-analysis and objective
convention integrations. They MUST respect configured source roots, supported
language versions and framework contracts. Failed checks MUST identify the
applicable rule and source location without rewriting files in verification mode.

#### Scenario: Check supported source

- **WHEN** a consumer runs its selected read-only quality checks
- **THEN** violations produce a failing result with actionable diagnostics
- **AND** generated dependencies and excluded applied migrations remain unchanged

#### Scenario: Preserve an external callback contract

- **WHEN** a dependency argument name is required by a supported external contract
- **THEN** the checker preserves that contract rather than demanding a breaking rename

### Requirement: Safe managed resource lifecycle

Resource installation, update and removal SHALL operate only on explicitly
managed files or regions. Conflicting ownership and locally edited managed output
MUST be detected before replacement. Failed preparation MUST preserve the prior
usable files and MUST NOT report successful synchronization.

#### Scenario: Install or refresh twice

- **WHEN** the same selected resources are prepared repeatedly without changed inputs
- **THEN** the resulting output is identical and duplicate instructions or skills are not created
- **AND** host-owned instructions, configuration, secrets and local rules retain their content

#### Scenario: Detect a conflict before replacement

- **WHEN** a managed target was edited locally or belongs to another generator
- **THEN** preparation identifies the conflict and fails before replacing existing managed output
- **AND** a partial new state is not reported as a successful update

#### Scenario: Remove a selected integration

- **WHEN** a consumer explicitly removes an integration
- **THEN** only its unchanged managed resources are removed
- **AND** local additions and resources owned by other tools remain available

### Requirement: Preserve upstream resource ownership

The toolkit SHALL integrate with upstream-generated guidance and skills without
silently forking them or competing for the same installed target. Custom resources
MUST have explicit ownership and retain required attribution and license notices.

#### Scenario: Refresh upstream tooling

- **WHEN** a consumer refreshes its upstream-generated resources
- **THEN** toolkit-owned resources and local instructions retain their declared ownership
- **AND** overlapping targets are reported rather than chosen by accidental write order

### Requirement: Reviewable version transitions

Toolkit updates SHALL expose the changed standards, profiles and generated
resources for review. Compatibility and adoption steps MUST be documented.
Returning to a saved supported version MUST restore its tooling and unchanged
managed resources without resetting application data or local policy.

#### Scenario: Adopt and return from an update

- **WHEN** a consumer updates the selected toolkit and later restores its saved dependency set
- **THEN** checks and managed resources correspond to the selected version on each transition
- **AND** local configuration, domain rules and application data remain intact

### Requirement: Public distribution readiness

A public toolkit candidate SHALL have explicit licensing, recorded third-party
provenance and a reviewed publication file set. Credentials, private procedures,
proprietary implementation and agent state MUST be excluded. Public visibility
discussion MUST NOT itself trigger remote creation or publication.

#### Scenario: Assess a public candidate

- **WHEN** a release candidate is prepared for public distribution
- **THEN** its included files and history are checked for confidentiality and redistribution rights
- **AND** unresolved licensing or confidentiality findings prevent publication readiness

#### Scenario: Discuss public distribution

- **WHEN** public hosting or package distribution is discussed without an instruction to publish
- **THEN** work remains local and no remote repository, package registration or release is created

### Requirement: Agent-led toolkit versioning

Repository agent instructions SHALL direct the agent to establish release impact
from the full unreleased package diff and to maintain the changelog. Composer
versions SHALL come from immutable annotated semantic version tags.

#### Scenario: Publish package-impacting updates

- **WHEN** the owner authorizes a maintainer push that includes a package release
- **THEN** the agent selects the smallest compatible unused version from the remote tag baseline and full unreleased change set
- **AND** the agent verifies the exact public candidate, creates and pushes its annotated tag and checks a fresh locked Composer install without requesting a separate tag action

#### Scenario: Maintain the repository without publishing a new version

- **WHEN** the agent only prepares work locally, is authorized for a branch-only push, or finds that the unreleased changes have no package impact
- **THEN** the agent retains pending release notes where relevant and creates no new release tag

#### Scenario: Fail a release gate

- **WHEN** required evidence fails, the source changes, or a conflicting tag exists
- **THEN** the agent stops the affected release and preserves every published tag
- **AND** a post-tag failure is reported with the published source identity and failed check

### Requirement: Default feature-first area architecture

The shared architecture SHALL default to feature-first shared business and
separate delivery areas. Shared business MUST NOT depend on delivery areas; each
delivery area MUST depend only on itself and shared business. Another architecture
MUST be explicitly declared in project rules. Unused areas MUST NOT be created
solely to satisfy the default.

#### Scenario: Adopt the default architecture

- **WHEN** a consumer has not declared another architecture
- **THEN** applicable guidance and checks use the shared Main and Admin/Web/Console/Api area convention with additional named areas when needed
- **AND** source root and namespace belong to that consumer rather than to the first adopter

#### Scenario: Declare an alternative architecture

- **WHEN** project rules explicitly declare another structure and dependency policy
- **THEN** its adapter applies that policy instead of the default area checks
- **AND** unrelated standards remain applicable without editing shared resources

#### Scenario: Preserve an existing application on installation

- **WHEN** an existing application installs the toolkit
- **THEN** installation does not move files or generate empty delivery areas
- **AND** the developer must adopt the default or explicitly record the existing alternative before architecture verification can pass

### Requirement: Classify rule changes by their canonical owner

Agents using the toolkit SHALL identify the owner of a proposed instruction
before recording it. Reusable engineering defaults and optional-integration
practices MUST be proposed or changed in the toolkit source repository;
consumer-specific business rules and intentional exceptions MUST remain local.
Agents MUST NOT silently compensate for a missing shared rule by creating a
second maintained consumer copy, or edit installed/generated toolkit resources.

#### Scenario: Discover a reusable engineering rule

- **WHEN** work in a consumer reveals a practice applicable to independent Laravel projects
- **THEN** the agent identifies AI Devkit as its canonical owner and explains that classification
- **AND** changes its authorized source checkout or prepares an upstream change proposal if source access is unavailable
- **AND** adoption uses an explicit dependency/resource update rather than a silent local rule

#### Scenario: Discover a consumer-specific rule

- **WHEN** an instruction describes product behavior, environment policy or an intentional project exception
- **THEN** the agent records it in consumer-owned rules with its scope and rationale
- **AND** no product identity, business invariant or private operational detail is introduced into toolkit resources

#### Scenario: Use the toolkit outside its author's projects

- **WHEN** an unrelated project inspects or adopts the distributed toolkit
- **THEN** guidance and tooling require no knowledge of existing or planned private projects
- **AND** examples, metadata and distributed resources contain no private project identities or access procedures
