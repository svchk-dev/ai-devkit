# Rule ownership and shared contributions

AI Devkit is a separate, versioned development package. Its installed standards,
skills and tools have a canonical owner in the AI Devkit source repository.
The consuming project's AGENTS.md and business rules have a different owner.

## Classify before recording

Before adding or changing an instruction, state which owner it belongs to and why.
Use the rule's actual scope rather than the repository where it was discovered.
A pattern observed in one project is not automatically a shared default. Consider
independent consumers and framework versions before proposing a general rule.

| Proposed instruction | Canonical owner |
| --- | --- |
| Reusable Laravel engineering, naming, testing or architecture default | AI Devkit shared standards |
| Reusable practice for an optional integration | That integration's AI Devkit profile |
| Product behavior, authorization invariant, selected deployment environment or business vocabulary | The consuming project's rules/specifications |
| Deliberate exception to a shared default | Local rules and matching adapter settings, with scope and rationale |
| Upstream framework/tool guidance | Its upstream source/generator; report issues there instead of forking generated output |

For example, full collaborator names are a reusable coding rule. A product's
approval policy is local. Native Filament form layout belongs to the optional
Filament guidance. A project keeping a framework-native directory structure records
an explicit local architecture exception and its actual verification command.

Do not silently turn a missing shared rule into another maintained local default.
Do not copy the entire shared standard merely to override one detail. A reusable
rule should be understandable without private product names, namespace assumptions,
business invariants, credentials or access to any other project.

## Change the source, then adopt it

For a shared change, identify the source repository from package metadata or
explicit maintainer configuration. The consumer's installed package path is not
the source checkout. The ownership manifest identifies the package and executed
source digest; it grants no repository access or publication permission.

When the source checkout is available within the authorized task, make the change
there with its applicable OpenSpec workflow, documentation, checks and independent
review. Include only sanitized generic examples. If source access is unavailable,
prepare a concrete upstream change proposal and report the adoption as pending.
Do not invent a local checkout path or silently replace the upstream change with
a permanent consumer rule.

Never edit vendor files, managed snapshots or generator-owned skills to implement
a rule change. After a supported shared version is available, adopt it explicitly:
update the consumer's development dependency/lock, refresh managed resources,
review the diff and rerun affected checks. Preserve local rules and application data.

For a local rule, update consumer-owned guidance and specifications through that
project's maintained mechanism. Make its scope and any override explicit. Shared
defaults continue to apply outside the exception.

Keep publication separate from source preparation. Installing AI Devkit or
identifying a shared improvement does not authorize a remote write or release.
