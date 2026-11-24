# Changelog

## Unreleased

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
