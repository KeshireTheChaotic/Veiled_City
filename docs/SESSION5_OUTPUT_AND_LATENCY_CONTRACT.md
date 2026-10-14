# Session 5 output and timing contract

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Output authority

All existing SEM06, FH40, PVP30/PVP30q/PVP30ag, OBS21, native effect, privacy and publication guards remain required. New paths are opt-in; there is no arbitrary prose certification or model safety flag.

`scoped_disclosure_recovery` permits only a world/narrator annotation covering one complete held surface, with no authored span or staged mutation. A native-prepared WeakMap capability, exact original-candidate binding, unchanged output fingerprint and live part validation are required. Capture the original dependency roots **before** projection strips drafts. Any events, world additions/actions, cognition, memories, handouts, relationships, canon, interpretation, ordinary effects, AI intents or potentially mechanical player intents make recovery ineligible. Recovery currently accepts only neutral or closed v1 ephemeral scene-atmosphere parts: no fresh NPC prose, fact projection, observation or private message can pass this separation gate. Exact promoted matching text is rejected. Remaining original annotations and completeness tripwires are reviewed together. NPC/other-PC knowledge, stale ancestry, uncertain material assertions and dependent actions stay fatal. This narrow nonmaterial lane is not general semantic independence detection for arbitrary prose.

`scene_descriptions` enables version 5 `gm_world_parts`: `{version:5,kind:"scene_description",fact_refs:[],atmosphere:[]}`. The current authenticated owner source and accepted immediate typed `describe_scene`/`current_situation` request are mandatory. The model does not supply a trusted scene, principal, recipient, safety classification or consequence receipt. Native composition binds current session/scene, principal/control revision, saved location, simulation minute, public occupancy and eligible evidence to the exact output hash.

Environmental evidence needs active, GM-established, objective, audience-visible fact ancestry and matching location. **A category or GM assertion alone is insufficient.** Exact bytes must also be reconstructed by the closed environmental grammar in `environment-observation.js`. For example, existing fact provenance may contain:

```json
{"scene_location":"terminal","scene_observation":{"version":1,"subject":"window","quality":"rain-streaked","relation":"overlooks","target":"the alley"}}
```

It certifies only the exact sentence `A rain-streaked window overlooks the alley.` when all native source/audience tests pass. It cannot contain extra PC clauses. No production facts were converted or created. Unsupported legacy/free-form descriptions remain held; future vocabulary expansion needs the same negative PC/material coverage. Ephemeral atmosphere uses typed subject/verb/manner combinations, not a growing catalog of whole sentences, and creates no durable fact or effect. Generated NPC language continues through the unchanged audience-isolated NPC authoring contract; its documented residual semantic risk is not reclassified as formally safe by this feature.

Party views require current public presence for all present recipients at the actor's location; saved private position alone is not party knowledge. Separated or unconfirmed viewpoints receive a specific limitation without exposing positions. Private views bind only the entitled owner's position. Missing or unsupported evidence produces a truthful scoped limitation, never invented scenery or an inferred arrival.

`post_projection_answers`, together with `scene_descriptions`, repairs a grounded scene/situation request from native evidence if no version-5 answer survived projection. `answerless_projection` counts recovery attempts (including rolled-back previews), not unique failures. Ordinary observation and NPC answers retain their existing native production routes. This is not a claim that arbitrary roleplay can always be semantically answered without review.

Deferred delivery revalidates sources, exact payload, recipient, principal, scene and evidence revision. Archive certificates now include referenced facts and their ancestry; changed/retracted facts invalidate republication through recap without undoing mechanics or rewriting delivered text. Neutral historical acknowledgments are explicitly labeled, not synthesized into scenes.

## Timing and API boundaries

Async-local traces wrap the existing per-guild queue, native capture, pre-Director, router, context, GM, NPC writer, validation/commit and outbox path. Runtime SQL instrumentation counts prepared get/all reads only (not exec/iterate); it stores no SQL or parameters. First-substantive latency requires an acknowledged, currently authorized native chunk; typing, progress, logs and voice do not count. Direct native-proven assembly output is conservatively counted only for wholly nonneutral groups. Assembly command traces are measured from handler entry, not gateway ingress; message traces start at the application receive callback. Successful retry/replay never reexecutes native effects to obtain telemetry.

Reports are GM-only, guild-HMAC-scoped, process-lifetime, bounded to 100 guilds/500 recent samples and 32 request details per turn. They expose aggregate/request-purpose timing, reported token totals (including cached/reasoning), unknown-usage counts, retry/error categories, queue/depth, SQL read counts, private publication counts and category percentiles. No raw user IDs, messages, prompts, secrets or narration enter telemetry. Restart resets timings, not native receipts.

`ROUTER_DECISIONS_SHADOW=false` by default. When explicitly enabled it adds one bounded engagement-only request, in parallel with the existing router; it **never** changes routing or native adjudication. Refusal, uncertainty, malformed responses and errors keep the proven route. The pinned SDK's generic `post('/decisions')` adapter is exercised using an injected offline fetch; typed helper is used if present. No SDK upgrade or real beta request has been made. SDK/API account compatibility and real correspondence remain staging gates. The official [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) informed this adapter; [Luna documentation](https://developers.openai.com/api/docs/models/gpt-6-luna) confirms `none` support. The bundled migration reference was unavailable, so fetched official documentation and local SDK inspection were used.

Runtime reasoning and output budgets remain unchanged. `session5-replay-variants.mjs` prepares A/low versus B/none requests for read-only offline design comparison only. There is no automatic escalation, weaker model switch, token ceiling reduction or claim of quality equivalence. Pre-Director work remains causally serialized and separately measured.

`GM_PROGRESS_ENABLED=true` preserves delayed notices, now accurately describing processing/delivery without a false commit guarantee. Typing and one notice span the logical envelope; replay skips timers; finally stops timers after completion/failure. Disabling notices is UX only, not a speedup.

## Opt-in and rollback (not executed)

After separate deployment/canary approval, a GM may use:

```text
/vc-city flags json:{"scoped_disclosure_recovery":true,"scene_descriptions":true,"post_projection_answers":true}
/vc-session assembly-status
/vc-session assemble
/vc-admin ops
```

Keep Decisions shadow disabled unless billable staging is separately approved. A shadow agreement metric cannot justify production promotion without a real false-negative/quality review. Keep Luna low until a separately authorized model-quality experiment supports none. The provisional routine SLA remains p50 <10 s, p95 <20 s and <5% progress notices; no live result is claimed.

Rollback by disabling the three city flags and Decisions shadow, retaining records/receipts/certificates and delivery history. Disabling a renderer can hold already queued parts: review them explicitly, never blindly resend uncertain output or restore the campaign DB to repair prose. No schema migration or historical outcome rewrite is introduced. Do not deploy, restart, register commands or run a live/billable canary under this offline qualification.
