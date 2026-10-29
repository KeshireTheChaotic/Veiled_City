# C175 verification ledger

## RF04-F06 — Session–World opening opportunities pair

Moved the original `openingWorldOpportunities` implementation into `framework-to-framework/session--world/opening-opportunities.js`, kept its non-import body byte-identical, re-exported the same function from the pair public API, and repointed `gm.js`. No new Session or World port was introduced.

The new C175 test contributes 1/1 passing cases in the combined C165–C167/C175 batch. Node loader hooks replace only the Session and World public modules with feature-local fakes; the moved pair function is the implementation under test. The test verifies direct pair public re-export and module-load Session binding identity, preservation of `source_ref`/`signal_ref`, party versus private audience filtering, duplicate signal removal, and false execution/publication authority flags. The two-file combined command passed 4/4 with zero failures, skips, or cancellations.

`node --check` passed all 15 changed JS/MJS paths in the combined scope. The initial RF04 gate reported `UNREGISTERED_BRIDGE_CONSUMER` because the `session--world` entry did not list `gm.js` as a consumer. The metadata owner added the exact consumer and a narrow C175 scope description. The one authorized post-repair RF04 rerun passed with 843 source modules, zero unowned modules, zero active groups, and zero transition errors. RF05 was also rerun once because its original 60 active groups included that registration error; it remains incomplete with 59 existing legacy module-location groups and errors.

`git diff --check` and transition/archive JSON parsing passed. The test made no network, production database, or live provider calls. It establishes the pair projection and import/export behavior with deterministic public API fakes, not live provider behavior or release qualification. Exact command, counts, hashes, and architecture results are in `C175-RUN.json`.

## Metadata-only repair

Added only `bot/src/gm.js` to the existing `session--world` consumer list in `RF01/BRIDGE_CONTRACTS.json` and amended that pair’s scope to name the original `openingWorldOpportunities` provider and its unchanged saved references/audience checks. Pair status, directions, other pairs and the registry `tests` array are unchanged. The C175 test path and hash remain in `C175-RUN.json`; its three-digit case suffix is outside the bridge registry test selector format, so it was not added to that array.

The initial RF04 failure and the gate-only post-repair results remain recorded in `C175-RUN.json`. Registry SHA-256 after the repair is `7B5C11CB428214E61B09C5A896BB3A58862C382D56053EB528BDDCE608930683`. No tests or production sources were rerun or changed for the repair. Next exact phase: C176 Session opening-attendance composition relocation as separately proposed; RF05 remains open with 59 groups/errors.
