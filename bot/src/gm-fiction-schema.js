/** Data-only output proposal schemas. They confer no authority and import no state/effect services. */
const str=n=>({type:'string',maxLength:n});
const closed=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
export const compositionTones=['plain','warm','wry','terse'];
const beats=[closed({op:{type:'string',enum:['quote']},source_ref:str(200),knowledge_key:str(160),source_span:str(1200)}),
  closed({op:{type:'string',enum:['gesture']},gesture:{type:'string',enum:['pause','smile','fidget','fold_arms','listen','look_away']}}),
  closed({op:{type:'string',enum:['question']},topic:{type:'string',enum:['next_step','goal','needs','work','reason','details']}}),
  closed({op:{type:'string',enum:['threat']},action:{type:'string',enum:['arrest_attempt','seizure_attempt','call_for_help']}})];
export const npcCompositionSchema=closed({version:{type:'integer',enum:[2]},kind:{type:'string',enum:['npc_composition']},
  entity_key:str(160),tone:{type:'string',enum:compositionTones},beats:{type:'array',minItems:1,maxItems:6,items:{anyOf:beats}}});
export const freshNpcFocuses=['conversation','work','help','warning','offer','rumor','greeting','farewell'];
export const freshNpcRequestSchema=closed({version:{type:'integer',enum:[3]},kind:{type:'string',enum:['npc_fresh_request']},
  entity_key:str(160),focus:{type:'string',enum:freshNpcFocuses},source_refs:{type:'array',maxItems:6,items:str(200)}});
export const freshNpcResponseSchema=closed({utterance:str(1400)});
export const nativeOutcomeKinds=['pc_effect_receipt','roll_request','evidence_receipt','commitment','scene_entry'];
export const nativeOutcomeSchema=closed({version:{type:'integer',enum:[4]},kind:{type:'string',enum:['native_outcome']},
  receipt_kind:{type:'string',enum:nativeOutcomeKinds},ref:str(200)});
