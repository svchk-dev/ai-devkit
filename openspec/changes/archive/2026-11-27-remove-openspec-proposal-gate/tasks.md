# Tasks

## 1. Restore native change authoring

- [x] 1.1 Remove the proposal module, guarded wrapper, specialized dispatcher
  branches, and helpers and tests that only served those branches. Move the
  existing shell parser into the dispatcher. Run the dispatcher and workflow
  Node tests for generic shell write bookkeeping, native edit guidance and
  reviewer isolation.
- [x] 1.2 Remove stale references from the maintained source inventory and
  current guidance. Search source, tests, configuration and distributed resources
  for obsolete names, messages and fixtures. Verify that the ordinary OpenSpec
  profile and generated authoring workflow still use the project's CLI.

## 2. Retire adapter policy

- [x] 2.1 Delete the obsolete section from runtime adapter validation, the JSON
  schema, the repository adapter and fixtures. Run the existing adapter tests
  and check that current adapter files load through ordinary validation.
- [x] 2.2 Apply the AI Devkit release skill and add an `Unreleased` entry that
  describes the supported OpenSpec authoring workflow. Verify the final
  documentation and change together with `make check-docs`.

## 3. Verify consumer behavior

- [x] 3.1 Run `make test-node`. In a disposable project with an existing open
  change, run successive scaffold commands through the project-local OpenSpec
  CLI and exercise Codex preflight for the command and artifact edits. Compare
  the existing artifacts before and after. Repeat through the trusted shared
  plugin when available and record actual client coverage.
- [x] 3.2 Obtain an independent read-only review of the final owned scope and
  verification, and resolve confirmed findings before completion.
