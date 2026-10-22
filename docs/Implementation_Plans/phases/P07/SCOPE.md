# P07 — Character-Driven, Party-Aware Narrative

**Authority:** [Owner AI GM behavior specification](../../OWNER_AI_GM_BEHAVIOR_SPEC.md), complementary to `content/ENGINE/AI_GM_CONSTITUTION.md`. **Reference at execution:** `codex/clean-ai-gm-2026-10` / `42ca6334bf19fb0a4a3b3f1ea38bf6cd6bd47b0d`.

## Objective

Where multiple equally eligible and similarly urgent optional developments already exist, prefer a naturally party-relevant opportunity when independently supported by entitled native evidence. Preserve individual character stories, NPC/faction autonomy, open player choices and private knowledge boundaries.

## Non-goals and invariants

- No mandatory convergence, common plot, party score, fixed narrative percentages, forced cooperation/co-location/party membership, or inference from absence/roster alone.
- No PC decisions, feelings, dialogue, consent, movement, dice, resource choices, or success invented by the GM.
- Native code alone validates and commits Daggerheart mechanics. Existing spotlight, source authority, privacy, saved readers, receipts and outbox contracts stay authoritative.
- Active player declarations/questions, direct NPC responses, urgent causality and native obligations precede optional party-aware selection.
- A compelling personal lead remains valid; party overlap is only a deterministic tie-break among comparable optional opportunities. Missing evidence preserves existing order.
- No new narrative or autonomy restrictions without asking the owner. This phase implements a soft preference only.

## Delivery sequence

1. **P07-F01** baseline, source/data-flow map, decision examples and failure cases; documentation only.
2. **P07-F02** pure bounded opportunity characterization and unit tests.
3. **P07-F03** integrate after entitlement/deduplication and before the existing four-signal cap; preserve source hashes and revalidation.
4. **P07-F04** minimal existing GM-private Director/writer guidance, with response obligations unchanged and no model-call increase.
5. **P07-F05** inspect continuity, retrieval, multiplayer and privacy boundaries; test only modified production contracts.
6. **P07-F06** fresh deterministic acceptance cases, coverage map, changed-file syntax and final delta evidence.
7. **Corrective delta P07-F07..F12** (handoff `Veiled_City_P07_Correction_Handoff_Luna_Medium.md`): merge duplicate coverage maps; correct stable ordering and mandatory/causal precedence; audit additional source-grounded overlap; verify downstream Director projection or hold it; reconcile evidence without rewriting F01–F06 history.

Each feature has a separate scope and ledger and is committed after it is supported. Only fresh feature tests under `bot/tests/ai-gm-2026-10/` may run; never execute legacy tests, broad validation, provider tests or CI. Start each frozen batch once and never poll. Do not push, merge, deploy, restart, access production DB, or spend on live providers.

## Data path and decision placement

```text
existing native/world sources
  -> worldNarrativeBridgePacket: authorize scope, validate source, deduplicate
  -> P07 deterministic tie-break (after eligibility, before slice(0, 4))
  -> bindDirectorNarrativeSource / dramaticBrief (private source-bound guidance)
  -> worldDirectorBridgeBeats and current Director/writer path
  -> existing audience projection, revalidation, native receipts/outbox
```

Ranking cannot create or upgrade truth, provenance, scope, knowledge, location, commitment or salience. Revalidation continues to compare the current native signal snapshot, so changed sources cannot gain authority from their earlier rank.

## Acceptance

- Required responses and justified urgent single-character consequences cannot be displaced by optional overlap.
- Verified independent links to distinct entitled character interests may break otherwise comparable optional ties; private-only or ambiguous evidence yields `unknown` and preserves order.
- Stable deterministic order, current signal IDs/schema, current cap of four, replay validation and at-most-one Director beat remain intact.
- No new model call, network, production DB use or invented causal link.
- Offline results are delta evidence only; semantics, Discord delivery, production state and release qualification remain unverified absent separate authorization.

## Corrective delta scope (anchored at local HEAD `47f93d755e8afc00a13206f148cf759f3c826269`)

- P07-F07 fixes duplicate root keys in the test coverage registry and preserves each mapping's union.
- P07-F08 fixes comparator antisymmetry and restricts overlap tie-breaking to optional classes only.
- P07-F09 keeps opening requests and unresolved tasks mandatory; resolved player outcomes remain causal; ordinary NPC conversation developments are optional.
- P07-F10 audits shared-cause evidence but holds non-conversation overlap because current resolved-action signals are causal, not optional.
- P07-F11 holds downstream optional-capacity reordering until a source-bound end-to-end Director fixture can prove established observations and native receipts are not displaced.
- P07-F12 adds focused acceptance evidence and reconciles the stale F06 phase wording. End-to-end persistence, Discord delivery, and live semantic quality remain outside this delta.

## Second corrective delta — P07-F13..F18

See [second corrective handoff](Veiled_City_P07_Second_Corrective_Handoff_Luna_Medium.md) and feature scope/ledger pairs in `docs/Implementation_Plans/features/P07-F13` through `P07-F18`. This delta adds a disposable-SQLite path using native authenticated speech and presence records through the real World Director request, native Director binding, current audience revalidation and writer-context builder; hardens the actual coverage loader against duplicate decoded root keys; and adds public/private/revocation acceptance. It does not change Daggerheart rules, action authority, creative requirements, or the four-item caps.

The added source proof resolves the former “no native Director fixture” gap for the available-capacity conversation path only. It does not identify comparable optional capacity under committed/established beat pressure, and no authoritative non-conversation optional cross-PC source was found. Those remain local holds. F01–F12 entries and P08/P09 work are unchanged.
