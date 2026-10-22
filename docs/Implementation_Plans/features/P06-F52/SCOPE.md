# P06-F52 — Support the source-bound Route Around cue

Status: IMPLEMENTED; feature tests pass, aggregate mapping needs a final corrected-code result. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `ae8f89b5d2061e1b570aa017836fa3d1df1f0f16`; implementation commit `7bbf88de04398ab7233c8ad8151b0f790f8b939e`.

Exact occurrence: `adversary:choir-relay:route-around`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#choir-relay/features/1`; source SHA-256 `6e29725df1587c4ce248e9460745202b656e934776a8c144282e03f53cf6c831`; template SHA-256 `8d96b1f9606e8910602b63021d03b23d7e564daf015b062db86ffa66d4e7e364`.

Expose the exact Reaction cue in current verified GM-private Choir Relay context. This adds no NPC-autonomy restriction: no Stress choice, ally/Signal eligibility, last-HP event, device/range proof, relocation or HP mutation is committed here. Those exact native mechanic and replay boundaries remain local holds.

Only fresh tests in `bot/tests/ai-gm-2026-10/`. The mapped run recorded 183/185, with only two F01 inventory-count assertions failing; all four Route Around cases passed. After correcting the unrelated-source count to the final 64/62, F01 passed 3/3 against the committed descriptor. A mistaken cwd command failed to form the mapped batch and is unqualified; no final single-run aggregate is claimed. Changed-file syntax 5/5 and JSON parse 2/2 passed. No legacy tests, broad runner, provider spend, model judge or polling. Preserve player agency, privacy and saved readers.
