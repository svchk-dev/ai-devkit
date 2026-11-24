# Laravel boundaries

Check installed package versions and version-specific documentation before using
ecosystem APIs. Prefer Laravel's current facilities and existing abstractions.

## Storage and configuration

Use simple Laravel migrations without speculative table/column existence checks.
Separate explicit, repeatable seed population from schema changes. Never rewrite
an applied migration. Honor selected model classes, connections, tables, scopes
and transaction boundaries throughout services, repositories and extensions.

Primary deployment settings use direct `env('KEY', default)` lookups in config;
runtime reads `config()` so cached configuration remains authoritative. Keep
models, resource classes, catalogs and technical tuning in PHP. Avoid custom env
parsers/validators. Document keys, defaults and cache/process refresh. Preserve
explicit host values and secrets when adopting published configuration.

Use model factories and Faker for generated demo/test attributes. Keep reference
catalogs and exact business-scenario values explicit. Seeders coordinate supported
operations, repeatability and required locale/invariant behavior; do not create
large custom placeholder-text generators. Ensure their dependencies exist where
they are documented to run, including runtime consumers where applicable.

## Guards, caching and events

Keep authorization, validation and invariants at every supported boundary, including
direct model writes when the contract supports them. Service delegation alone
does not cover a bypass path. Public reads must retain authoritative access and
privacy guards.

Assess reusable public entity data, lists, counts, navigation and locale equivalents
for caching. Use Laravel facilities and the project's shared mechanism where
available. Define finite retention, identity/locale/storage isolation and complete
dependencies. Invalidation is part of the feature: supported writes, publication
and deletion refresh dependent results after the actual outer commit; rollbacks
preserve valid entries. Concurrent fills/failed eviction must not restore revoked
content. Verify warm-read query reduction and observable freshness. Document why a
read is unsuitable for caching. Product-specific derived-export retention follows
the local contract, not a universal toolkit rule.

Use events/subscribers for current independent cross-feature reactions. Record the
producer, actual consumer, ownership, transaction timing, rollback/failure behavior
and verification before implementation. One real consumer is enough when it removes
coupling. Keep guards explicit; required consistency remains synchronous. Prefer
direct calls for simple workflows. Avoid speculative CRUD-event catalogs, payload
hierarchies and parallel event frameworks.

Event classes/files end in Event; jobs end in Job, with matching class/filename.
Use Laravel's Events Dispatchable trait and `EventClass::dispatch(...)`, not the
Bus trait for events. Put subscriber `subscribe(Dispatcher $events): void` before
handlers (after the constructor); register each handler with an explicit multiline
listen call separated by blank lines. Preserve framework callback names.

## Console interaction

Use Laravel Prompts with explicit function imports for interactive commands.
Keep business validation in services/models too. Passwords use masked input and
confirmation, never visible text or command arguments. Reject unsupported secret
input modes before storage access. Verify error behavior, unchanged state and
secret-free output through the console boundary.
