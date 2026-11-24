# Consumer architecture default

This describes sites and packages that adopt the devkit. The toolkit's internal
tooling directories have their own documented architecture.

Use feature-first areas under the consumer's source root and namespace:

```text
Main/<Feature>/          Shared business rules, persistence and neutral contracts
Admin/<Feature>/         Administrative delivery
Web/<Feature>/           Public web delivery
Console/<Feature>/       Console delivery
Api/<Feature>/           API delivery when implemented
<AdditionalArea>/<Feature>/  Another actual delivery boundary when needed
```

An application may use `app/` and `App`; a package may use `src/` and its own
namespace. Main depends only on Main within the project. Each delivery area
depends on itself and Main. An explicit composition root may wire areas; business
logic does not belong in that root. Rules apply to imports, annotations,
inheritance, attributes, class strings and runtime/container resolution too.

Additional named areas are allowed when there is an actual consumer. OtherDomains
is not a mandatory folder. Create no empty future Api/area/role directories.

Service entry points live directly in their feature component, without a Services
subdirectory. Keep useful Models, ViewModels, Snapshots, Contexts, Inputs, Results,
Repositories and other role groups. Collocated specialized contracts can be useful;
neither an interface nor a facade per service is required. Prefer a useful main
entry point without pass-through APIs that hide supported collaborators.

Existing projects are not silently restructured by installation. To use another
architecture, explicitly record the layout/dependency policy in local rules and
reference it from the adapter's architecture override with its check command.
This replaces architecture defaults, not unrelated engineering standards. Keep
product-specific feature restrictions in the consumer's own architecture checks.
