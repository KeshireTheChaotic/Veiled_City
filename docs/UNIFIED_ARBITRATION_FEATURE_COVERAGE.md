# Unified arbitration feature coverage

UA6 source inventory, starting `a20f40b85e30a21fc95773582626df8781c03161`. Application remains `0.0.0.1`, schema 460.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Inventory and execution status

41 adversaries / 105 occurrences (39 Passive, 36 Action, 29 Reaction, 1 untyped); 16 environments / 48 occurrences (17 Passive, 27 Action, 4 Reaction). **153 total: 8 supported bounded routes, 144 review_only, 1 needs_authoring, 0 not_mechanical.** UA6 initially had zero handlers. The additional occurrence is the owner's explicitly authorized in-place Coordinated Volley (2026-10-16), not an interpretation of Null Foam. These counts concern textual special features only. Existing standard attacks, exceptional actions, no-roll fiction and owner reaction invitations remain separate. UA8 and UA9 are PARTIAL, not a completed advanced release.

Code-owned `bot/src/native-feature-definitions.json` pins each exact feature string and entire actor template using SHA-256 over JSON serialization (including stats). `native-feature-catalog.js` checks hashes, completeness and unique keys against actual content before returning immutable descriptors. Original prose is retained; exactly one new feature was appended to the existing Ritual Enforcement Team after a read-only live-dependency preflight. Its two existing text hashes/indices are unchanged; their full-template pins deliberately change. Source order/index is part of the crosswalk; a content edit requires explicit requalification, not silent regeneration. A model cannot supply descriptors or a handler.

## Handler crosswalk

UA7 adds `blood_rush_hold_position`: an actual incoming hit marking 2+ HP permits an AI-owned Knight to clear one marked NPC Stress while electing its current position within Very Close. Exact native occurrence, current actor/control/scene/owner/audience, a separate same-call GM decision and native result/mutation proof are required. Other relocation remains reviewed. No PC dice/resources, ordinary spotlight or metacurrency.

UA8's qualified subfamilies add `pack_pressure` and `feedback`. Pack Pressure uses actual native Thrall presence in the target's same zone (conservative Melee subset of Very Close), caps the modifier at +2, and keeps ally identities in GM-only proof rather than owner offers. Historical offers retain their original odds. Feedback uses actual public/party owner-device use, a native Wraith/control/range/source window, and bounded same-call GM policy `feedback_v1`; it marks one NPC Stress before creating an exact owner-private Instinct 12 reaction. Only the actual owner's native failed reaction marks one PC Stress and disables that device. Critical/success/withdrawal grant no Hope/Fear/Stress reward, no PC HP effect, and no extra GM move. Full-PC-Stress overflow is held before activation; reset/repair requires a separately verified native route (not yet implemented). A disabled device cannot receive another functional-use completion merely from a no-roll ruling. No raw device content or private roll is promoted to public fiction/NPC cognition.

The independent UA8/UA11 pre-damage subfamily adds `first_severe_to_major`: Contingency Stack on the first actual Severe native PC attack damage against a currently bound, local, AI-owned Analyst each scene. The existing `finishDamage` pipeline applies two rather than three NPC HP marks before final HP mutation; raw dice/type/Critical arithmetic are unchanged. GM-private immutable defense/source/charge proof references actual saved owner attack/damage IDs. The per-actor/scene charge never refreshes after replay/retraction. Lesser damage does not consume it; Major damage may still defeat the NPC (no resurrection). Unbound/proxied/unproved actor does not acquire the automatic defense from a name. This is an automatic zero-cost passive, **not** Route Around or a generic reaction window/d20.

Still **planned**, not dispatchable: flashbang, route_around, all_lanes_stop, null_foam, sirens_outside, ownership_bites, upload_countdown, first_forced_movement. Route Around's Signal taxonomy is now explicit (below); independent alliance/powered-destination/native interception proofs are still required. All other effect metadata is explicitly unmapped; untyped Catastrophic Echo needs authored timing. No feature is labeled harmless to bypass effect validation. Stress-paid last-HP interception, on-hit temporary conditions, group/environment adapters and UA17–UA19 remain unqualified.

