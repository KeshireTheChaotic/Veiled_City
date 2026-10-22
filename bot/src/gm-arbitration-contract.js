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
export const gmArbitrationProposalSchema={anyOf:[proposalV1,obj({...proposalV1.properties,proposal_version:{type:'integer',enum:[2]},trigger_ref:str(200)}),
  obj({...proposalV1.properties,proposal_version:{type:'integer',enum:[3]},collaboration:obj({kind:{type:'string',enum:['help','tag']},request:str(200),partner_request:str(200)})}),
  obj({...proposalV1.properties,proposal_version:{type:'integer',enum:[4]},feature_intent:obj({action:{type:'string',enum:['breach','restrain','surprise']},position_ref:str(160)})})]};
const unifiedV1={version:{type:'integer',enum:[1]},npc_intents:{type:'array',maxItems:4,items:npcSceneIntentSchema},
  decisions:{type:'array',maxItems:16,items:gmArbitrationProposalSchema}};
const interrupt={type:'array',maxItems:1,items:obj({request_ref:str(200),npc_intent_ref:str(200)})};
const environmentProfiles={type:'array',maxItems:1,items:obj({version:{type:'integer',enum:[1]},environment:str(200),location:str(160)})};
const arrivalAction=obj({version:{type:'integer',enum:[1]},feature_ref:str(160),environment:str(200),
  category:{type:'string',enum:['authority','media','property_management','emergency_response']},
  npc:obj({kind:{type:'string',enum:['npc']},key:str(100),name:str(160),aliases:{type:'array',maxItems:6,items:str(80)},
    location_key:str(160),parent_location_key:str(160),role:str(160),summary:str(600)})});
const sceneAction=obj({version:{type:'integer',enum:[1]},feature_ref:str(160),environment:str(200),
  detail:obj({kind:{type:'string',enum:['medical_emergency','service_emergency','mundane_detail']},category:str(160),property:str(160),service:str(160),value:str(160)})});
const environmentActions={type:'array',maxItems:1,items:arrivalAction};
const uploadCommon={version:{type:'integer',enum:[1]},feature_ref:{type:'string',enum:['environment:apartment-veil-breach:upload-in-progress']}};
const uploadStart=obj({...uploadCommon,operation:{type:'string',enum:['upload_start']},environment:str(200),handout:str(200),creation_source:str(200)});
const uploadAdvance=obj({...uploadCommon,operation:{type:'string',enum:['upload_advance']},countdown:str(200),
  beat_kind:{type:'string',enum:['owner_action','scene_effect']},beat_ref:str(200),accepted_intent:str(200),ruling:str(600)});
const uploadAdjust=obj({...uploadCommon,operation:{type:'string',enum:['upload_adjust']},countdown:str(200),accepted_intent:str(200),prerequisite:str(200),ruling:str(600)});
const witnessAccounts=obj({version:{type:'integer',enum:[1]},feature_ref:{type:'string',enum:['environment:haunted-nightclub:everybody-saw-something-different']},
  environment:str(200),incident_ref:str(200),accounts:{type:'array',minItems:3,maxItems:3,
    items:obj({npc:str(200),unit_ref:str(200),evidence_ref:str(200),truth_ref:str(200)})},
  inconsistency:{type:'array',minItems:3,maxItems:3,items:obj({left:str(200),right:str(200)})}});
const maintenanceMemoryAction=obj({version:{type:'integer',enum:[1]},feature_ref:{type:'string',enum:['environment:veil-anchor-chamber:maintenance-memory']},
  environment:str(200),detail:obj({kind:{type:'string',enum:['historical_memory']},category:{type:'string',enum:['']},property:str(160),service:{type:'string',enum:['']},value:{type:'string',enum:['']}})});
