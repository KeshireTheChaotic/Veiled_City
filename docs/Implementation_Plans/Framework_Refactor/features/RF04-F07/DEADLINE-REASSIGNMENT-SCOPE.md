# RF04-F07 — Owner-authorized deadline reconciliation

## Objective

Reassign only existing RF04 transition records whose exact target is a Publication-owned module assigned by the source crosswalk to RF06, and whose removal is therefore accountable to RF06-F03 publication isolation. Preserve every transition ID, source edge, owner, code, baseline identity and maximum occurrence count. Update `remove_in_feature` and `expires_after` together. Do not use the approval as a blanket deadline extension.

## Included records

The exact set is recorded in `DEADLINE-REASSIGNMENT.json`. Each selected current violation must point to `pvp-output.js`, `publication-outbox.js`, `publishing.js`, or `handout.js`; the crosswalk must identify the target as Publication-owned in RF06; and the current RF05 ratchet report must contain the same transition ID as an expired error. New owner is RF06-F03. Removal requires replacing that exact private import with the qualified Publication public API and verifying the source's existing audience, saved-reader, outbox acknowledgment, and uncertain-send semantics with fresh affected-code tests when implementation occurs.

## Exclusions and verification

Do not move the 357 Daggerheart-owned records as a group. Their current per-record dependencies still name RF04 World, NPC, Knowledge, Session, or pair work; owner labels alone do not prove a later-phase dependency. Keep records without an exact later feature/source assignment unchanged. This slice changes transition metadata and evidence only; no production code changes and no tests are run. Run the RF04, RF05 and RF06 phase-aware architecture ratchets once after the frozen metadata update. Do not run legacy tests, broad validation, live services, CI or production data.

## Rollback

Restore the original `remove_in_feature`/`expires_after` pairs for only the IDs in `DEADLINE-REASSIGNMENT.json`; remove the reassignment evidence and ledger addendum. Keep baseline, source crosswalk, source code, owner edits and all other transition records unchanged.
