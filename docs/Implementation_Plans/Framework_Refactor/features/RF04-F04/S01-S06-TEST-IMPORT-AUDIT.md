# RF04-F04 S01–S06 test import audit

S01, S02, S03 and S04 fresh tests each directly import only their respective changed production reader and Node standard libraries. Their recorded focused results apply to the recorded source fingerprints; S04's root reader was subsequently changed by S06, whose separate evidence covers the moved implementation.

S05's initial test directly imported `native-scenes.js` before S06 changed it, so that run is diagnostic. A newly authored S05 boundary test imports only production files changed in S05/S06 and Node libraries; its 2/2 result, fingerprints and limitations are in S05-LEDGER.md. The separate S05 positive consent test imports multiple unchanged production files and its earlier unfingerprinted result is diagnostic; it was not rerun or used as qualification.

S06 directly imports only production modules changed in that slice and Node libraries. Its first two cases exercise changed code; its third reads unchanged `index.js` for ordering and is diagnostic. No existing tests, fixtures or golden outputs were imported or reused in the new S05 boundary test. This audit does not establish RF04 exit or release readiness.
