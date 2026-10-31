# RF06-F02 R55 — Original owned-character list SQL reader

Move only original listCharacters SQL body to private character-list-repository.js using same caller connection/proxy. Preserve signature/includeClosed default and truthiness, guild/user filters, status/name ordering, parsed row/raw JSON/default errors; all318otherclass methods unchanged including getCharacter/Native/lifecycle writes/transactions/migrations. R54 qualifies independent display caller; fresh nonempty/JSON/error/getters/instrumentation/reopen and same caller write/nested/outer rollback evidence required. No Native correlated transaction qualification.

Exclusive database.js single-method grant required before source mutation, INDEX separately before exact commit. Frozen freshc55+affectedc54 batch, syntax/AST/schema460/hash. No public/registry/schema/policy/provider/production changes.
