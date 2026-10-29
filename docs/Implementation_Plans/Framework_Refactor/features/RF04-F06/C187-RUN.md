# C187 focused verification record

- Run ID: `20dd2830-3982-4733-8773-d94ee9126429`
- HEAD: `52a32f33ec289a98775cb36b1a61ed4411fc881c`
- Start: `2026-10-29T18:31:37.2373667Z`
- End: `2026-10-29T18:31:40.4770043Z`
- Runtime: bundled Node.js `v24.22.1`
- Changed/new JavaScript syntax: `node --check` once for each of 40 changed/new `.js`/`.mjs` files under `bot/src` plus the new C87 test; exit 0.
- Focused test command, run from `bot/`: `node --test tests/ai-gm-2026-10/rf04-f05-c87.test.mjs`; exit 1. The runner did not preserve the diagnostic outside its isolated temporary directory, so test count and failure detail are unavailable. This is a failed, unqualified run.
- RF04 ratchet command, run from `bot/`: `node tooling/architecture/check-boundaries.mjs --ratchet --phase RF04`; exit 1 before analysis. Node could not resolve package `acorn`, imported by `tooling/architecture/read-project.mjs`.
- RF05 ratchet command, run from `bot/`: `node tooling/architecture/check-boundaries.mjs --ratchet --phase RF05`; exit 1 before analysis for the same missing `acorn` dependency.
- No legacy or broad validation suite was run. No test was rerun.
- Historical ancestry coverage is static only: the test checks `pc-death.js` still routes through `nativePrincipals.historicalOwnerPrincipal`; it does not import or execute the unchanged historical reader.

## File hashes at batch start

SHA-256 values were captured for the syntax-checked source set and test. Paths are relative to the repository root.

| SHA-256 | File |
|---|---|
| `BD2CAD77F56A9355372C50D1DC0B7BF95E98EEC0B669114F0A16F1E44827EB37` | `bot/src/ai-intents.js` |
| `B36F021508E63FA0F9A63671C1C86A963757B9CA3FA4711C0D6B4B5B077DA696` | `bot/src/application/composition/discord-session.js` |
| `28C9028FA02ACFE4A64666CED2E363379127719F922B09F4491E925ECCEA4911` | `bot/src/application/composition/public.js` |
| `6111DF14BC2BF07574CE424DA9A392CCA6AF7F1C7AA822AB83B62CC7365A3E67` | `bot/src/application/composition/publication-session.js` |
| `9FFAA97E97C9BE76814CAEF951A1E78A59390C492E0A3CAA1ED0F94D5151FF30` | `bot/src/application/composition/pvp-agreements.js` |
| `E19A5C7C8A5A190B175C7F0B78D151E9A70FC7FDCC59F843A8BCD9E89B3F1E0B` | `bot/src/application/composition/session-intent.js` |
| `41E69128A21DBEFB187AC6D3DAD589910247C35D82E1026F5BBC8AE9C2E07EE4` | `bot/src/authored-candidates.js` |
| `352B348B8C96C8D897ADDBE0906E48020665F453A14917EFB487C60EFEF9F37C` | `bot/src/authored-turn-envelope.js` |
| `15B8E77AB64670528B980650BAC19055F97E40D226CB55FB770B6251A4B54102` | `bot/src/discovery-delivery.js` |
| `95CA6F7F15AC4A19A48EE72ACA48A5BF471382B17C88938CACE3A29150121338` | `bot/src/framework-to-framework/discord--session/public.js` |
| `80CD77765EFCC79EE77D786227EE23F9A9B433F5D046072B6401AF1532A5A5DC` | `bot/src/framework-to-framework/intent--session/public.js` |
| `F66B13F4E84C009726A2F231ECD375BC7898D79E8011B39D71CD99EC3AF78E2F` | `bot/src/framework-to-framework/narrative--session/public.js` |
| `EA88CC488D3B47770F7E7E617A4AE6F8114B402D923C735B1121D7FE3050AB97` | `bot/src/framework-to-framework/publication--session/public.js` |
| `BBA6C6346F95214967E9E372E3EABC6CFFE65B0831FD2A68A2283A8D42AB190E` | `bot/src/frameworks/discord/contracts/session-principal.js` |
| `95ECA517AC9840D9F97D6E15E0EEAEA0144A131CFCFFC6AC8A60DE0385500F61` | `bot/src/frameworks/discord/public.js` |
| `A38416FB43AFBCC1358E5A63171836B12E6AA22A60010C6FF495020B18CF9508` | `bot/src/frameworks/intent/contracts/session-principal.js` |
| `5A7FA8E8AEBEE2CA3155DB6CDD8745F0396CA550D60E85E48E203F9EF75D1086` | `bot/src/frameworks/intent/public.js` |
| `B47FEFB0754F3E4E3131A08236A6E23AEDF6CD21CCC4E462B4ED8A31AE2363F5` | `bot/src/frameworks/narrative/contracts/session-principal.js` |
| `61A423F762799561152D102DC96555776294A1800E91BB1267541255DA38FE50` | `bot/src/frameworks/narrative/public.js` |
| `0E4453D5F079CD12484FC99275239451ABF7AA6EE3A1513C5A78E44FD6909F21` | `bot/src/frameworks/publication/contracts/session-principal.js` |
| `6627100E2412997B74CAE155AB0530A4297345E6615701FBBBCE6806A79A2AAF` | `bot/src/frameworks/publication/public.js` |
| `D909824C20743451F473C2C45F111D107CDD1212F0E59400287401DF64FDE590` | `bot/src/fresh-npc-authoring.js` |
| `0B1803E1753B88B3CE29D8BE25528E95D042DF3ECA9B714810E78DA7FB7EA9BC` | `bot/src/gm-arbitration-output.js` |
| `CF47D6E467D5C6E5FE2396409D5B3AC9826E69619608D1909D545C81EA7E836A` | `bot/src/gm-world-scope.js` |
| `BF8AE742A288308EDBA74AAE8690960731710FE2784A037DFE62B8B474169C3C` | `bot/src/index.js` |
| `93784AB586391B8367F111F8FCD0F5D0253AC45C4B4C88DE1C0684E7026B9F06` | `bot/src/narrative-authority-context.js` |
| `38D7427AF1659D4564AB3181119CF9FBCB86C4FC3E7B47D5AC0431D050527F8C` | `bot/src/narrative-context.js` |
| `BBCFEA055DA1069B6FA0C38D475E88B8F55E72DCAD949A375D8D8FE520340593` | `bot/src/narrative-pvp.js` |
| `93033736DD65AE62C59DA41A42160512B900B5E545C259EE2A3913AFC3FFACF1` | `bot/src/narrative-salience.js` |
| `74C620DC24704A9163C63E7E9089A446B0BF805B42BC74271D661F223BBD9495` | `bot/src/narrative-tasks.js` |
| `4C5E95233E45B184680FF9C5D1224371EE4F6118375CAE32CD5D33D70FF538F0` | `bot/src/native-outcome-output.js` |
| `DB30D0DDA56E46CC9F44C951979CC50BBE1EE004FC4043746538018080BEF2DC` | `bot/src/nonmaterial-grammar.js` |
| `CA42FC343518B770EE168CA0986F9B03B666B44FE9509C9C30BB472A53E8AB4D` | `bot/src/pc-death.js` |
| `868F86E8982BD849744D320E13667F586860DA846DCAC94E604EBD617E215FCB` | `bot/src/pvp-menu.js` |
| `81FB5483A42B4985A5C9C022EEB2323BFFC20F94774FB571580B65284C0E3FE2` | `bot/src/pvp-output.js` |
| `7B587ECB47B2F724BDA04930D3409C086B77990C1E2B64B010FF07AC5762E63C` | `bot/src/scene-description.js` |
| `C8D2DFAF2BC3B7FC8E29EA415058A0A5FF895EEED875FBC02B9A14D81DD36B06` | `bot/src/scene-fiction-context.js` |
| `6A56C5F2FB1DF21976F3874EC039F86015E1802B1A57325A909163DA14917DF0` | `bot/src/semantic-engagement.js` |
| `2897BC2C3F608656F1A09CC081C200D513A3815C7288A96D4248E2A09FB882EB` | `bot/src/typed-intents.js` |
| `B1BC0D2C8E4AB131F2E3416E9A30113AD32BDB56E3F5C5E63A25C821A6F7F855` | `bot/tests/ai-gm-2026-10/rf04-f05-c87.test.mjs` |

