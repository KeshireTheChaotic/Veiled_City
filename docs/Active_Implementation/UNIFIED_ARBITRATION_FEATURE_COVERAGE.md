# Bounded native special-feature coverage

**Authoritative source:** `bot/src/native-feature-definitions.json`, its runtime verifier `native-feature-catalog.js`, relevant `native-*` executors and source-pinned original content. Current counts are 153 = 12 supported + 140 review-only + 1 needs-authoring. This is **handler inventory**, not UA17 whole-release certification.

## Supported feature keys and exact scope

| Feature key | Supported bounded behavior | Unqualified extension/hold |
| --- | --- | --- |
| `adversary:pale-court-thrall:pack-pressure` | Same-native-zone actual Thrall ally presence; attack modifier cap +2 | Generic broad Very Close/unknown-range interpretations |
| `adversary:aster-vale-contractor:flashbang` | One current Close owner; private Instinct reaction/choice, native condition/Stress; Critical ignores ordinary-success effect with additive v3 receipt | Different targeting/range, unsupported overflow/condition alternatives |
| `adversary:static-wraith:feedback` | Verified visible device use, Wraith Stress cost, owner Instinct 12, fail Stress/device disabled | Unproved device repair/overflow or generic private-device evidence |
| `adversary:choir-relay:local-mesh` | Verified source-pinned Signal taxonomy, real allied same-zone actor; max +1 defensive Difficulty | Cross-zone buffing or inferred alliance/device access |
| `adversary:pale-court-knight:blood-rush` | Native actual hit marking ≥2 HP enables bounded Knight Stress clearance and holding its current position | Unproved free relocation/variant movement |
| `adversary:ritual-enforcement-team:stack-formation` | Actual remaining NPC HP ≥4 gives +1 defense Difficulty, else +0, pre-dice sealed | Combined passive/aura and Tag Team HP-transition replay |
| `adversary:ritual-enforcement-team:coordinated-volley` | Owner-authored 1–3 target shared native GM attack/damage, per-owner baseline defense/Armor/HP | Shared target-specific Vulnerable odds, generalized multitarget actions |
| `adversary:traffic-saint:all-lanes-stop` | Actual visible in-Far cohort; distinct owner reactions and sourced movement condition | Arbitrary movement distances/closure or generic group-feature schema |
| `adversary:wraith-pack:many-deaths` | Bounded real Fear opportunity and successful native hit can add exactly one PC Stress | Signal-Touched optional response/Stress overflow, other triggers |
| `adversary:pale-regent:command-the-blood` | Source-current same-zone Presence 20; failed owner may choose 2 Hope or 2 Stress | Invented communicated command/compliance, nonlocal range |
| `adversary:green-root-host:horde-3d8-8` | Real half-marked NPC HP chooses native 3d8+8 attack damage; critical dice max once | Other Host HP/final-HP/interception rules |
| `adversary:aster-vale-catastrophe-analyst:contingency-stack` | First actual Severe native incoming damage to local Analyst becomes Major, charged once/scene | Generic adversary reaction/Route Around or postmortem resurrection |

All handlers need correct native actor template/content hashes, control, scene/zone, target, rules, opportunity and costs; existing source/proof compatibility for saved outcomes survives a later context change. Catalog strings alone are not a fallback executor.

## Group features: rights and result semantics

- The same GM-origin parent can create multiple owner-private reaction children. Each player submits only their own current request/revision via `/vc-roll window`.
- **Flashbang:** ordinary successful reaction may require owner `stress` versus `vulnerable`; a true natural matching-dice Critical bypasses ordinary-success negative options using a new version-3 zero-effect receipt. Old committed v1/v2 readers remain; pending legacy Critical-choice records require review, not silent charges.
- **All Lanes Stop:** movement restriction expires after a real next Saint spotlight receipt, not elapsed wall-clock time. A verified condition-only expiry is narrowly allowed without reopening unrelated changed PC state.
- **Command the Blood:** failure permits exact, affordable `hope` or `stress` option. Choosing `command` is scoped review pending a communicated command and owner action; it is not automatic obedience. Success/Critical is not an extra Stress/Hope/Fear reward.
- **Volley:** one native attack die + one shared damage roll only when needed; each child owns defense, Armor, damage, death and withholding. A waiting sibling is not default failed.

## Feature input catalog and owner rulings

The only deliberately appended actor feature is Ritual Enforcement Team **Coordinated Volley**; the original two feature strings/indices remain pinned but the full actor-template hash changed by the append. The explicit eight-Signal actor taxonomy is an owner design ruling, not inferred from names; unclassified actors have no Signal eligibility. `native-house-errata.json` pins HR01–HR12 source/version interpretations, but many have only review diagnostics. Examples still held: Invitation Revoked, Spend Forecast one-d12 reroll, Blackout/Three Vectors, certain HP interception, Route Around's powered destination, Signal-Touched opt-in suppression.

## What remains unimplemented

The **140 `review_only`** entries and **one `needs_authoring`** occurrence are explicitly non-executable; generic 16-environment feature execution is not certified. Multi-owner condition variants, richer scene reach, generic private-result dependencies and arbitrary additional special defenses require separate adapters and counterexample tests. Do not reclassify items `supported` just to suppress a review status. Catalog completeness must fail closed when a feature string, full actor template, order or hash changes.
