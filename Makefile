.PHONY: help setup build docs-install check-docs test test-node format format-check analyse check composer test-consumer
.DEFAULT_GOAL := help
help:
	@printf '%s\n' 'setup build composer test test-node format format-check analyse check-docs check' 'PHP runs in Docker; Node/npm versions are pinned in .nvmrc and package.json.'
build:
	docker build -t ai-devkit-php:local .
setup: build
	sh tooling/php.sh composer install --no-interaction --prefer-dist
	npm ci --ignore-scripts --no-audit --no-fund
docs-install:
	npm ci --ignore-scripts --no-audit --no-fund
composer:
	sh tooling/php.sh composer $(ARGS)
test:
	sh tooling/php.sh vendor/bin/phpunit
test-node:
	npm test
format:
	sh tooling/php.sh vendor/bin/pint
format-check:
	sh tooling/php.sh vendor/bin/pint --test
analyse:
	sh tooling/php.sh vendor/bin/phpstan analyse --no-progress
check-docs:
	npm run check:docs
	npm run spec:validate
test-consumer:
	node tests/Consumer/run.mjs

check:
	$(MAKE) format-check
	$(MAKE) analyse
	$(MAKE) test
	$(MAKE) test-node
	$(MAKE) check-docs

.PHONY: agent-task agent-check agent-test agent-conventions agent-identity agent-rehearsal
agent-task:
	@node agent-runtime/cli.mjs $(ARGS)
agent-check:
	@node agent-runtime/cli.mjs check $(ARGS)
agent-test:
	@npm test
agent-conventions:
	@sh tooling/php.sh php bin/conventions.php
agent-identity:
	@sh tooling/php.sh php tooling/identity.php
agent-rehearsal:
	@node agent-runtime/compatibility.mjs $(ARGS)
