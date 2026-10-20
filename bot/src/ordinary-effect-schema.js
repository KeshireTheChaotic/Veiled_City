/** Untrusted bounded follow-through candidates; no authority or rules engine. */
const str=maxLength=>({type:'string',maxLength});
export const ordinaryEffectClasses=['observation','npc_intent','environment','position','access','clock','exposure','evidence','scene_state',
  'special','resource','damage','custody','character_choice','death','disclosure'];
export const ordinaryEffectsSchema={type:'array',maxItems:4,items:{type:'object',additionalProperties:false,properties:{
  version:{type:'integer',enum:[1]},accepted_intent_ref:str(4000),effect_class:{type:'string',enum:ordinaryEffectClasses},
  adapter:{type:'string',enum:['observation','evidence_excerpt','condition_clear','delegated','unsupported']},prerequisite_ref:str(200),payload_json:str(6000)
},required:['version','accepted_intent_ref','effect_class','adapter','prerequisite_ref','payload_json']}};
export function validOrdinaryEffect(p){return !!p&&Object.keys(p).sort().join(',')===ordinaryEffectsSchema.items.required.slice().sort().join(',')
  &&p.version===1&&ordinaryEffectClasses.includes(p.effect_class)&&['observation','evidence_excerpt','condition_clear','delegated','unsupported'].includes(p.adapter)
  &&['accepted_intent_ref','prerequisite_ref','payload_json'].every(k=>typeof p[k]==='string'&&p[k].length<=ordinaryEffectsSchema.items.properties[k].maxLength);}
export const ORDINARY_EFFECT_PROMPT='ordinary_effect_proposals are untrusted FOLLOW-THROUGH candidates, never receipts. Use [] unless needed. '
  +'Reference an exact current native accepted action ID from ORDINARY EFFECT CONTEXT, or the exact full current source clause (resolved uniquely natively). '
  +'prerequisite_ref is its actual action_outcome_receipt, or empty while awaiting native resolution; never invent dice/receipt/GM authority. '
  +'payload_json is {when:"no_roll"|"success"|"failure_fear",query:{target_type:"npc"|"location",target,operation:"appearance"|"clothing"|"activity"}} for observation, '
  +'or {when,intent:<existing closed ai_intent>} for delegated. For evidence_excerpt/effect_class=evidence use {when,evidence:{handout_id,source_event,expected_revision,excerpt_start,excerpt_end}} for an exact visible excerpt from an already owner-held registered original. '
  +'The native result labels it an unverified document claim, never an inferred conclusion, guilt, authenticity, custody transfer or new canon. '
  +'For condition_clear/effect_class=special use {when:"no_roll"|"success",condition:{condition:<exact owned native condition ref>}} only after an owner clear_condition declaration targets that ref and its own native action succeeds. '
  +'This narrowly ends a verified until-cleared Flashbang Vulnerable condition; it cannot heal, clear unrelated conditions, infer success or free another PC. Its result stays owner-private. '
  +'Only native-scoped observation, bounded document reading, NPC goal, sourced scene record or matched service consequence routes exist. '
  +'Private sources/results stay private; missing/unsupported capability, custody, damage, costs, conditions, death, knowledge/disclosure or generic clock/exposure needs scoped review. '
  +'A high/Critical roll is only a precondition, never effect permission. Do not duplicate the nested intent in ai_intents or infer another PC reaction. '
  +'Native effect receipts have their own audit; proposed effects alone do not set legacy state_review categories changed.';
