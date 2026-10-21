# P03-F03 — Autonomous NPC cognition

**Phase:** [P03](../../phases/P03/SCOPE.md). **Status:** TARGETED PASS. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Deliverable
Track believable goals, fears, misinformation, loyalties and attitude changes; permit NPC initiative without metagame omniscience or proxy usurpation. Ask before restricting creative autonomy.

## Source entrypoints (inspect current HEAD; not all need editing)
bot/src/npc-cognition.js; bot/src/npc-conversations.js; bot/src/relationship-state.js

## Acceptance
New belief-versus-fact and independent-motive progression tests.

## Brand-new focused tests
Write `bot/tests/ai-gm-2026-10/p03-f03.test.mjs` from scratch. Exercise only production code actually touched by this feature plus necessary changed shared-contract consumers; use offline deterministic fixtures and avoid old test source/registries entirely. Record actual commands/results in `LEDGER.md` after the feature freezes.

## Boundaries and rollback
Preserve PC agency, authoritative native state, stored proof readers, private scopes and once-only delivery. Any restriction on expressive output, incidental worldbuilding or autonomous AI GM requires the owner's explicit answer before implementation. Missing exact rules are local holds, not grounds to stop unrelated features. Scope changes require ledger record and rollback instructions.

## Frozen implementation delta

Source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`. Status: TARGETED DELTA PASS. Scope is the changed contracts recorded in this feature ledger; unchanged live behavior is not recertified. No new creative restriction. Final evidence: [FINAL_DELTA.json](../../evidence/FINAL_DELTA.json).
