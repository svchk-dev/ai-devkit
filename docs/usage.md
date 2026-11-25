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

## Enable Codex hooks

After syncing `.devkit` at the Git repository root, run:

```sh
vendor/bin/devkit.mjs add-to-codex
```

Keep `codex` and Git on PATH and keep the Codex profile and temporary directory
outside the project checkout. The command reuses the configured marketplace
and an enabled plugin. On first setup it verifies the published Git tag against
the project's Composer lock and registers an exported catalog in the local
Codex configuration. It then adds `codex` to the project's `.devkit`. After an
installation error, correct the reported problem and rerun the command.

Trust the repository in Codex and review and approve the plugin hooks under
**Settings → Hooks** in the desktop app or `/hooks` in the CLI. Start a new
session after approving them. The plugin dispatches to the version in the
current project's Composer lock.

Run `node vendor/svchk-dev/ai-devkit/agent-runtime/compatibility.mjs --inventory`
in the project to inspect native activation. When migrating existing project
hooks, disable their duplicate definitions after checking the shared plugin's
trust and behavior. Repeat the actual lifecycle rehearsal when the executing
toolkit or hook definitions change.

A separate `project_reviewer` role can be installed once at user scope from
the [reviewer template](../adapters/codex/project_reviewer.toml), or the project
can supply its own role when its review contract requires one.

### Manual setup

For a release without `add-to-codex` or an explicitly selected local catalog,
add the AI Devkit marketplace and plugin once per Codex installation. Select a
published Git tag containing the plugin and substitute it for `TAG` below.
For a local catalog, pass its path to marketplace add.

```sh
codex plugin marketplace add svchk-dev/ai-devkit --ref TAG
codex plugin add ai-devkit@svchk-dev
```

Add `codex` to `.devkit` profiles, rerun `vendor/bin/devkit.mjs sync`, and
complete the trust and verification steps above.

## Publish OpenSpec changes

Select `ai-devkit:openspec-push-changes` in the Codex skill picker and name the
change to publish. Consumers using Boost can discover the same package skill as
`openspec-push-changes`. The skill follows the project's OpenSpec commands,
required checks and release policy. A request to publish the selected work
authorizes that push. Mentioning or inspecting the skill preserves read-only
behavior.

Existing Codex installations with a catalog pinned before this skill was
bundled need a one-time client update. After installing the selected Composer
release and syncing the project, replace the old client installation:

```sh
codex plugin remove ai-devkit@svchk-dev
codex plugin marketplace remove svchk-dev
vendor/bin/devkit.mjs add-to-codex
```

Review the updated hooks in Codex and start a new session. The updated client
plugin supplies the skill to projects that use it.

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
Keep `quality` overrides in `.devkit`. Update callers of snapshots to use the
installed executable and resources or consumer-owned configurations.
Preserve local exceptions, trusted-client settings and application data.

To return to a version that predates single-file support, restore its saved
Composer lock and manifest together with the legacy devkit.json and matching
managed directory and ownership manifest.

Legacy projects can continue to sync their existing layout with the new toolkit.
The legacy command reports conflicting ownership or edited files before
replacement and retains previous resources on a failed staged update.

## Remove the integration

Remove the `codex` profile to opt the repository out of the shared hooks. Disable
any remaining consumer-owned hooks and remove references to the toolkit from
project commands. Review and remove `.devkit`, then remove the Composer
development dependency. For a legacy snapshot, run the
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
