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

### Requirement: Consumer-declared verification paths

The toolkit SHALL accept additional executable or runtime asset paths from the
consumer adapter. Documentation-only verification MUST reject scopes that cover
these paths, and relevant runtime receipts MUST bind their contents.

#### Scenario: Select an interface asset or its owning directory

- **WHEN** a change scope intersects a consumer-declared code path
- **THEN** the documentation-only profile is rejected even if the files use non-code extensions
- **AND** runtime verification includes the selected path in its execution inputs
