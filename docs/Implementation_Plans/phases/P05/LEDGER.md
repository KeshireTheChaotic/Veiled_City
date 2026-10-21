# P05 — Latency, models and caching: ledger

| Feature | Status | Evidence |
|---|---|---|
| [P05-F01](../../features/P05-F01/LEDGER.md) | TARGETED PASS | Final union 8e01519; see feature ledger |
| [P05-F02](../../features/P05-F02/LEDGER.md) | TARGETED PASS | Final union 8e01519; see feature ledger |
| [P05-F03](../../features/P05-F03/LEDGER.md) | TARGETED PASS | Final union 8e01519; see feature ledger |

Audit anchor: `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`. Final source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Final fresh delta: 47/47 tests passed across 20 fresh files and 43 changed-file syntax checks passed (exit 0), run `fresh-delta-1792599054739`. This phase is covered by the feature results below and is not 47 unique tests on its own. Critical blockers: none established. Phase-specific holds and unverified work remain below.

**Test execution:** one final blocking frozen-delta run, no polling: `fresh-delta-1792599054739`, exit 0. Full command, hashes and concise results: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json). Feature ledgers retain the individual affected-code batches and any repair history.

### P05-F01: TARGETED PASS
Explicit provider refusal is terminal for that structured request instead of causing a pointless malformed-JSON retry. Stub counts: complete=1, malformed then repaired=2, refusal=1, pre-aborted=0. Complete narration retained; no model downgrade or new creative cap. Frozen phase batch: 7/7 pass.
Changed: bot/src/gm.js. SHA: 0834f299ccff1738e9b3dd753a5fc616d3965370 + working delta. Tests: p05-1792598572133; exit 0; # tests 7; # pass 7; # fail 0; # cancelled 0; # skipped 0; # duration_ms 702.2053. Full hashes/command in feature ledger. Provider calls/tokens/spend: 0/0/$0; Codex usage unavailable. Restrictions: none proposed. Local holds: Real provider performance and quality unmeasured. Critical: none established. Release unauthorized.

### P05-F02: TARGETED PASS
Packaged content token indexes are cached per ContentIndex instance with version/root/audience/visibility/content-hash identity. Seeded tenant documents and generated outcomes are never cached. Observed cold public lookup: 1 miss; warm: 1 hit; changed bytes: second miss; changed audience: misses rise to 4. No stale secret appears in public lookup. Frozen phase batch: 7/7 pass.
Changed: bot/src/content.js. SHA: 0834f299ccff1738e9b3dd753a5fc616d3965370 + working delta. Tests: p05-1792598572133; exit 0; # tests 7; # pass 7; # fail 0; # cancelled 0; # skipped 0; # duration_ms 702.2053. Full hashes/command in feature ledger. Provider calls/tokens/spend: 0/0/$0; Codex usage unavailable. Restrictions: none proposed. Local holds: No provider token savings claim; static source indexing only, not owner-specific projection caching. Critical: none established. Release unauthorized.

### P05-F03: TARGETED PASS
Routine progress replies default off; typing remains. Explicit opt-in preserves one notice, and queued feedback is cancelled after completion. No change to narration length or pacing. Frozen phase batch: 7/7 pass.
Changed: bot/src/generation-feedback.js, bot/src/config.js, bot/.env.example. SHA: 0834f299ccff1738e9b3dd753a5fc616d3965370 + working delta. Tests: p05-1792598572133; exit 0; # tests 7; # pass 7; # fail 0; # cancelled 0; # skipped 0; # duration_ms 702.2053. Full hashes/command in feature ledger. Provider calls/tokens/spend: 0/0/$0; Codex usage unavailable. Restrictions: none proposed. Local holds: No live p50/p95 claim; fake timers qualify feedback only. Critical: none established. Release unauthorized.

## Final frozen delta

Implementation SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: affected-code targeted pass; unchanged behavior not recertified. Refusal call counts, immutable packaged indexes and feedback.

Run `fresh-delta-1792599054739`: 47/47 tests across 20 fresh files, exit 0; 43 changed-file syntax checks exit 0. Input/test hashes and complete command: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json). This phase's tests are a subset of that union, not 47 unique tests per phase.

Provider calls/tokens/spend: 0/0/$0. Codex tokens/cost unavailable. No subagents. No new creative restrictions awaiting owner; full owner spec read. No critical blocker. Local holds and unverified work remain in each feature ledger. No release authorization or certification. Source commit is clean; owner plan/specification and this documentation remain working-tree edits. Rollback only the affected source diff, preserving saved state and owner documents.
