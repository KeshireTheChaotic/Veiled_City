# R6 draft destination binding — slice complete

Publication now requires saved audience campaign, scene and source reference to match the command campaign, destination channel scene and selected source. Equal recipients cannot authorize a draft in another scene. Existing valid saved drafts already contain these fields; malformed or historical incomplete drafts remain withheld for review. No store schema or AI interface change.

Files: native-draft-publication.js; focused GM-command test; this report and SHA-256 manifest; current handoff and ledger.

Fresh validation, Node v26.13.0, 2026-11-10: GM-command suite 23/23 passed (613.0559 ms); native-root composition 4/4 passed (951.1038 ms). New adversarial checks independently alter campaign, scene and source with identical recipients; none claims or sends the draft. Fake transport only; no live Discord/model operation. Prior publication hashes describe the earlier commit; current hashes are R6_DRAFT_SCOPE_HASHES.json.

Migration/rollback: unchanged storage, only stricter publication preconditions; revert this slice to restore earlier checks without database rollback. Known holds: source epoch revalidation across restart/reopen is still required, as are consequential prose/agency review, segment-local repair and validated autonomous delivery. No major phase gate passed. Next: persist and revalidate draft source authority before publication, then R4 material review and delivery. Production unchanged.
