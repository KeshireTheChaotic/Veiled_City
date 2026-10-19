# Break the Pattern — owner-approved authoring contract v1

Owner approval: 2026-10-19, `owner:break-the-pattern:v1`. Registry: HR13 v1 in `bot/src/native-house-errata.json`.

This is an additive campaign ruling, not a claim that the original compendium specified the missing verification protocol. The original adversary feature text, actor template and their hashes remain unchanged.

## Exact source

- Feature: `adversary:catastrophic-echo:break-the-pattern`, feature index1.
- Source: `content/GM_PRIVATE/ADVERSARIES/adversaries.json#catastrophic-echo/features/1`.
- Original feature hash: `4e60ea7640e3c1cff3822722f30798595489ca088a64f30d4ef21add27c534a9`.
- Original template hash: `f71790aec63e3a6da0e6b4395c6af2ae58c7344c2ebc503779b62361a4c03086`.

## Authored rule

**Passive.** A PC who identifies and deliberately disrupts three distinct, GM-established defining details of the original event reduces that particular Echo's Difficulty by2 for the rest of the current scene. Apply this reduction once per Echo actor and scene; it does not stack with another completion of this passive.

Each detail must have its own stable identity and GM-established original-event source. The same authenticated PC must have both identification and deliberate disruption supported by actual native outcomes for each of the three details. An owner-authored declaration establishes intent, not success. Ordinary native adjudication determines whether an action needs a roll; this passive imposes no automatic roll, additional resource cost or prescribed number of separate actions. A legitimate compound action may count only the distinct detail outcomes it actually establishes.

The trigger is completion of the third qualifying detail, not a model's assertion that the pattern was broken. Scope is the actual Echo instance, current scene, PC/control revision and relevant source/target/audience. No retrospective invention of qualifying details, borrowing another PC's progress or carrying a completed reduction into a new scene is authorized.

## Evidence and execution boundary

GM ownership of an original-event detail does not make it known to a PC. Identification must independently prove entitled access/observation and the applicable native outcome; disruption must prove that owner's current deliberate intent and the matching resolved native effect. Quotation, narration, accepted-but-unresolved intent, high dice alone, or a model-supplied receipt is insufficient. Private details stay private; mechanical eligibility does not disclose them.

This ruling resolves missing **authored semantics only**. The feature remains `review_only`, with no native handler, until the original-event detail/progress adapter and every current/saved Difficulty consumer are implemented and qualified. Existing ordinary review routes cannot infer or apply the reduction from free text. Any eventual implementation must preserve pending/saved rolls, exactly-once effects, scene expiry, source revocation, legitimate prior outcomes and historical readers.

## Scheduling and rollback

Per the owner's latest priority, this and the other review-only adapters are deferred until after OpeningDirector changes. There are no remaining needs-authoring occurrences in the current catalog; that does not mean all features are supported. Environment features are unchanged.

No campaign DB write, saved encounter rewrite, automatic Difficulty change, new roll, cost, disclosure or command registration occurs from adopting this contract. Rollback must retain the original source and this versioned ruling for historical interpretation; disabling future preparation must never rewrite legitimate saved outcomes.
