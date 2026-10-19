/** Shared model proposal taxonomy. JSON selects a proposed ruling, never a principal, die or receipt. */
export const ARBITRATION_DISPOSITIONS=Object.freeze(['no_roll','npc_no_roll','request_pc_action_roll','request_pc_reaction_roll',
  'gm_attack_roll','gm_exceptional_action_roll','gm_reaction_roll','native_feature_resolution','needs_consent','needs_rules_review','blocked']);
const str=maxLength=>({type:'string',maxLength});
const obj=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
export const npcSceneIntentSchema=obj({actor_key:str(160),operation:{type:'string',enum:['speak','walk','prepare','attack','exceptional_action','reaction','feature','set_allies','clear_allies']},
  target_refs:{type:'array',maxItems:8,items:str(160)},objective_ref:str(160),source_refs:{type:'array',maxItems:8,items:str(160)},
  dependencies:{type:'array',maxItems:8,items:str(160)}});
const proposalV1=obj({intent_ref:str(200),disposition:{type:'string',enum:ARBITRATION_DISPOSITIONS},
  rule_basis_refs:{type:'array',minItems:1,maxItems:8,items:str(200)},difficulty:{anyOf:[{type:'integer',minimum:0,maximum:100},{type:'null'}]},
  trait:{anyOf:[{type:'string',enum:['Agility','Strength','Finesse','Instinct','Presence','Knowledge']},{type:'null'}]},
  stakes_kind:{type:'string',enum:['attempt_only','native_attack','native_feature','needs_review']},
  stakes:str(600),reason:str(600),difficulty_reason:str(600),feature_ref:str(160),experience_ref:str(160),
  advantage:{type:'boolean'},disadvantage:{type:'boolean'}});
export const gmArbitrationProposalSchema={anyOf:[proposalV1,obj({...proposalV1.properties,proposal_version:{type:'integer',enum:[2]},trigger_ref:str(200)})]};
const unifiedV1={version:{type:'integer',enum:[1]},npc_intents:{type:'array',maxItems:4,items:npcSceneIntentSchema},
  decisions:{type:'array',maxItems:16,items:gmArbitrationProposalSchema}};
export const unifiedArbitrationSchema={anyOf:[obj(unifiedV1),obj({...unifiedV1,version:{type:'integer',enum:[2]},
  pre_roll_fear:{type:'array',maxItems:1,items:obj({request_ref:str(200),npc_intent_ref:str(200)})}})]};
export function matchesArbitrationSchema(schema,value){
  if(schema.anyOf)return schema.anyOf.some(s=>matchesArbitrationSchema(s,value));
  if(schema.enum)return schema.enum.includes(value);
  if(schema.type==='null')return value===null;
  if(schema.type==='boolean')return typeof value==='boolean';
  if(schema.type==='integer')return Number.isSafeInteger(value)&&value>=schema.minimum&&value<=schema.maximum;
  if(schema.type==='string')return typeof value==='string'&&value.length<=schema.maxLength;
  if(schema.type==='array')return Array.isArray(value)&&value.length>=(schema.minItems||0)&&value.length<=schema.maxItems&&value.every(v=>matchesArbitrationSchema(schema.items,v));
  return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===schema.required.length
    &&schema.required.every(k=>Object.hasOwn(value,k)&&matchesArbitrationSchema(schema.properties[k],value[k]));
}
export function arbitrationFailure(reason){return Object.assign(new Error(`Unified GM arbitration held: ${reason}`),{code:'GM_ARBITRATION',expected:true});}
