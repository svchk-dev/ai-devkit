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
verify the selected toolkit without writing. The Codex profile adds the shared
standards and skill locations to the agent's context. Contributors can also
follow `.devkit` metadata or optional Boost discovery.

Projects with a root devkit.json keep the legacy managed output and
devkit.resources.json ownership manifest. The optional resourceDirectory
setting applies to that layout only. See the [migration guide](usage.md#migrate-a-legacy-snapshot)
to move to the single-file adapter.

Document intentional exceptions locally. Paths must remain inside the repository
after symlink resolution. Define commands as argv arrays. Failed writes restore
previous files or report precise recovery paths. New `.devkit` files place
operational state under `vendor/.ai-devkit`. For an existing `stateDirectory`,
retain its ignored location and access to any active task evidence.

The legacy ownership manifest also records the executing Composer selection when its
installed path matches the toolkit being run. Direct source execution is labelled
development; a content digest is still recorded. The schema describes structure;
runtime validation additionally checks symlinks, installed prerequisites and
cross-field requirements.

Use `vendor/bin/devkit.mjs format --test` for read-only Pint and omit `--test`
to apply formatting. It uses `sourceRoots` unless `quality.pint.in` or explicit
CLI paths select a different scope. Set `quality.pint.in` to `["."]` for a
repository-wide check that respects the configured exclusions.
The command merges `quality.pint` over the [shared Pint
preset](../config/pint.json). `vendor/bin/devkit.mjs analyse` runs PHPStan with
the [shared analysis defaults](../config/phpstan.neon). Set `quality.phpstan`
to select the analysis level, PHP version, paths, includes, bootstrap files or
exclusions. Set `quality.php` to the project-relative execution argv prefix when
PHP runs through a container command. The root project must be the working
directory inside the container. The commands keep effective configuration in
the state directory only while the tools run. Existing project configurations
can independently include the installed [convention rules](../config/conventions.neon).

Area architecture accepts additionalAreas and explicit fully qualified
compositionRoots. Run vendor/bin/devkit.mjs architecture with Deptrac
installed as a consumer development dependency. architecture.command can wrap
Deptrac for containers; the toolkit appends its temporary configuration and
read-only verification options. Custom mode runs exactly the declared argv
instead. The default check detects parsed dependencies; computed runtime class
names and business responsibility still require review. See
[Deptrac configuration](https://deptrac.github.io/deptrac/configuration/) and
[collectors](https://deptrac.github.io/deptrac/collectors/).

The `codex` profile opts into the [shared client plugin](usage.md#enable-codex-hooks).
Once installed, it uses Codex's project trust and verifies the installed package
against the Composer lock and `.devkit` metadata before running it. The hook adds
the project's installed standards, applicable skills and configured local
references to the agent's context. Legacy snapshots still provide the
project-local hook and reviewer templates.

Run the installed `agent-runtime/cli.mjs` directly for task registration, scope
changes, declared checks, review preparation and checkpoints. Set `checks` and
`verificationProfiles` in `.devkit` to describe the project's actual commands
and required checks. These can invoke installed tools directly.
Run agent-runtime/compatibility.mjs --inventory to inspect current client trust
and observed coverage. Register the actual runtime session and do not manufacture
lifecycle events. Unavailable hooks do not waive manual checks or review.

Environment identity applies to every declared check by default, including
custom check ids. environment.identityCommand supplies actual tool identity;
environment.inputs supplies ignored local configuration that must be observed.
An explicit environment.checks list can scope those inputs to selected checks,
for example keeping docs checks usable with Node alone while binding PHP and
consumer checks to the PHP toolchain. The list must name declared check ids.