## Dependency restore and authorized failed-gate rerun

- Dependency restore command: `npm ci --ignore-scripts --no-audit --no-fund` from `bot/`; exit 0. Npm reported 38 packages added. No lifecycle scripts ran and no package or lockfile edits were requested. Full persistent log: `.reports/c187-dependency-restore.log`.
- Run ID: `86aafa20-8277-416f-a7b3-0b7fe0904971`
- HEAD: `52a32f33ec289a98775cb36b1a61ed4411fc881c`
- Start: `2026-10-29T18:34:47.8416182Z`
- End: `2026-10-29T18:34:50.4196373Z`
- Test SHA-256: `B1BC0D2C8E4AB131F2E3416E9A30113AD32BDB56E3F5C5E63A25C821A6F7F855` (`bot/tests/ai-gm-2026-10/rf04-f05-c87.test.mjs`)
- Focused test command: `node --test tests/ai-gm-2026-10/rf04-f05-c87.test.mjs` from `bot/`; exit 0, 8 passed, 0 failed, 0 skipped.
- RF04 ratchet command: `node tooling/architecture/check-boundaries.mjs --ratchet --phase RF04` from `bot/`; exit 0, `pass: true`, 0 active violation groups, 0 transition errors.
- RF05 ratchet command: `node tooling/architecture/check-boundaries.mjs --ratchet --phase RF05` from `bot/`; exit 1, `pass: false`, 45 active violation groups and 45 transition errors. Full output lists legacy module location entries including `action-continuation.js`, `assembly-state.js`, `autonomous-world.js`, `character-observation.js`, and `city-calendar.js`.
- Persistent logs: `.reports/c187-c87-test.log`, `.reports/c187-rf04-ratchet.log`, `.reports/c187-rf05-ratchet.log`.
- The first C87 attempt's diagnostic was not retained by the isolated runner. The authorized rerun above passed after restoring dependencies. No syntax checks were repeated because they had already passed and source files were unchanged.
