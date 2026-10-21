# Static reconciliation audit

Review basis: 2026-10-21, current `main` SHA `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`, GitHub-connected tree plus selective source read, expected AI GM behavior supplied by owner. Not a complete executable or live performance audit.

| Target | Observed code | Discrepancy / needed work |
|---|---|---|
| Authentic narrator and NPC conversation | `bot/src/gm.js`, `narrative-writer-v9.js`, `narrative-delegation.js`, `narrative-completeness.js` | Structured creative path exists, but schema and retry success cannot prove immersive output; new scoped behavioral tests P01. |
| PC control, dice, Fear | `typed-intents.js`, `scene-intent-board.js`, `roll-requests.js`, `gm-native-rolls.js`, `pre-roll-fear.js` | Existing native boundary; focus on changed-contract owner protections and spotlight rather than rebuilding (P02). |
| Ordinary invention, memory and autonomous world | `autonomous-world.js`, `npc-cognition.js`, `narrative-salience.js`, `world-narrative-bridge.js` | Substantive foundation; salience is retrieval-only, not canon authority. Verify playable independent behavior P03. |
| Multi-owner/secret projection | `audience-native-v9.js`, `scene-action-window.js`, `assembly-*` and outbox | Preserve scoped identity and voluntary arrival; add only changed-path fresh tests P04. |
| Responsiveness/cost | `gm.js` has bounded parse and repair retries plus delegated writers; `config.js` default progress after 20s | Profile, reduce unnecessary calls, cache immutable inputs P05. No measured production speed claim. |
| Documentation truth | README points at `codex/audience-first-narrative-v9`, branch not found through connected GitHub; old docs pin `014bc39` and other commits | Baseline source is present `main`; clean P00 doc crosswalk. |
| Catalog | Current JSON parsed 153 records: 16 supported, 137 review_only, 0 needs_authoring | `CURRENT_SCOPE.md` and `PROJECT_SCOPE.md` claim 12/140/1; do not presume all supported actually qualified. |
| Validation | `.github/workflows/offline-validation.yml` runs `npm run validate -- --changed`; selector has inherited always/legacy registration and full fallback | Incompatible with owner's no-legacy, changed-code-only testing. Use independent new selector/CI protocol P00. |

**Limits:** none of the actual code was executed, no Node tests run, no production data inspected and no real provider/Discord behavior measured. Additional discrepancies require fresh Codex current-code inspection and evidence before classification as bugs.
