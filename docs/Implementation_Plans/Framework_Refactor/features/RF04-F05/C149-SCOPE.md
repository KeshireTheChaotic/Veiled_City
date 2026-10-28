# RF04-F05 C149 — GM hook import root moves into Narrative

Base 7766d57e. The GM hook package normalizer root moves into the Narrative framework; Persistence reaches it through a fixed consumer bound by the narrative--persistence pair, and commands.js uses the Narrative public API. Three open RF04 records retired.

Rollback: Revert only the C149 commit: restore root gm-hook-import.js, db.js and commands.js imports, drop the Persistence consumer, narrative-persistence adapter and initializer, and restore the exact transitions from C149-RETIRED.json.
