# C181 — Owned community service and Operations review bridge

## Phase result

Moved the owned-community composition into Knowledge-owned `owned-community-service.js`, exposed its four original public wrappers from Knowledge public, and retired the root composition module. Preserved `createOwnedCommunity`, the lazy singleton, the original wrapper functions and `organizationRequest` binding to the fixed consent source port. Application commands, city commands, and the personal-continuity composition wrapper now import Knowledge public.

Intent receives only `inviteOrganization` (alongside C180's `manageEvidence`) through the narrow Intent-owned action port on the already-adopted Intent–Knowledge pair. The existing initializer retains its maintenance-port return value and idempotent rebinding to the same functions. Operations receives only `reviewOrganization` through its own one-method port and a new Knowledge–Operations pair. The app initializer runs after the existing Knowledge World, NPC actor-source, and other service initialization. `operationsNpcReview` was not changed.

The original domain implementation remains byte-for-byte in `bot/src/frameworks/knowledge/owned-community.js`. No request, membership, event, audit, transaction, policy, or saved-row behavior was intentionally changed.

## Changed files

- `bot/src/owned-community.js` (retired)
- `bot/src/frameworks/knowledge/owned-community-service.js` (new)
- `bot/src/frameworks/knowledge/public.js`
- `bot/src/commands.js`
- `bot/src/city-commands.js`
- `bot/src/personal-continuity.js`
- `bot/src/ai-intents.js`
- `bot/src/frameworks/intent/contracts/knowledge-actions.js` (new)
- `bot/src/frameworks/intent/public.js`
- `bot/src/framework-to-framework/intent--knowledge/public.js`
- `bot/src/application/composition/intent-knowledge.js`
- `bot/src/frameworks/operations/contracts/knowledge-organization-review.js` (new)
- `bot/src/frameworks/operations/public.js`
- `bot/src/framework-to-framework/knowledge--operations/public.js` (new)
- `bot/src/application/composition/knowledge-operations.js` (new)
- `bot/src/application/composition/public.js`
- `bot/src/ai-review.js`
- `bot/src/index.js`
- `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json`
- `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json`
- `docs/Implementation_Plans/Framework_Refactor/RF01/PACKAGES.json`
- `docs/Implementation_Plans/Framework_Refactor/BRIDGE_REGISTRY.md`
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C181-RETIRED.json`
- `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C181-SCOPE.md`

The Knowledge–Operations bridge adopts only Knowledge → Operations `reviewOrganization`; the observed reverse dependency remains unqualified. The contract records the observed 2/3 dependency counts unchanged. The fresh bounded C81 test passed in the initial combined batch and is recorded in `C181-RUN.md`; the C80 Intent action test passed after a test-only assertion correction in its targeted run, as recorded in `C180-RUN.md`. SHA-256: C81 `bcf9a54c493977424c52e6111602731204532479da07bfd4e22ac59a5721f845`; C80 `78e5e6c5bd16deebc945d8a2af067711ea36c19ee7570160fa10ca03cce3b68c`. These fake bounded fixtures do not close broader production dependencies.

## Transition records

Archived and removed only these assigned records:

- `029579f8c2c4eca569d8a2740e9c70fa9810e252567e8e09451503f2a5e215e8` — Knowledge root location, RF04-F03.
- `8379846863c2ca10cc7e022ba5d3b484562ff66e338b0211043b21bfb6c61064` — Intent import to root, RF05-F02.
- `a613566deb5b9c689ebd6d054edbdd34d41f736e8a6505cb65661358269d2872` — Operations import to root, RF05-F05.
- `79c0f22fb4c327478ff892ee054376df8abd484b44f46f8957fe5b5f61a56f61` — Application city-command import to root, RF06-F04.
- `af7534c3faacdd33d84157aad792b46eae73b32cbda1ea0eb84583d54866d9b9` — Application command import to root, RF06-F04.

The composition-wrapper import in `bot/src/personal-continuity.js` had no transition record and was repointed. The Knowledge factory file and `createOwnedCommunity` public export remain intact. RF06 imports were changed under the existing prerequisite authorization. RF05-F05's current `assertMutationSuccess` scope did not describe this edge; C181 documents the separately scoped existing review capability without widening the phase.

## Verification and open work

C81 passed in the initial combined C80/C81 batch; C80 passed in a targeted rerun after its test-only assertion correction. Scoped syntax verification passed for 21/21 changed JavaScript and test files. The outcomes are recorded in `C181-RUN.md` and `C180-RUN.md`. Broader production dependencies remain open; no runtime, Discord, production database, or release qualification is claimed.

## Rollback

Restore only the five transition records from `C181-RETIRED.json`, the removed root, and the original imports. Remove only the new Knowledge–Operations port/adapter/composition and corresponding package/bridge entries. If reverting only C181 while preserving C180, retain `intentKnowledgeActions.manageEvidence` and its binding; remove only `inviteOrganization` from that shared consumer port. Preserve C178–C180 and unrelated worktree changes.

## Source hashes

Captured at the source handoff in isolated worktree `C:\Users\Keshi\.codex\worktrees\rf04-isolated\Veiled_City`, baseline HEAD `40ed5a49dabce7a02f20975f4b703072a3e995ee`.

| Current path | SHA-256 |
|---|---|
| `bot/src/ai-intents.js` | `7eb3cabd2ef145122d6f24e75137bee03369f9fdcb9d9f0ac7a5e0d5d2f77dff` |
| `bot/src/ai-review.js` | `ac8187e2fb99f6ba6056d6b8d2d17b7986e7948a9281518ecce120bcef4467a3` |
| `bot/src/application/composition/intent-knowledge.js` | `f2f4c6cbeb84f41afdf8cd2dca6d2b3bfa47a65bd16ae5c7c9b1857b0a6512dc` |
| `bot/src/application/composition/knowledge-operations.js` | `8d26402b9eba412e23060e9d08230bf904d930b33e7034cc5e8e85059bf73e86` |
| `bot/src/application/composition/public.js` | `410532ecf98e2e4c91317c6e7f340d253932aac0cd6aa3d697fba5d0779d5643` |
| `bot/src/city-commands.js` | `a57fef96b780fe2e41a160fceebdf84aed0f820229b8cd4b2f1c8a837bbac17d` |
| `bot/src/commands.js` | `f9ea588f9aa638757de60a558fa2917069fb56fed3aacd8c5b7d7b155a253d0e` |
| `bot/src/framework-to-framework/intent--knowledge/public.js` | `4b174cbdb793f64f053bb388a3ee63c46c4cc28ce5d43a4a0a475c92666fd39b` |
| `bot/src/framework-to-framework/knowledge--operations/public.js` | `e0db98a16e7dc880efc55075442024d75cdd2448da6efa9ad2f36199f02d15e3` |
| `bot/src/frameworks/intent/contracts/knowledge-actions.js` | `97939e5963cb0efc530f8b62f47b44843e1352bb6cf90937c393eeeefb325886` |
| `bot/src/frameworks/intent/public.js` | `19f0454e3047574583ec438ea01b49727bb217c7867b9572d14ab507b3c07944` |
| `bot/src/frameworks/knowledge/contracts/community-evidence-sources.js` | `e872277e739dc73bea6abae9f2f80dc324b2421204785c84fa8e6129a4e45d0d` |
| `bot/src/frameworks/knowledge/evidence-custody-service.js` | `4ed643fbf5eac571b9f28ca19e489bc08f77eaa8bcb30183326d3d1df96c78ff` |
| `bot/src/frameworks/knowledge/owned-community-service.js` | `768c4c21cb4d2ee200702d8e641f2305cf65d0192fae220fd958715293f044ae` |
| `bot/src/frameworks/knowledge/public.js` | `134ee10416e2afefc141906e569e4b8ce5c9848941483fe02265517962812146` |
| `bot/src/frameworks/operations/contracts/knowledge-organization-review.js` | `cdfd4401c968c4b232888f3414d9eb4991e3fb5f5c94131335c2d393a44c977b` |
| `bot/src/frameworks/operations/public.js` | `958793240b1062db317f995020711e2171a25f5f0de6ccd757428087db172cf9` |
| `bot/src/index.js` | `a656368320ea3fe491c73228946c4c363c270676379b15cda710953ca73c467e` |
| `bot/src/personal-continuity.js` | `10d7ce86559de76c4da6be1a0e56a8792edba3b3e9c9e733e418c8040b7be2d5` |
| `docs/Implementation_Plans/Framework_Refactor/BRIDGE_REGISTRY.md` | `0875f01ba20e532d02f2e02b8c6fcd1ef7873f2994092caa60cb48c2117172ec` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json` | `440f515317f45e6512d09409739ab1f498d8492b7ad7f92839c7cfead9282039` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/PACKAGES.json` | `94a4cb92d35e450a169b0b8b2abe0d98fc2366bedf720a269e631a2e4a476933` |
| `docs/Implementation_Plans/Framework_Refactor/RF01/TRANSITIONS.json` | `372c731c38f8d720ec261ab14a5c55df41e4bb66669f1431a77087ac3c7d057e` |
| `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C180-RETIRED.json` | `aaa70a3106e7f2babb9f16cdf33d5232d769de6d534c2497609f01617105da39` |
| `docs/Implementation_Plans/Framework_Refactor/features/RF04-F06/C181-RETIRED.json` | `09297841a5c223c3acfe136853739f240566bb6a5597e99c4ed7335345990447` |
| `bot/tests/ai-gm-2026-10/rf04-f03-c80.test.mjs` | `78e5e6c5bd16deebc945d8a2af067711ea36c19ee7570160fa10ca03cce3b68c` |
| `bot/tests/ai-gm-2026-10/rf04-f03-c81.test.mjs` | `bcf9a54c493977424c52e6111602731204532479da07bfd4e22ac59a5721f845` |

Deleted roots were present at baseline HEAD and their exact retired transition records are preserved in the two archive files. The complete source snapshot above excludes generated test files because none were authored in this source-only handoff. No changes were staged or committed.
