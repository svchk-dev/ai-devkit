# agent-development-workflow Specification

## Purpose

Provide reusable development-session controls that use each consumer's declared
policy while preserving actual verification, independent review and task scope.

## Requirements

### Requirement: Consumer-configured project context

The workflow SHALL restore current task scope and applicable shared and local
references for a supported session. Source roots, commands, specialized standards
and product rules MUST come from the consumer adapter. Delivered context MUST NOT
count as evidence that the agent read or understood a source.

#### Scenario: Resume a scoped task

- **WHEN** a supported session starts, resumes or compacts
- **THEN** current task scope, mode and applicable references are supplied
- **AND** another product's namespace, documents or business rules are not injected

#### Scenario: Declare another source layout

- **WHEN** a consumer explicitly overrides the default architecture in its rules and adapter
- **THEN** affected-path guidance and checks use the declared layout
- **AND** the override is visible without modifying the installed toolkit

### Requirement: Actual execution creates verification evidence

Only observed completed execution of declared checks SHALL create successful
verification evidence. Evidence MUST identify the task, command, inputs, tool
identity and actual outcome. Failed, unavailable, interrupted or running checks
MUST remain distinguishable from successful checks.

#### Scenario: Complete a declared check

- **WHEN** a check exits successfully with stable declared inputs
- **THEN** its result records the actual execution and checked state
- **AND** it can satisfy only the task and check obligations it covers

#### Scenario: Claim success without execution

- **WHEN** an agent prints a success marker or a check remains running or fails
- **THEN** the workflow accepts no successful evidence from that claim
- **AND** the missing or failed obligation remains visible

### Requirement: Current and isolated workflow evidence

Verification and review freshness SHALL include relevant consumer inputs, adapter
policy and the selected installed toolkit implementation and resources. Changed or
unstable inputs MUST invalidate affected evidence. Tasks and worktrees MUST NOT
inherit unrelated evidence or erase each other's findings.

#### Scenario: Change toolkit code or guidance

- **WHEN** relevant installed or development-linked toolkit content changes during or after verification
- **THEN** a mixed-state run cannot pass and affected previous evidence becomes stale
- **AND** a new successful check is required for the new state

#### Scenario: Change only declared reporting inputs

- **WHEN** only reporting inputs outside a runtime check's declared scope change
- **THEN** unchanged runtime evidence remains reusable
- **AND** the adapter's documentation and substantive-review obligations still apply

### Requirement: Completed separate independent review

Successful repository-changing completion SHALL require an observed completed
separate reviewer assessment of current authorized changes and required evidence.
Unresolved confirmed findings or unavailable required scope MUST prevent a passed
verdict. Read-only tasks and reviewers MUST NOT require recursive review.

#### Scenario: Complete a current review

- **WHEN** a separately invoked reviewer finishes with verified matching scope and no unresolved findings
- **THEN** its observed identity and assessment can satisfy the review obligation
- **AND** coordinator-authored text cannot substitute for that assessment

#### Scenario: Change reviewed inputs

- **WHEN** substantive changes affect reviewed inputs after the reviewer finishes
- **THEN** the prior review is stale and follow-up review is required

### Requirement: Explicit activation and client compatibility

Agent integrations SHALL report actual activation, trust and observed client
coverage. Installation MUST NOT grant trust or tool permissions automatically.
Unsupported client paths MUST remain visible and manual consumer obligations MUST
remain applicable.

#### Scenario: Hooks are missing or untrusted

- **WHEN** a selected client integration lacks trusted definitions or required observed coverage
- **THEN** compatibility is reported as incomplete
- **AND** documentation, tests and review are not reported as verified through that integration

#### Scenario: An integration supports another client

- **WHEN** another agent client is added
- **THEN** its lifecycle and reviewer observations are verified independently
- **AND** coverage from a different client is not reused as proof

### Requirement: Honest and bounded task completion

The workflow SHALL distinguish success, progress, waiting and incomplete work
using current task-bound checkpoints. Missing evidence MUST produce actionable
feedback without an endless retry loop. Interruption MUST preserve pending
obligations and MUST NOT authorize new scope or publication.

#### Scenario: Finish with missing evidence

- **WHEN** successful completion is requested without a current required check or review
- **THEN** success is rejected with the missing action
- **AND** progress or a concrete incomplete handoff remains possible

#### Scenario: Interrupt or start another task

- **WHEN** the user interrupts work or the session starts another task
- **THEN** pending state remains isolated to its original task
- **AND** a consumed checkpoint cannot authorize the later work

### Requirement: Private and recoverable local workflow state

Workflow state SHALL remain local to its worktree, session and task. Credentials
and full agent transcripts MUST NOT be copied into state or distributed resources.
Malformed state or observation failures MUST remain incomplete until explicit
scoped recovery re-establishes valid evidence.

