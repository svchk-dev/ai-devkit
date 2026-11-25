# Proposal

## Why

Codex setup rejects an otherwise usable temporary directory when an empty
`.git` placeholder is present in its path. This blocks setup in environments
that create these placeholders for filesystem isolation.

## What Changes

- Allow an empty `.git` directory during checkout detection and continue
  checking its ancestors.
- Verify that setup still rejects a temporary directory inside a checkout.

## Capabilities

### Modified Capabilities

- `agent-development-workflow` covers temporary working directories for explicit Codex setup.

## Impact

The Composer CLI setup command and its Node verification cover the corrected
behavior. The command takes the same arguments and uses the same Codex profile.
