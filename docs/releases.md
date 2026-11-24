# AI Devkit releases

## Version and changelog

Composer derives versions from immutable annotated `vMAJOR.MINOR.PATCH` Git tags.
Keep the package manifest without a manual version. Record package changes under
`Unreleased` in the [changelog](../CHANGELOG.md). When cutting a release, place
the selected notes under the new version and date before freezing the candidate.

Inspect all unreleased changes since the latest stable remote tag. Select the
smallest version that describes the full change set.

| Package impact | Increment |
| --- | --- |
| Compatible correction to distributed standards, skills, configuration or tools | Patch |
| Compatible addition to the public package | Minor |
| Breaking change to a supported consumer contract before 1.0.0 | Minor |
| Breaking change to a supported consumer contract from 1.0.0 | Major |
| Repository maintenance with no package impact | No tag |

Consumer contracts include supported platforms, managed resources, profiles,
configuration schema, published commands and skill discovery. A repository
maintenance change can still warrant a release when it affects those contracts.
Document breaking changes and recovery steps, including before 1.0.0. Honor an
explicit exact version when it is unused and compatible. Resolve conflicts
with the owner before substituting a different version.

## Authorization

An explicit instruction to push intended AI Devkit work authorizes the
containing branch and the needed package tag under this procedure. A branch-only
instruction limits publication to the branch. A request to prepare changes,
review them or name a version keeps the work local. Permission applies to the
specified work. Repository creation and package registry registration are
separate operations.

## Publish a release

1. Confirm the intended public remote and branch. Inspect the working tree,
   changelog, remote branch and annotated stable tags, including the peeled
   source identities. Compare versions numerically and verify the preceding
   release is in the candidate history. Check local and remote tag collisions
   before choosing a version. Keep unrelated staged or worktree changes outside
   the candidate.
2. Freeze the intended commit and verify its exact public history, exported
   package files, licensing and provenance. Run `make check` and
   `make test-consumer` for the candidate and obtain the independent review.
   Refresh actual trusted-client compatibility evidence when the executing
   hooks or client integration change. Record actual results and the commit.
3. Push the containing branch with an explicit branch refspec and
   `--no-follow-tags` so local Git configuration cannot publish extra tags.
   Verify the [GitHub Actions workflow](https://github.com/svchk-dev/ai-devkit/actions/workflows/checks.yml)
   succeeds on the candidate SHA. Immediately before tagging, recheck the
   candidate, remote branch, tag availability and evidence.
4. Create an annotated `vMAJOR.MINOR.PATCH` at that SHA and push only its exact
   tag ref with `--no-follow-tags`. Confirm the remote tag object and peeled
   commit. After an ambiguous push, check the remote before retrying. Treat
   published tags as immutable.
5. Verify the tag-triggered workflow and install the stable version in a fresh
   isolated Composer project using the public distribution source. Confirm the
   lock version and source reference match the tag. Verify public registry
   visibility separately when the registry supplies the package.

Report the version, commit, hosted checks and installation evidence. A failed
gate before tagging leaves the candidate pending. A failed gate after tagging
leaves the tag in place and the verification incomplete. Prepare corrections as
a separate candidate for an authorized release.

## Rehearse changes to this workflow

Use a disposable repository and local bare remote for tag/ref operations.
Exercise version selection from multiple pending changes, a local-only change,
an authorized branch-only push, a tag collision and a failed gate. Verify the
annotated tag object's peeled SHA in the successful case. Record any hosted or
Composer step that the rehearsal did not exercise.
