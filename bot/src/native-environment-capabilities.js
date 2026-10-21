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
    kind:'mundane_detail',fear:1,properties:{lighting:['bright','dim','dark'],temperature:['cool','temperate','warm'],
      wall_color:['white','grey','black','blue','green','red'],ambient_sound:['silent','humming','ringing']},
    effect:'One bounded mundane environmental property, no character condition or response.'},
  'environment:haunted-nightclub:too-loud-to-think':{handler:'nightclub_auditory_disadvantage',entry:'decisions',fear:0,
    disposition:'request_pc_action_roll',stakes_kind:'attempt_only',advantage:false,disadvantage:true,
    effect:'Exact delicate auditory/verbal applicability ruling; real owner quiet_environment outcome ends this disadvantage.'},
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
  return structuredClone(contract);
}
