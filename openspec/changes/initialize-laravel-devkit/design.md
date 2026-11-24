# Design

## Context

See [proposal.md](proposal.md) for motivation and
[development-toolkit](specs/development-toolkit/spec.md) and
[agent-development-workflow](specs/agent-development-workflow/spec.md) for contracts.
This is a new independent repository with an OpenSpec scaffold and no implemented
Composer package. Its first adopter has a separate adoption change; private
adopter inventories and operational procedures stay outside this repository.

## Goals / Non-Goals

**Goals:** One versioned source for portable standards and executable integrations,
explicit consumer policy, safe resource updates and observable verification.

**Non-Goals:** Run an application, copy an adopter's private implementation or
release policy, publish during setup, or require every consumer to use one agent.
The architecture prescribed to consuming sites does not prescribe the devkit's
own internal directories.

## Decisions

### 1. Ship one Composer library from one repository

Use one versioned library containing standards, resource templates, shared
configuration, PHPStan extensions and the Node agent engine. Do not start with
multiple repositories, a Composer plugin or a hosted policy server. Consumers
install it directly in root `require-dev`, record their lockfiles and explicitly
prepare selected integrations.

The project is named AI Devkit; the selected package identity is `svchk-dev/ai-devkit`; original work is proposed
for MIT licensing. Confirm the remaining license/publication choices before distribution. Keep `composer.json`
without a manual version; derive releases from immutable tags. This planning
task creates neither Composer metadata nor any remote release.

Keep ecosystem tools as explicit consumer development dependencies initially:
Boost, Pint, Larastan/PHPStan and architecture tooling follow the selected
profile's documented compatible requirements. Do not place dependencies intended
for consumers only in the library's `require-dev`, which is not transitive.
Require only actual library execution dependencies in its own `require`.
Optional Filament, package-host and OpenSpec integrations do not pull their full
stacks into every consumer. Do not run consumer synchronization through dependency
package Composer scripts; invoke the toolkit explicitly from consumer commands.

A local path repository is acceptable for isolated development rehearsals.
Final consumer adoption uses a portable versioned source. A public release and
remote registration require their own authorization and successful candidate
checks.

### 2. Organize the toolkit by tooling responsibility

Proposed internal layout:

```text
standards/                  Shared engineering documents and profile guidance
config/                     Shared Pint/PHPStan/architecture configuration
src/                        PHP convention extensions and resource preparation
bin/                        Explicit toolkit entry points
resources/boost/            Toolkit-owned Boost guidelines and skills
agent-runtime/              Node state, checks, review and client observation
adapters/codex/             Client integration templates
tests/                      Tool behavior and isolated consumer fixtures
docs/                       Installation, ownership, compatibility and releases
openspec/                   This toolkit's contracts and changes
```

These are tooling boundaries, not empty directories to create before a consumer
or implementation requires them. Adopt a documented tooling-internal architecture
exception for this repository rather than forcing its own code into site delivery
areas. Use direct command boundaries; no Laravel events, service provider boot
side effects or product lifecycle abstractions are needed.

### 3. Make site architecture a shared overridable default

For consuming Laravel sites and packages, describe feature-first shared business
under `Main`, with delivery areas `Admin`, `Web`, `Console`, `Api` and
additional named areas where needed. `OtherDomains` is an extension category,
not a required literal folder. Each delivery area depends on itself and Main;
Main has no delivery dependency. An explicit composition root wires areas.

Parameterize source root and namespace: an application can use `app/` and
`App`, while a package can use `src/` and its own vendor namespace. Place
service entry points at component roots and use meaningful local role groups for
typed objects. Do not generate unused areas or migrate existing files during
installation.

An alternative architecture must be explicit in project rules with matching
adapter settings. The adapter names its local rule source and alternative
dependency policy; it must not silently disable all architecture verification.
Initial fixtures cover both the shared default and an explicitly documented
framework-native alternative. An undeclared conflicting layout gets actionable
feedback, not automatic rewriting.

Alternative: enforce the first adopter's namespace and exact feature matrix.
Rejected because the shared default is a generic policy; each adopter owns its
stricter feature relationships.

### 4. Keep a small consumer adapter and clear ownership

Use a repository-local `devkit.json` with a documented schema for selected
profiles, source roots/namespace, architecture/override rule reference, command
argv, standards map, required checks, relevant input sets, reviewer extensions
and managed targets. Secrets and trust grants are not adapter settings.

Validate adapter structure and contained paths before writes. Invoke commands as
argument arrays without shell concatenation. Reject unsupported configuration
rather than inferring a different project or weakening a check.

Toolkit documents are canonical package resources. Consumers retain their own
`AGENTS.md`, domain rules and entry-point links. Generate managed local resources
only where agent discovery or self-contained documentation needs them. Record
version, source digest, file ownership and last-written hashes in a small tracked
resource manifest. Store operational task state separately in ignored local files.

Before changing output, plan every target and check ownership/conflicts. Stage
replacement files and make the update recoverable: a failed operation leaves the
prior usable managed set, with explicit recovery information if final replacement
cannot complete. Removal deletes only unchanged owned files/regions. Validate
non-default source roots, path traversal, symlink boundaries, filenames with
spaces, repeat preparation, stale targets and locally edited managed files.

