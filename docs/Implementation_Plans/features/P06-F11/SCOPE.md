# P06-F11 — Enable Everybody Saw Something Different

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** TARGETED PASS; OCCURRENCE SUPPORTED. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

Occurrence `environment:haunted-nightclub:everybody-saw-something-different`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#haunted-nightclub/features/2`: after a supernatural incident, give three mutually inconsistent witness accounts, with at least one true detail from each.

The exact native handler already binds the current sealed GM origin, local environment profile and persisted scene-action board. It requires an independently GM-established local supernatural incident; three actual available local AI-world NPCs, each with their own attributed speech/evidence and independently established true detail; and exact account anchors for the GM's inconsistency judgment. It does not promote testimony to truth or transfer knowledge/state to PCs. No roll or cost is printed, so the native cost is zero.

Frozen production: feature definition, native handler allowlist and exact capability guard. Fresh test `p06-f11.test.mjs`; rerun P06-F01 and P06-F04 through F10 because shared catalog/capability code changes. No legacy tests or fixtures.

Run ID `p06-f11-20261021-a`; command from repository root: `node --test bot/tests/ai-gm-2026-10/p06-f01.test.mjs bot/tests/ai-gm-2026-10/p06-f04.test.mjs bot/tests/ai-gm-2026-10/p06-f05.test.mjs bot/tests/ai-gm-2026-10/p06-f06.test.mjs bot/tests/ai-gm-2026-10/p06-f07.test.mjs bot/tests/ai-gm-2026-10/p06-f08.test.mjs bot/tests/ai-gm-2026-10/p06-f09.test.mjs bot/tests/ai-gm-2026-10/p06-f10.test.mjs bot/tests/ai-gm-2026-10/p06-f11.test.mjs`; changed JS/MJS syntax only.

No new narrative, NPC autonomy, faction autonomy or invention limitation. The frozen batch passed 22/22 with four syntax checks; see the [feature ledger](LEDGER.md) and [targeted evidence](../../evidence/P06_F11_TARGETED.json). Implementation commit: `a857ae4d1dea57e8ecb87309f01371f0f33ebd52`. Release authorization: none.