## UA9 bounded shared-attack adapter

`coordinated_volley` is a GM-owned spotlight action using the existing Ritual Enforcement Team's Coordinated Fire (+3, Far, 2d8+3 physical). Native arbitration derives one to three distinct present PCs, their individual Evasions, exact actor/binding/source/template and current GM opportunity. A private originating scene cannot select another recipient. One shared native GM attack roll and (only if anyone is hit) one damage roll pay Fear 1 plus any separately required extra spotlight cost. Natural 20 adds the maximum of the shared damage dice once, not another flat modifier. No PC roll, Hope, Critical Stress recovery or reaction-generated GM move is inferred.

The GM-private `npc_volley_attack`/`npc_volley_roll_receipt` parent seals the complete ordered target set and original feature descriptor. Existing character-private incoming offers/roll receipts reference that real shared roll; they do not create per-target dice. The first entitled owner's baseline defense confirmation allows the GM check. Other owners remain `awaiting_defense` or `hold_for_owner`, never automatically failed or injured. Each independently reviews/confirms their own unchanged baseline, chooses their own Armor and resolves native thresholds/HP/death; unsupported pre-roll defense or target-specific modifier choices stay held, not silently applied. No advantage/Experience waiver is implemented for this bounded feature. Each child retains current owner/principal/source/scene/PC-state checks after restart; a changed sibling cannot freeze a separately valid saved attack result. Saved result ancestry is not a permission for a new roll.

`/vc-roll effect json:{"op":"incoming-withhold","attack":"<own attack>"}` leaves only that owner's unresolved Volley pending. Existing `review`, `incoming-defense`, `incoming-armor`, death and private inbox operations are reused. Review resumes a held workflow without choosing anything. Outbox notices expose each recipient's own attack key and result only; old or uncertain payloads remain subject to the existing proof/reconciliation boundary. Group PC reactions (Null Foam/All Lanes Stop), generic multiactor attacks and UA10–UA15 remain unqualified.

## Owner ruling: Signal taxonomy v1

The owner explicitly classifies these eight templates as Signal-based: **Static Wraith, Choir Relay, Morrowline Echo, Traffic Saint, Choir Junction Intelligence, Morrowline Matured, Citywide Choir, Choir Storm Node**. This is a new design ruling (`owner:signal-taxonomy:v1`), not a claim that the original compendium already contained those tags.

`native-feature-definitions.json:actor_taxonomy` stores the exact eight immutable UA6 full-template hashes. `compileNativeActors()` validates every actor/feature against the current pinned sources, then derives frozen actor metadata; `nativeActorTaxonomy()` selects only an exact template fingerprint, never keywords, equipment, similarity, a model role or a supplied `signal_based` field. The eight classified templates and their feature hashes are unchanged; UA9's separately authorized Ritual Enforcement Team append does not alter the Signal ruling. Unlisted actors return `signal_based:false` for **eligibility only**, not a new fiction claim that their nature can never be Signal. In particular, Wraith Pack remains unclassified. The six explicit technological/suppression exclusions (Aster Vale Forecast Engine, Aster Vale Catastrophe Analyst, Aster Vale Occult Analyst, Ritual Enforcement Team, Blacksite Null Team, Civic Null Operative) receive no Signal eligibility from their equipment or portrayal.

`nativeSignalFeatureTarget()` is the shared necessary-only taxonomy gate for both Local Mesh and Route Around; it does not itself issue an effect capability. Local Mesh now additionally uses independently committed native NPC alliance and proved same-zone range (below). Route Around still requires separate active combatants, actual before-final-HP damage, two available Relay Stress, established powered destination, lawful movement/occupancy and particular represented-node/local-manifestation evidence. A distributed intelligence's taxonomy does not authorize moving its entire network into a device. Missing proof must hold the particular reaction, preserve saved attack/damage and allow independently authorized effects. Complete native evidence must not require fabricated human approval. Broad cross-zone Local Mesh and end-to-end Route Around acceptance remain outstanding.

## Versioned house-rule errata

