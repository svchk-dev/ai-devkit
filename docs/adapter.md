# Consumer adapter and resources

Install the toolkit directly in root development dependencies and create a
devkit.json file with [schemaVersion 1](../config/adapter.schema.json), selected profiles, namespace, sourceRoots,
architecture and check command argv arrays. No installation changes project
instructions or grants trust automatically.

Select laravel-application (default source root app) or laravel-package (src).
The package profile requires installed Testbench; applications do not. Optional
filament, openspec and codex integrations are explicit. Common standards are
always available. Prerequisites are checked before resource preparation.

The default architecture mode is areas. Additional named areas can be supplied
through architecture.additionalAreas. An alternative uses mode custom, rules
pointing to existing local documentation and command as a nonempty argv array
for its actual verification. This overrides architecture, not unrelated standards.

Run vendor/bin/devkit.mjs doctor, then vendor/bin/devkit.mjs sync explicitly.
Reference .devkit/instructions.md from the consumer's own AGENTS.md entry point.
Use sync --check for read-only freshness verification and remove to delete only
unchanged owned output. Conflicting owners or local edits fail before replacement.

The tracked root devkit.resources.json manifest records source and adapter
identity, output directory and last-written hashes. Common documents and
effective Pint configuration live under .devkit by default; resourceDirectory
can select another contained directory. Updates can relocate owned resources,
preserving local additions. No dependency package Composer script runs this step.

quality.pint supplies explicit local settings/exclusions; its rules merge over
shared defaults. Document intentional exceptions locally. Paths must remain
inside the repository after symlink resolution; commands are argv, not shell
fragments. Failed writes restore previous files or report precise recovery paths.
Operational state is separate and must be ignored; neither state nor manifests
contain credentials or full transcripts.

The ownership manifest also records the executing Composer selection when its
installed path matches the toolkit being run. Direct source execution is labelled
development; a content digest is still recorded. The schema describes structure;
runtime validation additionally checks symlinks, installed prerequisites and
cross-field requirements.

The generated phpstan.neon includes shared type settings and convention rules.
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

The codex profile prepares templates under the managed resource directory.
Activation is a separate local integration step: review/merge the hook definitions
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
