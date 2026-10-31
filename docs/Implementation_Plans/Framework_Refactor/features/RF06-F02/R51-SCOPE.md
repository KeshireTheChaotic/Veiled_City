# RF06-F02 R51 — NPC profile SQL readers

Only original getNpcProfile/listNpcProfiles SQL bodies move into a private repository on the same caller connection. Leave findNpcProfile matching and dynamic list dispatch, profile upserts, cognition writes and every other method unchanged. Preserve normalization, JSON defaults/errors/raw columns, ordering/filter/pagination/getter behavior and schema460. Existing R37 command view qualifies independent display; fresh tests cover profile write-return and caller rollback without qualifying Native correlated writes.

Require Agent A's exclusive two-method source grant before mutation, separate INDEX grant before exact commit. One frozen fresh c51 plus affected c50/c37 batch, actual disposable SQLite only. No policy, public API, registry, schema, production/provider or Native transaction migration.
