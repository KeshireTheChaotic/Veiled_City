# P06-F42 — Support the source-bound Readout cue

Status: FROZEN FOR ONE TARGETED BATCH. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `5e5cc5fcb2bb95e686fcfe3d72901cfbd8c4e1b1`.

Exact occurrence: `adversary:aster-vale-occult-analyst:readout`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#aster-vale-occult-analyst/features/1`; source SHA-256 `fa6da860d53ca54081905e91bebb4efe33c27a468ce75ae720e018896c2a4fe8`; template SHA-256 `e215752211a9503b2e643616c55d396b2511dff9bd4556c4e3b0e609ae4e61c5`.

Expose the exact Reaction rule only in the current verified GM-private Analyst context: when a PC uses an obvious supernatural feature, the Analyst may mark Stress, identify its broad source, tell one allied adversary how to counter it, and that adversary gains Advantage on its next reaction roll against that feature.

The cue commits no identification, disclosure, Stress, allied actor, counter, Advantage or roll. It adds no narrative/autonomy restriction. Native event qualification, NPC cost, source identification, ally binding, one-use reaction Advantage and receipt/replay remain local holds.

Only fresh tests under `bot/tests/ai-gm-2026-10/`; one frozen mapped batch, changed-file syntax checks, no legacy tests, broad runner, paid provider, model judge or polling. Preserve saved readers, audience privacy and owner files.
