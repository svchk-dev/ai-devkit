# Changelog

## Unreleased

## v0.6.0 (2026-11-27)

- Create changes with the project's OpenSpec CLI. **Breaking adapter change.**
  Keep `openspec` only as an entry in the adapter's `profiles` list, then run
  `vendor/bin/devkit.mjs sync`.

## v0.5.1 (2026-11-25)

- Allow `add-to-codex` to use temporary directories below an empty `.git`
  placeholder while continuing to reject paths inside a Git checkout.

## v0.5.0 (2026-11-25)

- Add `vendor/bin/devkit.mjs add-to-codex` to install or reuse the shared
  Codex plugin and opt the current project into its trusted hooks.
- Bundle `openspec-push-changes` for Codex and Composer skill discovery. It
  follows the current project's OpenSpec and release policy.

## v0.4.0 (2026-11-25)

- Allow consumers to declare additional runtime verification paths in `.devkit`.
- Validate project settings with the selected package when dispatching client hooks.

## v0.3.0 (2026-11-25)

- Add a shared Codex plugin for opted-in, trusted projects. It loads the
  dispatcher from the AI Devkit package selected by each project's Composer lock.
- Add package-owned Pint and PHPStan commands configured through `.devkit`.
- Keep new single-file operational state under the ignored Composer directory.
- Apply adapter-scoped references to native edits before they run.

## v0.2.0 (2026-11-24)

- Add the single-file `.devkit` Composer setup. Explicit sync creates or
  refreshes package metadata without overwriting local settings.
- Read shared resources from the installed package in single-file mode.
  Existing snapshot-based consumers remain supported.
- Invalidate documentation receipts when OpenSpec screenshots or documentation
  checker inputs change.

## v0.1.0 (2026-11-24)

- Introduce shared Laravel coding standards, architecture defaults, optional
  profiles and Composer-managed instructions and skills.
- Provide configurable Pint, PHPStan and Deptrac integrations and a
  consumer-owned adapter for verification and Codex hooks.
- Verify independent Laravel application and package adoption, including
  development-only installation, resource updates and recovery.
