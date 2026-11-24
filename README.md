# AI Devkit

**A shared engineering framework for AI-assisted Laravel development.**

AI Devkit gives Laravel applications and packages one versioned source of coding
standards, architecture conventions, agent skills and verification tools. Adopt
the same engineering practices across projects while keeping each project's
business rules and explicit exceptions local.

The Composer package is **svchk-dev/ai-devkit**, installed directly as a
development dependency. See the [toolkit specification](openspec/specs/development-toolkit/spec.md)
for the supported contract.

## Why it exists

Copying an AGENTS.md file, a collection of skills and several quality scripts
into every repository creates separate versions of the same practices. Fixing a
rule in one project does not update the others, and project-specific assumptions
can spread unnoticed.

AI Devkit makes that shared layer an explicit dependency. Projects choose when to
adopt a version, review changes to its rules and retain ownership of their domain
contracts. The agent receives discoverable guidance; developers receive commands
and evidence they can inspect.

## What it provides

| Layer | Responsibility |
| --- | --- |
| Engineering standards | Readable code, focused responsibilities, meaningful tests, collaborator naming, logical blocks, accurate types and Laravel boundaries |
| Architecture defaults | Feature-first Main/Admin/Web/Console/Api areas, component-root services and explicit project overrides |
| Quality integrations | Shared Pint settings, PHPStan configuration and objective convention rules; configurable Deptrac area checks |
| Agent skills | Toolkit-owned commit, review and change-workflow guidance that consults local project policy |
| Managed resources | Explicit preparation, source identity, tracked ownership, conflict detection and recoverable refresh/removal |
| Agent workflow engine | Task scope, current project context, declared checks, input freshness, separate reviewer provenance and completion checkpoints |

Shared documents describe engineering policy. Executable checks enforce selected
objective rules. Responsibility boundaries, useful abstractions and business
correctness still require human or independent agent review.

## Shared defaults, local decisions

The toolkit owns reusable engineering practices. A consuming project owns its
AGENTS.md, product specifications, authorization rules, deployment configuration,
release policy and any documented exceptions.

The **.devkit** adapter can supply the project's namespace, source
roots, selected integrations, check commands, reference documents and reviewer
additions. It connects the shared tools to that project's actual environment.
Installation does not grant an agent permission to publish, deploy or change
application data.

```text
AI Devkit, versioned development dependency
    ├── Shared standards and skills
    ├── Quality configuration and convention checks
    └── Agent workflow machinery
                  │
           Project adapter
                  │
    ┌─────────────┼──────────────────┐
    │             │                  │
Laravel app   Laravel package   Another Laravel project
Local rules   Local rules       Local rules
```

When work reveals a new reusable rule, the agent must identify AI Devkit as its
owner and change its source repository or prepare an upstream proposal. Business
rules and intentional exceptions stay in the consumer. Agents must explain this
choice before recording a rule; shared improvements must not silently become
duplicated local standards. See [rule ownership](standards/rule-ownership.md).

## Architecture for consuming projects

The default organizes code by feature within shared business and delivery areas:

```text
app/                         # A package can use src/ or another declared root
├── Main/
│   └── Orders/
│       ├── Models/
│       └── OrderService.php
├── Admin/Orders/
├── Web/Orders/
├── Console/Orders/
└── Api/Orders/               # Only when an API is actually implemented
```

Main depends only on Main within the project. Each delivery area depends on itself
and Main; explicitly declared composition roots wire areas together. Add another
named area only when the project needs that boundary. No empty delivery areas or
literal OtherDomains directory are required.

Existing applications are not restructured automatically. A project can keep
another architecture by documenting it locally and declaring its actual
verification command in the adapter. That exception replaces architecture
defaults while preserving unrelated standards.

This layout describes **consuming applications and packages**. AI Devkit itself
uses directories organized by tooling responsibility.

## Optional integrations

