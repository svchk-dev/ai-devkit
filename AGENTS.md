# Working on AI Devkit

Read [README.md](README.md) and the selected OpenSpec change before decisions.
The toolkit implementation follows the active change. Read
[shared coding standards](standards/coding.md) before code changes. The toolkit
uses the internal layout in [development](docs/development.md); consumer site
architecture defaults do not prescribe its own folders. Preserve the distinction
between planned, implemented and verified behavior when reporting progress.

- Keep repository documentation and identifiers in English; communicate in the
  user's requested language.
- Before recording a rule, follow [rule ownership](standards/rule-ownership.md).
  Shared changes belong here; consumer business rules and explicit exceptions
  remain in the consumer. Keep all examples and metadata project-neutral.
- Keep generic engineering guidance independent of any adopter's proprietary
  domain, namespace, deployment environment, credentials or private procedures.
- Preserve upstream authorship and licenses. Keep generated Boost/OpenSpec
  resources owned by their generators rather than manually forking them.
- Changes to supported behavior require a coherent OpenSpec change before
  implementation. Planning approval does not itself complete implementation.
- Read full changed artifacts and applicable source standards. Verify claims with
  actual commands; structural validation does not prove runtime behavior.
- Before completing repository-changing work, obtain a separate independent
  review of the actual final scope and verification. Reviewers must not edit
  files or launch agents.
- Keep work local until the user explicitly authorizes the intended push or
  publication. Do not create remotes, tags or public packages from a discussion
  about public distribution alone.
- Use project-local pinned tooling when it is established. Do not silently use or
  upgrade globally installed tools.
