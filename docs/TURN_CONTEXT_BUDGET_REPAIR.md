# Turn context budget repair

Starting development HEAD: `78b844a18681b1ed7fe6d250b9a45ea761cd0f08`, branch `codex/session5-narrative-latency`, version 10.0.0. This is a prompt projection repair, not a character migration or rules change.

Accepted typed intents are canonical adjudication inputs; authenticated human declarations own intent; native receipts own outcomes.

## Evidence

Owner-authorized read-only inspection of production Session 6 found three failed, uncommitted `CONTEXT_OVERFLOW` turns. A credential-free diagnostic used SQLite `readOnly` and `query_only`, intercepted prompt assembly before provider execution, and reported `total_changes=0`. It bypassed only the redundant existing-campaign insert during reading; no campaign initialization or recall write occurred. Production was not changed.

The current source's fixed instructions occupied 42,617 characters, leaving a 71,383-character input limit before its mandatory 2,000-character margin. Roster/sheets occupied 24,641 characters. SESSION embedded the same assembly plan already present in its dedicated mandatory section: 4,530 serialized characters of duplication. Current-data reconstruction exceeded the effective mandatory budget by 2,210 characters for Jaxon and 989 for Tyrell. Billy's recorded failed input fit at inspection time: the diagnostic did not reconstruct the historical snapshot/configuration exactly. It used default recent/reference limits, not credentials or the live process environment. A duplicate-only read-side simulation allowed all four sampled inputs to fit. These are character counts, not provider token counts, cost or live latency measurements.

## Implementation

- `referenceSessionContext` removes only an exactly matching parsed `assembly_plan_json` and replaces it with an explicit pointer to the complete separately retained mandatory assembly section. Session identity, phase, director state and all other fields are preserved. Mismatch/malformed/null cases retain the original value; no blind loss of authority.
- `partitionRosterContext` preserves every roster identity, current status/control/presence/accessibility field and all mechanics, inventory, domain data, hook permissions and unknown sheet fields. Only string-valued background, notes, backstory, personality, appearance, description and biography are split into optional GM-private whole-field records.
- Deferred records retain native character/user identity, field, exact full value, SHA-256 content digest and a storage locator. Mandatory roster records retain matching detail references. The locator is not a new tool, native action capability, receipt or permission; omitted text is not evidence of absence. Ordinary background remains included when it fits, with existing query-aware optional ranking.
- Structured values under otherwise descriptive field names remain mandatory. Missing native character identity also prevents deferral. Unknown/oversized mechanical material continues to fail closed before provider execution; this does not raise the 120,000-character cap or trim authenticated sources, native ledgers, rules, consent, pending continuations, reviews or other required material.
- Shared `summarizeRoster` and persisted sheets are unchanged. GM context adds the native character ID to existing roster rows; the partition applies only to ordinary `runTurn` prompt sections. Director/assembly semantics, native adjudication and certified output/publication checks are unchanged. No extra model call, cache, alternate model, schema migration or data deletion.

## Tests and qualification

Added default-registered tests in `v96-context-efficiency-test.mjs`: exact-only session aliasing; immutable roster mechanics/control/permissions; structured notes and unidentified-data retention; oversized four-owner native turn; oversized unknown mechanics rejection; and complete background in ordinary party/private turns. Red-first initial run: 1/4 passing, three failures (two missing helper interfaces and the actual 293,329-character mandatory turn overflow). The structured-notes contrast independently failed before the conservative type restriction was added. Existing SEM06, PvP/native effects, assembly/outbox and privacy guards remain mandatory.

Final actual focused/integration/full results are recorded in `TYPED_INTENT_PROGRESS.md`. Synthetic response fixtures establish prompt sizing and native invariants, not unrestricted live-model semantic safety or measured live performance. Large genuinely mandatory state may still overflow; this repair never silently discards it.

## Rollback and operations

Code-only rollback; original campaign state, sheets, private data, source spans, native outcomes and delivery acknowledgements need no migration or restoration. No production operation, bot restart, command registration or paid API request is part of this implementation. Once separately authorized and deployed, restart to load the code, then submit the intended action normally. Never bulk-replay failed turns or resend uncertain publications: prior independent native effects/acknowledgements must still be checked through their existing receipts.
