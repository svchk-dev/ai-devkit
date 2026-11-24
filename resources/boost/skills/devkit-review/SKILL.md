---
name: devkit-review
description: Independently review authorized project changes against shared standards and local contracts without editing files.
license: MIT
metadata:
  author: svchk-dev
---

# Independent review

Read current project instructions, applicable shared standards and local rules.
Obtain objective, baseline, owned edits/new files, unrelated pre-existing changes
and actual check results. Inspect real diffs, full changed methods/callbacks and
affected callers. Distinguish target specifications from shipped behavior.

Report actionable defects or documented convention violations with file/line,
governing rule, evidence and minimal correction. Personal preferences and
unrelated issues are outside required corrections. Check naming, logical blocks,
responsibility, current consumers, security and relevant transaction behavior.

Do not edit, format, commit, publish or launch another reviewer. Return passed,
changes required or incomplete with reviewed scope and unavailable evidence.
Substantive final edits need follow-up review; invoking a reviewer alone is not
completion. Read-only review does not require recursive review.

Before adding or changing an instruction, classify its owner using the shared
rule-ownership standard linked from the managed instructions. Reusable defaults
belong in AI Devkit source; product rules and deliberate exceptions stay local.
Do not edit installed/generated resources or silently create a second local owner.
