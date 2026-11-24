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

Create devkit.json and follow the [adapter guide](adapter.md). Run:

```sh
vendor/bin/devkit.mjs doctor
vendor/bin/devkit.mjs sync
vendor/bin/devkit.mjs sync --check
```

Composer's vendor/bin entry is executable; do not pass that shell proxy to Node.
Reference the prepared instructions from the consumer's own AGENTS.md. Review and
commit managed output and its ownership manifest. Installations do not grant trust,
modify application data or publish anything.

## Update a selected version

1. Save the current Composer manifest/lock and unchanged managed resource set in
   the project's version control. Review the target's standards and adoption notes.
2. Select a compatible released version in require-dev and resolve it with the
   project's maintained Composer command. Review the resolved lock diff.
3. Run vendor/bin/devkit.mjs sync, then sync --check. Review changed resources,
   local exceptions and check commands. Rerun affected quality/consumer checks.
4. Repeat actual client compatibility acceptance when the hook definition or
   executing toolkit changes. A prior trust decision or synthetic test is not
   fresh lifecycle evidence.

For saved-lock recovery, restore the saved composer.json and composer.lock, run
the project's locked install, then synchronize with that selected toolkit.
Keep the current ownership manifest and unchanged outputs together until sync
replaces them; restoring only an old manifest over newer output causes a conflict.
Alternatively restore the entire saved managed set and manifest as one consistent
snapshot. Verify freshness and affected checks again. Preserve local rules,
environment files, application storage and existing task evidence throughout.

## Resolve resource conflicts

Sync and remove refuse locally edited managed files and foreign targets.
Inspect the diff and the manifest's last-written ownership. Move intentional local
policy to a consumer-owned document/adapter exception, restore the known managed
output from the selected saved version, then retry. Do not delete ownership
metadata to claim foreign files or edit vendor to bypass the conflict.

A failed staged update restores the prior usable files. If restoration itself
fails, use the reported paths and the saved consistent resource set for manual
recovery; do not report synchronization as successful.

## Remove the integration

Disable the consumer-owned hook launchers and remove references to shared config
from project-owned commands. While the toolkit is still installed, run:

```sh
vendor/bin/devkit.mjs remove
```

Then remove its development dependency with the project's maintained Composer
command and review the lock diff. Removal deletes unchanged owned resources,
preserving local additions and files owned by other generators. Keep local task
evidence until its review/recovery obligations are resolved; no application
migration or database reset is involved.

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
