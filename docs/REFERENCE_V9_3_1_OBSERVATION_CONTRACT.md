# v9.3.1 observation and character-description compatibility contract

**Status:** binding pre-implementation amendment to v9.3 V9-PVP-B, not a new completed phase. **Precedence:** supplements `V9_3_OUTPUT_AUTHORITY_CONTRACT.md` and the v9.2 character-authorship policy. Preserve the cross-actor PVP30/PVP30q release gates.

## Intent: questions are permitted; new character agency is not

A player may freely **ask** about another PC's appearance, clothing, location, activity, spoken words, visible condition or apparent behavior. Such a question is not an attempt to take control of that PC, and asking it must never fail solely because the target owner has not yet supplied the requested information. Merely mentioning another PC in a question, observation or GM answer is **not** a PvP agency claim. Questions do not establish the answer as true.

**No blanket exemption for assertions.** The system must not trust a model's `question`, `observation`, `narrative_claims: []`, `harmless` or `subject_character` label as proof. The native system must resolve the *actual identity, relevant scene and permissible answer evidence*, then compose any material answer from source-backed facts or a truthful unknown/deferred response. An unsupported assertion of apology, injury, emotional reaction, decision, possession or movement remains unpublishable even if embedded in a question-and-answer sequence.

## Evidence and visibility tiers

| Case | Authorized GM behavior | Never infer |
|---|---|---|
| Established, observable character appearance | Describe exact owner-authored / native accepted visible attributes if current perception or established compatible witness memory allows | Undisclosed sheet statistics, GM-only hooks, secret identity, unseen equipment |
| Partially established appearance | Describe known visible attributes; explicitly leave the remainder unspecified | New permanent physical traits, scars, costume, species or distinguishing features |
| No established description | Answer that the appearance is not yet established / cannot be reliably described; optionally invite the target owner privately to describe it | A canonical new appearance, a fabricated description, a compelled response from the target |
| Current outfit / condition / whereabouts | Use current native position, inventory/disclosure and visible condition receipts appropriate to the observer | Private whereabouts, unseen travel, uncommitted injuries, equipment from a private sheet |
| Prior statements or activity | Quote/summarize only audience-visible or character-witnessed authored speech, committed events and properly scoped memory | OOC speech, private DMs, unseen private actions, unsourced motives |
| Thoughts, desires or motivations | Explain that internal state is unknown unless voluntarily disclosed; factual visible mannerisms can be reported **if established** | Claims that a PC thinks, feels, apologizes, consents or intends merely because the GM inferred it |
| Ordinary weather, scenery, NPC behavior | Continue under normal GM/environment authority and existing native causation gates | Player-authored choices or combat harm smuggled in as scenery |

Appearance is a **character-defining fact**: creating a new persistent description generally requires the controlling player's authenticated input (or an explicitly authorized prior character-import source). An existing sheet entry is *not automatically public*: read through field-level provenance and audience controls; if not demonstrably observable/known to the observer, use the nonrevealing fallback. An owner may later contribute or reveal an appearance, and that new description becomes answerable only under the applicable visibility/perception rules. A disguise or concealed feature does not become visible merely because it exists in a character packet.

## Required nonblocking flow

1. Accept an authenticated in-world inquiry or `observe` intent against a natively identified, permitted PC referent. Distinguish **request for information** from the text asserted as GM fact; resolving a referent alone supplies neither knowledge nor agency.
2. Read established source and native context for the exact observer, target, current/remembered scene, known appearance and speech, witness/perception facts, and publication destination. Prefer structured approved character appearance fields / accepted description events and audience-safe native source references.
3. If fully evidenced, render from evidence. If only partly evidenced, render only the known portion. If not evidenced, return a truthful `not_established`, `not_visible`, or `not_known_to_observer` response. This is a **successful inquiry**, not `NARRATIVE_PVP`, security-error, rolls, consent failure or aborted turn.
4. Optionally create a **private, idempotent** `character_description_request` to the affected owner, presenting the question and offering reply/decline/defer. Never force a response, send repeated unsolicited prompts, broaden private scene details to that owner without authorization, or hold the questioning player's independent action. Inability to DM is a delivery issue, not question failure.
5. If the owner responds, record an authenticated appearance or answer source with field provenance, current character/owner, revision and explicitly chosen disclosure scope; don't globally promote private details. Later authorized inquiries may use it; previous answers need not be regenerated.
6. Render the safe answer via a trusted `observation_answer` (or equivalent) part with observed evidence, known/unknown state and destination audience. Source/visibility must be checked again at queue/send and after restart, just as verified PvP parts are. Do not copy unsupported model prose into an observation part.
7. On mixed turns, independently verified movement/observation and PvP results continue even if another clause is quarantined. The absence of an appearance description must not poison the turn or trigger full model reroll.

## Example behavior

**Choso:** “What does Jaxon look like?”

- If Jaxon's player-established black hair and scar are **visible to Choso**: “From where you stand, Jaxon has dark hair and a scar across his cheek.”
- If only the hair is established: “You can make out his dark hair; the rest of his appearance hasn't been described clearly enough to be certain.”
- If no appearance evidence exists but Choso can see him: “Jaxon is nearby, but his appearance hasn't been established in enough detail to describe reliably.” (Optional private invitation to Jaxon; no forced answer.)
- If Jaxon isn't present and Choso has no relevant memory: “You can't currently see Jaxon, and you don't have a reliable description to go on.”
- If Jaxon's private GM notes contain an unrevealed identifying mark, that mark **must not** appear in Choso's answer.

**Billy:** “What did Choso say after the duel?” If Choso authored no response, answer “Choso hasn't given an established response,” even if Jaxon's draft said “Choso apologized.” This is not an invitation to canonize the draft.

## Acceptance gates (see OBS01–OBS22 matrix rows)

- An appearance question lacking source data gives a truthful nonblocking answer; the turn completes; no additional character fact or turn rollback is generated.
- Supported and partially supported descriptions use only observer-visible proven facts; absent targets, private records, earlier witnessed activity, disguises and GM-only facts honor epistemic scope.
- Optional owner request is private, noncoercive, idempotent and fail-safe on DM denial; authenticated reply has explicit visibility and later retrieval, but cannot authorize a forced voluntary reaction.
- An `observation` or `question` label does not launder the original `Choso apologizes` claim into canonical output, including when Billy is the triggering user or the GM omits `narrative_claims`.
- Confirm ordinary NPC/scenery narration and independent actions are not globally blocked by an unrelated PvP receipt.
- Keep PVP30, both cross-actor PVP30q, PvP author ownership and all D08 tests in the mandatory offline suite.