| Integration | When it applies |
| --- | --- |
| Laravel application | Uses the application's own namespace, source roots and tooling commands |
| Laravel package | Uses package roots and an explicitly installed Testbench host |
| Filament | Adds administrative-interface standards only for projects using Filament |
| OpenSpec | Uses the project's existing specifications and selected change workflow |
| Codex | Connects the workflow engine to explicitly activated, trusted client hooks |
| Laravel Boost | Discovers distinctive toolkit-owned guidelines and skills from a direct dependency |

Filament and OpenSpec are optional. A project without them does not need to
install them or follow their integration-specific rules. Boost and OpenSpec
retain ownership of their generated ecosystem resources; AI Devkit does not
silently fork those resources.

Codex is the initial agent integration. Other agent clients can be added through
separate adapters; support for them is not currently claimed.

## How adoption works

Install from Packagist as a root Composer development dependency, then run sync
from the project root:

```sh
composer require --dev svchk-dev/ai-devkit
vendor/bin/devkit.mjs sync
```

Sync creates one project-owned JSON file named **.devkit**. Commit it with
composer.json and composer.lock. It records the selected toolkit and points to
shared standards and skills in the installed package. Edit the file to select
optional integrations and record project settings. The installed version stays
the canonical source for shared rules and tools.

Run `vendor/bin/devkit.mjs sync` after installing or updating locked
dependencies. It refreshes toolkit metadata and preserves local settings.
Use `vendor/bin/devkit.mjs sync --check` to validate setup without writing.
Composer installation does not run this command itself. Codex hook activation
and trust are explicit client actions. Install the shared Codex plugin once and
select the `codex` profile in `.devkit` in each participating repository. The
plugin loads the rules and hooks from the project's locked Composer package.
Run `vendor/bin/devkit.mjs format` and `vendor/bin/devkit.mjs analyse` to apply
the installed quality defaults and any overrides selected in `.devkit`.

See the [adapter guide](docs/adapter.md) for settings and
[installation, update and recovery](docs/usage.md) for the full workflow and
migration from the earlier snapshot layout.

Runtime-only installation requires no toolkit or agent process.

## Verification and current status

Implemented locally: shared standards, the consumer adapter, managed resources,
quality integrations and the configurable workflow engine. Local regression
tests cover resource conflicts/recovery, check outcomes, reviewer provenance and
changes to installed or development-linked toolkit inputs.

Independent local acceptance has exercised an application with the default
architecture and a separate namespace, an application with an explicit native
layout override, and a package booted through Testbench. Synthetic immutable
Composer artifacts cover updates, saved-lock restoration, managed removal and an
HTTP probe after runtime-only installation.

The project-local Codex integration was exercised with actual lifecycle events,
including scope recovery, native and shell edits, delayed check completion,
separate review, Stop feedback and interruption. See the
[acceptance evidence](openspec/changes/archive/2026-11-24-initialize-laravel-devkit/evidence.md)
for the tested client identity and scope.

The development baseline is PHP 8.5, Laravel 13 and Node 26. See
[development](docs/development.md) for exact pins and commands. Wider platform
support requires its own verification.

AI Devkit supplies development guidance and tooling. Application scaffolding,
production monitoring, content-generation services and deployment automation are
separate projects.

## Developing AI Devkit

Read [AGENTS.md](AGENTS.md) and the [documentation map](docs/index.md). With the
documented Node/npm, Docker and Make requirements:

```sh
make setup
make check
```

The full gate runs formatting, type analysis, PHP/Node tests and
documentation/OpenSpec validation. Individual commands are listed in
[development](docs/development.md). Changes to supported behavior follow this
repository's own OpenSpec workflow and receive separate independent review.

## License and publication

AI Devkit uses the [MIT license](LICENSE). See
[source provenance](docs/provenance.md) and
[third-party notices](THIRD_PARTY_NOTICES).
Maintainers use the [release policy](docs/releases.md) to verify and publish
version tags.
