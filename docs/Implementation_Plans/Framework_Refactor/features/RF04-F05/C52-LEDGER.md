# C52 ledger

## 2026-10-27 C52 Session World calendar consumers

Seven Session legacy modules (dialogue-continuity, negotiations, opening-cohort-state, scene-entry, scene-entry-native, story-continuity, window-coordinator) switched from direct `./city-calendar.js` imports to Session's existing `sessionWorldEvents` and `sessionSceneWorldSources` ports; the latter now also forwards World's original `cityInteger`. All seven load uncomposed (no load-time calls).

Tests: one frozen batch of 7 files (new rf04-f05-c52 3/3 plus fresh tests directly importing changed modules, plus rf04-f05-c10): 39 tests, 29 pass, 10 fail, all ten named in C52-RUN.json as pre-existing. Proof: the same four files run with the C52 source edits set aside gave the identical ten failures (phases/RF04/rf04-f05-c52-baseline-test.log: 24 tests, 14 pass, 10 fail) — Narrative Knowledge evidence not composed in p08-f04-correction (5), p08-correction-completion (1) and rf04-f05-c03-p03 (1); Session scene World sources not composed in rf04-f05-c02 (2); adapter import-count assertion in rf04-f05-c02 (1). No test needed repair for C52 except the c10 key list.

Architecture: RF04 exit 0, 0 active violations, 726 modules, 3092 imports; RF05 598 groups/errors (was 605). 7 exact records retired; working-tree manifest 1879 open (includes Codex's uncommitted RF05-F04 retirements; committed manifest is HEAD minus these 7). Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
