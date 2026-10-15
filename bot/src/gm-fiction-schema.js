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
export const nativeOutcomeKinds=['pc_effect_receipt','roll_request','evidence_receipt','commitment','scene_entry','ordinary_effect_receipt'];
export const nativeOutcomeSchema=closed({version:{type:'integer',enum:[4]},kind:{type:'string',enum:['native_outcome']},
  receipt_kind:{type:'string',enum:nativeOutcomeKinds},ref:str(200)});
export const sceneAtmosphereSubjects={light:'Light',silence:'Silence',air:'The air',shadows:'Shadows'};
export const sceneAtmosphereVerbs={light:['settles','lingers','spreads'],silence:['settles','lingers'],air:['stirs','drifts'],shadows:['settle','linger','spread']};
export const sceneAtmosphereEndings={light:['softly','at the edges of the view'],silence:['briefly','between moments'],air:['gently','through the surroundings'],shadows:['softly','at the edges of the view']};
export const sceneDescriptionSchema=closed({version:{type:'integer',enum:[5]},kind:{type:'string',enum:['scene_description']},
  fact_refs:{type:'array',maxItems:6,items:str(200)},atmosphere:{type:'array',maxItems:3,items:closed({
    subject:{type:'string',enum:Object.keys(sceneAtmosphereSubjects)},verb:{type:'string',enum:[...new Set(Object.values(sceneAtmosphereVerbs).flat())]},
    manner:{type:'string',enum:[...new Set(Object.values(sceneAtmosphereEndings).flat())]}})}});
export const freshSceneRequestSchema=closed({version:{type:'integer',enum:[6]},kind:{type:'string',enum:['scene_fresh_request']},
  fact_refs:{type:'array',maxItems:6,items:str(200)}});
export const freshSceneResponseSchema=closed({description:str(1400)});
export const sceneFictionRequestSchema=closed({version:{type:'integer',enum:[7]},kind:{type:'string',enum:['scene_fiction_request']},
  operation:{type:'string',enum:['describe_scene','current_situation']},source_refs:{type:'array',maxItems:8,items:str(200)}});
export const sceneFictionResponseSchema=closed({description:str(1800),details:{type:'array',maxItems:8,items:closed({
  id:str(64),category:{type:'string',enum:['layout','sensory','nonmechanical_prop','ambient_activity']},text:str(300)})},
  evidence_refs:{type:'array',maxItems:8,items:str(200)}});
export const narrativeRequestSchema=closed({version:{type:'integer',enum:[8]},kind:{type:'string',enum:['narrative_request']},
  operation:{type:'string',enum:['describe_scene','current_situation','conversation','combat','continuation']},source_refs:{type:'array',maxItems:12,items:str(200)}});
export const narrativeUnitKinds=['scene','npc_speech','npc_action_attempt','lead','rumor','established_observation','native_outcome_render'];
export const narrativeResponseSchema=closed({narrative_units:{type:'array',maxItems:8,items:closed({id:str(64),kind:{type:'string',enum:narrativeUnitKinds},text:str(1800),
  subject_key:str(160),location_key:str(160),visibility:{type:'string',enum:['party','character','gm']},
  epistemic:{type:'string',enum:['observation','testimony','hypothesis','attempt','native_outcome']},source_refs:{type:'array',maxItems:8,items:str(200)},receipt_kind:str(80),receipt_ref:str(200)})},
  fiction_delta:{type:'array',maxItems:4,items:closed({kind:{type:'string',enum:['location','npc']},key:str(100),name:str(160),summary:str(600),
    location_key:str(160),parent_location_key:str(160),role:str(160),aliases:{type:'array',maxItems:6,items:str(80)}})}});
