# V96-02 — private native execution

Starting SHA / completed V96-01: `c1e36e495bae7c21fb7fdf1fc319664ee6228c3e`, clean tree verified. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Red-first findings

`v96-native-actions-test` initially 0/2, exit 1: actual private menu omitted Difficulty/stakes/rationale; production post-turn sender omitted `gmRulings`. Further owner Experience → Critical test failed 5/6 with a party-visible outcome receipt despite private mechanics. These are production adapter failures, not repeated V95 work. TEMP `veiled-v96-02-red.log` retains initial failures; the later focus log records current green results. No live provider was used.

## Production interfaces and acceptance crosswalk

`gmRulingDetails` projects only the owner's bounded saved proposal terms and revalidates pending source/scene/evidence/rules before presentation. It describes proposed risk/stakes, not established facts. Private menu, deferred native notice and slash pending/result/review formatters reuse it; opening validates before saving UI/registry records. `publishRollRequests` includes exact native request links from GM ruling mutations. New discretionary requests set `private_result:true`, so native outcome receipts cannot promote privately selected mechanics. Explicit bounded owner-sharing remains separate. Old committed outcomes are not rewritten. Deferred pending notice failures retain existing NATIVE_NOTICE hold/recovery behavior: rejected evidence never becomes execution or delivery approval.

| Case | Actual production adapter / test | Authority proof |
|---|---|---|
| ROLL01 | `openRollMenu`, owner selection/confirm components, post-turn sender, native deferred outbox; tests 1–3, 6–7 | Exact accepted source → validated ruling → native request; proposed stakes/trait/Difficulty/rationale, reviewed alternate/Experience applicability, explicit payment; foreign readers rejected; revoked evidence holds send/RNG |
| ROLL02 | Owner Roll now component / `contributeRoll`; tests 3–4, 7 | Natural 12+12 native Critical total 29, paid Experience once, ordinary one Hope/one Stress clear; ordinary Fear success increments campaign Fear once; saved result/terminal receipt; restart replay no RNG/cost |
| ROLL03 | Native result / state mutation boundaries; tests 4–5 | Success receipt has zero material mutations; PC location/inventory/HP/other owners unchanged; unsupported Shadow Tell cannot obtain even a pending request or dice; no new adapter is claimed |
| ROLL04 | Existing `v9-pvp-hope-fear`, FH40, D08, and complete release attack/reaction/Armor/death suites | PC conflict remains dedicated bilateral/native services, zero PvP Hope/Critical Stress; immediate action Fear; defender reactions distinct; existing assertions unchanged |

Optional effects still require their dedicated native adapter. Generic success cannot grant remote scouting, door access, custody, HP effects, NPC responses or hidden facts. Native applicability proof fixtures call the existing authenticated GM review adapter; models cannot supply that identity or proof. Suggested alternatives are not selected automatically.

## Actual validation

Focused **7/7**, exit 0, no skips. T1 guarded suites: ruling discretion **17/17**, roll UX **17/17**, publication **23/23**, PvP Hope/Fear **30/30**, FH40 PC effect authority **26/26**, D08 security **1/1**, D08 observability **1/1**, D04 trait/share assertion script **1/1**: **116/116** runner cases, all exit 0/no skips. Logs TEMP `veiled-v96-02-<suite>.log`. Final manifest/full T2 pending; no phase-completion claim yet.

Final T2: sync 10.0.0 **585** files; `npm run check` exit **0**; `npm run validate` **135/135**, exit **0**, **372,434 ms**, zero failed/not-run. Both D08, all original P0/privacy/mechanics and historical assertion/acceptance checks passed on the same executable inputs. No skipped mandatory suite, live requests 0, billable tokens 0, network denied. TEMP `veiled-v96-02-validate.log` / `veiled-v96-02-validation.json`. ROLL01–04 qualified. Outcome-only annotation/resync and manifest byte/hash/diff integrity precede the independent commit, not another full run.

## Persistence / rollback / remaining scope

No SQL/schema migration, paid request, native dice arithmetic, consent or feature-applicability rule changes. New request field `private_result` already has an existing native reader; old committed outcomes remain immutable. No API/model routing change or extra call. Disable `gm_discretion` / revert this code phase to stop new rulings; retain source, jobs, imported characters and all committed receipts. Never reroll or blindly repost uncertain delivery. Rich unsupported-action review and continuation remain V96-03, not claimed here. V96-03 cannot begin before this phase's qualified independent commit.
