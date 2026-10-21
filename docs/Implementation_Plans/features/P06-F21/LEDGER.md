# P06-F21 — No Ordinary Signal ledger

Status: SUPPORTED / TARGETED PASS. Branch `codex/clean-ai-gm-2026-10`; audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; start SHA `7aa3f7e1654ad43d0ddf95ca52fc23857afbea0a`; implementation commit `9220c2a6c2cba300550eb7f2d721a54edc7b5efb`.

Exact source/template hashes are in [scope](SCOPE.md). Changed production: descriptor/catalog, capability contract, strengthened dedicated passive projector contract check, shared scene context. Fresh test: `p06-f21.test.mjs`; affected tests: p06-f01 and p06-f04 through p06-f21.

- Initial batch: 63/64 pass; the failing assertion in p06-f04 was stale after the F21 promotion. The updated fresh test now confirms unrelated `city-vs-river` remains held.
- Repair batch `p06-f21-20261021-a-repair-1`: 64/64 pass, 0 fail/cancelled/skipped, exit 0; no further repair. Syntax 7/7 and JSON 2/2 pass. Exact commands/results and hashes: [evidence](../../evidence/P06_F21_TARGETED.json).

Provider usage 0 calls/tokens/$0; no cache savings claimed; Codex usage unavailable. No owner restriction/question. Live profile/context delivery and release qualification unverified. Critical blocker: none. Release unauthorized. Rollback implementation commit `9220c2a6c2cba300550eb7f2d721a54edc7b5efb` while preserving owner docs and saved native state.
