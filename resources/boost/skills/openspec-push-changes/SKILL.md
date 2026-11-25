---
name: openspec-push-changes
description: Sync, archive and push selected completed OpenSpec work using the current project's verification and release policy. Use for an explicit OpenSpec publication request.
license: MIT
metadata:
  author: svchk-dev
---

# Push OpenSpec changes

Use the release, verification and OpenSpec instructions of the project receiving
the push. Read its agent instructions and local adapter when present. Use its
maintained commands and installed tool versions.

## Select the authorized work

An explicit request to run this workflow authorizes syncing, archiving,
committing and pushing the intended work. Creating, inspecting or mentioning
the skill grants no permission. Honor any narrower request, including a
branch-only push. Follow the project's authorization rules for tags and
package publication. Deployment requires its own authorization.

Inspect the branch, upstream, working tree and staged changes. Resolve the
OpenSpec root and store with the project's installed CLI. Select the named
change, the change established in the conversation, or the only active change.
Ask when the intended change or push target is ambiguous. Preserve changes
outside that scope. If the change is already archived, verify the existing
archive and continue with the remaining authorized work. When no change is
active, skip change-specific steps and verify any intended pending work under
the project policy. Report a no-op if the requested work is already current.

## Sync, verify and archive

1. Inspect the selected change's status, tasks, implementation and actual
   evidence. Complete verification already in scope, including independent
   review when required. Missing implementation, failed checks or required
   unavailable evidence block the dependent stages. Keep release-verification
   tasks open until the project's release workflow supplies the evidence.
2. Apply the installed OpenSpec spec-sync workflow for the resolved root and
   store. Merge the selected deltas into the main specifications and verify
   the resulting requirements. Preserve unaffected requirements and examples.
   If there are no deltas, skip synchronization.
3. Follow the project's documented order for candidate checks, publication
   and archiving. Use its release procedure when package publication applies.
   That procedure determines versioning, tags and publication checks. For an
   ordinary branch push, run the applicable checks and archive before the
   final push. Archive only completed work with evidence using the installed
   OpenSpec archive workflow. Preserve metadata, fix links affected by the
   move and validate the resulting specifications and documentation.

## Push and report

Use the installed commit-message guidance when available. Stage and commit
only the authorized changes, honoring the project's commit and branch rules.
For an ordinary branch push, use an explicit branch refspec with
`--no-follow-tags` and verify the remote ref. If the push result is
ambiguous, inspect that ref before retrying. Resolve upstream divergence
through the project's normal non-destructive workflow.

Report the selected change, archive path or pending reason, checks actually
run, review outcome, pushed commit and any verified release identity. State
what remains when a dependent stage is blocked.
