@php
    // This guideline template has no view inputs.
@endphp

# Shared development toolkit

This project explicitly selects versioned engineering standards from AI Devkit. Read its local AGENTS.md entry point, devkit.json policy and prepared
.devkit/instructions.md (or the configured resourceDirectory).

Use shared standards with explicit local rules. The default Main/Admin/Web/Console/Api
layout describes consuming applications/packages; respect documented overrides.
Check selected profiles, installed package versions and declared check commands.
Keep source/resource ownership clear; Boost and OpenSpec retain their own skills.

Do not overwrite project instructions, install trust or publish as an incidental
setup operation. Actual checks and separate review are required by project policy.

AI Devkit is a separate package. Before recording an instruction, read the
rule-ownership standard from its managed instructions and explain the owner.
Reusable rules belong in AI Devkit source; business rules and explicit exceptions
stay local. Do not edit vendor or silently duplicate shared defaults locally.
