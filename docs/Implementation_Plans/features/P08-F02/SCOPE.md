# P08-F02 — GM-private hook and knowledge firewall

**Phase:** [P08](../../phases/P08/SCOPE.md)  
**Status:** COMPLETE — FOCUSED OFFLINE CANARY PASS  
**Reference:** `KeshireTheChaotic/Veiled_City` · `codex/clean-ai-gm-2026-10` · `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Dependencies:** P08-F01

## Governing authority

Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` in full. Apply `README.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md` and `DECISION_GATES.md`. The owner behavior specification is authoritative for narrative intent; `content/ENGINE/AI_GM_CONSTITUTION.md` is complementary. Native state alone validates and commits rules; each player owns all PC choices, speech, thoughts, emotions, dice and resources. Source/audience proofs, secrets, canon and exactly-once delivery are nonnegotiable.

## Goal / deliverable

Eliminate unintended promotion of GM-only character hooks/relationships/canon proposals into `owner_character_material` or an owner/public authoring packet. Preserve legitimate GM planner inspiration and player-authorized revelation without erasing existing character data.

## Source entrypoints — inspect HEAD; do not assume all require edits

`bot/src/assembly-context.js`, `opening-entry-context.js`, `narrative-authority-context.js`, `character-export.js`, `db.js`, `gm-hook-import.js`, `gm.js`, applicable audience/receipt consumers

## Ordered implementation steps

1. Inspect `assemblyHookSources()` and all consumers. At the pinned SHA its `fields` array includes `gm_hooks` even though `playerCharacterProjection()` excludes it; treat this as a source-classification mismatch, not evidence of a real incident.
2. Replace implicit sheet iteration with an **explicit owner-entitled allowlist**. Exclude `gm_hooks`, `imported_gm_hooks`, `gm_private`, GM relationships, proposed canon and nested metadata with GM visibility. Decide separately how to sanitize nested owner-provided freeform objects without removing ordinary background.
3. Preserve imported GM hooks from GM-only readers as source-qualified optional `planAssembly()` seeds. Do not project their text, or their undisclosed mystery solutions, as player knowledge. GM seed references are not revelation receipts or promoted canon.
4. For owner-visible revelations, require an existing authenticated audience-disclosure mechanism/observation record. If no such route is source-authorized, keep reveal-dependent behavior on a local hold; do not invent a disclosure grant executor merely for this plan.
5. Project through both `assemblyWriterBrief()` and `openingEntryProjection()` plus all derived `narrative-authority-context` authoring requests; enforce the same current source versions and owner/principal/recipient checks at generation, commit and delivery/recovery boundaries.
6. Preserve historical saved readers and the original GM-only data. If any leakage can happen through legacy retained drafts/outbox records, quarantine **unpublished** unsafe parts and record an explicit migration/repair hold rather than silently altering an acknowledged turn.
7. Freeze the source/tests together; run only the new focused feature batch.

## Brand-new affected-code tests

Create `bot/tests/ai-gm-2026-10/p08-f02.test.mjs`. New canary-bearing GM-only sheet field, imported GM hook, hidden relationship, GM narrative, nested private metadata; assert no canary in owner/public prompts, accepted output or delivered/fallback material (initial, late, restart). Verify GM-only planner sees optional seeds only in authorized private context, ordinary owner notes still pass, and a **separately valid** disclosure appears only to its entitled audience. Exercise stale principal and revoked source after async writer work. Use changed production imports only.



## Acceptance / exit

Zero unauthorized canary projection in touched scenarios; no regression in normal owner material; no secret use as NPC knowledge or canon; source/principal change cannot publish stale content. Report any undisclosed historical records as an isolated hold.

## Scope, hold and rollback constraints

- Preserve native receipts and existing historical saved readers, principal/roster bindings, audience grants, uncertainties, acknowledged fiction and publication identity. Do not rewrite a delivered opening or send an uncertain part again.
- Use wholly new Node tests under `bot/tests/ai-gm-2026-10/` named for this feature, importing only **currently modified production code**, Node libraries, and newly written local fakes. No inherited tests, fixtures, golden outputs, broad validation or paid provider calls. For a documentation-only change, **no test is required or permitted solely to cover unchanged production**.
- Freeze source and fresh tests, run one targeted batch in one blocking call (or follow the repository's supervised no-poll alternative), collect the completed exit code, and document SHA/fingerprint, test hashes/counts, failures/skips and actual costs in [LEDGER.md](LEDGER.md). Rerun only after a batched repair; no watching.
- Before any *new creative limitation* (mandatory template, dialogue length cap, NPC invention ban, new fixed pacing, weaker model), ask the owner a concrete question and hold only that limitation. Enforcing existing player agency, privacy and mechanical authority does not require reapproval.
- If one item has missing source/rule or a noncritical hold, mark it locally and continue independent safe work. Stop unsafe critical work rather than fabricating proof. Reverse only this feature's scoped changes if rollback is necessary; retain owner edits and all authenticated history.
- Offline targeted passes are not release certification. No push, merge, deploy, service restart, production DB, provider spend or CI without separate approval.

## Corrective Follow-up — 2026-10-22

Treat nested `export_meta.visibility`, nested GM/private/audience labels and deep metadata as authority labels. Keep GM-hook records exclusively in the GM planner input. Do not treat any free-form planner-authored dramatic goal as disclosure permission. Fresh SQLite-backed corrective evidence is in `bot/tests/ai-gm-2026-10/p08-f02-correction.test.mjs`; accepted output, actual delivery, late-entry fallback and source/principal revocation during an awaited writer remain unqualified.

### Expanded corrective scope status — 2026-10-22

`openingEntryProjection()` now has a fresh source-projection test for legitimate owner material and nested GM/export canaries. Accepted narrative output and owner-private fallback delivery are still unqualified. See the F02 ledger addendum; no release claim.
