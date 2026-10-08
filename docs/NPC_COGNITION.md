# NPC Cognition — v3.8.0

Veilkeeper's NPC cognition layer stores **subjective character state**, not objective campaign truth. The canon ledger and campaign facts remain authoritative for what is actually true; cognition records what an NPC remembers, believes, wants, and is predisposed to do.

## State model

Each persistent NPC can have:

- **Profile** — stable identity/portrayal, activity tier, decision profile, capability notes, and explicit knowledge boundaries.
- **Memory** — episodic, semantic, relational, secret, or supernatural-impression memories with sentiment, importance, confidence, provenance, reinforcement, and lifecycle state.
- **Knowledge/belief** — durable claims classified as `known`, `suspected`, `rumor`, `doubted`, or `unknown`.
- **Goals** — immediate/near/long objectives with priority, progress, status, dependencies, acceptable methods, and rationale.

An NPC memory may be inaccurate. A rumor in `npc_knowledge` never becomes a global fact merely because the NPC believes it.

## Retrieval

Veilkeeper does not send an NPC's complete lifetime history to the model. Retrieval ranks cognition by scene/query overlap, importance, confidence, recency, prior recall, current goals, activity tier, and NPC-proxy context. Normal turns receive a compact set of the most relevant NPCs; World Director passes receive a broader goal-aware set.

Recall updates are operational retrieval metadata. They help repeatedly relevant memories remain salient without deleting older history.

## Automatic memory formation

The normal GM structured response now contains `npc_memories`, `npc_knowledge`, and `npc_goals`. The mandatory post-turn state review includes `npc_cognition`; cognition cannot be declared changed without a corresponding structured update, and emitted cognition updates cannot be hidden behind `no_change`.

Veilkeeper is instructed to create cognition only when an NPC plausibly witnessed, experienced, was told about, inferred, read, or supernaturally perceived the information. GM-only/global context is not automatically NPC knowledge.

## Veiled City setting boundaries

### Hospitality and obligations

Hospitality, shelter, invitations, gifts, formal introductions, oath language, Court/Concord custom, or explicit exchanges may establish **remembered debt or contractual expectation** when established fiction supports it. Ordinary politeness alone does not create a supernatural contract.

v3.8 stores these concepts as subjective relational/obligation cognition. The full enforceable obligation/contract state machine belongs to the later background-action phase.

### Supernatural perception and the Veil

Memories can use `subject_type=veil` and `memory_type=impression` for threshold, anchor, resonance, haunting, or other supernatural impressions. These are perceptions, not automatic truth. The Veil never grants an NPC omniscience merely because Veil-related GM facts exist.

## One-time seed

Run once after upgrading:

```text
/vc-admin seed-npc-cognition
```

The seed is guarded by the durable `npc_cognition_v1` seed marker. Re-running it is rejected.

It initializes cognition from:

1. `GM_PRIVATE/NPCS/npcs.json` NPC dossiers;
2. existing campaign NPC reference entries, including player-visible discoveries already promoted into structured campaign state;
3. existing relationship graph entries involving NPCs.

The seed creates a safety snapshot first. It does **not** infer that every NPC knows every campaign/player/GM fact.

Inspect an NPC with:

```text
/vc-gm npc-state npc:<name or key>
```

Both commands are GM/admin-only; NPC cognition is never exposed through player `/vc-intel` commands or player-safe campaign exports.

## Persistence and recovery

NPC cognition tables participate in campaign snapshots and first-class backups. GM-full campaign exports include cognition; player-safe exports exclude it entirely.
