# Proposal

## Why

Composer and `.devkit` provide a single-file setup, but consumers still need
local copies or adapters to connect quality commands and Codex hooks. Provide
those entry points from AI Devkit so new projects can reuse the shared policy.

## What Changes

- Run Pint and PHPStan from the installed package using `.devkit` settings.
- Supply one reusable Codex integration that selects each trusted project's
  installed AI Devkit. Keep the existing native project template compatible.
- Deliver the installed standards, skill and reviewer references from the
  active project adapter while preserving client trust and local exceptions.

## Capabilities

### Modified Capabilities

- `development-toolkit`: Run shared quality commands with single-file settings.
- `agent-development-workflow`: Load the selected project's workflow through a
  client-level Codex integration without per-project hook configuration.

## Impact

AI Devkit gains package-owned quality commands and a reusable Codex plugin
entry point. Composer and sync retain their existing project file scope.
Client activation and publication remain explicit.
