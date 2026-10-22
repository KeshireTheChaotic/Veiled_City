# P07-F02 — Pure bounded opportunity characterization

**Status:** Implementation prepared; test batch not yet run.

Implement a dependency-free deterministic ordering helper for already eligible native signals. Inputs are characterized metadata supplied by the caller, never model prose. Protect response/causal classes, use verified organic overlap only as a same-class and same-urgency tie-break, preserve original order when evidence is unknown, and cap output at four. Do not alter signal objects, IDs, schema, provenance or native state.

This helper cannot infer overlap itself. A caller must supply independently validated actor links; empty/invalid links are `unknown`. Detailed classification from current native signal types and evidence is deferred to F03 integration, where any unproven relationship must remain unknown.

**Fresh test:** `bot/tests/ai-gm-2026-10/p07-f02.test.mjs` covers precedence, comparable tie-break, private/unknown exclusion, single-character opportunities, stable order and bounded selection.
