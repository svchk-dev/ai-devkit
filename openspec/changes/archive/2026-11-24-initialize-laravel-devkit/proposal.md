# Proposal

## Why

Laravel projects need one maintained source for shared engineering practices and
development tooling instead of independent copies in each application or package.
A separately versioned devkit will let consumers adopt those practices explicitly
without acquiring another product's domain rules or production infrastructure.

## What Changes

- Create an independently installable Composer development package with common
  standards and optional Laravel application/package, Filament, OpenSpec and
  Codex integration profiles.
- Distribute only project-owned generic guidance and skills; integrate with
  upstream Boost/OpenSpec resources without taking ownership of their generated
  files or requiring OpenSpec in every consumer.
- Default to feature-first Main/Admin/Web/Console/Api areas and additional named
  areas, with explicit project-rule overrides and no empty area scaffolding.
- Provide shared formatting/analysis conventions and a configurable agent-workflow
  engine; keep commands, source roots, local rules and product contracts in
  consumer adapters.
- Make resource installation, refresh, removal and version changes explicit,
  reproducible and respectful of host-owned files and configuration.
- Verify an independent Laravel application and a package development
  adapter as separate consumers.
- Prepare for public Git hosting and Composer distribution with an explicit
  license/provenance inventory and confidentiality review before publication.
- Give maintainers an agent-led release procedure that selects and verifies an
  immutable version when the owner authorizes sending package changes.

The reusable toolkit and independent consumers are confirmed scope. The
public distribution target is AI Devkit under MIT with package identity
`svchk-dev/ai-devkit`. Each publication follows the owner's authorization
and the public-source review.

Non-goals are product-domain functionality, a site starter, production deployment,
monitoring, content automation, a hosted agent service and unattended publication
without maintainer authorization. Direct development-tool calls are clearer than Laravel
events: no application-domain producer or concrete subscriber is introduced.

Shared-rule changes belong to AI Devkit's source repository; consumer business
rules and explicit exceptions remain consumer-owned. Agents must explain this
classification before recording an instruction and must not silently create a
second local owner. Distributed resources remain independent of any existing or
planned private project identity.

## Capabilities

### New Capabilities

- `development-toolkit`: Versioned development-only installation, shared
  standards, profiles, quality integrations, managed guidance and safe updates.
- `agent-development-workflow`: Consumer-configured context, checks, current
  evidence, independent review and bounded completion for supported agent clients.

### Modified Capabilities

None; this is a new project with no permanent specifications yet.

## Impact

The repository will own package metadata, standards, project-owned skills,
quality-tool configuration, convention rules, agent engine/adapters, isolated
consumer fixtures, documentation and checks. Consumer projects opt in directly;
runtime-only installation must not require the devkit.

Each consumer owns and verifies its adoption independently. This project supplies
generic contracts and verified tooling; consumers supply their own domain policy,
integration changes and acceptance evidence. Private adoption inventories remain
outside this repository.
