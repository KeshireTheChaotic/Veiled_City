# P06-F39 — Support the source-bound Break the Hold cue

Status: FROZEN FOR ONE TARGETED BATCH. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `479a7b432ceff6a753ef1dd32db34e61013929ac`.

Exact occurrence: `adversary:pale-court-thrall:break-the-hold`; source `content/GM_PRIVATE/ADVERSARIES/adversaries.json#pale-court-thrall/features/1`; source SHA-256 `cf7bf4fbdb01e9b3bd0fafe308c3bad459a878be2be80fd390b2575496013d00`; template SHA-256 `b84f4192e2c4632ac103115bac62461c08251eb6f61610ece4329e9421c29906`.

Expose the exact printed reaction rule only within the current verified, audience-scoped GM adversary context for a live bound Pale Court Thrall. Preserve its rule: when shown undeniable proof that its master abandoned it, a PC may make a Presence Roll (11); on success, remove the Thrall from the conflict without defeating them.

The cue does not decide what proof is undeniable, create or reveal proof, initiate/choose a PC roll, or remove the NPC. No new narrative/autonomy restriction or Daggerheart interpretation is added. Native proof visibility/trigger, optional player-owned Presence roll, and successful conflict-removal receipt/replay remain local execution holds.

Only fresh tests under `bot/tests/ai-gm-2026-10/`; one frozen mapped batch, changed-file syntax checks, no legacy tests, broad runner, paid provider, model judge or polling. Roll back only this occurrence adapter and catalog delta; preserve saved readers, audience privacy, owner files and prior commits.
