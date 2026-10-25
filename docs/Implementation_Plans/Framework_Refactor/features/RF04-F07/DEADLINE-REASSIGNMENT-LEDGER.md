# RF04-F07 deadline reconciliation ledger

**Status:** SCOPED METADATA REASSIGNMENT COMPLETE. RF04 phase exit remains unmet; no source behavior changed.

This scope is limited to 12 exact RF04 transition edges whose target modules (`pvp-output.js`, `publication-outbox.js`, `publishing.js`, or `handout.js`) are Publication-owned and assigned to RF06 by `SOURCE_RELOCATION_CROSSWALK.csv`. Each exact ID was present as an expired transition error in the current RF05 ratchet report. Their deadlines now name RF06-F03 and `expires_after` is RF06. Full original and updated records, crosswalk evidence, removal criteria and gate outputs are in `../../phases/RF04/DEADLINE-REASSIGNMENT.json`.

The 357 Daggerheart-owned RF04 records were individually counted but not reassigned as a group. Their current per-record dependency evidence still points to RF04 World, NPC, Knowledge, Session, or two-framework adoption. Only a specific target with a demonstrable later-phase feature can move; none of those 357 targets met this slice's Publication-owned target rule. Two Daggerheart edges that appeared to target later Daggerheart paths were also excluded because they were absent from the RF03 qualified residual evidence and their exact later-feature dependency was not established.

No tests ran because no source/test or transition tooling changed. The RF04 ratchet passes at 572 modules, zero unowned, 2732 imports, zero active groups/errors (exit 0). RF05 ratchet fails with 955 active groups/errors (exit 1), down 12 from 967; these remain unresolved RF04/RF05 debt. RF06 ratchet fails with 1997 active groups/errors (exit 1); runtime entry remains held. Logs and the exact machine-readable run are linked in `DEADLINE-REASSIGNMENT.json`. No baseline, edge, owner, max count or source crosswalk changed.

**Tests:** none; this is metadata-only. **Rollback:** restore the RF04 deadlines for the 12 IDs only. **Release:** NOT AUTHORIZED.
