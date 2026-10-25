# RF04 feature qualification matrix

| Feature | Status | Evidence and remaining limitation |
|---|---|---|
| F01 World source ownership | INCOMPLETE | `features/RF04-F01/LOCAL_HOLDS.md` lists exact remaining producers and consumers, including city consequences, world authorship, civic/authoring paths and simulation. Completed source slices do not retire the legacy graph. |
| F02 NPC cognition and actors | PARTIAL | `features/RF04-F02/LOCAL_HOLDS.md` records remaining producer, strategy, evidence projection and cross-framework adoption. F05-C01 qualifies only its actual NPC–World actor evidence consumers. |
| F03 Knowledge and provenance | PARTIAL | `features/RF04-F03/LOCAL_HOLDS.md` records remaining World/Narrative/Session adapters and source integration. Knowledge policy extraction alone does not establish application adoption. |
| F04 Session and presence | PARTIAL | C09–C12 ledgers record specific openings, late attendance, private entry, schedule fencing and pure resource-overlap evidence. Other runtime paths, action-window state and publication interactions remain outside those cases. |
| F05 Actual pair adapters | PARTIAL / LOCAL HOLD | C01 NPC–World and C02 Session–World consumers are adopted at their exact scopes. C03-P01–P03 extract Narrative source visibility, grant policy and context builder, but bootstrap-reached composition and Narrative–World workflow adoption remain unverified. |
| F06 Private/hidden sources | QUALIFIED AT SCOPED CASES | New F06 disposable-SQLite case passed 1/1: owner-private fact isolation, cross-owner source denial, GM-only omission, retraction invalidation, and no character-state change. Other sources, publication and live Discord remain unqualified. |
| F07 Changed-code qualification | AUDIT COMPLETE; EXIT NOT MET | Exact feature evidence was reconciled; no tests were rerun and no production code changed. The phase still has open feature obligations. |

Current enforcement evidence: RF04 architecture ratchet passes with 566 modules, 0 unowned, 2722 imports, largest SCC 181, 2442 accepted legacy occurrences, 0 active violations and 0 transition errors. This ratchet result does not prove full isolation or behavior beyond the scoped tests.

**RF04 status: INCOMPLETE.** The Narrative–World hold is local and noncritical. Next exact work: establish an RF05 phase scope and select a source-backed provider/interpretation/narrative slice that is independent of that hold. **RELEASE NOT AUTHORIZED.**
