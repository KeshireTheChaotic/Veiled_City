# P07-F22 — Ledger

**Status:** PARTIAL — existing speech ranking supported and verified; non-speech adapter remains blocked by F21. Baseline `d3012f358f4d8cd851fd1b507c68c27032842fe9`; feature commit SHA recorded in phase closeout.

| Evidence | Result |
|---|---|
| Source contract | `worldNarrativeBridgePacket` derives links only from authenticated accepted owner speech, active authored-speech ancestry, current NPC hearing memory and actual NPC presence. |
| Scope | Fresh two-NPC/two-owner fixture checks overlap vs. one-owner optional speech and stable ordering for two different overlap groups. Does not add source classes or cross-character causation. |
| Test | One blocking final run: `node --test --test-reporter=tap tests/ai-gm-2026-10/p07-f22.test.mjs`; exit 0, 1 passed, 0 failed/skipped/cancelled/todo; duration 783.3481 ms. Syntax checks for fixture/test exit 0. Test SHA-256 `D606D4C3E5BD08B7B081ACC4D562883F6475202996F727A9DFF7303DF2B17C0D`; fixture helper SHA-256 `B8E01F083A4AF400E7E8B5394B0226A97C5AC2D0680BD6DCFDC989694DB4214B`; coverage SHA-256 `1AD244AFC8225B134D542FC4AB9E7A975B3BC99A635E2AEC904B292DC58F731B`. |
| Result | One owner-only optional signal remained eligible. Two authenticated owners' same-NPC opportunity ranked ahead of the single-owner candidate at equal class/urgency. With a second distinct two-owner NPC opportunity, all four retained native source order. Every signal remained `ranking_only`. |
| Failed runs | First test exposed that a one-word NPC alias was insufficient to resolve an ambiguous multi-NPC audience, so fixture speech now uses full established identities. A second run found Sable was also addressed by an incomplete alias. A later assertion incorrectly expected the first overlap group to remain first after all candidates became equally overlapped; it was replaced with an explicit current source-order assertion. Final result above passed. |
| Cost | Offline SQLite only; no model, network or publication calls. No production code or cache changed. |
| Hold | F21 non-conversation opportunity adapter remains unsupported and is not represented as complete here. |