`native-house-errata.json` records the explicit owner addendum, with immutable original UA6 feature/template hashes (and exact normalized Signal card section hashes). These are new interpretations, not a claim that original prose already resolved the conflicts. Only a code-allowlisted versioned handler is executable; an erratum by itself grants no effect.

HR01 `many_deaths_fear_opportunity` is bounded native support: an AI-owned Wraith Pack with at least four **remaining** HP, an actual related terminal PC action Fear opportunity, and a real standard attack hit. After affected-owner defense/Armor and native damage commit, it marks exactly one additional PC Stress with separate private mutation/source/effect ancestry. No Fear from GM d20; no repeat after restart. Missing/revoked causal proof, Stress overflow, or an active Signal-Touched owner option holds this extra effect privately without discarding valid base damage. No alternative HP overflow or suppression choice is invented. Historical offers without this proof keep their original shape; this is not a universal human-GM feature adapter.

| Addendum | Native status in this subfamily |
| --- | --- |
| HR01 Many Deaths | Bounded handler above; overflow and Signal-Touched choice held |
| HR02 precedence | Shared policy v2 aligned with existing native saved > explicit override > RAW > compatible house resolver; absolute source/consent restrictions retained |
| HR03 Local Mesh | v1 immutable review record retained; appended v2 bounded allied same-zone defense aura, +1 maximum, no self-buff or attack/reaction bonus; cross-zone range unproved |
| HR04 Invitation Revoked | Interpretation pinned; prior hospitality communication/violation proof adapter missing |
| HR05 Signal-Touched | Interpretation pinned; owner preconsequence suppression choice not yet implemented; ordinary Fear remains intact |
| HR06 Flashbang / HR07 Command the Blood | Interpretations pinned; owner choice workflows not yet implemented |
| HR08 Spend Forecast | Interpretation pinned; owner one-d12 prefinalization reroll not yet implemented |
| HR09 Blackout / HR10 Three Vectors | Interpretations pinned; specialized native adapters not yet implemented |
| HR11 HP representations | Remaining/marked and last-HP predicates tested; native Host Horde standard-damage replacement supported; Bad Future and paid final-HP interception not yet implemented |
| HR12 death | Legacy wording corrected to existing owner-selected native death service and automatic actual terminal status; original native death regressions retained |

The eleven versioned mechanical registry records (ten original v1 entries plus HR03 v2) are not eleven implemented routes. HR02 policy and HR12 existing native behavior are documented separately. Existing v1 entries/hashes were not rewritten on Local Mesh qualification. This is not UA8–UA11 completion, final full qualification, or production authorization evidence.

New unsupported-feature adjudications persist a GM-private `review_contract`: pinned erratum ID/version/hash, structured requirements, missing adapter and a nonauthorizing recovery instruction. Verified native NPC templates for Invitation Revoked, Flashbang, Command the Blood and Spend Forecast demonstrate these holds without any cost, PC state change, consent or RNG. Review diagnoses missing authority; it cannot substitute for the affected owner's choice or turn a finalized result into a pending reroll. Other unsupported feature gates remain intact.

`native-encounter-relations.js` implements explicit `set_allies`/`clear_allies` through the existing GM board, ruling and executor. Both ends must be distinct, active, source-pinned, local, currently GM-owned NPC combatants; PC participation and proxies are excluded. No relationship score or shared faction/encounter becomes an alliance. GM-only immutable receipts retain history; a current pair pointer can end alliance without rewriting earlier saved attack proof. `native-defense-aura.js` uses this proof plus the exact eight-template Signal taxonomy and live Relay presence. Current native same-zone range convention proves a conservative Melee subset of Close; other pairwise ranges remain unimplemented. The native PC attack request stores +1 effective defense Difficulty and an opaque private-proof ref; ordinary adversary attack and PC reaction Difficulty are unchanged. Other Relay can buff Relay; two auras never stack. Changed source/HP/presence/proxy before dice invalidates pending CAS; after a legitimate result, retraction holds presentation without replay or healing. Alliance facts are not NPC knowledge or party disclosure grants. Existing GM+writer call count is unchanged.

