# Local implementation evidence

Date: 2026-11-24. This records local implementation checks, trusted
Codex acceptance and review of the prospective public file set. Release and
hosted CI results are recorded separately.

## Scope and identity

The initial local implementation used baseline da6e869af35d7ffc1437fa765b93ef0f9607947e
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

## Initial local export

The reviewed synthetic export excludes IDE files, dependencies, operational
state, tests and generated upstream skills. Automated checks found no matches
for the selected private-project identifiers, workstation paths or credential
patterns. Documentation was also validated after extraction. The original
working checkout had only its empty baseline on the local main branch at this
point. The selected publication history is separate.

These checks supplement the independent source/provenance review. They do not
certify a future publication commit: its exact selected files, licensing choice
and hosted acceptance still require review. Local user-owned staged IDE files
remain outside this source/publication scope.

## Independent review

A separate project reviewer inspected the actual owned source, complete changed
methods/callbacks, tests, documentation, consumer evidence and export boundary.
Confirmed defects in custom-check environment binding, the documented Composer
proxy invocation and canonical Git-state paths were corrected with regressions.
The final helper spacing finding was also corrected and reviewed again.

The corrected local implementation received passed with zero unresolved findings.
The whole change received incomplete at that stage, pending real client
acceptance and final public-candidate review. Runtime and consumer results were
executed by the coordinator and independently checked against their logs; the
reviewer did not mutate files or manufacture hook receipts.

## Trusted Codex client acceptance

The installed Codex CLI 0.166.0-alpha.6 reported all seven selected hook
definitions active and trusted after the owner accepted them in Codex.
The test ran in an independent disposable Laravel application with the
installed fixture package. Its selected package identity was
`bf361ea44e8bf8290de17f1a013c4208fe0d33f5ba445873a2212591d9632194`.
The package's executable sources, standards, configuration, adapters and
managed-resource inputs were compared byte for byte with the publication
checkout. Synthetic version metadata and subsequent release prose differ.

The actual app-server session registered a scoped Markdown change, used
native apply_patch and a separate shell write, and ran its declared check.
Codex reported the process in progress and later received exit 0 after
roughly four seconds. The resulting receipt passed with complete observation
and no concurrent input changes. Stop blocked the first completion attempt
pending review and accepted a scoped progress checkpoint. The resumed session
launched a separate project reviewer. The runtime accepted its matching
completed result through collaboration status, with no findings or limitations.
The final Stop consumed the complete checkpoint and closed the task.

An independent test session observed an actual interrupt. A supported context
compaction followed by a normal turn restored project context. The installed
compatibility command exited 0 with no missing definition or unobserved
required event. Operational state, raw tool output and transcripts are kept
out of the distribution.

## Publication candidate checks

The prospective public branch starts from an independently prepared, clean
root commit holding 103 selected files with public author metadata. It contains
the generic toolkit sources and the upstream notices. Local IDE files,
developer checkpoints, environment files, vendor dependencies and raw logs
are outside its history. The Git export additionally omits development-only
test and generator resources through export attributes.

Gitleaks 8.30.1 reported no findings in the candidate history when run offline.
A separate path and content check found no private project identifiers,
workstation paths or forbidden export paths. Local Composer validation,
the complete check suite and independent consumer tests passed on the
implementation. Subsequent edits update release documentation and evidence.

The owner selected public publication under MIT. The real Codex acceptance
task is complete. Exact candidate review, hosted CI and tagged distribution
are separate milestones.
