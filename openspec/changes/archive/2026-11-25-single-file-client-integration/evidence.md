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

## Consumer verification paths

Focused adapter and dispatcher tests passed after adding the optional
`inputSets.codePaths` setting. They check a runtime asset, its parent scope and
a runtime fixture with a Markdown extension, while an independent documentation
scope retains its documentation-only profile. The paths in these checks are
fixture data supplied through the consumer adapter.

## Composer command for Codex setup

The candidate based on `72978c868d8794e7ada2beb6b48b63b0610796ee` passed
`make check` with 114 Node tests, 12 PHP tests and 33 assertions, Pint,
PHPStan, 41 Markdown files and three strict OpenSpec items. `make test-consumer`
passed both application layouts and the independent Testbench package,
including update, recovery and runtime-only installation. Focused setup tests
covered reuse across projects, retry after plugin installation failure,
release identity mismatch, and refusal of project-local setup directories.

A Composer fixture installed the implementation candidate as a disposable
artifact with the published `v0.4.0` bootstrap identity. The actual Codex CLI
`0.166.0-alpha.6` installed the plugin in both an absent explicit profile and
a fresh default profile. Repeating the command reused the plugin and left the
project adapter unchanged. The consumer had the Composer manifest and lock
and a single `.devkit` file outside Git metadata and installed dependencies.

Approval in the native client remained explicit for both the repository and
the seven hooks. Two inventories reported identical trusted fingerprints.
A native session using a loopback fixture model recorded startup, prompt
submission and Stop without hook failures. The independent review passed
after verifying the fresh-profile handling, directory isolation and nested
checkout refusal. The setup command was verified before its first public release.

## Shared OpenSpec publication skill

The settled candidate passed `make check` in an isolated source copy with
114 Node tests, 12 PHP tests and 33 assertions, Pint, PHPStan and strict
documentation and OpenSpec checks. `make test-consumer` found
`openspec-push-changes` among the installed Composer package's Boost skills
and passed the application and package scenarios.

An isolated Codex CLI `0.166.0-alpha.6` listed exactly one enabled user-scope
`ai-devkit:openspec-push-changes` entry from the installed plugin in a project
without a local skill directory. A read-only native turn with a loopback
fixture model received the selected skill, and the trusted plugin recorded
startup, prompt submission and Stop without hook failures.

An independent forward test used a disposable repository and local bare
origin. It synced the selected delta, validated and archived the change, then
pushed only the requested branch. A second case with no active change and
`push.followTags=true` pushed only the intended README change and kept the
annotated tag and unrelated file local. Repeating the scoped request was a
no-op. The separate repository review cleared the resulting scope and
authorization corrections. This evidence was recorded before publication.
