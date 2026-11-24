# Source provenance

Original toolkit code, documentation and resource templates use the repository's
MIT license. Public releases require explicit owner authorization and review of
the exact files selected for distribution.

| Resource | Source and ownership | Distribution treatment |
| --- | --- | --- |
| Shared standards and profiles | Original generic engineering guidance prepared for this toolkit | MIT; product-specific examples and procedures excluded |
| PHP convention rules and agent workflow | Development tooling extracted/generalized from the owner's existing project | Review exact transferred files and remove adopter-specific policy before public readiness |
| OpenSpec-generated project skills | OpenSpec 1.14.3, MIT, author OpenSpec | Generator-owned development resources; excluded from Composer exports |
| Boost-generated Laravel/testing/inference skills | Laravel Boost, MIT, author Laravel | Not bundled or forked here; consumers obtain them from Boost |
| Composer/npm dependencies | Their upstream package metadata and licenses | Lockfiles retain identity; vendor/node_modules are excluded from exports |

Private product implementations, private repository URLs, access procedures,
credentials, environment files, operational state and transcripts are outside the
transfer set. Public readiness requires both a source/history review and a
reviewed export archive; a secret-pattern scan alone is insufficient.

## Maintained source inventory

| Paths | Origin and treatment |
| --- | --- |
| standards/*, docs/*, README.md, AGENTS.md | Original generic documents; product-specific contracts and identifiers are excluded |
| src/PHPStan/* | Owner-authored convention tooling, generalized to consumer namespaces and explicit architecture policy |
| agent-runtime/checks.mjs, context.mjs, environment.mjs, repository.mjs | Owner-authored workflow mechanisms with adapter-owned commands, paths and executed-toolkit identity |
| agent-runtime/state.mjs, tasks.mjs, runner.mjs, review.mjs, completion.mjs | Owner-authored evidence/state/reviewer mechanisms; no product release or business policy |
| agent-runtime/compatibility.mjs, dispatcher.mjs, protocol.mjs, proposals.mjs, watch.mjs, conventions.mjs, cli.mjs | Owner-authored generic client/workflow mechanisms; generated lifecycle evidence is excluded |
| agent-runtime/adapter.mjs, resources.mjs, toolkit-watch.mjs, architecture.mjs | Original toolkit integrations |
| config/*, bin/*, adapters/*, resources/boost/* | Original shared configurations, entry points and distinctive templates/skills |
| tests/*, tooling/*, Makefile, Dockerfile, manifests and CI | Owner-authored development/acceptance support with generic disposable fixtures |
| .agents/skills/openspec-*/SKILL.md | Generated OpenSpec resources retaining metadata; license reproduced in THIRD_PARTY_NOTICES |

This ledger describes origins without importing a private repository inventory
or naming any private consumer. The owner requested extraction of reusable
development practices; no production implementation is transferred.
The owner selected MIT for the public toolkit. Review each exact candidate,
including all selected original and derived sources, before distribution. Dependency
licenses remain with their separately installed packages. The
[third-party notices](../THIRD_PARTY_NOTICES) retain the bundled generator notice.
