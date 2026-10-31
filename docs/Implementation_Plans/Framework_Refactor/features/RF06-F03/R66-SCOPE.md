# RF06-F03 R66 — original group reaction reservation qualification

Status: complete for the original group owner-submission transaction; no production source/API migration.

Extract only R65's fresh canonical producer into a local test helper, retaining production inputs and authority checks. Add an original `submitGmReactionInvitation` failed reaction with an actual Movement limited effect. Reject the actual reservation insert with SQLite; require all-table rollback, then successful exact retry, actual typed roll proof, owner notice, one condition/effect/receipt, and write-free saved replay. RNG is deterministic only; no authority or receipt mocks.

Frozen first batch: new R66 case plus affected R65 case after helper extraction. Preserve the original R65 committed evidence; do not rerun unrelated suites. Agent A retains default index/registries and production source ownership, Agent C owns AF changes. Any interface source window remains a separate explicit agreement.
