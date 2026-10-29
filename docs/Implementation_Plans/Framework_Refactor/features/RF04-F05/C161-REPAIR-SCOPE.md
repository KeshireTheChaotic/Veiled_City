# RF04-F05 C161-REPAIR — Restore standalone database bindings

## Scope and authorization

This is a bounded repair of the C161 standalone-construction regression at source freeze `8de8007a701897dc8687cab148fdddfb388b1ee8`. C161 removed existing database-facade bindings and three historical Knowledge reader shims. A standalone `VeiledDB` constructed over existing relationship rows therefore reaches an unbound relationship-state port during schema migration and raises `PERSISTENCE_RELATIONSHIP_STATE_COMPOSITION`.

The repair restores those pre-existing imports, standalone bindings and shim files exactly as they appeared at the parent of `bad01463`. It also restores only the six corresponding records archived in `C161-RETIRED.json` to `RF01/TRANSITIONS.json`. This preserves the existing standalone persistence contract while the separately authorized RF06 consumer migration remains pending. It is a rollback of a demonstrated regression, not a new migration, an expansion of the migration baseline, or a deadline change.

## Changed files

- `bot/src/db.js` — restored the original relationship-state, relationship-evidence and historical-archive imports and facade bindings; unrelated database code was left intact.
- `bot/src/relationship-state.js`, `bot/src/presentation-evidence.js`, `bot/src/historical-archive.js` — restored byte-for-byte from the parent of `bad01463`.
- `RF01/TRANSITIONS.json` — restored only the three retired root-location records and three database-to-shim import records listed in `C161-RETIRED.json`.

No tests, C161 historical artifacts, unrelated narrative-delegation/task files, or C163 files were edited by this repair. Tests were not run and no commit was created.

## Source freeze and hashes

The source freeze was recorded before edits at HEAD `8de8007a701897dc8687cab148fdddfb388b1ee8`, with pre-existing narrative-delegation/task edits and C163 work preserved. SHA-256 hashes after the scoped restoration:

| File | SHA-256 |
| --- | --- |
| `bot/src/db.js` | `960D5BE8314778BC299B6E45B5AB1D3A4B2690B8BF77FB2247DFD8BD0C5E3567` |
| `bot/src/relationship-state.js` | `AF773D9238C0056DA70FAC8E13017D3DF7543E505CBF457EEAE83A18D9700C50` |
| `bot/src/presentation-evidence.js` | `97DF4361F7DFC0A8CE871E55D41FBF9FC5C7A2438E8C17B41E39802A41AA935F` |
| `bot/src/historical-archive.js` | `4050D877C24616DF45FB04E9C0F3364F713A5F037ABBB1BB7C6811034FCCC29F` |
| `RF01/TRANSITIONS.json` | `A462495092482EF702F9B0656335D6A52C1D5D1DA4756DD5E8AA75712236BE80` |

Next exact phase: C161-REPAIR focused fresh regression validation, followed by the separately scoped RF06 consumer migration when its prerequisite review is complete.
