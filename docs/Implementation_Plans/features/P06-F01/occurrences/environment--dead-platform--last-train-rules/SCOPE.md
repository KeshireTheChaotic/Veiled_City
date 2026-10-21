# environment:dead-platform:last-train-rules

Status: SUPPORTED SOURCE-BOUND GM RULE CUE; ROLL INTEGRATION HOLD. Parent: [P06-F01](../../SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ENVIRONMENTS/environments.json#dead-platform/features/0`. Source SHA-256: `1558a02d3c5af80ab4454d1c60262a2b53a129c06d528c6f9cb277d4fee70bfd`; template SHA-256: `dc290c7974aa110f61545ba78c61e9a78aa0f7362ee41bb0b7d7f9ae83bf2011`.

P06-F34 implements an exact source-bound passive GM rule cue. The exact living rule and its +2 Difficulty instruction are projected only within the current entitled environment context. The GM judges the trigger; the player's declaration, speech, dice and resources remain theirs. The adapter does not itself calculate a +2; live ruling-to-roll application is an explicit integration hold. Descriptor handler: `environment_last_train_rules_context`.

No generic fallback or new creative limitation. Roll back only the occurrence-specific diff; preserve saved readers and receipts.

Final tested source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; run `fresh-delta-1792599054739` passed 47/47 union tests. The catalog test verifies this occurrence source; this is not occurrence effect qualification. Input/test hashes: parent final evidence.
