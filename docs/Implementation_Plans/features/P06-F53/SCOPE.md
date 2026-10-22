# P06-F53 — Support the source-bound Terms First cue

Status: IMPLEMENTED; cumulative mapped tests pass. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `8faadced7fb3332ee45cc59c75d8c0537ca91b2b`; implementation commit `8f5ca2d50b096f324c53f164b6b22d86a9678276`.

Exact occurrence: `adversary:glass-market-knife:terms-first`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#glass-market-knife/features/0`; source SHA-256 `c89ba0ba3221a41b284f71c3bb34711f653b76006b1a15b4e5a3df6e514324ba`; template SHA-256 `8d3926fd1e93855408d2f6afd334c698114cd92a8772972f7bab5b546ed61e07`.

Expose the exact Passive source cue in current verified GM-private Glass Market Knife context. No new narrative or PC-agency restriction: the player alone decides whether to reject an offer and initiate violence. The cue does not infer that event or grant Fear. Native event truth, exact offer/rejection/violence sequence, Fear mutation and replay remain local holds.

Fresh mapped batch `p06-f53-20261022-a`: 189 total, 188 pass, one F01 drift-count failure. Only the changed F01 test reran and passed 3/3; unique mapped coverage is 189/189 cumulatively, including all four F52 and all four F53 cases. Syntax 5/5 and JSON 2/2 pass. Provider use 0/0/$0; no cache claim. Preserve saved readers, native state, privacy and outbox guarantees. No single combined rerun after the test-only repair; no release authorization.
