# Producer/native/reader retirement crosswalk (LD0–LD7)

Inspected development source at R6 `17f388cd03fab4c9fff126d922452257dc40c5b3`. This is a current local reachability assessment, not a production configuration claim. `rg` covered all `bot/src` and `bot/scripts` JS/MJS import/call sites. Unknown external consumers = KEEP. No whole-file deletion, assertion deletion or historical record rewrite is authorized by this table.

## D0 inventory / assertion ownership

| Symbol | Role / reachable consumers / records | Existing assertion / replacement | Decision |
| --- | --- | --- | --- |
| `authoredCandidatesSchema` five-field branch | Current GM proposal plus old compatibility parser; `authored_candidate`, `scene_entry`, speech/declaration sources | natural-language-scope D1–D8, semantic S2 D09–12; NC24 current request | Retire current-model branch only; retain exported historical schema and parser |
| `persistAuthoredCandidates` | Native source/offset/owner validation; state transaction, historical/manual pending | natural-language-scope preview/fragment/quoted/owner contrasts; S2 | KEEP both persisted formats |
| `AUTHORED_CANDIDATES_PROMPT` | Current-model producer, already requests v2 | S2, NC24 | Keep v2 direction; current schema must agree |
| `declarationContext` | Coarse lexical hint currently in GM; historical tests | narrative-understanding unclear/referent assertions; NC24 exact current source | Remove current GM call only; KEEP historical function |
| `captureDeclaration` | Native owner-authored source capture; entry and old candidate APIs | scene-entry, roll lifecycle, natural-language-scope | KEEP source producer/reader, not an obsolete language gate |
| `interpretAuthoredText` | Legacy compatibility producer and native quote/entry staging consumers | original i-heard-you/narrative-understanding/S2 | KEEP; not all consumers replaced |
| `authoredSceneText` | Legacy formatting helper | original scope/response tests | KEEP; harmless formatting, no effect authority |
| `worldRequirements` | Historical classifier; not autonomous effect authority | legacy-authority-migration | KEEP external/test compatibility; no current GM use |
| `hasCharacterInvitation` | Historical response heuristic | original response-obligation tests | KEEP; no deletion parity claim |
| `responseObligation` | Historical lexical obligation helper | original i-heard-you; semantic S4 | KEEP historical assertions; current intake uses semantic obligation |
| `rollDeclaration` | Compatibility parser only; route and historical fixtures | legacy-authority-migration exact/help ambiguity; i-heard-you-2 | KEEP; native authorization examples still executable |
| `reviewRollDeclaration` | Native exact owner preauthorization + human review; ai-intents roll.adjudicate | i-heard-you-2/integration, native roll/cost suites | Extract native service, compatibility re-export; never delete |
| `routeRollMessage` | No normal intake caller; mandatory i-heard-you-2/integration exercise exact request/cost/recovery | existing exact owner and no inferred Help/cost assertions | KEEP compatibility route until adapter assertions migrated one-for-one |
| `consentOffers` | Native owner-private inbox; commands and consent route | i-heard-you-4, owner-consent/PvP tests | KEEP native service |
| `respondConsent` | Exact terms/revision/expiry/source owner response; consent replies/external native workflows | i-heard-you-4 exact acceptance vs conditional/quoted reply | KEEP native service; not generic semantic consent |
| `routeConsentMessage` | No normal intake caller; mandatory i-heard-you-4 | exact revision reply and no inferred consent | KEEP compatibility until equivalent adapter coverage; no reader deletion |
| `discoveryQuestion` | Legacy parser; optional + mandatory historical discovery fixtures | systems-to-players-9, natural-language-scope | KEEP compatibility; current intake does not intercept it |
| `formatDiscovery` | Read-only authorized packet rendering; live command | systems-to-players-9 limits/unknown/accessibility | KEEP native reader |
| `discoveryDeliveryProof` | Current role/source snapshot before awaited send; live command | v9-discord-hardening role change/delivery/privacy | KEEP native security |
| `deliverDiscoveryMessage` | Native owner-private transport; historical delivery adapters | v9-discord-hardening uncertain/failed private sends | KEEP native transport |
| `routeDiscoveryMessage` | No ordinary intake caller; command uses native services; many mandatory/optional comparison tests | v9-discord-hardening + i-heard-you-4 + systems-to-players-9 | KEEP until assertion parity migration; not “unused” merely because intake replaced |
| `entryTarget` | Legacy declaration parser; old candidate/entry review producers | scene-entry, narrative-understanding | KEEP old/manual workflow compatibility |
| `locationMatches` | Native entry identity matching; staging/review | scene-entry wrong target and existing saved location | KEEP exact native check |
| `prepareSceneEntry` | Source-backed old/manual review staging; old candidate API | natural-language-scope preview rollback; scene-entry | KEEP pending/history producer compatibility |
| `routeSceneEntryMessage` | No ordinary intake caller; original staging tests | scene-entry/narrative-understanding non-interception | KEEP until original assertions migrated; no blind route deletion |
| `entryReferenceContext` | Current GM owner-visible pending referents | narrative-understanding, h02 referent/movement | KEEP read side |
| `reviewSceneEntry` | Human GM source/owner/revision/access review; story-commands | scene-entry/h02/native outcome v4 | KEEP native adjudication |
| `configureEntryPolicy` | Human GM policy; story-commands | native entry policy tests | KEEP authority boundary |
| `mundaneEntryImpact` | Native preflight, used by AI scene.enter policy | entry/native-effects/ai-intents | KEEP native service |
| `resolveMundaneEntry` | Native reviewed policy resolution, ai-intents | exactly-once entry/source/revision tests | KEEP native service |
| `GM_WORLD_NARRATIVE_PROMPT` | Current v1–7 producer instructions conflicting with v8 | delegation-quality, NC24 | Retire from v8-enabled request only; flag-off contract KEEP |
| `gmWorldPartsSchema` historical branches | Current request + historical v1–8 shape inventory | schema validation, frozen NC27 | Current v8 request admits v4+v8 only; original schema KEEP |
| `establishGmWorldPart` | v1/v2 native closed composition; flag-off/assembly | v96-05r-fiction, assembly, publication tests | KEEP; no proved flag-off parity |
| `renderGmWorldPart` | Historical queued/delivered/outbox/archive reader | historical-archive, original PVP30/SEM06 | KEEP indefinitely |
| `validateCompositionShape` | v2 closed native composition | v96-05r-fiction/source negative | KEEP historical/flag-off native validation |
| `compositionEvidence` | Native v2 quote/source/actor proof | original composition/privacy assertions | KEEP; not prose generation |
| `projectComposition` | v2 native deterministic reader | original composition projection/replay | KEEP; no byte-parity replacement proven |
| `authorFreshNpcRequests` | v3 conditional generator, still supported when v8 off | v96-fresh-authoring/delegation-quality | KEEP generator until flag-off parity; current v8 mode does not select it |
| `findFreshNpcPart` | v3 request-key proof, historical/current flag-off lookup | source/owner/proxy/replay tests | KEEP reader |
| `hasFreshNpcResponse` | v3 response health/admission for supported old mode | existing fresh-authoring tests | KEEP compatibility helper |
| `renderFreshNpcPart` | v3 historical proof/quote rendering | historical/source/audience/voice tests | KEEP reader |
| `quoteNpcWords` | Escaped native attribution; also new artifact composer | R4 NC15 exact fake transport | KEEP shared formatting security |
| `hasPcReference` | v3 defensive PC tripwire | fresh-authoring/PvP guards | KEEP; no safe equivalent replacement proven |
| `projectSceneDescription` | v5 native factual/unknown reader | OBS21, observation/assembly | KEEP reader; no blanket unknown suppression |
| `authorFreshSceneRequests` | v6 generator, still flag-off reachable | scene-narration-repair/playable narration | KEEP supported generator |
| `findFreshScenePart` / `hasFreshSceneResponse` | v6 proof lookup / responsiveness | original playable/hold tests | KEEP each; no replacement in disabled-v8 mode |
| `renderFreshScenePart` | v6 source/owner/location reader | historical/private/restart | KEEP reader |
| `authorSceneFictionRequests` | v7 conditional generator used with narrative_authority=false | session5/playable/semantic S1 | KEEP flag-off generator |
| `establishSceneFiction` | v7 native establishment, flag-off | original v7 scene/proof fixtures | KEEP native service |
| `renderSceneFiction` | v7 historical reader | historical-archive/source/owner checks | KEEP reader |
| `nativeOutcomeProjection` | v4 native effects/rolls/custody/entry, not legacy prose | original FH40/damage/death/roll/consent + NC27 | KEEP unchanged |
| `sceneObservationOperation` literal lane | Current one-call optimization | semantic S1 + session5-routing | DEFER N13; no silent extra call |
| `routeGameplayIntake` | Current full-message nonauthorizing intake | NC25, v96-semantic-intake, legacy-authority-migration | KEEP current replacement; not mechanical authorization |
| `observationQueries` / `renderObservation` | Native current + historical scoped knowledge projection | OBS01–22/OBS21/SEM06 and NC11/12 | KEEP each; PC/remote/real unknowns required |
| `renderNarrativeUnit`, `validateOutputPart`, `revalidateOutputPublication` | Native v8+ proof at output/memory/restart/voice; immutable outbox | NC04/14/28 + original security/archive suites | KEEP hard reader boundary |

