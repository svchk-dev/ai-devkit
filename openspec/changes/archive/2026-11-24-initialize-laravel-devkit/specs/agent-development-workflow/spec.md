# Spec Delta

## Purpose

Provide reusable development-session controls that use each consumer's declared
policy while preserving actual verification, independent review and task scope.

## ADDED Requirements

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
