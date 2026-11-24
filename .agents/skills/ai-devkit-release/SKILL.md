---
name: ai-devkit-release
description: Maintain AI Devkit release notes, decide version impact, and complete annotated tagging and Composer verification after an authorized AI Devkit push. Use for AI Devkit package changes, push requests, and version or release work in this repository.
---

# AI Devkit release

Use [the release policy](../../../docs/releases.md) and
[the changelog](../../../CHANGELOG.md). Apply this workflow to AI Devkit itself.
Consumers publish under their own repository policies.

For local work, classify package impact and record pending notes for changes
that affect users of the package. For a release status request, inspect the
requested identities and checks in read-only mode.

For an explicitly authorized push, compare the complete pending change set
against the latest verified release. Own the version decision. Honor a
branch-only instruction and check for any changes that warrant a package tag.
Where the push includes a release, follow the exact-candidate gates and carry
the operation through the annotated tag, hosted tag checks and fresh Composer
installation. One authorization for the intended push covers those release
steps without a separate tag request.

If a gate blocks the release, report the candidate SHA, selected version,
observed results and the precise pending step. Preserve existing tags.
