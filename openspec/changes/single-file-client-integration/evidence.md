# Verification evidence

## Package and consumers

The local candidate is based on `1b33e121b2e26c4d0c4d83782af927f577a2d332`.
`make check` passed Pint, PHPStan, 12 PHP tests with 33 assertions, 108 Node
tests, Markdown validation and strict OpenSpec validation. Node coverage
includes two selected installed versions, an untrusted user layer, modified
package content, opt-out and concurrent legacy/plugin activation detection.

`make test-consumer` passed independent application and Testbench hosts, both
architecture layouts, installed quality checks and controlled Pint and PHPStan
failures in the single-file workflow. It also passed synthetic version updates,
saved-lock restoration, legacy removal and a runtime-only HTTP probe. The
version labels in that suite belong to local fixture artifacts.

## Native client smoke check

Codex CLI `0.166.0-alpha.6` installed the marketplace and plugin in a disposable
client profile. The native hook review accepted all seven definitions and
`hooks/list` reported them enabled and trusted, all from the plugin. The test
project held an actual Composer-installed fixture and `.devkit`. It supplied no
project hook manifest or agent entry point.

A real Codex session using a loopback fixture model completed a turn. The
installed toolkit recorded one `SessionStart:startup`, one `UserPromptSubmit`
and one `Stop`. The model request contained the selected package's standards
and skills references, and the new toolkit state was under `vendor/.ai-devkit`.
Tool edits, resume, compaction, independent-review completion and interruption
were outside this native smoke check. The consumer's full lifecycle acceptance
remains a separate check. No public release has been made for this change.

## Independent review

The final read-only review passed. The corrected candidate honors the Pint
source roots, reports native project trust separately from plugin hook trust,
and directs task recovery through the installed CLI. The real Codex inventory
confirmed active and inactive results for trusted and untrusted projects with
the same seven approved plugin hooks.
