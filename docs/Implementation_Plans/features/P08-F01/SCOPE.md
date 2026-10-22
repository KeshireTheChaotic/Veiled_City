# P08-F01 — Reference reconciliation and source-to-authority map

**Phase:** [P08](../../phases/P08/SCOPE.md)  
**Status:** COMPLETE — DOCUMENTATION-ONLY RECONCILIATION  
**Reference:** `KeshireTheChaotic/Veiled_City` · `codex/clean-ai-gm-2026-10` · `81569d08699343e401fc11ba1eaed0f10b4fd37a`  
**Dependencies:** None (entry feature)

## Governing authority

Read `docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md` in full. Apply `README.md`, `TEST_PROTOCOL.md`, `TEST_EXECUTION_NO_POLL.md` and `DECISION_GATES.md`. The owner behavior specification is authoritative for narrative intent; `content/ENGINE/AI_GM_CONSTITUTION.md` is complementary. Native state alone validates and commits rules; each player owns all PC choices, speech, thoughts, emotions, dice and resources. Source/audience proofs, secrets, canon and exactly-once delivery are nonnegotiable.

## Goal / deliverable

Reconcile the older opening-integration audit to the actual checkout at the supplied SHA, confirm scope and authority, and create a compact cross-boundary contract before changing any production code. This feature is **documentation-only unless a direct current-code repair is independently authorized and moved to its implementing feature**.

## Source entrypoints — inspect HEAD; do not assume all require edits

`bot/src/{commands.js,session-opening-runner.js,assembly-context.js,gm.js,pvp-output.js,assembly-publications.js,opening-entry.js,session-opening-attendance.js,narrative-authority-context.js}`; project process docs and persisted record readers

## Ordered implementation steps

1. Record `git status --short`, `git branch --show-current`, `git rev-parse HEAD` and any pre-existing edits; never clean, reset or overwrite them.
2. Read the owner specification and five repository process policies in full before implementation. Consult only this active feature/phase pair and targeted source once baseline reading is complete.
3. Trace `/vc-session start` → `scheduleSessionOpening` → `runSessionOpening` → `planAssembly` → `assemblySlots` → `authorAssemblyScene` → `prepareAssemblyOutput` → outbox/acknowledgement; separately trace before-start registration and after-start `/vc-session present`/`arrive` → `prepareOpeningEntryOpportunity` → `deliverOpeningEntry`.
4. Draw compact data-flow crosswalk: GM-only planning seeds; owner-entitled material; source-authorized disclosure; public camera vs real witnessed presence; owner-private entry; planned dramatic objective; certified writer context; native accepted narrative; outbox/receipt; acknowledged weighted-memory write.
5. Verify which seven source-derived gaps remain, have changed, or already been solved by current code. Inspect schema compatibility with persisted v1/v2 opening records, manual/returning-party modes and historic snapshot readers. Do not assume the audit SHA is current.
6. Record dependencies, touched-module risk, precise null/one/two/many-player state cases, and the least invasive integration boundaries. Keep a list of evidence-required hypotheses rather than presenting old findings as newly tested facts.
7. Scope fresh modified-code tests for subsequent features using new deterministic fakes (temporary SQLite, fake clock, mock provider/outbox). Do not write or run tests against unchanged production purely for characterization.

## Brand-new affected-code tests

**No feature-specific tests**: documentation-only reconciliation, under TEST_PROTOCOL. If current code is modified, move that change into P08-F02…F07 with brand-new affected-code tests; do not smuggle implementation into F01.



## Acceptance / exit

Updated [crosswalk](../../P08_SOURCE_CROSSWALK.md) with exact inspected SHA, verified findings, field/receipt contracts, safe dependency order, compatibility conclusions and open verification needs. No claim of runtime qualification.

## Scope, hold and rollback constraints

- Preserve native receipts and existing historical saved readers, principal/roster bindings, audience grants, uncertainties, acknowledged fiction and publication identity. Do not rewrite a delivered opening or send an uncertain part again.
- Use wholly new Node tests under `bot/tests/ai-gm-2026-10/` named for this feature, importing only **currently modified production code**, Node libraries, and newly written local fakes. No inherited tests, fixtures, golden outputs, broad validation or paid provider calls. For a documentation-only change, **no test is required or permitted solely to cover unchanged production**.
- Freeze source and fresh tests, run one targeted batch in one blocking call (or follow the repository's supervised no-poll alternative), collect the completed exit code, and document SHA/fingerprint, test hashes/counts, failures/skips and actual costs in [LEDGER.md](LEDGER.md). Rerun only after a batched repair; no watching.
- Before any *new creative limitation* (mandatory template, dialogue length cap, NPC invention ban, new fixed pacing, weaker model), ask the owner a concrete question and hold only that limitation. Enforcing existing player agency, privacy and mechanical authority does not require reapproval.
- If one item has missing source/rule or a noncritical hold, mark it locally and continue independent safe work. Stop unsafe critical work rather than fabricating proof. Reverse only this feature's scoped changes if rollback is necessary; retain owner edits and all authenticated history.
- Offline targeted passes are not release certification. No push, merge, deploy, service restart, production DB, provider spend or CI without separate approval.
