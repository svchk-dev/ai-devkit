# Consumer adapter and resources

Run `vendor/bin/devkit.mjs sync` at the Composer project root. The single
`.devkit` file is a JSON adapter using [schemaVersion 1](../config/adapter.schema.json).
Edit the file for project-owned settings, such as source roots, namespace,
architecture, check commands and optional profiles. The `toolkit` section is
maintained by sync and describes the executing package. It is informational;
put intentional overrides in the other adapter settings.

The defaults use the App namespace, the app source root and the shared area
architecture. Select laravel-package to default to src and require Testbench.
Optional filament, openspec and codex integrations are explicit. The
laravel-application profile validates the installed Laravel dependency.

Additional named areas can be supplied through architecture.additionalAreas.
An alternative uses mode custom, rules pointing to existing local documentation
and command as a nonempty argv array for its verification.

Use doctor to validate configuration and prerequisites. Use sync --check to
verify the selected toolkit without writing. Point contributors to the
installed standards index through the project's existing agent entry point
or optional Boost discovery. The toolkit does not create agent entry points.

Projects with a root devkit.json keep the legacy managed output and
devkit.resources.json ownership manifest. The optional resourceDirectory
setting applies to that layout only. See the [migration guide](usage.md#migrate-a-legacy-snapshot)
to move to the single-file adapter.

In legacy snapshot mode, quality.pint supplies explicit local settings and
exclusions merged over shared defaults. Document intentional exceptions locally. Paths must remain
inside the repository after symlink resolution; commands are argv, not shell
fragments. Failed writes restore previous files or report precise recovery paths.
Operational state is separate and must be ignored; neither state nor manifests
contain credentials or full transcripts.

The legacy ownership manifest also records the executing Composer selection when its
installed path matches the toolkit being run. Direct source execution is labelled
development; a content digest is still recorded. The schema describes structure;
runtime validation additionally checks symlinks, installed prerequisites and
cross-field requirements.

Single-file setups can use the [installed Pint preset](../config/pint.json)
and include the [installed PHPStan defaults](../config/phpstan.neon) and
[convention rules](../config/conventions.neon) from their existing configurations.
They can run the installed `bin/conventions.php` with the active adapter settings.
Keep command-specific Pint and PHPStan overrides in project configurations
when using the single-file adapter. Legacy snapshots can generate effective
configuration using the adapter's `quality` options.
quality.phpstan can select level, bootstrapFiles and excludePaths. The consumer
can include this file from its own Larastan configuration and retain its host
bootstrap. Pint uses an effective JSON configuration; it has no native inheritance.

Area architecture accepts additionalAreas and explicit fully qualified
compositionRoots. Run vendor/bin/devkit.mjs architecture with Deptrac
installed as a consumer development dependency. architecture.command can wrap
Deptrac for containers; the toolkit appends its temporary configuration and
read-only verification options. Custom mode runs exactly the declared argv
instead. The default check detects parsed dependencies; computed runtime class
names and business responsibility still require review. See
[Deptrac configuration](https://deptrac.github.io/deptrac/configuration/) and
[collectors](https://deptrac.github.io/deptrac/collectors/).

The codex profile references the installed hook template from the managed
metadata in `.devkit`. Legacy snapshots copy the templates to their managed
directory. Activation is a separate local integration step. Review and merge
the hook definitions
into the consumer's own .codex/hooks.json, configure its project_reviewer role
from the template and preserve local policy. Those local launchers remain
consumer-owned; sync never overwrites them or grants trust. Use the client's
supported trust interface yourself. Changing definitions or the executing
toolkit requires a fresh actual rehearsal; synthetic tests are insufficient.

Run the installed agent-runtime/cli.mjs from project-owned commands for task
registration, scope changes, declared checks, review preparation and checkpoints.
Run agent-runtime/compatibility.mjs --inventory to inspect current client trust
and observed coverage. Register the actual runtime session and do not manufacture
lifecycle events. Unavailable hooks do not waive manual checks or review.

Environment identity applies to every declared check by default, including
custom check ids. environment.identityCommand supplies actual tool identity;
environment.inputs supplies ignored local configuration that must be observed.
An explicit environment.checks list can scope those inputs to selected checks,
for example keeping docs checks usable with Node alone while binding PHP and
consumer checks to the PHP toolchain. The list must name declared check ids.
