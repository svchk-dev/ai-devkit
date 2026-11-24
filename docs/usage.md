# Installation, updates and recovery

## Select a source

The package identity is svchk-dev/ai-devkit. Select an immutable release for
tracked integrations so any checkout can install the same version. For local
evaluation, a Composer path repository or isolated versioned artifact can
exercise the integration before selecting a release.

Install the selected toolkit directly in the consumer's root require-dev.
Select compatible ecosystem tools explicitly: PHPStan is an execution dependency
of the toolkit; Pint, Deptrac, optional Larastan/Boost, and a package's Testbench
host remain project decisions. See [development](development.md) for tested pins.
Filament and OpenSpec are not prerequisites unless their profiles are selected.

From the project root, run:

```sh
composer require --dev svchk-dev/ai-devkit
vendor/bin/devkit.mjs sync
vendor/bin/devkit.mjs doctor
```

Commit `.devkit` with the Composer manifest and lock. The file is JSON and
holds both project settings and a `toolkit` section maintained by sync.
Use the executable Composer proxy directly. Composer installs the dependency;
the explicit sync command prepares its project settings. See the
[Composer script lifecycle](https://getcomposer.org/doc/articles/scripts.md)
and [adapter guide](adapter.md).

## Update or restore a selected version

1. Review the target version's change and select it in require-dev.
2. Resolve and install it with the project's Composer command.
3. Run `vendor/bin/devkit.mjs sync` and then
   `vendor/bin/devkit.mjs sync --check`. Review the lock and toolkit metadata
   diff and run affected checks.

For recovery, restore the saved Composer manifest and lock, install from the
lock and rerun sync. Shared guidance and tools follow the installed version.
Sync preserves explicit local settings. Review and reapply changed hook
definitions through the client's supported configuration and trust workflow.

## Migrate a legacy snapshot

Install the newer toolkit and save the legacy adapter, ownership manifest and
managed resources together. With the legacy `devkit.json` still in place,
run `vendor/bin/devkit.mjs remove` to remove unchanged owned output. Move
any remaining local files out of the old `.devkit/` directory and remove the
empty directory before creating the file at the same path.

Rename `devkit.json` to `.devkit` and remove its `resourceDirectory` setting.
Transfer any `quality` overrides to the project's Pint or PHPStan configuration
and remove `quality` from the adapter before running sync. Update existing
entry points that referenced snapshots to use installed resources or
consumer-owned configurations.
Preserve local exceptions, trusted-client settings and application data.

To return to a version that predates single-file support, restore its saved
Composer lock and manifest together with the legacy devkit.json and matching
managed directory and ownership manifest.

Legacy projects can continue to sync their existing layout with the new toolkit.
The legacy command reports conflicting ownership or edited files before
replacement and retains previous resources on a failed staged update.

## Remove the integration

Disable any consumer-owned hooks and remove references to the toolkit from
project commands. Review and remove the project-owned `.devkit` file, then
remove the Composer development dependency. For a legacy snapshot, run the
toolkit's `remove` command before removing the dependency. Preserve any local
additions or task evidence still needed by the project.

## Recover agent state

Use the agent CLI's read-only status operation first. A valid pending task cannot
be reset to erase findings. Explicit recover quarantines malformed state and
starts incomplete, requiring registration, fresh checks and review. Supply the
actual session id from client context; never manufacture lifecycle events,
coverage, reviewer completion or passed receipts.

The CLI is node vendor/svchk-dev/ai-devkit/agent-runtime/cli.mjs with status,
start, scope, check, review, checkpoint and recover operations. Every operation
requires --session. See the adapter's declared checks and local policy before
executing a mutating operation.

## Publication prerequisites

Maintainers follow the [AI Devkit release policy](releases.md) for version
selection, authorization, public-source review and exact-candidate verification.
The policy governs this repository. Consumers own their release procedures.
