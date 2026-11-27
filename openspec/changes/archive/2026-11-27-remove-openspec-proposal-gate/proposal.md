# Proposal

## Why

AI Devkit blocks requested OpenSpec work when a project has an unarchived
change, even when the new work is independent. The shared toolkit should let
the project's OpenSpec workflow handle change creation directly.

## What Changes

- Remove the proposal-specific Codex check, the separate approval flow, and
  the guarded OpenSpec wrapper.
- **BREAKING** Remove the retired policy section from the adapter schema and
  runtime configuration. Remove its references from maintained guidance and
  fixtures.
- Use the project's OpenSpec CLI to scaffold independently named changes and
  keep ordinary Codex edit guidance available for their artifacts.

## Capabilities

### New Capabilities

### Modified Capabilities

- `agent-development-workflow` defines how the toolkit integrates with native
  OpenSpec change authoring in an active development session.

## Impact

The toolkit's event dispatcher, OpenSpec wrapper, adapter, and regression tests
are affected. This change belongs in AI Devkit because Composer consumers
execute the shared dispatcher selected by their project lock.
