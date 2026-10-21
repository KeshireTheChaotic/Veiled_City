# P06-F24 — Support the source-bound Private Room offer cue

Status: FROZEN for one targeted batch. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `0a5e302f8e6fcc73dc225681411a2392cb3b1d4c`.

Exact occurrence: `environment:pale-court-townhouse:private-room`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#pale-court-townhouse/features/1`; source SHA-256 `a958263238f792fc40c5544f70120eee71777fad0faaccf081d447ee5876884b`; template SHA-256 `24375b3fe2b4606ed929b808eb2924be4e848595b8c029f815a3fed8814e9c18`.

The native adapter exposes the exact action as source-bound current-scene context for the GM's chosen scene framing. It does not create an NPC, force an offer, claim leverage, move or separate a PC, or decide whether the player accepts. This preserves the source's offer as GM-owned fiction and the player's response as theirs. No Daggerheart mechanics are changed.

Fresh tests only: new `p06-f24.test.mjs` and mapped fresh tests for changed catalog/context integration. Run once after freeze; changed-file syntax checks and JSON parsing only. No provider tests or broad validation. No owner question or new creative/autonomy limitation proposed. No critical blocker established.
