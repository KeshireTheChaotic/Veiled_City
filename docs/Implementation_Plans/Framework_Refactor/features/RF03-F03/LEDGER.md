# RF03-F03 ledger

ACTIVE. Native choices and receipts must remain unchanged.

## C15 — actual PvP attack provider cold import

A new offline test imported `pvp-attacks.js` after the C13 lazy-adapter repair and called its existing actor snapshot hash export. It passed 1/1, exit 0, 345.2031 ms; one changed MJS syntax check and the RF03 ratchet passed. Exact hashes/logs are in `phases/RF03/F03_C15_TERMINAL.json`. This does not qualify attack authorization, dice, damage, persistence, receipts, or live combat.

## F03 qualified proof and arithmetic slice

Base8bea508. Extracted fear-reservation-proof.js (read-only ancestry and reserved-funds calculation) and pc-resources.js (existing Hope cap/pool/marked-slot arithmetic). Existing producer keeps world indexing; pc-effects calls extracted arithmetic inside its unchanged transaction after owner/source/replay checks. pc-native-eligibility preserves death proof at caller. No changed receipt fields, source IDs, effect keys, SQL or costs.

First fresh F03 batch: six tests, five passed/one failed, exit1,70.1802ms. Failure was a test assumption: malformed original mutation throws TypeError before domain ancestry error; both fail closed. Production behavior preserved. Repaired only that assertion; targeted failed-test-name execution passed1/failed0,exit0,65.8643ms; five unchanged passing cases not rerun. Unique qualified cases6. Seven changed syntax checks passed; RF03 ratchet exit0, no new/unowned/integrity violations. F03_TERMINAL.json plus F03_REPAIR_TERMINAL.json retain both real outcomes/hashes.

PARTIAL WITH LOCAL HOLDS: pvp-fear-moves retains grounded targets, private AUTO_FE capability, publication receipt dependencies, native effect/recovery and world state mutation in original module. Moving it wholesale would mix more than two owners and may duplicate module-private authority; it is not claimed isolated. Consent/death/PvP live runners remain unqualified; proof tests are not spend/notice/transaction integration evidence. No gameplay change. Rollback F03 checkpoint as a unit. Provider0/$0; Codex UNMEASURED; RELEASE NOT AUTHORIZED.


## Corrective C07 — qualified PC identity and environment contract extraction

Base 96b5b0c1c8ec2cd1a96a861ecfed220eaff4b7df. Native PC target/effect identity and environment proposal validation now run in Daggerheart factories; the existing source/provider modules supply only character lookup or the existing immutable contract table and delegate to those native implementations. No new identity rule, consequence, status activation or environment effect was added. Five fresh tests passed, zero failed/skipped, exit0,147.7519ms; seven changed JS/MJS syntax checks passed. RF03 ratchet exit0:383 modules,0 unowned,2608 counted occurrences,0 active groups,0 transition errors,SCC183. Exact hashes and terminal logs C07_TERMINAL.json. A first C06 attempt tested10 cases successfully but its gate rejected four new cross-framework import groups; its test/source shape was then narrowed and it is not qualified. No owner source was overwritten.


## Corrective C08 active — native PC action eligibility

Started from checkpoint d33f9c928aeda63e25105cb4d39432c25a1b4e69. Native action/attack eligibility policy will move to frameworks/daggerheart/pc-eligibility.js; pc-native-eligibility.js remains the existing verifier composition point. Fresh test rf03-f03-c02.test.mjs. No test run yet. Rollback only this source, provider, focused test and ledger entry; no state or receipt changes.


## Corrective C08 active native implementation

Native action eligibility moved to an explicit factory with the current death-outcome verifier supplied by the existing provider. Existing public exports and exact terminal/recovery logic are preserved. Awaiting frozen focused test and RF03 gate; see phase C08 terminal evidence when complete.


## Corrective C08 qualified PC action eligibility

The existing action/attack eligibility predicates now execute in daggerheart/pc-eligibility.js and receive the exact native death-outcome validator from the existing source provider. Status, HP bounds, full-HP behavior, PC choice and risk-it-all recovery evidence are unchanged; missing or malformed proof now fails closed with the native eligibility error. Fresh cases: five passed in the combined C02/C08 run; the sixth exposed a null-proof TypeError and was repaired to make the existing hold explicit. Only that previously failing case was rerun:1pass/0fail,exit0,356.7256ms. Combined run:12 total,11 passed/1 failed,exit1,477.869ms; F02 six and C08 five passed, one C08 failure repaired. Six changed JS/MJS syntax checks for the initial combined run and two repair syntax checks passed. RF03 gate exit0 after repair:385 modules,0 unowned,2601 occurrences accepted,0 active groups,0 transition errors,SCC182. Full actual results and all prior failures in phases/RF03/F03_C02_TERMINAL.json, F03_C02_INITIAL_TERMINAL.json, F03_C02_CYCLE_REPAIR_TERMINAL.json. No production DB or providers.
