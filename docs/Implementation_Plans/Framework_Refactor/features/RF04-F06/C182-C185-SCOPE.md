# C182–C185 — Knowledge memory ownership retirement

**Status:** source and metadata frozen in isolated worktree `C:\Users\Keshi\.codex\worktrees\rf04-memory\Veiled_City`, branch `codex/rf04-memory`, base HEAD `92de0048204873669158e15b71184f4988233d4a`. No test or architecture gate was run by this implementation turn; source qualification is pending the tester-owned fresh batch. No files in the live-play checkout were written. No changes were staged or committed.

## Delivered scope

- C182–C185 move the existing four root compositions into Knowledge-owned services. Factories, schemas, saved rows, source policy, audience filters, receipt checks, transaction boundaries, and original forwarded operations remain unchanged.
- Knowledge public exports the existing functions from four local service modules. `contextMemorySchema` and `CONTEXT_MEMORY_PROMPT` remain the original factory exports; the context service still constructs its singleton at module evaluation, while the other services remain lazy.
- C182/C185 retrieve `BACKGROUND_WORLD_KINDS` via the existing Knowledge–World identity consumer. Its callback returns the original frozen World public array reference; each service reads it only when its lazy factory is first constructed. No array or policy copy is introduced.
- Application `gm.js` and `state.js` use Knowledge public. Intent, Narrative, and Publication use narrow caller-owned fixed ports on existing pairs. The new Knowledge–Publication API contains only queue/ack operations; other observed graph edges remain open.
- Publication bootstrap binds its consumer before outbox runtime use. The existing outbox enqueue, delivery acknowledgement, and reconciliation positions remain synchronous and within their existing transaction handling.
- Only the 12 C182–C185 transition records were archived and removed. `C182-C185-RETIRED.json` records the exact records and the pre-removal manifest hash. The two Narrative-to-World background-identity imports outside this scope remain untouched.

## Function identity, saved state, and privacy

The four service modules forward the original factory methods without changing arguments, results, or errors. Fixed consumers bind exact exported function references and reject replacement. The World-kind callback returns the same frozen array object; it is called only inside the two lazy Knowledge factories. Context-memory retains its original eager construction and source binding. No persisted row, receipt, schema, identity-qualification version, or transaction flow was changed. Existing Knowledge filtering continues to decide source visibility and audience eligibility; the pair APIs confer only the listed operations.

## Modified and removed files

The hash table below records the bytes at the C182–C185 source freeze for each changed source and metadata file. Removed root paths are explicitly marked. `gm.js` and `narrative-authority-context.js` are shared caller files released to C186 after this freeze; any later C186 edits to those files must be documented at their later hash in the C186 scope. Other C186 source files are excluded from this table. The updated C180/C181 scope prose only replaces stale test-status claims with references to completed `C180-RUN.md`/`C181-RUN.md`; their test references and dependency counts are unchanged.