The managed consumer entry point must identify AI Devkit as a separate package
and link to the rule-ownership standard. Before recording a new instruction,
classify it as a reusable default, an optional-profile practice, a consumer
business rule or an intentional local exception. Shared changes belong in the
authorized toolkit source checkout; if it is unavailable, prepare an upstream
change proposal rather than silently accumulating a competing local rule.
Never edit vendor files or generated snapshots. New toolkit releases and explicit
resource refresh carry shared changes back to consumers.

Source repository access and publication remain separately authorized actions.
Do not infer a source checkout or private project from a package installation.
Examples and distributed metadata must remain neutral across all consumers.

### 5. Compose with upstream tools

Expose toolkit-owned guidance/skills through Boost's supported
`resources/boost/guidelines` and `resources/boost/skills` lookup. The toolkit is
a direct consumer dependency so current Boost third-party discovery can see it.
Use distinctive names and no competing output owner.

Boost remains the source for Laravel/testing/convention-inference skills;
OpenSpec remains the source for its generated workflows. Keep original notices
and versions for redistributed material. Generic commit formatting and reusable
review/workflow guidance can be toolkit-owned; product release procedures are
adapter/local-policy concerns.

Pint uses an explicit effective config composed from shared rules and consumer
exclusions; PHPStan uses supported includes with accurate paths/bootstrap.
Generalize namespace-sensitive convention checks with native framework-contract
exceptions. Use configurable architecture rules for the default area matrix and
permit adopter refinements. Keep semantic review for responsibility, logical
blocks, current production consumers and justified events/caching.

### 6. Separate agent machinery from product policy

Port reusable Node lifecycle/state/input-watching/check/review/completion machinery
behind adapter settings. The first supported integration is Codex; keep protocol
normalization separate from policy and document observed coverage only.

Bind evidence to actual commands and exits, task/baseline/scope, consumer inputs,
shared standards, adapter settings, dependency selection and the installed toolkit
code/resources used. Installed package content and development-linked targets
need declared identities and observation; lockfile identity alone is insufficient.
A changed-and-restored input during a check remains unstable.

Retain separate observed reviewer provenance, current trust/client identity,
bounded completion, per-task/worktree isolation and reporting-only receipt reuse.
Do not auto-trust hooks, inspect full transcripts, copy credentials into state,
add a production monitoring service or allow self-authored passed receipts.
Manual obligations remain when integration coverage is unavailable.

### 7. Prove reuse independently and prepare public distribution

Establish the toolkit's own pinned local tooling, Make/check commands and CI
definition during implementation. Start with the verified PHP 8.5/Laravel 13
toolchain and pinned Node/OpenSpec versions used for the initial adapter.
Document the actually tested combinations; do not claim older-version support
without additional evidence. Version-specific recommendations use consumer
metadata rather than hard-coded first-adopter PHP patch versions.

Use isolated application/default-layout, application/explicit-override and package
fixtures. The application fixtures must not depend on the first adopter's package,
credentials, namespace, Workbench or proprietary policies. Verify locked install,
quality diagnostics, ownership conflicts, update/saved-lock restoration,
integration removal and runtime installation without the toolkit.

For public readiness, establish a source/provenance ledger, an explicit license,
third-party notices, package export rules and review of both staged archive and
Git history. Transfer only reviewed generic material with redistribution rights;
rewrite original generic guidance where direct copying is not authorized.
Automated secret scans supplement human source review; a clean pattern scan alone
cannot establish confidentiality or licensing. Actual public hosting, Packagist
registration and tags remain outside local implementation authorization.

## Risks / Trade-offs

- Shared defaults become inflexible -> Explicit local architecture/policy overrides
  retain unrelated standards and require their own checkable declarations.
- A generic engine imports hidden adopter assumptions -> Inspect dependencies and
  exercise independent namespaces, source roots, check commands and fixtures.
- Resource updates destroy local guidance -> Preflight ownership and stage the
  complete update; test conflict/failure/removal behavior and idempotence.
- Installed tools escape evidence observation -> Include installed and linked
  resource digests, relevant tool versions and current client identity.
- Optional integrations become mandatory dependencies -> Keep their tools explicit
  in the selected consumer profile and verify minimal installs.
- Public output includes private or unlicensed content -> Review provenance,
  export contents and history before publication readiness.
- Synthetic lifecycle tests overstate client support -> Require a real trusted
  installed-client rehearsal for the Codex integration and report limits.

## Migration Plan

1. Establish this repository's independent metadata, licensed generic sources,
   pinned tools and check commands without publishing.
2. Implement quality/resources/profiles and prove isolated application/package
   behavior before extracting the agent engine.
3. Port and verify the configurable engine and real client integration; provide a
   tested toolkit identity to the separate adopter change.
4. Verify update, removal and saved-lock restoration, complete source/export
   review and obtain independent review with actual check evidence.
5. Synchronize specifications and archive only completed implementation. A later
   authorized publication can create the remote/package release.

Rollback restores a consumer's saved dependency set and managed resources while
preserving its local rules, secrets, application data and evidence. Failed
synchronization retains the last usable state and actionable recovery. Toolkit
updates have no application migration or database cleanup operation.

## Open Questions

- Confirm the MIT license and publication destination before
  preparing public metadata or distributing any candidate. Local implementation
  and the generic acceptance matrix do not depend on the final names.
