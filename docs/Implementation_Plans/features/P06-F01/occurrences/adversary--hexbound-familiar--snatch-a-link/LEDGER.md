# adversary:hexbound-familiar:snatch-a-link — ledger

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS.

- Branch/implementation SHA: `codex/clean-ai-gm-2026-10` / `7c2116fdaa1d85c4fc093848eb888dfff37d2ded`.
- Changed modules: native definition/catalog, Snatch a Link cue projector, current adversary context, fresh F47 test and coverage mapping.
- Fresh run `p06-f47-20261021-a`: 168/168 tests across 45 fresh files, exit 0, no repair/rerun. Syntax 5/5; JSON parse 2/2.
- Handler `adversary_snatch_a_link_context` exposes the exact Action in current verified GM-private context; execution is not authorized.
- Local holds: native attack roll, eligible exposed link, theft, inventory mutation, event qualification and once-only receipt/replay.
- Evidence and hashes: [P06-F47 targeted evidence](../../../../evidence/P06_F47_TARGETED.json).
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable.
- Owner questions/restrictions: none. Critical blocker: none. Release authorization: false.
