# R2 — independent human canon review

Completed review/ledger slice; full R2 acceptance remains open.

## Delivered

`private-hook-store.js` extends the dedicated v2 database with immutable canon revisions, current pointers and review receipts. Pending imports alone still establish no canon. A distinct native human-GM review can accept, reject or supply a custom value. Value or visibility conflicts preserve current canon unless replacement is explicit and the expected revision matches. Updates atomically synchronize proposal state, canonical entry and review receipt. Original proposal content, import provenance, previous canonical versions and conflict receipts remain available. Exact review replay returns its original receipt without rolling back later state; altered replay and stale revisions fail.

`character-package-service.js` adds a closed, native-only review request and the existing human-GM/character/campaign authorization checks before storage and at transaction completion. It cannot be called through any of the four generic AI capabilities. Canon approval confers neither publication authority nor audience knowledge. Canon visibility describes the approved ledger entry, not a delivered observation. No prose outcome, PC decision or mechanical resource is committed by review.

`r2-canon-review.test.mjs` adds six fresh tests. The changed store and service also required their six private-import and seven package checks to run again.

## Validation

**19/19 passed**, zero failures/skips, 120.8917 ms. Tests cover separate review source, player denial, import-versus-approval separation, conflict preservation, explicit replacement, immutable history, stale revision/replay protection, rejection/custom value, synchronized proposal state, transaction rollback on revoked authority, forged arguments and cross-campaign refusal. Test output and execution metadata: R2_CANON_TEST_OUTPUT.txt and R2_CANON_TEST_EVIDENCE.json. Source/test/document hashes: R2_CANON_HASHES.json. A subsequent source comment only clarifies the expanded store purpose; behavior did not change after tests.

The pinned legacy `resolveCanonProposal`, `proposeCanon` and `resolveCanonConflict` implementations were inspected for status, conflict and custom-review behavior. This is a new native API with explicit optimistic revision checks, not proof of full command compatibility. No old tests or fixtures were imported. Authentication is injected in these tests; they do not prove live Discord authorization or human review quality.

## Remaining gates and recovery

The v2 ledger has not been populated from production canon. Production authentication, migration, approved-evidence adapters to knowledge/context, full export repository composition, concurrent multi-process review qualification and backup/restore still need evidence. Review records must not be mistaken for publication receipts or actor observation. Imported relationship targets remain retained but unapplied. Private-planning grants and the remaining R1/R2 adapters are also open. R3–R8 remain outstanding.

No production data, existing command routing, legacy schema/content/source, deployment or remote branch changed. Existing canon services remain intact. Rollback is to leave the opt-in modules unused; no production migration needs reversal. Do not cut over or remove old canon services until full semantic migration and replacement coverage pass.

**Next exact work:** imported relationship handling and private-planning authorization, followed by the remaining native recall/provider adapters and R3 deterministic rules. R0 dynamic-contract holds remain active.