| Path | Frozen SHA-256 |
|---|---|
| `bot/src/frameworks/knowledge/memory-lifecycle-service.js` | `47678695821e205dd44096bdb0425e340ef63e304b728bfed5998876963b4205` |
| `bot/src/frameworks/knowledge/context-memory-service.js` | `ad2c8f65f8536bdded4978a89a89092fc41e40262a8d747e624cf0483a9f913f` |
| `bot/src/frameworks/knowledge/scoped-memory-service.js` | `2c5e355315ef9e3a204ccdcf2b627338f919809016fc99d7633e7d6ae306427e` |
| `bot/src/frameworks/knowledge/narrative-memory-service.js` | `4fdc3921a287ebfe0c4bf61d579a764b9bcd4b019e7826965faf8368172140b9` |
| `bot/src/frameworks/knowledge/public.js` | `25731766e91d2818413535d15655dd00b740ea1c03bf94851ff567c767122e2b` |
| `bot/src/frameworks/knowledge/contracts/world-identities.js` | `6b732ab86e500c80634423655c319e0f0c729a8320e49649a4869a46a88fbf04` |
| `bot/src/framework-to-framework/knowledge--world/public.js` | `9f9547d5798fbca9ae1849171b9d60a2d6c27dfe310f56ad84f64d104afbed84` |
| `bot/src/frameworks/intent/contracts/knowledge-memory.js` | `0f79ee69b63790e3b102f0ac2b620ad95e50d0e6558f9c62b622f873a41432cf` |
| `bot/src/frameworks/intent/public.js` | `f88b7f847bfb80393b9ce3e441ec23fda4ee9bbbb8bcab19e6b6b8d5c3eb6bcf` |
| `bot/src/framework-to-framework/intent--knowledge/public.js` | `a890ee8b10da40e7a7354c73a12381cdddd280edc0b7fb74e08475d35ada1771` |
| `bot/src/application/composition/intent-knowledge.js` | `e72e8ee8face2eb7b33f42ef3c60ae61c0b22caa1125a847417d19ffbb829ea9` |
| `bot/src/frameworks/narrative/contracts/knowledge-memory.js` | `6de55d84da3a4f988b1eeac32275eb0c277887addcf4dd74fa5eef76610cf184` |
| `bot/src/frameworks/narrative/public.js` | `5b592dfbf32158f13e3479f95be4bb5cb5108190988e515f6ea2636050dc71ac` |
| `bot/src/framework-to-framework/knowledge--narrative/public.js` | `4109d1f1af27bc6301d34f86a962bfcf8dbc3cabae0c034f03070c13e216ea8b` |
| `bot/src/application/composition/knowledge-narrative.js` | `33d254d18b9e0b39bc2533e7ad0099d36be1d522ba29b29b531330195a3e6555` |
| `bot/src/frameworks/publication/contracts/knowledge-narrative-memory.js` | `503d2a0a7a36e814a154e59a87b38c4c311073f5265baf24caef9db0f6e9ea0a` |
| `bot/src/frameworks/publication/public.js` | `27b9d765033f569e1411179d76fd9c7a6b1390b5d3c8f5973f8d5c6bf2ee9eb6` |
| `bot/src/framework-to-framework/knowledge--publication/public.js` | `1c286f841f2cffb414924e9157793bee758f29f355fed085b6715fd7685f3d42` |
| `bot/src/application/composition/publication-knowledge-narrative-memory.js` | `9ddede9e349a3f314c7fcd8d03aed0040a6ea23775ffecd415b09ae416bce52e` |
| `bot/src/application/composition/public.js` | `0bc4b3c7ce2de6151f0a6639c034bd9200e2fc3771adb7b7361bbf8d50460852` |
| `bot/src/index.js` | `22adef35765b2603f462f22ee200ef3e20682ad52e0cdb98a9c68089f6eb9590` |
| `bot/src/gm.js` | `2f9bbf9669ebdf9d9085f7c64dab58482e8b574e5a33671ceb1f3bac3d9f4f24` |
| `bot/src/state.js` | `ceadfd73df97554136efe908bfd81da1166e675a40a05c58c2dcf01690598a50` |
| `bot/src/typed-intents.js` | `8a38eaa75ae8afc55f9a77d7f94c5a775bfec30e84792cd4e111ddf1f93da8d2` |
| `bot/src/narrative-authority.js` | `e356011147f178372161a8bd23975be416d11d3887cfd4671347c6007eb1712b` |
| `bot/src/narrative-authority-context.js` | `c6bcf4ea8b000ad7efe883bca4a9ea6e9614180a60459bfaee2af7d220f38ce8` |
| `bot/src/publication-outbox.js` | `b44bd8b850448d9b55dbaf90249cc29e2bea4bbc53167f302101cdf3644065bc` |
| `bot/src/memory-lifecycle.js` | removed |
| `bot/src/context-memory.js` | removed |
| `bot/src/scoped-memory.js` | removed |
| `bot/src/narrative-memory.js` | removed |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `1a5c56faaded88a813c6912ccd640384fb8aaac5e4553a491d4d04cdf59e6bdb` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` | `3da34846510b18baa39f377cd1d3c795fcf3286b6b13f549ae3198550c09e4bb` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/PACKAGES.json` | `1dcbde07b17595c2c902155ef7bdf8e035bbc4b41ef4aeac8575e33761d78ff5` |
| `docs/Implementation_Plans/Framework_Refactor/BRIDGE_REGISTRY.md` | `c4457d6e568a2c019c1d0b5caa28ca7a6e0a4e16baf39cb29987d96e53ccc28a` |
| `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C182-C185-RETIRED.json` | `aae34b703ee9b71b2ab8f302113032c29f465ba30cfc594b5c9b0b554a58f3bd` |

## Comparison and validation status

The implementation was compared to the original root implementations from the base snapshot after normalizing imports, comments, formatting, and only the required lazy World-kind getter/eager context-constructor expressions. Each normalized non-import comparison was equal:

- C182 memory lifecycle: `E26C52AF03063B53AEDD07486C1AE8862C06718326DECC1533485496BCE117EB`.
- C183 context memory: `F6188CF2131272157DD258C9729C611115D2AFDDBB910AD44286E429613C2CF3`.
- C184 scoped memory: `6C8EDBF963134DA46038BA6C580339F6E8919B7E0743FEA16FEC9645BEA8BCFA`.
- C185 narrative memory: `E090F3C815B26337F8602C30E2E189DE8CD72234C35326DBC638ECEC14099B80`.

No tests, syntax checks, or architecture gates were run for C182–C185 by this source implementer. Do not treat the prior C180/C181 bounded fake-fixture results as qualification of this cluster. The next exact step is the tester-owned fresh C182–C185 focused batch and authorized architecture gate; record actual outcomes in its RUN artifact before claiming qualification. No full runtime, production database, Discord, or release behavior is claimed.

## Exact rollback

Restore only the 12 records from `C182-C185-RETIRED.json` to `RF01/TRANSITIONS.json`; revert only the four Knowledge service moves, exact public/pair ports and bootstrap, and caller repoints listed in this scope. Restore the four root compositions from base `92de0048204873669158e15b71184f4988233d4a`. Preserve C180/C181, C186 concurrent work, all unrelated dirty files, and the existing World/Narrative identity imports. Do not reset or clean the worktree.