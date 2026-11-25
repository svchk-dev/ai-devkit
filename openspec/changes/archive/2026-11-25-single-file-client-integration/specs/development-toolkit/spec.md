# Spec Delta

## ADDED Requirements

### Requirement: Single-file quality command execution

AI Devkit SHALL expose package-owned Pint and PHPStan commands that read
project settings from `.devkit` and use the installed shared defaults.

#### Scenario: Format or analyse a consumer through the installed toolkit

- **WHEN** a consumer invokes the selected quality command with local settings in `.devkit`
- **THEN** the command applies shared defaults and declared local settings and paths
- **AND** it reports the actual tool exit status and removes temporary configuration
- **AND** it creates no maintained project launcher or configuration copy

#### Scenario: Use consumer container tooling

- **WHEN** a consumer supplies an argv prefix for its PHP execution environment
- **THEN** the package passes the tool and temporary configuration as arguments to that environment
- **AND** a missing required tool or invalid path produces an actionable failure
