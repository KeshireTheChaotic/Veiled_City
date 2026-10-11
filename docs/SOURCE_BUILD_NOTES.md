# Veiled City 10.0.0 — Complete Source with Typed Intents

This is a complete, premodified source tree. **No patch installer or Python is required.** It was assembled from the user-supplied `Veiled_City-main (1).zip`, which reports `bot/package.json` version `10.0.0`, and verified against the eight original Git blob hashes specified by the prior v10 typed-intent package (upstream reference commit `5b04fbee0aafce59c0bead15806245de513a9ea9`).

## Changes included

- Semantic `player_intents` extracted by the existing GM call: movement, local-zone travel, searches, observation, interaction, speech, rolls and consent proposals, with source-span, target, framing and resolution.
- GM generation and preview now require typed interpretation for authenticated roleplay and check that auto-resolvable movement is not merely echoed as a pending declaration.
- Autonomous ordinary location/NPC creation, access, arrival, co-presence and NPC listening updated to use typed semantics. Native access/ownership/canon/consent constraints remain authoritative.
- Memory tiers: persistent named/actionable people and locations; descriptive `context_memory` for important props/details; incidental descriptions are transcript-only and can expire naturally.
- Native pending-roll integration runs only during real commit, not during model preview; repeated owner requests retain idempotent source identity.
- Existing authoritative canon checks retained, with added guidance/recovery for AI mislabeling new mundane storefronts and signs as canon ledger claims.
- Disabled legacy natural-language candidate capture is quarantined rather than aborting otherwise valid typed GM narration.
- Added `typed-intents-regression-test.mjs` and `gm-recovery-regression-test.mjs` to the offline validation suite.

## Compatibility

The five older `*-language.js` modules are **retained** for backward-compatible entry points and tests. The normal GM turn now uses typed intents rather than those verb lists as the primary action gate. Certain explicit owner consent, collaborative mechanics and historical APIs retain their stricter authorization rules intentionally. This bundle is **not** a claim that every old parser has been deleted.

No production database, `.env` secrets, user campaign files, running bot or remote GitHub repository were changed.

## Validation completed during packaging

- Hash-pinned original-source check and all **42** anchored typed-intent replacements: PASS.
- New modules/tests: 4 source modules plus 1 typed-intent test; merged 1 GM recovery test.
- `node --check` across **193** JavaScript/ESM source and test files: PASS.
- `node scripts/format-check.mjs`: PASS.
- `node scripts/check-source.mjs`: PASS.
- `node scripts/quality-check.mjs`: PASS (nonfatal preexisting long-line warnings).
- Isolated semantic-intent and memory-tier import smoke checks: PASS.
- **Full `npm run validate` and live Discord/OpenAI integration were NOT executed** in the packaging sandbox because package dependencies could not be installed (`npm ci` did not complete within the environment). These should be run on the target system before deployment.

## Windows deployment

1. Stop the running Veilkeeper process. **Back up** your current entire project and SQLite database (including `-wal`/`-shm` files after clean shutdown).
2. Extract this full-source ZIP into a **new** directory. Do not overwrite a populated campaign `bot/data` folder, `.env` or existing bot source without comparing local changes.
3. In PowerShell, open the extracted `Veiled_City-main\bot` directory and run:

```powershell
node --version
npm ci
node --import ./scripts/offline-guard.mjs scripts/typed-intents-regression-test.mjs
node --import ./scripts/offline-guard.mjs scripts/gm-recovery-regression-test.mjs
npm run validate
```

4. Resolve any test failures before migrating the bot and transferring your backed-up `.env`, content customizations and database. Review the existing `README.md` for configuration and deployment. Node.js >= 22.16.0 is required.

## Provenance

- Base: user-supplied `Veiled_City-main (1).zip` (version 10.0.0).
- Typed-intent changes: earlier `Veiled_City_10.0.0_Typed_Intents_No_Python.zip`, applied successfully to the verified original tree.
- Canon/disabled-candidate recovery: earlier `Veiled_City_10.0.0_GM_Recovery_Hotfix.zip`, reconciled with the typed GM path in the final tree.
- Full source and bundled content files retained from the uploaded archive. Build-generated backup directories and patch installers are excluded from this full-source ZIP.
