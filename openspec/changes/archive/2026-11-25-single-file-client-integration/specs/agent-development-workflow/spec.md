# Spec Delta

## ADDED Requirements

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

#### Scenario: Set up a new Codex client from a synchronized project

- **WHEN** a consumer explicitly runs `add-to-codex` with a published toolkit installed from its lock
- **THEN** the toolkit registers a client-level catalog from the verified release using Codex commands and installs the shared plugin
- **AND** only the project's existing `.devkit` is updated to select the `codex` profile

#### Scenario: Reuse a client or retry setup

- **WHEN** a consumer runs the command with an existing client marketplace or enabled plugin
- **THEN** setup preserves the marketplace and reuses the enabled plugin when available
- **AND** a failed Codex installation does not enable the project profile
- **AND** trust of the repository and plugin hooks remains explicit in Codex

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