HR11's exact Green Root Host `horde_marked_half_damage` handler derives marked HP as max minus remaining and switches the existing native standard attack to `3d8+8` at ceiling-half marked. It does not edit the stat block, Attack Modifier, PC defenses or GM critical rule. GM-private pinned passive ancestry and an opaque owner-offer reference bind the chosen damage before dice; changing HP/proof before execution fails CAS. Native critical adds all three d8 maxima (24) once, plus the flat 8 once. Existing offers without the additive passive keep their historical damage expression. Other HR11 adapters remain held; the omnibus erratum stays review-only rather than pretending full coverage.

## Per-occurrence source crosswalk

All rows are GM-owned content, not public disclosure grants. Source paths and exact 64-character hashes are retained in the JSON catalog; abbreviated hashes here are identification aids only. A planned handler is not implemented support.

| Native feature key | Type | Status | Planned handler | Feature SHA-256 prefix |
| --- | --- | --- | --- | --- |
| `adversary:pale-court-thrall:pack-pressure` | Passive | supported (bounded native presence) | pack_pressure | `86d4ebc68823a9e5` |
| `adversary:pale-court-thrall:break-the-hold` | Reaction | review_only | unmapped | `cf7bf4fbdb01e9b3` |
| `adversary:aster-vale-contractor:professional-entry` | Passive | review_only | unmapped | `f66ba265a8139184` |
| `adversary:aster-vale-contractor:flashbang` | Action | review_only | flashbang | `8c481c1b7ba6cbc0` |
| `adversary:aster-vale-occult-analyst:mark-the-variable` | Action | review_only | unmapped | `7a4b6412c0eff2de` |
| `adversary:aster-vale-occult-analyst:readout` | Reaction | review_only | unmapped | `fa6da860d53ca540` |
| `adversary:static-wraith:ride-the-current` | Passive | review_only | unmapped | `96a8990dd782bd60` |
| `adversary:static-wraith:feedback` | Reaction | supported (bounded owner reaction) | feedback | `e9f014629e4accf8` |
| `adversary:veil-burned-stalker:peripheral` | Passive | review_only | unmapped | `b0989706dfbf8c41` |
| `adversary:veil-burned-stalker:steal-the-focus` | Action | review_only | unmapped | `a98b2fb874771c97` |
| `adversary:hexbound-familiar:sympathetic-relay` | Passive | review_only | unmapped | `86c5d334a2f56ea6` |
| `adversary:hexbound-familiar:snatch-a-link` | Action | review_only | unmapped | `15c41c45de84456c` |
| `adversary:river-hound:flow-around-it` | Passive | review_only | unmapped | `71d42cf8c44aceb3` |
| `adversary:river-hound:drag-down` | Action | review_only | unmapped | `ab4fd58eea112dcd` |
| `adversary:memory-leech:blank-spot` | Reaction | review_only | unmapped | `c872fbbcf0242e65` |
| `adversary:memory-leech:taste-the-fear` | Passive | review_only | unmapped | `61b1838c74c603cc` |
| `adversary:choir-relay:local-mesh` | Passive | supported (bounded HR03 v2) | local_mesh_allied_zone | `799bc4b81f6ca9e0` |
| `adversary:choir-relay:route-around` | Reaction | review_only | route_around | `6e29725df1587c4c` |
| `adversary:glass-market-knife:terms-first` | Passive | review_only | unmapped | `c89ba0ba3221a41b` |
| `adversary:glass-market-knife:pin-to-the-deal` | Action | review_only | unmapped | `a353d8298f84f49e` |
| `adversary:morrowline-echo:i-saw-that` | Reaction | review_only | unmapped | `9dbfdea705d70afe` |
| `adversary:morrowline-echo:self-fulfilling-event` | Action | review_only | unmapped | `909cb13738aa5fad` |
| `adversary:morrowline-echo:bad-future` | Reaction | review_only | unmapped | `f7442d36f1d96101` |
| `adversary:cicada-runner:always-a-price` | Passive | review_only | unmapped | `84c48b17def86972` |
| `adversary:cicada-runner:exit-clause` | Reaction | review_only | unmapped | `4c3f3878c6ac2b60` |
| `adversary:pale-court-knight:predatory-grace` | Passive | review_only | first_forced_movement | `316bee8e6ca7f3d9` |
| `adversary:pale-court-knight:blood-rush` | Reaction | supported (current-position recovery only) | blood_rush_hold_position | `c02071b8b756f9f0` |
| `adversary:pale-court-fixer:reputation-attack` | Action | review_only | unmapped | `71a92b466bb5be9e` |
| `adversary:pale-court-fixer:call-security` | Action | review_only | unmapped | `f7f8a79df4ae31e3` |
| `adversary:thorn-hound-of-the-green:urban-cover` | Passive | review_only | unmapped | `b070e02d7b77c2c7` |
| `adversary:thorn-hound-of-the-green:root-snare` | Action | review_only | unmapped | `ab2498777e6340d3` |
| `adversary:clause-eater:loophole` | Reaction | review_only | unmapped | `2759fc3b9542ea6c` |
| `adversary:clause-eater:conflicting-duty` | Action | review_only | unmapped | `3be0f926c2e75572` |
| `adversary:clause-eater:digest-the-contract` | Passive | review_only | unmapped | `e5ab662b56beba87` |
| `adversary:ritual-enforcement-team:stack-formation` | Passive | review_only | unmapped | `6d3ca52834faf8b8` |
| `adversary:ritual-enforcement-team:null-foam` | Action | review_only | null_foam | `56e5fcfe6ab7ad83` |
| `adversary:ritual-enforcement-team:coordinated-volley` | Action | supported | coordinated_volley | `8d86763434197c32` |
| `adversary:traffic-saint:right-of-way` | Passive | review_only | unmapped | `b914a830882cb33a` |
| `adversary:traffic-saint:all-lanes-stop` | Action | review_only | all_lanes_stop | `6116bc4cd4facead` |
| `adversary:skin-thief:perfect-surface` | Passive | review_only | unmapped | `b893fc1a1dfcbc07` |
| `adversary:skin-thief:borrow-a-memory` | Reaction | review_only | unmapped | `e328b5a2e51f79c5` |
| `adversary:skin-thief:wear-the-doubt` | Action | review_only | unmapped | `fbb7973191531112` |
| `adversary:aster-vale-forecast-engine:expected-value` | Passive | review_only | unmapped | `a86ec6fb836e2f51` |
| `adversary:aster-vale-forecast-engine:spend-forecast` | Reaction | review_only | unmapped | `d287ea494175f8e9` |
| `adversary:aster-vale-forecast-engine:model-collapse` | Reaction | review_only | unmapped | `2343f552f8107da6` |
| `adversary:wraith-pack:many-deaths` | Passive | supported (bounded HR01) | many_deaths_fear_opportunity | `a294330cfbf15903` |
| `adversary:wraith-pack:replay-the-moment` | Action | review_only | unmapped | `94387394b0d7bf5b` |
| `adversary:pale-court-elder:ownership-has-weight` | Passive | review_only | unmapped | `54789d2e2c673e8d` |
| `adversary:pale-court-elder:call-the-household` | Action | review_only | unmapped | `210894b4a748eae4` |
| `adversary:pale-court-elder:invitation-revoked` | Reaction | review_only | unmapped | `4a9706f0fec04941` |
| `adversary:blacksite-null-team:countermeasure-suite` | Passive | review_only | unmapped | `e28f49bcf72ca00a` |
| `adversary:blacksite-null-team:sever-the-working` | Action | review_only | unmapped | `72dbcc901b7d9b40` |
| `adversary:choir-junction-intelligence:distributed` | Passive | review_only | unmapped | `b3832299c4f7f6b8` |
| `adversary:choir-junction-intelligence:all-systems-speak` | Action | review_only | unmapped | `3e1268c5c9f43ac6` |
| `adversary:choir-junction-intelligence:reroute` | Reaction | review_only | unmapped | `edfa2605b3cc7b3a` |
| `adversary:old-green-warden:older-than-the-street` | Passive | review_only | unmapped | `94c00abce2a6a43e` |
| `adversary:old-green-warden:take-back-the-block` | Action | review_only | unmapped | `e156159e089c94a5` |
| `adversary:name-eater:hard-to-describe` | Passive | review_only | unmapped | `b35af7be6393f6be` |
| `adversary:name-eater:eat-the-introduction` | Action | review_only | unmapped | `728eecbdf7bc7d86` |
| `adversary:name-eater:no-one-called-that` | Reaction | review_only | unmapped | `3fcb2e906a632013` |
| `adversary:veil-anchor-sentinel:plausible-denial` | Passive | review_only | unmapped | `f3a847cfcce32ad4` |
| `adversary:veil-anchor-sentinel:edit-the-scene` | Action | review_only | unmapped | `de3d4428d56b2a7a` |
| `adversary:morrowline-matured:three-moves-ahead` | Passive | review_only | unmapped | `fd690dbfd05abe62` |
| `adversary:morrowline-matured:spend-forecast` | Reaction | review_only | unmapped | `848814f03a79dfdb` |
| `adversary:morrowline-matured:branch-pruning` | Action | review_only | unmapped | `c5ee7f203922e254` |
| `adversary:morrowline-matured:unknown-variable` | Reaction | review_only | unmapped | `e008f15dd7ff0ddd` |
| `adversary:glass-market-debt-reaper:standing-debt` | Passive | review_only | unmapped | `b056d07b1dbb8ec9` |
| `adversary:glass-market-debt-reaper:seize-collateral` | Action | review_only | unmapped | `6513507dd9742c8c` |
| `adversary:glass-market-debt-reaper:paid-in-full` | Reaction | review_only | unmapped | `3e075ce57c56b9db` |
| `adversary:catastrophic-echo:pattern-hunger` | Passive | review_only | unmapped | `55269eb0f655e917` |
| `adversary:catastrophic-echo:break-the-pattern` | untyped | needs_authoring | unmapped | `4e60ea7640e3c1cf` |
| `adversary:pale-regent:the-house-is-me` | Passive | review_only | unmapped | `d0d674da435e8a80` |
| `adversary:pale-regent:command-the-blood` | Action | review_only | unmapped | `5123d07666847b89` |
| `adversary:pale-regent:second-face` | Reaction | review_only | unmapped | `de3056934af6f2af` |
| `adversary:pale-regent:terms-of-surrender` | Passive | review_only | unmapped | `66e07027d7919430` |
| `adversary:citywide-choir:no-single-body` | Passive | review_only | unmapped | `4e3fd4b2e6984778` |
| `adversary:citywide-choir:every-screen` | Action | review_only | unmapped | `3394a9f94ff7c1ee` |
| `adversary:citywide-choir:failover` | Reaction | review_only | unmapped | `1fff7f3b6362467f` |
| `adversary:veil-engine-custodian:consensus-pressure` | Passive | review_only | unmapped | `c902244aecc2401f` |
| `adversary:veil-engine-custodian:rewrite-witnesses` | Action | review_only | unmapped | `fbaf4906489c3e4b` |
| `adversary:veil-engine-custodian:quarantine-reality` | Action | review_only | unmapped | `f628f2b7e566a6ed` |
| `adversary:hunger-behind-glass:perfect-offer` | Passive | review_only | unmapped | `eaa716729df02978` |
| `adversary:hunger-behind-glass:compound-interest` | Reaction | review_only | unmapped | `a7a522090f0ad5d0` |
| `adversary:hunger-behind-glass:foreclose` | Action | review_only | unmapped | `777f0de41b05c3d9` |
| `adversary:sovereign-of-the-green:territory-incarnate` | Passive | review_only | unmapped | `fa6e8eec6c156d44` |
| `adversary:sovereign-of-the-green:season-out-of-place` | Action | review_only | unmapped | `486ca70e2d845faa` |
| `adversary:sovereign-of-the-green:old-bargain` | Reaction | review_only | unmapped | `442de584db696725` |
| `adversary:pale-court-executioner:sentence-carried-out` | Passive | review_only | unmapped | `6796316d38bc902b` |
| `adversary:pale-court-executioner:break-the-line` | Action | review_only | unmapped | `9d48694a3de369a1` |
| `adversary:pale-court-executioner:no-appeal` | Reaction | review_only | unmapped | `8c0edbbf94d0b2e9` |
| `adversary:choir-storm-node:network-sight` | Passive | review_only | unmapped | `9043554b1075d43f` |
| `adversary:choir-storm-node:brownout` | Action | review_only | unmapped | `89fdaa371aa0a127` |
| `adversary:choir-storm-node:arc-through` | Reaction | review_only | unmapped | `f1b15ef73bb5405e` |
| `adversary:green-root-host:horde-3d8-8` | Passive | supported (native marked-half damage) | horde_marked_half_damage | `d2c6817c978cf3f6` |
| `adversary:green-root-host:take-the-pavement` | Action | review_only | unmapped | `cd22500e55da8911` |
| `adversary:green-root-host:regrow-through-concrete` | Reaction | review_only | unmapped | `27e2a72af8056ab3` |
| `adversary:civic-null-operative:countermeasure-suite` | Passive | review_only | unmapped | `7392cdfaff565c42` |
| `adversary:civic-null-operative:containment-foam` | Action | review_only | unmapped | `3808455cb7cec3f4` |
| `adversary:civic-null-operative:clean-exit` | Reaction | review_only | unmapped | `e88ab524711d51ec` |
| `adversary:aster-vale-catastrophe-analyst:forecast-window` | Action | review_only | unmapped | `5741bd4acf734c6b` |
| `adversary:aster-vale-catastrophe-analyst:bad-branch` | Reaction | review_only | unmapped | `26d2693654d16fd1` |
| `adversary:aster-vale-catastrophe-analyst:contingency-stack` | Passive | supported (automatic native defense) | first_severe_to_major | `fe45f62e8bd14036` |
| `adversary:veil-engine-knifewalker:outside-the-frame` | Passive | review_only | unmapped | `68b99ca1aa51b52b` |
| `adversary:veil-engine-knifewalker:cut-the-connection` | Action | review_only | unmapped | `16689ae17825e957` |
| `adversary:veil-engine-knifewalker:never-where-recorded` | Reaction | review_only | unmapped | `cd1a85e2377f7d74` |
| `environment:occult-crime-scene:contaminated-scene` | Passive | review_only | unmapped | `0179a99660fbf070` |
| `environment:occult-crime-scene:three-vectors` | Action | review_only | unmapped | `f13ec7906cebddae` |
| `environment:occult-crime-scene:sirens-outside` | Action | review_only | sirens_outside | `ae2c09f77180cc61` |
| `environment:after-hours-emergency-department:hipaa-and-procedure` | Passive | review_only | unmapped | `4b972966880fc207` |
| `environment:after-hours-emergency-department:code-blue` | Action | review_only | unmapped | `f5f3c602c1551f86` |
| `environment:after-hours-emergency-department:something-in-imaging` | Action | review_only | unmapped | `8971142f05e8a2af` |
| `environment:abandoned-mall-glass-market:no-violence-in-the-aisles` | Passive | review_only | unmapped | `0cd6bf7439938db4` |
| `environment:abandoned-mall-glass-market:everything-has-a-price` | Action | review_only | unmapped | `427506c41475d3b1` |
| `environment:abandoned-mall-glass-market:closing-time-moves` | Action | review_only | unmapped | `90a7dfb71dc15c19` |
| `environment:storm-drain-shrine:local-memory` | Passive | review_only | unmapped | `5e4555647c8039b3` |
| `environment:storm-drain-shrine:flash-flood` | Action | review_only | unmapped | `ced130b1fc7a0f45` |
| `environment:storm-drain-shrine:wrong-offering` | Reaction | review_only | unmapped | `b1a7ab918217f2a1` |
| `environment:apartment-veil-breach:thin-walls` | Passive | review_only | unmapped | `b0c12b9baebbe3d2` |
| `environment:apartment-veil-breach:door-chain` | Action | review_only | unmapped | `d9f7bf042274ef8d` |
| `environment:apartment-veil-breach:upload-in-progress` | Action | review_only | upload_countdown | `d233c76e5b989871` |
| `environment:dead-platform:last-train-rules` | Passive | review_only | unmapped | `1558a02d3c5af80a` |
| `environment:dead-platform:express-through-memory` | Action | review_only | unmapped | `1b5899579f84ceb1` |
| `environment:dead-platform:third-rail-spirit` | Action | review_only | unmapped | `1d4bb3b865866591` |
| `environment:aster-vale-predictive-lab:everything-logs` | Passive | review_only | unmapped | `022ababfeaf115f5` |
| `environment:aster-vale-predictive-lab:model-room` | Action | review_only | unmapped | `882908904e661282` |
| `environment:aster-vale-predictive-lab:containment-shutters` | Action | review_only | unmapped | `e904f72300c525b4` |
| `environment:haunted-nightclub:too-loud-to-think` | Passive | review_only | unmapped | `26f2c8d3d895827a` |
| `environment:haunted-nightclub:vip-threshold` | Passive | review_only | unmapped | `064acca655222888` |
| `environment:haunted-nightclub:everybody-saw-something-different` | Action | review_only | unmapped | `d7620922b535c526` |
| `environment:pale-court-townhouse:guest-right` | Passive | review_only | unmapped | `844eb3ad20fdbab7` |
| `environment:pale-court-townhouse:private-room` | Action | review_only | unmapped | `a958263238f792fc` |
| `environment:pale-court-townhouse:ownership-bites` | Reaction | review_only | ownership_bites | `05619567b93cfe3b` |
| `environment:flooded-river-threshold:current-with-intent` | Action | review_only | unmapped | `868322818f0bfee3` |
| `environment:flooded-river-threshold:old-marker-stone` | Passive | review_only | unmapped | `ae48316a5ee2fa3b` |
| `environment:flooded-river-threshold:city-vs-river` | Action | review_only | unmapped | `9ff96204e2555c3f` |
| `environment:glass-market-grand-concourse:neutrality-has-teeth` | Passive | review_only | unmapped | `99c9c26f40400fa1` |
| `environment:glass-market-grand-concourse:auction-of-consequences` | Action | review_only | unmapped | `8535b6ea80ac799e` |
| `environment:glass-market-grand-concourse:everyone-is-watching` | Reaction | review_only | unmapped | `9534b8e9ffe24475` |
| `environment:archive-beneath-the-courthouse:chain-of-title` | Passive | review_only | unmapped | `06f32d43d4165ff4` |
| `environment:archive-beneath-the-courthouse:sealed-docket` | Action | review_only | unmapped | `c60d1051c7bd9e99` |
| `environment:archive-beneath-the-courthouse:records-reject-you` | Action | review_only | unmapped | `3e2152e30e7015c6` |
| `environment:district-blackout:no-ordinary-signal` | Passive | review_only | unmapped | `be9b0f432352c363` |
| `environment:district-blackout:emergency-cascade` | Action | review_only | unmapped | `5852a6554a0575c3` |
| `environment:district-blackout:choir-volume` | Action | review_only | unmapped | `b42851f226bffb4e` |
| `environment:veil-anchor-chamber:consensus-engine` | Passive | review_only | unmapped | `33d0e8d7dc74cf45` |
| `environment:veil-anchor-chamber:maintenance-memory` | Action | review_only | unmapped | `f1ce5a01730dadad` |
| `environment:veil-anchor-chamber:automatic-correction` | Action | review_only | unmapped | `de25d5db634e1917` |
| `environment:rupture-district:no-consensus` | Passive | review_only | unmapped | `eb519776111e2129` |
| `environment:rupture-district:reality-collision` | Action | review_only | unmapped | `72ac5d1c881a84be` |
| `environment:rupture-district:mass-witness` | Reaction | review_only | unmapped | `95be876bcb6b1769` |
| `environment:networked-dream:metaphor-is-physics` | Passive | review_only | unmapped | `c38a9eae6056e03c` |
| `environment:networked-dream:algorithmic-undertow` | Action | review_only | unmapped | `ab168906521f62f0` |
| `environment:networked-dream:viral-door` | Action | review_only | unmapped | `68ff3b8c94be9cc9` |
