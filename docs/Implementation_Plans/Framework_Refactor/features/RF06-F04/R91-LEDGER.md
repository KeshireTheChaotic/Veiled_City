# RF06-F04 R91 — Encounter combat-state message boundary complete

`commands.js` delegates only the combat-state message wrapper and clipping to Discord's `encounterCombatStateText`. Application retains all GM/session controls, encounter/combatant/roster/fear reads, spotlight derivation and the original read order; native combatant row rendering remains on its existing pair boundary.

From `bot/`: `node --test tests/ai-gm-2026-10/rf06-f04-r91-encounter-combat-state-text.test.mjs` — final run exit 0, 3/3 passed, 0 failed/skipped/cancelled. The initial read-order expectation omitted `requireSession`'s campaign lookup; the corrected test records that existing lookup before encounter, combatant, roster and fear reads. Syntax checks passed for commands, Discord public, formatter and test; changed-path `git diff --check` passed. The RF05 ratchet exits 1 on Agent C's unowned Native helper; it reports 0 transition errors and no R91 path in the available errors.

No SQL/schema, mechanics, provider/live Discord, production DB, CI, deployment, push, merge or full-phase qualification is claimed. The source ownership/crosswalk record accompanies this slice; the RF06 phase-ledger row will follow once the commit SHA is known.