#### Scenario: Recover malformed state

- **WHEN** task state is malformed
- **THEN** the affected task reports the failure and requires scoped recovery
- **AND** recovery neither clears another task's findings nor fabricates passed checks

### Requirement: Shared client integration for single-file projects

The toolkit SHALL provide a reusable Codex integration that follows an
adopter's locked toolkit version without generating project hook definitions.
Dispatch MUST require verified native project trust and toolkit identity.

#### Scenario: Open an opted-in trusted consumer

- **WHEN** a trusted Codex installation invokes the shared integration for a trusted project with a synchronized `.devkit` and the `codex` profile
- **THEN** the integration dispatches the relevant event to the project's selected installed toolkit
- **AND** the toolkit exposes shared and local guidance from the adapter without adding a project file

#### Scenario: Refuse an unsafe or mismatched selection

- **WHEN** project trust cannot be verified or the locked, installed and configured toolkit identities disagree
- **THEN** the shared integration does not execute the project toolkit
- **AND** unavailable or stale activation is visible without inventing coverage or receipts

#### Scenario: Open a project without the selected integration

- **WHEN** a Codex event belongs to a project without the `codex` profile in `.devkit`
- **THEN** the shared hook skips it without taking project actions

### Requirement: Explicit shared Codex setup

The toolkit SHALL expose an explicit command to install or reuse its shared
Codex plugin and opt in the current single-file consumer. The command MUST
preserve existing user-level marketplace selection and native trust controls.
The setup working directory MUST be outside the consumer project and any Git
checkout. An empty `.git` directory alone MUST NOT identify a checkout.

#### Scenario: Set up a new Codex client from a synchronized project

- **WHEN** a consumer explicitly runs `add-to-codex` with a published toolkit installed from its lock
- **THEN** the toolkit registers a client-level catalog from the verified release using Codex commands and installs the shared plugin
- **AND** only the project's existing `.devkit` is updated to select the `codex` profile

#### Scenario: Reuse a client or retry setup

- **WHEN** a consumer runs the command with an existing client marketplace or enabled plugin
- **THEN** setup preserves the marketplace and reuses the enabled plugin when available
- **AND** a failed Codex installation does not enable the project profile
- **AND** trust of the repository and plugin hooks remains explicit in Codex

#### Scenario: Use a temporary path with an empty Git marker

- **WHEN** the temporary path or an ancestor contains an empty `.git` directory and the path is outside the project and all checkouts
- **THEN** setup uses the temporary path for its working directory

#### Scenario: Refuse a temporary path inside a checkout

- **WHEN** the temporary path is inside a Git checkout, including when an empty `.git` directory is present below the checkout root
- **THEN** setup fails before invoking Codex or changing the project adapter

### Requirement: Reusable OpenSpec publication guidance

The toolkit SHALL distribute a shared OpenSpec sync, archive and push skill
through the Codex plugin and Composer skill resources. The skill SHALL use the
selected project's OpenSpec workflows, verification and publication policy.

#### Scenario: Discover the skill through the shared client plugin

- **WHEN** a consumer opens a session with the AI Devkit client plugin installed
- **THEN** the shared publication skill is available without a project skill file

#### Scenario: Apply project authorization and publication policy

- **WHEN** the agent uses the skill for a selected OpenSpec change
- **THEN** it follows the project's verification, specification, archive and release requirements
- **AND** it requires explicit authorization for the intended remote changes

### Requirement: Consumer-declared verification paths

The toolkit SHALL accept additional executable or runtime asset paths from the
consumer adapter. Documentation-only verification MUST reject scopes that cover
these paths, and relevant runtime receipts MUST bind their contents.

#### Scenario: Select an interface asset or its owning directory

- **WHEN** a change scope intersects a consumer-declared code path
- **THEN** the documentation-only profile is rejected even if the files use non-code extensions
- **AND** runtime verification includes the selected path in its execution inputs

### Requirement: Native OpenSpec change authoring

The toolkit SHALL delegate change scaffolding and change-name validation to the
project's OpenSpec workflow. Its Codex integration SHALL provide ordinary edit
guidance for OpenSpec artifacts.

#### Scenario: Scaffold independent changes

- **WHEN** the project's OpenSpec CLI scaffolds requested changes with distinct names in an AI Devkit-enabled Codex session
- **THEN** each change has its own scaffold and can be authored in that session
- **AND** scaffolding preserves existing change artifacts

#### Scenario: Edit a change artifact

- **WHEN** a supported Codex editing tool writes an OpenSpec artifact
- **THEN** the toolkit provides its ordinary project guidance and edit bookkeeping
