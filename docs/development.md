# Development

Use Node 26.11.1, npm 12.2.0, GNU Make and Docker. The standalone image pins PHP
8.5.11 and Composer 2.10.3. Run `make setup` to build it and install both locked
dependency sets. `make check` runs formatting, type analysis, PHP tests, Node
tests and documentation/OpenSpec checks. `make check-docs` needs only Node/npm.

Use `make composer ARGS='validate --strict'` for Composer commands. Set
`DEVKIT_PHP_IMAGE` explicitly only when rehearsing against another prepared image;
record that identity with the results. No first-adopter source tree or secret is
needed by the default image or checks. Tests own only temporary fixture paths;
they do not reset application databases or touch production storage.

This repository uses a tooling-internal architecture: PHP extensions are under
`src`, Node modules under `agent-runtime`, standards/config/resources have their
own responsibilities. The Main/Admin/Web/Console/Api default describes consumers,
not this toolkit's implementation. Generated OpenSpec skills stay generator-owned.

The initial verified platform targets PHP 8.5 and Laravel 13. Do not infer a wider
support matrix from dependency version constraints. Hosted checks and publication
remain pending until they actually run. Keep work local without explicit push or
publication instructions.

The independent development graph selects Laravel 13.44.1 and PHPUnit 13.4.4.
The first attempted older pins were rejected by Composer advisories. The
[Laravel advisory](https://github.com/laravel/framework/security/advisories/GHSA-63hm-g96r-2m2q)
identifies the fixed 13.x range and the
[PHPUnit advisory](https://github.com/sebastianbergmann/phpunit/security/advisories/GHSA-9vw2-f4vp-x7gf)
identifies 13.4.4. Advisory blocking remains enabled.

Use make test-consumer for independent application/default-layout,
application/framework-native override and package-host acceptance. The suite owns
only generated tmp consumers, installs actual Composer dependencies, checks
controlled violations and Boost discovery, then rehearses synthetic immutable
archive versions, saved-lock restoration, removal and a runtime-only HTTP probe.
Its versions are fixture artifacts, not tags or published releases.
The application fixture uses Laravel's standard Composer autoload lifecycle.
No application database or external site's storage is used.

The CI definition runs the same make setup, make check and make test-consumer
commands on Ubuntu 24.04 with pinned Node/npm and the standalone PHP image.
This is the intended hosted platform, not a claim of a completed hosted run.
No workflow is triggered remotely during local preparation.

The local tooling verification profile requires full, consumers, conventions,
docs and compatibility receipts. A full local pass does not imply trusted-client
coverage. Inspect the actual inventory and report unavailable activation honestly.