Native records retained: all versions1–8 output parts/drafts/receipts, native4 outcomes, old candidates/declarations, pending rolls/entry/consent, source closure, disclosure, outbox hashes/delivered IDs/uncertain statuses. No evidence is migrated by rerunning mechanics. New sidecars: `narrative_task_coverage`, `narrative_artifact`, native nonsecret NPC import events, native fresh-NPC presence. They confer no player control or mechanical authority.

## D1/D2 implementation receipt

D1 narrows current provider candidate emission to source-exact v2 and v8-enabled world proposals to native4/creative8; the exported historical schemas/parsers remain unchanged. It removes `declarationContext` from current GM context but retains the function and original tests. Flag-off requests retain old generator proposals. No v8/v4 hash change.

D2 extracts actual native implementations (LF-normalized function bodies verified identical):

| Old module / symbols | Native implementation | Live caller migrated | Historical interface |
| --- | --- | --- | --- |
| roll-language `reviewRollDeclaration` | `roll-declaration-review.js` | ai-intents roll.adjudicate | exact re-export, unchanged route/parser |
| consent-language `consentOffers`, `respondConsent` | `consent-native.js` | commands consent inbox | both exact re-exports; legacy route uses the same implementation |
| continuity-routing `formatDiscovery`, `discoveryDeliveryProof`, `deliverDiscoveryMessage` | `discovery-delivery.js` | commands private discovery | all exact re-exports; old route still uses native proof |
| scene-entry `locationMatches`, `reviewSceneEntry`, `configureEntryPolicy`, `mundaneEntryImpact`, `resolveMundaneEntry` | `scene-entry-native.js` | story-commands human review/policy; ai-intents native scene.enter | exact re-exports; entry capture/referent/pending APIs retained |

