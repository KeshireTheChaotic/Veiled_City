# P07-F01 — Ledger

**Status:** COMPLETE — documentation baseline committed.

| Field | Result |
|---|---|
| Baseline | `42ca6334bf19fb0a4a3b3f1ea38bf6cd6bd47b0d`; branch `codex/clean-ai-gm-2026-10`. |
| Changed paths | Planned: P07 phase scope/ledger, this feature scope/ledger, implementation plan README index. No production modules. |
| Current source map | `worldNarrativeBridgePacket()` in `bot/src/world-narrative-bridge.js` validates current session/owner scope and constructs eligible sourced signals; it returns `signals.slice(0,4)`. `revalidateWorldNarrativeSignal()` rebuilds that current packet and matches canonical hash. `bindDirectorNarrativeSource()` in `bot/src/narrative-director-source.js` binds current native signal snapshot to an in-process scope and includes a private `dramatic_brief`; `worldDirectorBridgeBeats()` validates source scope and produces bounded metadata. `narrative-delegation.js` owns creative response-task priority. Audience filtering/authority and publication remain downstream in native authority/output paths. |
| Decision placement | Rank already entitled, validated, deduplicated optional candidates immediately before the current four-item cap. Never alter IDs, source refs, scope or schema. |
| Required-response example | A PC asks a present NPC a direct question while a broader optional hook exists: NPC answer/reaction remains first. |
| Personal-thread example | A sourced urgent consequence to one PC beats an optional overlapping lead. |
| Safe-overlap example | Two optional candidates already have independent, currently entitled links to distinct involved PCs; stable tie-break may prefer overlap. |
| Failure/privacy examples | GM-only or character-private link cannot make a party candidate win; roster-only relationship, absence, shared scene, or similar names imply no link; missing evidence preserves current order. |
| Invariants | No invented PC action/feeling/consent/location/knowledge; no mechanics, spotlight, memory, persistence, output, audience or outbox changes. |
| Tests/cost | No tests applicable to docs-only work; no provider calls/tokens/cost. |
| Questions/blockers | None. |
| Rollback | Revert this documentation/index commit; no production state affected. |

| Completion SHA | `e8646c3a295391f913d79c3288b43b848761d827`. |
