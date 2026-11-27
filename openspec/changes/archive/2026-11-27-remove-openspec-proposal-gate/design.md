# Design

## Context

The dispatcher currently classifies OpenSpec commands and native artifact edits
as proposal creation and tracks a user exception in session state. A separate
wrapper checks the same policy under its own repository lock. The proposal
module also contains a shell parser used for generic write detection.
See [proposal.md](proposal.md).

## Goals / Non-Goals

Keep Codex responsible for project context, write bookkeeping and completion
evidence. OpenSpec owns change scaffolding, name validation and its generated
workflows. The consuming project owns its publication policy.

## Decisions

- Remove proposal-specific classification, denial responses and prompt and
  outcome handling from the dispatcher. Move the existing shell parser into
  the dispatcher for its generic write detection. Delete the proposal module,
  the OpenSpec wrapper and their dedicated lock and path-filter helpers.
- Delete the policy section from runtime adapter validation, the JSON schema
  and the repository adapter. Existing adapter validation rejects the retired
  section as an unsupported setting.
- Remove old policy references and examples from maintained resources and
  fixtures. Describe OpenSpec authoring through the project's CLI in the
  pending release notes.

## Risks / Trade-offs

- The shell parser also recognizes generic edits. Exercise shell write
  detection, native edit guidance and reviewer isolation after removing the
  proposal checks.
- An installed plugin can come from an earlier catalog. Verify that a shared
  installation dispatches to the synchronized Composer version and that the
  selected dispatcher handles the OpenSpec workflow correctly.

## Migration Plan

Consumer owners remove the retired adapter section where present, update the
Composer dependency and run `vendor/bin/devkit.mjs sync`. The standard
saved-lock and adapter restore procedure applies for rollback. See the [update guide](../../../../docs/usage.md#update-or-restore-a-selected-version).
