# RF05-F04 C29 ledger

**Status:** LOCALLY QUALIFIED; RF05-F04 INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C29-SCOPE.md`](C29-SCOPE.md)

## Implementation

Moved the existing bounded private-world-seed JSON schema and instruction string into the World-owned `private-world-seed-contract.js`, published both through World public, and preserved their exact compatibility identities through `world-private-seeds.js`. `gm.js` now obtains the proposal schema through World public while source verification, origin binding, and entity-creation capabilities remain in the existing native runtime adapter. No raw hook premise was added to the GM request and no state or mechanics changed.

## Verification

Fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c29.test.mjs`: **2/2 passed**, exit **0**, TAP duration **643.2196 ms**, one launch. Changed JavaScript syntax passed **4/4**. RF05 architecture ratchet exit **1**: 597 source modules, zero unowned, 2,788 imports, largest cycle 181, 950 active groups and 950 transition errors. This is aggregate transition debt; no clean full-phase claim is made. See `C29-RUN.json` and the named terminal logs.

Provider calls/tokens/spend: **0 / 0 / $0**; Codex usage **UNMEASURED**. No database, network, CI, Discord, or paid provider used.

## Rollback and limits

Restore the schema and instruction declarations in `world-private-seeds.js`, restore the GM schema import, and remove only the C29 World module/public export/test/evidence. No persisted data changed. RF05-F04 still has **47** assigned transitions; C03-P04 remains a separate RF04 local hold. Release is **NOT AUTHORIZED**.

The fresh P10-F08 regression file was rerun once because `gm.js` changed: **9/9 passed**, exit **0**, 8,323.4975 ms. This is additional offline coverage of the existing opening pipeline and does not qualify live Discord or production recovery. See the P10 phase ledger entry and C29 RUN record. No paid provider spend.