Native validation not duplicated. Extracted body blocks:1461/5790/2784/7261 characters (entry identity helper additionally preserved). `NC25` checks function identity across all old/new exports. Original i-heard-you-4/integration and scene-entry assertions execute against those same native functions, and original v9-discord-hardening14 cases verify awaited privacy/control/source changes. **No freeform wrapper deleted**: original mandatory/optional assertions and unknown external consumers do not yet have one-for-one replacement coverage. This is KEEP rather than a false unused-code claim. See execution ledger for actual commands/counts.

## Finding dispositions at correctness freeze

| Finding | Disposition / evidence |
| --- | --- |
| N01 | FIXED remote speaker/local viewpoint; native adjacent setting compatibility retained without remote speech (NC01/02; original N02) |
| N02 | PARTIAL/FIXED current genuine hearing and newly trusted nonsecret package imports; unsupported historical path-only seed-drafts remain KEEP/review (NC05–07) |
| N03 | FIXED same-task NPC appearance/empty unknown; separate PC/remote facts retained (NC11/12) |
| N04 | IMPROVED source-proven nonbinding offers/allegations, strict personal surrender guard (NC17–19/DQ04) |
| N05 | RETAINED guard / DEFER ambiguous aliases and non-vocative reference proof (NC20/21 original quality probes still red) |
| N06 | RETAINED `you feel` ambiguity; existing see/hear/smell character POV works; camera witnessing blocked (NC22/23) |
| N07 | FIXED unique native public role among audible NPCs; ambiguity/proxy/remote stays zero hearing (NC08/09; S3) |
| N08 | FIXED honest native per-target task disposition; same-target ambiguous mapping remains incomplete, not invented answers (NC13) |
| N09 | FIXED native nonbinding local prop + valid independent arrival, held unsafe sibling (NC15/16) |
| N10 | FIXED no alphabetic camera anchor; exact request/native scene/Director or sole-setting native assembly; no PC placement (NC10; original N01/N07/N21) |
| N11 | FIXED exact effective private/party unit visibility and deferred validation; not a claim of a prior leak (NC03/04/28) |
| N12 | FIXED current-model five-field/schema/hint production; old/manual native recovery retained and extracted |
| N13 | DEFER literal one-call removal and mixed OOC policy |
| N14 | DEFER broader salience; no cleanup scope expansion |
| N15 | DEFER rich owner-authored PC appearance; no inferred replacement |

## Rollback and non-claims

Code-only reviewed revert per phase; retain all native sources/receipts/outbox and new sidecars. Older code may conservatively hold newly certified prop output. Never roll back a current campaign DB to undo code changes, replay dice, restore uncertain sends to pending or recertify historical private text. No production, push, CI, flags or live language quality evidence was collected.
