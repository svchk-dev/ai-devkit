# Testing defaults

Write tests for business logic, service behavior, important rejection paths,
atomicity and regressions at supported production boundaries. Test observable
contracts, not private structure, trivial delegation or a coverage percentage.
Do not add production APIs solely for tests. Do not add dedicated migration tests
or repeat framework persistence/cast/schema declarations; exercise storage
restrictions through the business operations they protect. Mandatory integration
and consumer verification still apply.

Use the project's installed PHPUnit/Pest and Laravel helpers, nearby conventions
and framework fakes that preserve actual behavior. Keep fixtures and test support
inside tests. Separate preparation, operation and assertions with blank lines;
independent scenarios get independent visual blocks. Assertions should identify a
concrete observable result and high-value rejected-state effects.

Use real isolated storage for integration behavior. Resolve and validate actual
database, role, server, schema, filesystem and queue targets before mutation or
cleanup. Never substitute a different database engine silently. Cleanup owns
only that run's resources and explicit preservation sentinels, not a global
inventory. Stop workers before deleting their isolated fixtures. Preserve
unrelated runs, development data and credentials.

Control nondeterministic time, randomness, network and process dependencies at
their proper boundaries. Preserve real required consistency subscribers when
checking business reactions. Test commit/rollback timing and observable effects,
not only dispatch assertions. No fake should hide a required reaction.

Use focused checks while iterating and the complete required project gates once
inputs settle. Reuse current successful receipts only when their relevant inputs
are unchanged. Structural docs/spec checks do not prove runtime or browser output.
Report actual commands, failures, unavailable checks and evidence limitations.
