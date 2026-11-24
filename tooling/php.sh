#!/bin/sh
set -eu
toolkit_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec docker run --rm --user "$(id -u):$(id -g)" \
    --mount "type=bind,src=$toolkit_root,dst=/app" \
    --workdir /app --env COMPOSER_HOME=/tmp/composer --env DEVKIT_AGENT_SCOPE_FILE --env DEVKIT_AGENT_SESSION_ID \
    "${DEVKIT_PHP_IMAGE:-ai-devkit-php:local}" "$@"
