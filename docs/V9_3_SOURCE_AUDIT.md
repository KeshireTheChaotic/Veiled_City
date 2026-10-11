# Veiled City typed-intent v9.3.1: carried-forward source audit and observation-policy amendment

**Read target:** `KeshireTheChaotic/Veiled_City`, branch `codex/typed-intent-refinement`, GitHub HEAD `bf6b592d2ea1e44c9c666770b533e0800176c102` (2026-10-11). GitHub remote read only; the operator's uncommitted Windows tree is not visible. Check `git status` and local diffs before modifying any files.

## State of completion

| Phase | Status | Commit |
|---|---|---|
| V9-00 | Complete | `c4e08d78f347ffafc8c7e64cff825fdce868bc29` |
| V9-01 | Complete | `697f088fe3c6c576472718c5ec34f903ccb1e2bd` |
| V9-PVP-A | Complete | `2b8d807d11cfe15e47b8eeed2d17ac912203091f` |
| V9-02 | Complete | `1149dc908636d78177e3e38a3e850c2de0215500` |
| V9-PVP-B | **Blocked; not phase-complete** | Remote WIP checkpoint `bf6b592d2ea1e44c9c666770b533e0800176c102`; preserve local drafts |
| V9-03–V9-08 | Not started | No completion claims |
| D08 | **BLOCKED** | Release gate pending |

GitHub `docs/TYPED_INTENT_PROGRESS.md:537–578` reports original PVP30 green and newly discovered **PVP30q cross-actor** negatives red. Last recorded check: `npm run check` PASS (253 JS modules/scripts and 24 root commands); offline validation FAIL, **105 registered suites pass and 1 fails**; offending suite `v9-pvp-authorship-test` 20/22 tests green. The reported network guard had zero live/billable requests. No tests were run in this source audit.

## Defect register (observed source versus necessary proof)

| ID | Priority | Evidence and mechanism | Required remediation |
|---|---|---|---|
| XA01 | **P0 / reproduced** | `bot/src/pvp-authorship.js:282–285` filters PvP proposals by **`scope.actorUserId`**. During unrelated Billy turns, Jaxon/Choso contest is excluded. | Protected scene/audience scope independent of who triggers the turn; do not simply remove filter and reject everything. |
| XA02 | **P0 / reproduced** | `validateNarrativeClaims()` calls `assertPvpOutput()` but model `narrative_claims:[]` provides no extra protection after actor-filter short circuit; `bot/scripts/v9-pvp-authorship-test.mjs:157–163`. | Receipt-grounded output preparation before validation; claim omission cannot grant authority. |
| XA03 | **P0 / reproduced** | `queueTurnPublications()` calls same actor-filtered check then enqueues raw `result.narration`; test lines 164–172 proves queue accepts unverified Choso response under Billy's scope. | Revalidate authorized output parts at enqueue; no direct arbitrary string under relevant PvP protection. |
| XA04 | **P0 / source-confirmed integration gap** | `assertPvpOutput()` currently accepts only one canned neutral sentence or text identical to an existing validated projection. Removing actor filter without replacing the design rejects unrelated freeform GM narration and risks rolling back independent actions. | Separate *state/action authorization* from *model prose authorization*. Retain native sibling receipts while quarantining unsafe narrative blocks, render safe receipt-based summaries. |
| XA05 | **P1 / source risk not yet reproduced** | `bot/src/index.js:175–270` directly publishes World Director `public_narration`/private messages; no common PvP output guard is evident in those direct publishers. | Cover party/private/World Director/manual director model outputs with one authoritative projector; test both audience scopes. |
| XA06 | **P1 / source risk not yet reproduced** | `bot/src/index.js:514–520` feeds `result.narration` to voice after outbox, not a verified saved publication payload. | Voice must use the exact approved, public-safe, persisted projection or suppress speech; no raw-output shadow channel. |
| XA07 | **P1 / source-confirmed** | `bot/src/gm.js:688` rethrows `NARRATIVE_PVP`; `applyAuthoritativeMutation()` validates model narration in transaction; a naively broadened guard makes independent native actions fail and can trigger wrong rollback/recovery. | Distinguish an untrusted *narrative draft* from an invalid *state mutation*. Deterministic quarantine/repair, no automatic whole-turn model reroll or state replay. |
| XA08 | **P1 / source-confirmed** | `pvp-authorship.js:99–118,150–249` now implements bounded owner source templates, exact affected-owner ratification, and use-time clause/projection checks. Original PVP30 positive path is fixed in reported suites. | **Preserve** this hardened code; do not rebuild duel/three-strikes mechanics or weaken source-backed clause tests. |
| XA09 | **P1 / source risk** | Historical `pvp_authored_narrative` v1 and unapproved raw drafts must remain inert, including after scene/window closure and restart. | Output guard must use authoritative versioned native references; no text-based legacy grandfathering or stale scene bypass. |

### Root cause in one sentence

A **trigger-author-scoped lookup** is being used to answer an **audience- and affected-character-scoped authorization question**, and the resulting unchecked model text reaches two independent publication boundaries.

### Avoid these false fixes

- Removing `actorUserId` filter *alone*, thereby rejecting all normal party prose whenever PvP exists.
- Replacing it with character-name or apology-word regexes; aliases, pronouns, implication and mixed language evade them.
- Relying on model-supplied `narrative_claims`, `safe=true`, `subject_character`, or quoted/disclaimed raw text.
- Trusting GM approval or bilateral disclosure signatures as retroactive PC reaction authorship.
- Rolling back an unrelated completed movement because generated prose contained an unauthorized apology.
- Filtering only the regular outbox while allowing direct World Director sends, private fallback, TTS, journal, or replay to relay the same untrusted content.

### Required test strategy

Keep the **original PVP30** and two **PVP30q** regressions unchanged. Add independent sibling continuity, validated success+reaction projections, GM world director, private/voice outputs, replay/TOCTOU and no protected-scope false positives. Progress log and source tests are evidence; do not mark the P0 closed without actual offline re-execution on the operator's exact source tree.

## Observation compatibility requirement added before v9.3 implementation

**New requirement, not newly reproduced defect:** Character inquiries such as Choso asking, "What does Jaxon look like?", must work with existing visible profile/owner facts and must respond without an error if the target has never been described. A lack of description is not missing action consent. The bot must not invent defining PC appearance or publish private packet/GM-only details. Sources and witness/perception context determine which existing facts may be answered. A private optional owner description invitation never holds the questioning player's action.

This change adds source-audited **implementation risk** OA01: the v9.3 `assertPvpOutput` broadening may accidentally reject legitimate other-PC observational narration. Mitigate with explicit trusted `observation_answer` rendering and `OBS01–OBS22` behavioral regressions. The existing GitHub read at `bf6b592d2` did **not** constitute a test of these new requirements; their acceptance is pending Codex implementation. Existing PVP30q release blockers remain P0 and must not be weakened. See `V9_3_1_OBSERVATION_CONTRACT.md`.
