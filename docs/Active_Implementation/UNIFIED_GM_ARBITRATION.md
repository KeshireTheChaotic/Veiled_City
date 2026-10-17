# Unified AI GM arbitration — engineering contract

## Control split

**Player:** declares intent, performs their own Duality/reaction dice, authorizes optional Help/Experience/Hope/Armor/consent/choice and controls proxy/surrender/death selections.

**AI GM:** may choose *supported* GM-owned targets, stakes, applicable Difficulty, mundane no-roll consequences and code-qualified NPC feature opportunities from source-grounded current context.

**Native engine:** validates current source and rules, actor/control, target/scene/line of sight and native costs before rolling or persisting. Exact committed native receipts authorize playback and player-facing projections; generation text does not.

No universal `human_reviewed=true` flag substitution. Some rule/feature applications still require human review because the missing adapter is *substantive*, not cosmetic. Existing human/legacy native receipt readers remain required.

## Actual execution flow

`index.js` public/private turn → `GMService.runTurn` → `scene-intent-board.js` bounded native board and model proposal → `gm-unified-arbitration.js` + `gm-arbitration-contract.js` disposition/feature review → `state.js` final authoritative mutation → native GM capability/roll/PC incoming/feature executor → native output preparation/outbox → exact recipient verification.

The common proposal schema supports NPC `speak`, `walk`, `prepare`, `attack`, `exceptional_action`, `reaction`, `feature`, `set_allies` and `clear_allies`. Proposals carry rule basis, Difficulty, trait, stakes class and source refs but **not** a principal or permission to sample RNG. Existing semantic `stakes_kind` text is not proof of a damage/feature effect. A private unresolved request is not a failed roll.

## Time and resource order

- Ordinary nonattack NPC behavior typically needs no roll. A GM exceptional d20 task requires actual native objective/template and independent fiction opportunity; civic simulation scores do not supply attack evidence.
- Standard NPC attacks roll native GM d20 versus target Evasion only after current source, template, actor/presence, opportunity, costs and affected-owner defense restrictions are checked. Native natural 20/critical is GM-native, never player Hope/Fear.
- Feature/spotlight costs, extra spotlight and allowed NPC Experience spends are **additive before dice** and committed exactly once. First normal spotlight does not incur a universal invented Fear cost.
- PC reaction invitations create separate owner-authenticated pending requests. Withdrawing/silence cannot be construed as failure. Owners choose any available resource/condition options through exact current revisions.
- Saved outcomes and parent/child multi-target sources are stable across restart; a sibling's unresolved response cannot rewrite another child's valid result or prompt fresh shared RNG.

## Audience and publication

The GM's hidden intent/rationale, NPC knowledge and private prerequisites do not leak into the public camera or another owner. A valid source and native output type must independently authorize text; unsupported fiction/effects remain GM-private review. Native damage/roll proof remains valid even if its descriptive narration is held. Known/uncertain transport cannot trigger rerolls or duplicate spends.

## Bounded features currently available

See [UNIFIED_ARBITRATION_FEATURE_COVERAGE.md](UNIFIED_ARBITRATION_FEATURE_COVERAGE.md) for exact feature keys and per-handler scope. The engine currently knows **12** source-pinned special handlers; the remaining 141 authored occurrences are not native executable features. New catalog metadata/house-rule errata is not an authorization until a tested handler, original-content fingerprint and positive/negative end-to-end adapter all agree.

## Rules priority

Applicable saved GM ruling → exact explicit campaign override → verified Daggerheart SRD (v2.0, Aug 25 2026) → compatible house/homebrew extension → provisional ruling, always beneath source ownership, consent, native proof, privacy and safety gates. `native-house-errata.json` pins owner decisions to versions/hashes, but does not implicitly enable unimplemented adapters. PvP's existing bilateral/current Hope-Fear boundaries remain untouched by a proposed post-UA redesign.