const doorChainAction=obj({version:{type:'integer',enum:[1]},feature_ref:{type:'string',enum:['environment:apartment-veil-breach:door-chain']},environment:str(200),
  npc:obj({kind:{type:'string',enum:['npc']},key:str(100),name:str(160),aliases:{type:'array',maxItems:6,items:str(80)},location_key:str(160),
    parent_location_key:str(160),role:str(160),summary:str(600)})});
const imagingRecordAction=obj({version:{type:'integer',enum:[1]},feature_ref:{type:'string',enum:['environment:after-hours-emergency-department:something-in-imaging']},
  environment:str(200),modality:{type:'string',enum:['scan','monitor','lab_result']},impossible_detail:str(4000),clue:str(4000)});
const preparedPositions={type:'array',maxItems:4,items:obj({position_ref:str(160),kind:{type:'string',enum:['fortified_position','prepared_defense','established_ambush','barricade','other_prepared_position']},
  description:str(600),target_refs:{type:'array',minItems:1,maxItems:8,items:str(160)}})};
export const unifiedArbitrationSchema={anyOf:[obj(unifiedV1),obj({...unifiedV1,version:{type:'integer',enum:[2]},pre_roll_fear:interrupt}),
  obj({...unifiedV1,version:{type:'integer',enum:[3]},pre_roll_fear:interrupt,
    environment_profiles:environmentProfiles}),
  obj({...unifiedV1,version:{type:'integer',enum:[4]},pre_roll_fear:interrupt,environment_profiles:environmentProfiles,
    environment_actions:environmentActions}),
  obj({...unifiedV1,version:{type:'integer',enum:[5]},pre_roll_fear:interrupt,environment_profiles:environmentProfiles,
    environment_actions:{type:'array',maxItems:1,items:{anyOf:[arrivalAction,sceneAction]}}}),
  obj({...unifiedV1,version:{type:'integer',enum:[6]},pre_roll_fear:interrupt,environment_profiles:environmentProfiles,
    environment_actions:{type:'array',maxItems:1,items:{anyOf:[arrivalAction,sceneAction,uploadStart,uploadAdvance,uploadAdjust]}}}),
  obj({...unifiedV1,version:{type:'integer',enum:[7]},pre_roll_fear:interrupt,environment_profiles:environmentProfiles,
    environment_actions:{type:'array',maxItems:1,items:{anyOf:[arrivalAction,sceneAction,uploadStart,uploadAdvance,uploadAdjust,witnessAccounts]}}}),
  obj({...unifiedV1,version:{type:'integer',enum:[8]},pre_roll_fear:interrupt,environment_profiles:environmentProfiles,
    environment_actions:{type:'array',maxItems:1,items:{anyOf:[arrivalAction,sceneAction,uploadStart,uploadAdvance,uploadAdjust,witnessAccounts,maintenanceMemoryAction]}}}),
  obj({...unifiedV1,version:{type:'integer',enum:[9]},pre_roll_fear:interrupt,environment_profiles:environmentProfiles,
    environment_actions:{type:'array',maxItems:1,items:{anyOf:[arrivalAction,sceneAction,uploadStart,uploadAdvance,uploadAdjust,witnessAccounts,maintenanceMemoryAction,doorChainAction]}}}),
  obj({...unifiedV1,version:{type:'integer',enum:[10]},pre_roll_fear:interrupt,environment_profiles:environmentProfiles,
    environment_actions:{type:'array',maxItems:1,items:{anyOf:[arrivalAction,sceneAction,uploadStart,uploadAdvance,uploadAdjust,witnessAccounts,maintenanceMemoryAction,doorChainAction,imagingRecordAction]}}}),
  obj({...unifiedV1,version:{type:'integer',enum:[11]},pre_roll_fear:interrupt,environment_profiles:environmentProfiles,
    environment_actions:{type:'array',maxItems:1,items:{anyOf:[arrivalAction,sceneAction,uploadStart,uploadAdvance,uploadAdjust,witnessAccounts,maintenanceMemoryAction,doorChainAction,imagingRecordAction]}},
    prepared_positions:preparedPositions})]};
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
