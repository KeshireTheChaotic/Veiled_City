# V9-PVP-B supplementary contract — claim-level character ownership

**Priority:** P0 mandatory security/authority gate. **Precedence:** supplements `V9_NARRATIVE_PVP_CONTRACT.md` §6; it does not change the agreed duel/three-strikes/Hope/Fear mechanics.

## Determination

The only authoritative post-result PvP narration is **a verified story-stake receipt plus separately authenticated, clause-level character-owned narration**. Free-form text authored by one participant is *not* evidence that every named character acted as described. Treat unclear wording as a draft/review request, never as an adjudicated outcome. GM review cannot unilaterally authorize another PC's voluntary reaction.

## Three-layer model

1. **Canonical result** (`pvp_resolution_receipt`): immutable result of the locked agreement, native roll pairing or strike score, tie/withdrawal, and allowed best/worst stakes. It authorizes only the result expressly negotiated. In the shin-tap example it can establish an agreed **harmless tap**, but not an apology.
2. **Owner narrative evidence** (`pvp_narrative_clause`): an authenticated player-specific, source-scoped proposal for their own character. For each material clause, persist author user, active controlled character, exact source event and verbatim offsets/span, accepted subject, role (`own_success`, `own_reaction`, `withhold`), limited effect type, agreement/resolution/terms hash, revision and audience. A retracted/changed owner source invalidates projection. A second character's **material** behavior requires that second character's own separate authenticated source or explicit exact-clause ratification. Winner-authored text never creates it.
3. **Publication projection** (`pvp_public_projection`): renderer may combine (a) the exact, saved result's noncontroversial stake summary, (b) only mechanically/provenance-authorized clauses and neutral scenery, and (c) allowed disclosure status. It must never put raw unapproved whole-blob winner prose onto a player-visible/campaign-canonical surface. Delivery approval is a separate gate after content-authority verification.

## Deterministic gate and free-text treatment

- Require a closed structured set of material claims: `claim_id`, `subject_character`, `claim_kind`, `claimed_effect`, `source_event`, `source_span`, `start`, `end`, `owning_user`, `authority_ref`, `resolution_ref`, `terms_hash`; any claim describing speech, chosen reaction, emotion, intent, bodily response, concession, item custody, movement or injury is **material**. Claims may reference another PC only to the extent the exact stake receipt already guarantees an interaction, without creating new behavior by that PC.
- Bind claim owner from the current authenticated principal and DB owner assignment, **not** from the user-supplied `subject_character` or a model classification. Verify source exact substring/UTF-16 offsets, scene, character, principal revision and active ancestry at *use and publication time*. For a clause about another PC, require that PC's separate source-backed approval/ratification of **that exact clause hash and result revision**; ordinary bilateral permission to publish the whole account is insufficient.
- **No general-English proof by regex.** A dictionary of disallowed words or a model's `safe: true` judgment cannot certify arbitrary text. Use a conservative closed set of canonical claim templates generated from native receipt fields and owner-authorized clause types for publishable material effects. Player-submitted creative prose remains a *noncanonical private draft* unless every material clause is proven and the composed surface satisfies locked boundaries. Quoting it or adding a disclaimer does not make an unverified claim canonical.
- Safe player authorship can remain expressive through **structured own-action fields** and role-specific display templates, with an optional unstructured player note available only privately as a proposal. If a natural-language clause cannot be decomposed/proven safely, preserve it for revision; do not infer missing evidence. Explicitly allow ordinary harmless first-person own action, such as `I land my own harmless tap`, only through a source-bound and receipt-constrained representation, never by trusting the first-person wording alone.
- A **winner-authored clause** may implement their authorized outcome only. A **loser-authored clause** may describe their response, or `withhold` may intentionally leave it undescribed. One player may not commit a clause of the other PC's apology, decision, movement, injury, emotional state or dialogue. A player can separately *ratify* an exact other-authored suggestion as their own PC's authorized clause, with an authenticated event; no silent ratification and no meaning expansion.
- A material clause outside the agreed terms, including harm, permanent effects, unwanted confession, forced speech, changed destination or asset transfer, requires a **new bilateral terms revision and new consent** before any relevant dice. After dice, no retroactive expansion: close the unsupported clause and negotiate a new independent scene action instead. Never rewrite an old `pvp_resolution_receipt`.
- For a sentence mixing own behavior and another PC's behavior (`I strike the harmless tap and Choso apologizes`), split only on exact owner-submitted clause boundaries; retain the authorized own clause if independently verifiable, quarantine the cross-owner clause, and require author revision or Choso's own explicit exact-clause ratification. Never publish the mixed raw sentence.

## GM review (non-authorizing)

An ambiguous draft transitions to `needs_scope_review` in the author-private inbox, with reason codes such as `unproven_other_character_claim`, `mixed_owner_clause`, `terms_exceeded`, `undecidable_free_text`, or `missing_source_span`. GM sees only what their role legitimately grants. The GM may: (a) reject the draft, (b) suggest a safe rewording, (c) request affected-owner ratification, or (d) certify neutral/environmental wording that establishes **no PC behavior** and remains inside terms. Record GM principal, rationale, decision, exact text/terms/receipt hash, timestamp, and downstream owner choices. A GM alone cannot mark an unsupported other-PC reaction approved or canonical. A stopped or absent player cannot be treated as approving by silence.

## Safe resolution and privacy

- Native PvP dice and the agreed winner remain terminal even while descriptions are pending. The absent/withheld reaction remains absent: this is **not** a mechanical stalemate or a penalty.
- Separate `result_terminal`, `narration_pending`, `narration_partially_authorized`, `narration_approved`, `disclosure_pending`, `published` statuses. These are *projections* or subrecords; do not rewrite the native result or reroll.
- Use **two gates** for public surfaces: content authority (claim-by-claim) and current audience/disclosure authorization (per agreed publication terms). `reviewPvpNarrative` may grant preview access but is never a cross-PC semantic signature by itself.
- Avoid leaking sealed traits, actions, hidden dice, other player's withheld/private reaction, GM-only adjudication, or message identifiers to recipients without rights. Mixed-source private/public output must fail closed.
- Model-written connective prose may mention only the receipt-established stake and approved neutral environment; any character-attributed material assertion requires its own proof. The renderer must use stable approved text/receipt projections, not free model prose.

## Example

- **Verified stake:** "Jaxon may land a harmless shin tap; no injury or forced speech."
- **Jaxon's authenticated own clause:** "I step in and tap his shin." => publishable only after an exact current source proof and agreement/stake verification.
- **Jaxon's additional proposed clause:** "Choso apologizes for losing." => **rejected/quarantined**; Jaxon's own-subject field does not grant Choso agency.
- **Choso response:** "I glare at Jaxon." => publishable only if Choso independently authored and consented to sharing it. Alternatively Choso may withhold.
- **GM:** "A nearby light flickers." => allowed as independently bounded scenery under the Fear policy; cannot imply Choso's reaction.

**Non-negotiable negative:** PVP30 stays red until an actual test shows winner-authored loser reactions cannot be accepted as actionable/authoritative and cannot be published via review/share/Discord or AI narration. No code path may bypass this by relabeling raw text as a quote, using a mutable `subject_character` field, or treating a GM check as consent.
