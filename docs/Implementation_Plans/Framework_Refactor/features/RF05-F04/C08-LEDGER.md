# RF05-F04 C08 — World minor-NPC schema public API

**Status:** COMPLETE FOR SCOPED PROPOSAL-SCHEMA IMPORT; RF05-F04 and RF05 remain incomplete.
**Base HEAD:** `9c5b5fc0ce8a3ab209efad9b009b20b9426e723c`
**Scope:** [`C08-SCOPE.md`](C08-SCOPE.md)

The existing `minorNpcSchema` is now defined in the World framework and exported through its public API. The mixed `city-depth.js` module keeps its mutation/persistence behavior and compatibility export; `gm.js` imports the schema from World public. Schema properties and object identity remain unchanged.

The frozen fresh batch ran eight changed-code test files once and passed **14/14**, exit **0**, in **1,349.9331 ms**. It included the new C08 regression and six existing fresh tests plus C07's test, all of which import the changed `GMService`. Changed JavaScript/MJS syntax passed **5/5** (exit **0**), and `git diff --check` passed.

The RF05 architecture ratchet failed on existing debt: 577 source modules, zero unowned, 2,741 imports, largest cycle 181, 955 active groups and 955 transition errors. The new schema module and GM-to-World public import have no findings. Five existing findings remain on the touched `city-depth.js` module: its legacy location, two unrelated import edges, and two cycles; two expired transitions belong to those unchanged source edges. Those findings were not introduced by C08. Exact transition `41a184d8e346809f13aa4feaf6a4c65501a4b20b1c040844046b09f4f857e886` was retired and preserved. **55** RF05-F04 assignments remain.

Provider calls, provider tokens, provider spend, network, and production database access: zero; Codex usage: UNMEASURED. Release is **NOT AUTHORIZED**. Rollback by reverting only the C08 implementation/evidence commit; preserve earlier commits and pre-existing user edits.
