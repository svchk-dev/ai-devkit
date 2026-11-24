# Local implementation evidence

Date: 2026-11-24. This records local implementation and checks, not a public
release or completed real-client acceptance. The selected project/package name
is AI Devkit / svchk-dev/ai-devkit. The original change id is retained.

## Scope and identity

The source checkout has baseline da6e869af35d7ffc1437fa765b93ef0f9607947e
(an empty local commit). Owned source includes standards, configuration, tools,
adapters, skills, isolated tests, documentation and this change. Generated upstream
skills, local IDE files, dependencies and operational state are separate owners.

Executed source identity: d2d5e276df61b4f37157704c686d11924b9c10d4e44ed8b8728de969cd5ab0d6.
Synthetic immutable artifacts inject fixture-only versions; they are not tags.

## Actual checks

- full: passed, receipt 6b71fd6c-6958-46e4-bad2-073ac4042d05, stable observation generation 0.
- consumer: passed, receipt 86027d73-a5f2-4440-80ba-72fcbc5d01ed, stable observation generation 0.
- conventions: passed, receipt 1adaa472-b73b-4e23-8a0e-4cc9f3b31df5, stable observation generation 0.
- docs: passed, receipt f6be14cb-34fb-4cef-b33a-dcee74764e81, stable observation generation 0.

The full gate ran Pint (7 files), PHPStan (no errors), PHPUnit (12 tests,
33 assertions), Node (99 passed, zero failed) and documentation/OpenSpec checks.
All three toolkit-owned skills passed the skill-creator structural validator.

Independent acceptance used actual Composer installation in default-layout and
explicit native-layout applications and a separate Testbench package. It checked
controlled format/type/convention/area failures, direct Boost resource discovery,
an actual declared Pint check through the installed agent runner, version update
and saved-lock restoration, managed removal, local-rule/data preservation and
a runtime-only application HTTP probe without the toolkit.

Artifact checksums:
- 0.1.0: 7862a26690ffe17986e75c4b321729de0cff9726d2312c98261c955eeb1c620a.
- 0.2.0: 89076568048ee9d5c3dc320fb58f5784cfec8cd9b58356100a7d2de040509c4c.

## Public file boundary

The reviewed synthetic export excludes IDE files, dependencies, operational
state, tests and generated upstream skills. Automated checks found no matches
for the selected private-project identifiers, workstation paths or credential
patterns. Documentation was also validated after extraction. Reachable Git history
contains only the empty baseline; no remote or published tag exists.

These checks supplement the independent source/provenance review. They do not
certify a future publication commit: its exact selected files, licensing choice
and hosted acceptance still require review. Local user-owned staged IDE files
remain outside this source/publication scope.

## Remaining acceptance

Task progress is 25/28. The real trusted-client rehearsal (4.6), final public
candidate readiness (6.1) and full final acceptance review (6.3) remain open.
Actual Codex inventory is 0.166.0-alpha.6 with no active trusted hooks and no
observed lifecycle events for this toolkit. An isolated application with actual
installed definitions is prepared in ignored temporary storage; trust was not
changed. Synthetic events and direct CLI checks do not substitute for this stage.

Consumer integrations are separate changes. No proprietary consumer dependency,
business contract, private access procedure or release policy is distributed here.
No synchronization/archive or public distribution is claimed by this evidence.

## Independent review

A separate project reviewer inspected the actual owned source, complete changed
methods/callbacks, tests, documentation, consumer evidence and export boundary.
Confirmed defects in custom-check environment binding, the documented Composer
proxy invocation and canonical Git-state paths were corrected with regressions.
The final helper spacing finding was also corrected and reviewed again.

The corrected local implementation received passed with zero unresolved findings.
The whole change received incomplete because actual trusted-client acceptance
and final public-candidate review remain open. Runtime and consumer results were
executed by the coordinator and independently checked against their logs; the
reviewer did not mutate files or manufacture hook receipts.
