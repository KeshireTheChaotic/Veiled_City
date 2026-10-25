import {npcCompositionSchema,freshNpcRequestSchema,nativeOutcomeSchema,sceneDescriptionSchema,freshSceneRequestSchema,sceneFictionRequestSchema,narrativeRequestSchema} from './gm-fiction-schema.js';
export const dialogue={
  welcome:"Hello. Come closer if you'd like to talk.",
  ask_work:"Looking for work? Tell me what kind of work you're looking for.",
  ask_skills:"What are you good at, and what would you rather avoid? We can start there.",
  ask_needs:"What can I help you with?",
  invite_details:"I'm listening. Tell me a little more before I make any suggestions.",
  ask_destination:"Where are you hoping to go?",
  clarify:"I'm not sure what you mean. Could you explain a little more?",
  decline:"I can't help with that. You don't owe me an explanation.",
  acknowledge:"I hear you. What would you like to do next?"
};
export const atmosphere={room_hum:"A low, uneven hum hangs in the room.",coffee_aroma:"The scent of coffee drifts through the air.",
  soft_light:"Soft light settles across the surroundings.",quiet_pause:"For a moment, the surroundings are quiet."};
export const tones={plain:"",warm:"The speaker's voice is warm. ",wry:"The speaker gives a wry smile. ",terse:"The speaker keeps it brief. "};
const acts=[...Object.keys(dialogue),...Object.keys(atmosphere)];
export const gmWorldPartsSchema={type:"array",maxItems:4,items:{type:"object",additionalProperties:false,
  properties:{version:{type:"integer",enum:[1]},kind:{type:"string",enum:["npc_dialogue","scene_atmosphere"]},
    entity_key:{type:"string",maxLength:160},acts:{type:"array",minItems:1,maxItems:3,items:{type:"string",enum:acts}},
    tone:{type:"string",enum:Object.keys(tones)}},required:["version","kind","entity_key","acts","tone"]}};
gmWorldPartsSchema.items={anyOf:[gmWorldPartsSchema.items,npcCompositionSchema,freshNpcRequestSchema,nativeOutcomeSchema,sceneDescriptionSchema,freshSceneRequestSchema,sceneFictionRequestSchema,narrativeRequestSchema]};
export const GM_WORLD_NARRATIVE_PROMPT="In ordinary, private and protected PvP scenes, use gm_world_parts for meaningful GM-owned conversation and atmosphere. "
  +"Choose current native NPC/location entity_key and compose up to three speech acts with a tone. ask_work + ask_skills invites a natural work discussion. "
  +"These parts authorize only the NPC's own closed utterance or harmless ephemeral atmosphere: never a PC response, secrets, promises, new access or mechanics. "
  +"Free text remains quarantined; do not encode extra facts in entity_key. Unsupported exposition needs separate native evidence/review. "
  +"Use [] when no suitable GM-owned fiction is needed. Never use an active human NPC proxy. "
  +"For fresh source-grounded NPC conversation in any scene, request version=3 kind=npc_fresh_request with current entity_key, "
  +"focus (conversation/work/help/warning/offer/rumor/greeting/farewell), and source_refs of current audience-visible NPC observations. "
  +"No utterance/text/safety flag is accepted from this combined GM prompt: a native audience-isolated authoring stage supplies words. "
  +"Use at most one such request; it authorizes no PC effect, revelation, reaction, spending or factual assertion about a PC. "
  +"Project an existing committed receipt using version=4 kind=native_outcome receipt_kind (pc_effect_receipt/roll_request/evidence_receipt/commitment) and ref. "
  +"This is read-only, audience-checked rendering, never permission to apply a receipt or disclose private resources. "
  +"For an owner's scene/situation request use type=other, operation=describe_scene or current_situation with the exact authored span. "
  +"When scene descriptions are enabled, version=5 kind=scene_description accepts only current GM-established environmental fact_refs and "
  +"typed ephemeral atmosphere clauses (subject, verb, manner). No arbitrary prose, new facts, PC effects or inferred arrival is accepted. "
  +"For expressive surroundings at an already established audience-visible viewpoint request version=6 kind=scene_fresh_request with fact_refs of eligible environmental facts (or []). "
  +"Supply no prose or safety flag; an isolated conditional writer provides nonmechanical scenery. Missing position requires owner-private initial setup, not invented arrival. "
  +"At most one isolated writer is permitted per logical turn across NPC and scenery requests, including retries/restarts.";
