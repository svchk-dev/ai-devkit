# Spec Delta

## ADDED Requirements

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
