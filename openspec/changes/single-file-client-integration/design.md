# Design

## Single-file quality commands

Expose `format` and `analyse` through the existing Composer executable. Read
local options from `.devkit` and derive the effective Pint and PHPStan
configurations from packaged defaults. The adapter can select an argv prefix
for PHP in a container. Temporarily store effective configurations in the
declared ignored state directory so they are visible on the container mount.
Remove each configuration after execution and return the actual exit status.
Leave legacy snapshots available to existing consumers.

## Reusable Codex entry point

Package a native Codex hook plugin that can be enabled and trusted once through
the client. On relevant events, find the event's repository and read its
`.devkit` selection. Projects without the `codex` profile are skipped. Query
Codex's existing effective configuration and require explicit user trust for
the exact repository before loading any project-installed executable code.
Require agreement between the development manifest, Composer lock, installed
metadata and `.devkit` source identity. Validate the installed path and load
the locked dispatcher from the project. This allows projects to select their
own compatible versions while keeping the shared bootstrap in the client.

Preserve the existing project-local hook template. The compatibility inventory
must distinguish the client plugin and project sources and must report native
trust and lifecycle evidence only when observed. The shared reviewer template
can be registered at user scope once. Core business guidance is declared by each
project. The installer and sync do not edit Codex settings or grant trust.

## Consumer verification paths

Allow the root adapter to name additional code or runtime asset paths in
`inputSets.codePaths`. Reject documentation-only verification for scopes that
contain or intersect those paths. Include the configured paths in runtime
check inputs regardless of their extensions. Each consumer owns those paths.

## Verification and recovery

Exercise a consumer with only its Composer files and `.devkit`, including
controlled Pint and PHPStan violations, two selected package copies, exact
project trust, a stale lock or toolkit selection, and no hook behavior for an
unconfigured project. Record any unavailable native trust or lifecycle checks.
The previous CLI and project-local hook template remain valid recovery paths.
