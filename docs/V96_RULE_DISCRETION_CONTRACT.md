# V96 rule-discretion and authority contract

Baseline: `25f6d8013d0a6b07fca1e023d32d16de3e1eea25`, local `codex/typed-intent-refinement`, application 10.0.0. V95-06 is BYPASSED by owner, not completed. V96 execution authorized 2026-10-12; live testing is not a prerequisite or authorized activity.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Authority matrix

| Principal / layer | May establish | Cannot establish |
|---|---|---|
| Current authenticated owner | Exact original intent, own optional choices/spends, consent, reaction, withdrawal, bounded disclosure | Another PC's intent, consent, thoughts, reaction or successful outcome |
| Combined semantic AI GM | Ordinary contextual understanding; proposed trait, Difficulty, stakes, ordinary fictional response | Authenticated principal, source, receipt, dice, capability, special-feature permission, expenditure or PC reaction |
| Native source/intent verifier | Exact immutable occurrence, framing, actor/control revision, scene, target and audience | Success merely because an immediate intent was accepted |
| Native rule arbitration | Applicable saved ruling/override/local SRD/house/homebrew grounding; zero-cost no-roll receipt or pending request | New supernatural reach, missing feature permission, arbitrary cost, damage, ownership or access |
| Native dice/effect adapters | Saved dice, eligible explicit costs, adapter-specific exactly-once consequences | Unimplemented effects, inferred consent, generic narrative success as a material receipt |
| Authenticated human GM review | Saved scoped rule decision; request clarification/rewrite or supported adapter execution | Speak/consent for another PC, rewrite committed dice or silently erase due Fear |
| Composer/outbox/memory/voice | Current source/owner/audience-verified projection and exact delivery status | Consequences, raw cross-actor prose approval, private-to-party promotion, uncertain-send retry |
| Operational instrumentation | Bounded guild aggregates and reference-safe GM diagnostics | Game state, authority, missing token usage or billing certification |

## Current rules, not proposed replacements

`rule-reference-catalog.js` pins local SRD 2.0 (2026-08-25). Actual catalog IDs are `srd:action-rolls`, `srd:reaction-rolls`, `srd:attack-rolls`, `srd:experiences`, `srd:help-an-ally`, and `srd:tag-team-rolls`. Applicability and kind are verified, not accepted from arbitrary `srd:` strings. `selectRuleBasis` selects an explicitly requested existing saved ruling, campaign override, RAW, then compatible house/homebrew references; otherwise provisional. It does not automatically discover all applicable campaign rulings. V96 must not claim otherwise or silently override a relevant saved rule.

Local `content/ENGINE/DAGGERHEART_MULTIPLAYER_CORE.md` and `MULTIPLAYER_GM_RULES.md` provide ordinary fiction-first/multiplayer policy. Historical general documents do not supersede newer native v10 owner policies and `TYPED_INTENT_CONTRACTS.md`: PvP generates no Hope or action-Critical Stress award; every qualifying action Fear has an immediate obligation, not campaign Fear; reactions do not create extra PvP Fear. Narrative Duel/Three Strikes never damage PCs. Damage profiles retain target-specific risk consent, Evasion, owner defense/Armor, thresholds and vanilla death risk; guaranteed-nonlethal tiers remain disabled. Risk It All matching death dice retains vanilla HP/Stress recovery. Non-PvP SRD resources remain unchanged.

## V96-01 implementation (not part of V96-00)

One versioned ruling candidate references a current accepted occurrence and scene/owner/source revisions. Dispositions: `narrative_no_roll`, `standard_action_roll`, `needs_review` (or genuine clarification/blocked). Native validation, not a model `safe`/`gm`/capability flag, determines eligibility. Reuse `adjudicateAcceptedIntent` and `prepareRollRequest`; no second dice engine or provider request per clause.

Generic action-roll authority is a bounded application of a real catalog entry. Mundane accessible observation may use a zero-cost, mutation-free native completion; risky mundane tactics require sourced Difficulty derivation, meaningful stakes and private owner choices before native dice. Generic rolls do not grant magic, conditions, custody, access, PC damage, NPC mechanical powers or feature costs. Those require a dedicated current native adapter or scoped review, regardless of a Critical/high roll. Do not silently replace the player's unsupported goal with an alternative.

