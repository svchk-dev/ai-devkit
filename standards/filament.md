# Optional Filament profile

Apply this standard only to consumers that use Filament. The toolkit does not
require or install Filament; projects without it ignore this document. Selecting
the filament adapter profile checks that the consumer installed its dependency.

Use native components and coherent sections. Consider useful search, filters,
workflow tabs, summary widgets, semantic status colors, sorting, optional columns,
pagination, empty states and visible associations. Choose controls justified by
actual data and permissions; invent no workflow state or decorative metric.

Recheck permissions on direct/interactive requests. Lists, summaries, selectors
and related records remain inside selected resource scopes and current read
permissions. Use deterministic ordering; search/filters/tabs must intersect.
Distinguish resource-wide totals from filtered results. Read-only UI must not seed,
publish, regenerate derived content or perform hidden writes.

Show meaningful identity and real saved workflow status with text plus color,
not color alone. Keep saved status separate from unsaved input. Make existing
associations visible without another search; show related links only when
authorized. Keep destructive confirmation and correctable input after failure.

Verify keyboard/focus, long Unicode text, light/dark themes and desktop/narrow
layouts. Stack columns/cards responsively and scroll intrinsically wide tables
locally. Record actual browser evidence separately from PHP/structural checks.
Language, entity recipes, publication workflow and branding are consumer policy.
