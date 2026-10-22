# P07-F05 — Ledger

**Status:** SUPPORTED BY EXISTING CODE — STATIC INSPECTION; no production changes.

| Boundary | Inspection result |
|---|---|
| Salience | `narrative-salience.js` derives canonical interest from authenticated owner-authored text/verified typed interaction or accepted-established narrative units with source causes. Selector metadata alone is not an interest source and does not call persistence. |
| Memory/disclosure | `narrative-memory.js` stores GM fiction as undisclosed. Player recall requires acknowledged-to-audience delivery, current unit hash, exact entitled audience, and all publication receipts delivered. Camera exposition is explicitly not PC witness or NPC cognition. |
| Context retrieval | `context-planner.js` asks native `contextFacts` with explicit actor/scope before scoring candidates; character continuity is gathered only for currently present GM roster actors in GM scope or the authenticated owner's own character scope. Personal arcs remain valid. |
| Assembly | `assembly-context.js` selects hook sources only for authenticated private owner scope. Public writer briefs contain no private sources and describe convergence as an objective, not fact/motivation; shared opportunities are camera framing and do not assert arrival or membership. |
| Continuity/multiplayer | `story-continuity.js` checks source visibility, owner and current scene for personal proposals. `scene-intent-board.js` validates accepted owner actions and only includes shared inputs with current actual presence at the native location. `pacingAdvice()` exposes least-recently-heard as descriptive data and explicitly says spotlight is opportunity, never initiative. |
| Changes/tests | No production modules changed; no tests applicable or run. No legacy tests used. |
| Cost | No provider calls/tokens/expense; no cache or latency claim. |
| Questions/holds | None. Live semantic model behavior remains unqualified. |
| Rollback | Revert documentation commit only; no state change. |
