# P06-F43 — Support the source-bound Ride the Current cue

Status: SUPPORTED SOURCE-BOUND GM CUE / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `4f4b504908f0c50c63094f8e52f9f81e0189119f`; implementation commit `97f9f802f8e2aa4cd9b43dbccad3de326143893b`.

Exact occurrence: `adversary:static-wraith:ride-the-current`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#static-wraith/features/0`; source SHA-256 `96a8990dd782bd60bc14eab7f433bcfcf18783d1776a76cd5c455611ab36348b`; template SHA-256 `df4233402bab5e0b353a19ad0fa0b9617e4c9b88c943cd5dc0d4ee9f116f3fc1`.

Expose the exact passive rule in current verified GM-private Static Wraith context: it can move between powered devices within Close range without crossing the intervening space.

This adds no narrative/autonomy restriction. It makes no device eligibility ruling and commits no device, movement or position change. Exact powered-device qualification, Close range proof, destination, and replayable movement state remain local holds.

Only fresh tests in `bot/tests/ai-gm-2026-10/`; one frozen mapped batch, changed-file syntax checks, no legacy tests, broad runner, provider spend, model judge or polling. Preserve saved readers and audience privacy.

## Qualification

Frozen run `p06-f43-20261021-a` covered 152 cases across 41 fresh files: 151 passed and one stale catalog-count assertion failed; the repair was limited to `p06-f01.test.mjs`, whose rerun passed 3/3. Combined unique coverage is 152/152. Changed JS/MJS syntax 5/5 and JSON parse 2/2 passed. See [targeted evidence](../../evidence/P06_F43_TARGETED.json).
