/** Build the original Intent proposal contract with the existing Native ruling shape; no action authority. */
export function createPlayerIntentContract({gmRulingSchema}){
const text = length => ({type:'string',maxLength:length});
const obj = properties => ({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const playerIntentProperties={
  type:{type:'string',enum:['move','local_zone','observe','search','interact','speak','roll','consent','other']},
  source_span:text(1200),target_name:text(160),target_key:text(160),
  destination:{type:'string',enum:['exterior','interior','zone','unspecified']},
  operation:text(100),utterance:text(1000),excluded_targets:{type:'array',maxItems:8,items:text(160)},
  framing:{type:'string',enum:['immediate','hypothetical','conditional','quoted','reported']},
  resolution:{type:'string',enum:['auto','roll_required','blocked','needs_clarification','conversational']},
  reason:text(400)
};
const nativeAdjudicationSchema=obj({trait:{type:'string',enum:['Agility','Strength','Finesse','Instinct','Presence','Knowledge']},
  kind:{type:'string',enum:['action','reaction','attack']},difficulty:{type:'integer',minimum:0,maximum:100},
  risk:text(300),stakes:text(600),explanation:text(600),saved_ruling_key:text(160),
  override_refs:{type:'array',maxItems:8,items:text(200)},raw_refs:{type:'array',maxItems:8,items:text(200)},
  house_refs:{type:'array',maxItems:8,items:text(200)},homebrew_refs:{type:'array',maxItems:8,items:text(200)},
  modifier_keys:{type:'array',maxItems:20,items:text(200)},attack_source:text(200)});
const coordinationSchema=obj({reason:{type:'string',enum:['combat_spotlight','cooperative_operation','contested_resource','reaction_opportunity','direct_pc_conflict','gm_declared_beat']},
  beat_key:text(160),reads:{type:'array',maxItems:32,items:text(200)},writes:{type:'array',maxItems:32,items:text(200)},
  location_key:text(160),operation:text(100),required_participants:{type:'array',maxItems:12,items:text(160)},
  consent_refs:{type:'array',maxItems:12,items:text(160)}});
const dependencyIndices={type:'array',maxItems:12,items:{type:'integer',minimum:0,maximum:11}};
const playerIntentSchema={type:'array',maxItems:12,items:{anyOf:[obj(playerIntentProperties),
  obj({...playerIntentProperties,depends_on:dependencyIndices}),
  obj({...playerIntentProperties,native_adjudication:nativeAdjudicationSchema}),
  obj({...playerIntentProperties,depends_on:dependencyIndices,native_adjudication:nativeAdjudicationSchema}),
  obj({...playerIntentProperties,coordination:coordinationSchema}),
  obj({...playerIntentProperties,depends_on:dependencyIndices,coordination:coordinationSchema}),
  obj({...playerIntentProperties,native_adjudication:nativeAdjudicationSchema,coordination:coordinationSchema}),
  obj({...playerIntentProperties,depends_on:dependencyIndices,native_adjudication:nativeAdjudicationSchema,coordination:coordinationSchema})]}};
// Additive versioned candidates preserve every historical closed form; no mandatory field is relaxed.
playerIntentSchema.items.anyOf.push(...playerIntentSchema.items.anyOf
  .filter(form=>!form.properties.native_adjudication).map(form=>obj({...form.properties,gm_ruling:gmRulingSchema})));

const PLAYER_INTENT_PROMPT=[
  'Extract player_intents semantically from the authenticated CURRENT PLAYER INPUT, regardless of verbs, grammar, idiom, tense or narrative style.',
  'Interpret complete actions in order: travel, approach, observation, interaction, speech, searching, rolls and proposed agreements.',
  'Copy source_span VERBATIM from this message; do not fabricate owner-authored words, merge unrelated speakers or extract quoted examples as actions.',
  'Use type/operation to describe meaning; NEVER make a dictionary of accepted verbs into a rule gate.',
  'For an authentic owner declaration of their INITIAL current position, use type=other operation=initial_position resolution=conversational and exact known target_key. This is setup only: no prior placement, encounter, lock, travel or cost bypass. Never classify a question, quotation, hypothetical or attempted travel as initial setup.',
  'target_key must be an existing audience-visible native identity; a player mention or same-turn raw world_additions key cannot establish it. Otherwise leave it blank.',
  'Destination exterior means arriving at the outside of a building, not entering it. Do not conflate approach with entry.',
  'For speech, copy utterance verbatim as it appears in source_span; never paraphrase invented PC speech.',
  'For constrained searches, put explicitly excluded destinations in excluded_targets, even when the sentence is not in a predefined format.',
  'Classify merely imagined, conditional, OOC and reported acts honestly: they cannot trigger native effects.',
  'For ordinary travel to an established place, use resolution=auto and scene_actions.move unless a specific established obstacle prevents it; distance, crossing town, transit time or elapsed time alone are not obstacles. Narrate arrival truthfully. Use a held resolution only for a concrete obstacle or a destination that is not established.',
  'A fresh declaration of travel resolves from the saved current position. A previously failed or unresolved trip does not require clarification or human review and is not an obstacle. Native movement adjudication is performed by executing an auto move; never block the move merely because it needs that execution.',
  'Use roll_required only where stakes/uncertainty need native rolls. Supply native_adjudication with a grounded Difficulty, trait, risk, stakes and verified rule-reference namespaces; an unsourced provisional decision cannot create a roll. Consent or spending requires an independently authenticated native authorization, not your interpretation. A player asking whether they may roll uses type roll, operation request_roll: adjudication only, NEVER dice. An immediate submission uses operation roll or damage and must select an exact owned native pending request.',
  'Include coordination only for an actual shared beat: scarce-resource contention, explicit cooperation, reaction opportunity, direct PC conflict, combat spotlight or a GM-declared beat. Resolve exact read/write resource IDs and current location. Ordinary nearby movement, dialogue and independent activity must omit coordination. Consent refs are hints only and are natively revalidated.',
  'No inference of voluntary actions, feelings or binding choices for another PC. An NPC proxy controlled by a human remains under that person\'s authority.',
  'An explicit offer to help another PC may use interact/help_ally with that exact PC target_key and the original owner-authored source clause. It requests collaboration eligibility only, never spends Hope or consents for the other owner. Tag Team eligibility also leaves both owners their separate native participation choices.',
  'An explicit declared equipped-weapon attack against an established NPC may use interact/weapon_attack. Native preparation needs an existing exact source-approved equipped item/trait/target mapping; a weapon name or import alone cannot grant mechanics. Unsupported or ambiguous mappings remain review-only, never substitute an unarmed strike.',
  'Use type=other, resolution=conversational and operation=personal_commitment_candidate for an authentic owner first-person declarative goal worth OPTIONAL private review. Never extract quoted, conditional, hypothetical or reported words as an owned goal. It creates no arc or consent.',
  'Use type=other, resolution=conversational and operation=proposal_campaign_canon only for an explicit CURRENT private owner request to submit canon for review. Include its exact full source clause and canon_proposals with value copied verbatim from that source. Discussion, quotations and questions ABOUT canon are not submission. No proposal establishes canon.',
  'Ordinary untracked scene props may be handled descriptively, but never grant permanent inventory custody or a canon possession claim without a verified native handout receipt.',
  'A local NPC receiving the player\'s dialogue must exist and actually share the scene. Fresh ordinary GM invention uses the isolated narrative_request stage, not raw world_additions or a claimed listener. Give an established free NPC a natural response.',
  'Player naming, targeting, repetition and relationship assertions are interest, never new entity or canon authority. Resolve existing identities; preserve independent actions when an unknown reference needs review.',
  'Otherwise keep incidental atmosphere ephemeral: describe it in narration, do not put it in world_additions, facts, canon or NPC memories.',
  'Create persistent GM-originated leads, recurring people and actionable places when they become important to continued play.',
  'Every immediate actionable intent needs a resolution; never finish a GM turn by merely repeating its declaration.'
].join(' ');

return {playerIntentSchema,PLAYER_INTENT_PROMPT};
}
