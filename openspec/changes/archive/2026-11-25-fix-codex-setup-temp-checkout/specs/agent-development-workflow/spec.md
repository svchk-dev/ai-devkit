# Spec Delta

## MODIFIED Requirements

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
