/** Code-owned proposal contracts only. Caller fields, printed text and this metadata grant no execution. */
const contracts=Object.freeze({
  'environment:haunted-nightclub:everybody-saw-something-different':{handler:'nightclub_inconsistent_witnesses',transport:7,entry:'environment_actions',
    required:['version','feature_ref','environment','incident_ref','accounts','inconsistency'],fear:0,
    effect:'Exactly three actual local NPCs with native attributed speech, own evidence and established true details after an independently established supernatural incident. Inconsistency remains contextual judgment, not objective truth.'},
  'environment:haunted-nightclub:vip-threshold':{handler:'nightclub_vip_threshold',entry:'owner_private_admission',fear:0,
    methods:['invitation','status','leverage','deception'],
    effect:'Current source-backed admission only. Does not move a PC or waive locks, hazards, encounter movement or owner choice.'},
  'environment:occult-crime-scene:sirens-outside':{handler:'sirens_outside',transport:4,entry:'environment_actions',
    operation:'ordinary_responder_arrival',required:['version','feature_ref','environment','category','npc'],
    categories:['authority','media','property_management','emergency_response'],fear:1,
    effect:'Native ordinary identity/presence; never a combatant, PC reaction, custody or attack.'},
  'environment:after-hours-emergency-department:code-blue':{handler:'environment_code_blue',transport:5,entry:'environment_actions',
    kind:'medical_emergency',category:'medical',property:'',service:'',value:'',fear:0,
    effect:'Medical emergency competing for attention; owner response remains unselected.'},
  'environment:district-blackout:emergency-cascade':{handler:'environment_emergency_cascade',transport:5,entry:'environment_actions',
    kind:'service_emergency',categories:['hospital','traffic','fire','elevator','refrigeration','public_safety'],fear:0,
    effect:'Actual local service required; establishes an emergency, not numerical service damage or PC injury.'},
  'environment:veil-anchor-chamber:automatic-correction':{handler:'environment_mundane_correction',transport:5,entry:'environment_actions',
    kind:'mundane_detail',fear:1,detail_shape:'open_property_and_value',
    effect:'One creatively authored mundane environmental detail; exactly one printed Fear, with no automatic PC action or added Daggerheart mechanic.'},
  'environment:veil-anchor-chamber:maintenance-memory':{handler:'environment_maintenance_memory',transport:8,entry:'environment_actions',
    kind:'historical_memory',fear:0,required:['version','feature_ref','environment','detail'],
    effect:'One audience-visible chamber memory anchored to a current GM-established true metaplot fact; no new PC knowledge state or mechanical consequence.'},
  'environment:apartment-veil-breach:door-chain':{handler:'environment_door_chain',transport:9,entry:'environment_actions',fear:0,
    required:['version','feature_ref','environment','npc'],
    effect:'One current-scene frightened resident holds the direct route and asks for an explanation; no PC response, movement, access outcome or resource cost is inferred.'},
  'environment:after-hours-emergency-department:something-in-imaging':{handler:'environment_imaging_record',transport:10,entry:'environment_actions',fear:0,
    required:['version','feature_ref','environment','modality','impossible_detail','clue'],
    effect:'One creative impossible diagnostic finding offers a clue and creates an audience-scoped record; no patient identity, treatment, PC response or mechanical result is inferred.'},
  'environment:after-hours-emergency-department:hipaa-and-procedure':{handler:'environment_patient_procedure_context',entry:'scene_context',fear:0,
    effect:'Exact passive source rule: routine patient-information access requires appropriate credentials, consent or a credible workaround; context alone creates no permission or access decision.'},
  'environment:apartment-veil-breach:thin-walls':{handler:'environment_thin_walls_context',entry:'scene_context',fear:0,
    effect:'Exact passive source cue: loud or spectacular actions risk adding witnesses; no witness or PC action is automatic.'},
  'environment:haunted-nightclub:too-loud-to-think':{handler:'nightclub_auditory_disadvantage',entry:'decisions',fear:0,
    disposition:'request_pc_action_roll',stakes_kind:'attempt_only',advantage:false,disadvantage:true,
    effect:'Exact delicate auditory/verbal applicability ruling; real owner quiet_environment outcome ends this disadvantage.'},
  'environment:storm-drain-shrine:local-memory':{handler:'shrine_local_memory_advantage',entry:'decisions',fear:0,
    disposition:'request_pc_action_roll',stakes_kind:'attempt_only',advantage:true,disadvantage:false,
    effect:"One ordinary PC action roll for the player's exact question about recent local movement after their declared respectful offering; no answer, cost or PC choice is inferred."},
  'environment:aster-vale-predictive-lab:everything-logs':{handler:'intrusion_trace_owner_payment',entry:'decisions',
    disposition:'request_pc_action_roll',stakes_kind:'attempt_only',advantage:false,disadvantage:false,
    effect:'Register intrusion before dice; real failure creates native trace. Only explicit owner choice may pay exactly 1 Hope.'},
  'environment:apartment-veil-breach:upload-in-progress':{handler:'upload_countdown',transport:6,entry:'environment_actions',
    operations:['upload_start','upload_advance','upload_adjust'],fear:1,max:4,
    effect:'Actual native clear recording/upload source; unique actual fictional beat; owner native tick-back/redirect; no time-based tick or recipient knowledge.'}
});
export function environmentProposalContract(feature){
  const contract=contracts[feature?.feature_key];
  if(feature?.status!=='supported'||contract?.handler!==feature.native_handler||!Array.isArray(feature.costs))return null;
  const fear=feature.costs.filter(c=>c?.resource==='fear').reduce((sum,c)=>sum+c.amount,0),
    otherCosts=feature.costs.some(c=>c?.resource!=='fear');
  if(!Number.isSafeInteger(fear)||fear!==contract.fear||otherCosts)return null;
  if(feature.native_handler==='sirens_outside'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='upload_countdown'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='nightclub_auditory_disadvantage'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='native_pc_action_disadvantage'))return null;
  if(feature.native_handler==='shrine_local_memory_advantage'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='native_pc_action_advantage'))return null;
  if(feature.native_handler==='environment_emergency_cascade'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='environment_code_blue'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='nightclub_vip_threshold'&&(feature.type!=='Passive'||feature.trigger_kind!=='attempted_private_floor_entry'
    ||feature.target_policy!=='acting_pc'||feature.roll_protocol!=='established_credential_or_successful_deception'))return null;
  if(feature.native_handler==='environment_mundane_correction'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='nightclub_inconsistent_witnesses'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='environment_maintenance_memory'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='environment_door_chain'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='environment_imaging_record'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='none'))return null;
  if(feature.native_handler==='environment_patient_procedure_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_thin_walls_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  return structuredClone(contract);
}