New GM-discretion writes remain opt-in until qualified; no such feature flag exists at this baseline and no flag is enabled here. Existing ordinary fiction/no-roll/native request behavior stays available. `roll_requests` and `pvp_private_ui` are existing opt-ins. `autonomous_pvp_fear` defaults enabled unless explicitly false; manual mode preserves pending obligations. Operator configuration is unknown: no `.env` or campaign database was read.

V96-01 adds **`gm_discretion`**, default off, through the existing GM-only `/vc-city flags json:{"gm_discretion":true}`; native rolls also require existing `roll_requests` / `roll_collaboration` opt-ins. No operator flag was enabled. Explicit manual `gm_authority` takes precedence. No live command registration is needed or performed for this existing JSON command.

`gm_ruling` is an additive closed member of an immediate `player_intent`, never simultaneous `native_adjudication`. V1 contains disposition, exact current context event references, capability/effect class, nullable trait/Difficulty, risk/stakes/explanation/derivation and existing rule/modifier references. The wrapper derives actor, source occurrence, session/scene, principal revision and audience from native acceptance, never from model fields. Context requires current observed/established GM-owned events at the current location and appropriate audience; player declarations, roll proposals, GM-only or other-owner evidence do not certify mundane facts. The bounded context inventory is a locator, not complete substitute for source records.

Only mutation-free observation/ordinary-attempt rulings are supported. `mundane` is not a capability certificate. Special/unknown features or material resource/damage/custody/access/scene effects require their native adapter or private review; a generic roll grants none. Real no-roll receipts have empty state mutations/native dice. Standard requests use actual local generic `srd:action-rolls` only when no explicit rule was requested; every supplied namespace/key/kind must exist/apply. Saved/override precedence is retained and invalid special refs never fall through to generic authority.

`gm_action_ruling` is GM-private proposal/validation metadata, keyed once per accepted input/version with immutable proposal digest, evidence digest and native request/outcome links. It is not another outcome ledger. Its recorded preparation status is historical; current request/accepted action/native outcome receipts own terminal results. Execution rechecks native owner/source/scene/location/audience/rule/evidence before replay, optional costs and dice. Changed terms need explicit later review, not overwrite; missing capability/rule/adapter becomes `needs_review`, no action receipt or fake roll. Existing native trait review retains its real request, distinct from unsupported capability review. V96-03 will add richer scoped review/owner recovery, not silently upgrade these holds.

Rule revisions bind actual current saved-row content as well as catalog metadata; same-timestamp edits cannot bypass the pre-RNG check. Older no-roll completions and unrelated native requests remain historical/current native authorities under their original terms, never silently adopted or recertified by a new proposal. No historical record is rewritten or migrated. Read-only native proof on already resolved dice remains distinct from live new-operation validation.

## Review, compatibility and rollback

V96-02 private execution: saved terms are owner-private proposals, not facts or effect permission. Pending presentation/delivery revalidates the exact ruling/request and current source, owner, scene, evidence and rules; native operations independently recheck before costs/RNG. New discretionary requests narrow outcome receipts to the character. Explicit redacted owner-sharing remains separate; old receipts are not migrated. Alternate traits/Experiences retain native applicability proof and explicit owner selection/payment. Generic success/Critical grants no ability, access, custody, HP effect or hidden knowledge.

Distinguish epistemic uncertainty (ordinary GM fiction), rule ambiguity, missing character capability and missing native effect adapter. Only the latter actual authority gaps need scoped review; an unfamiliar verb is not an authority gap. A review record is non-actionable, source-bound and private; it cannot provide consent or unlock dependent effects. Independent sibling/other-owner actions must proceed. Revocation invalidates permission/publication, not immutable already-committed mechanics.

V96-00 adds fixtures/contracts only: no runtime change, SQL migration or historical receipt rewrite. Later additive versions must hold unknown/unverifiable records rather than upgrade old consent. Rollback is code/flag scoped, never database restoration over newer dice, imported character deletion, rerolls or blind uncertain reposts. Existing manual/native services remain authoritative throughout.
