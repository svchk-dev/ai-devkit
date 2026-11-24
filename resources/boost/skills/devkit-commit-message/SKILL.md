---
name: devkit-commit-message
description: Draft or review Git commit text using the shared format; this skill does not execute a commit or push.
license: MIT
metadata:
  author: svchk-dev
---

# Commit message

Read the intended diff and local commit-policy exceptions. Use English Type:
Summary with one of Chore, Feat, Fix, Docs, Refactor, Test, followed by a concise
capitalized summary. Derive the type from the actual change.

A request for commit text asks for text only. A commit instruction does not
authorize pushing, tagging or publication. Consult the consumer's explicit policy.

Before adding or changing an instruction, classify its owner using the shared
rule-ownership standard linked from the managed instructions. Reusable defaults
belong in AI Devkit source; product rules and deliberate exceptions stay local.
Do not edit installed/generated resources or silently create a second local owner.
