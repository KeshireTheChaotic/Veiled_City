# RF06-F02 C140 — Persistence relationship reader prerequisite

The owner authorized exact RF06 prerequisites required by RF04, preserving standalone database construction and saved formats, in `phases/RF04/RF06-PREREQUISITE-AUTHORIZATION.md`. Extract the existing `VeiledDB.getRelationship` query and projection orchestration into a Persistence-owned reader with explicit original Knowledge callbacks. Keep the constructor, compatibility reader import, original SQL, two evidence evaluations, short-circuit source validation, public return shape and synchronous transaction behavior.

This is a preparatory seam: `db.js` still imports `presentation-evidence.js`, so neither the RF06-F02 direct import record `0c269fece19bfde92be567f9173c007b496ec90ddf98573fd683dc56bd7ee323` nor the RF04-F03 root-location record `301a4696dc0b88ae402306e5506d18c1ee74d1cd77fce246e4cbf5a860e13154` can be retired. The standalone compatibility composition and remaining reverse-caller review are subsequent prerequisites. No deadline, baseline, schema or policy change is authorized by this slice.

Rollback the `db.js` import/call and new Persistence reader together; restore the original inline query. No persisted data migration. RF04 and RF06 remain open; RELEASE NOT AUTHORIZED.
