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
  'environment:archive-beneath-the-courthouse:chain-of-title':{handler:'environment_chain_of_title_context',entry:'scene_context',fear:0,
    effect:'Exact passive source cue: ownership, threshold and pact magic used here can often be traced through mundane property records; no record or result is automatic.'},
  'environment:rupture-district:no-consensus':{handler:'environment_no_consensus_context',entry:'scene_context',fear:0,
    effect:'Exact passive source cue: different major scenes may obey different supernatural logic; when the PC can perceive it, state the current rule clearly. The adapter invents no rule or perception.'},
  'environment:networked-dream:metaphor-is-physics':{handler:'environment_metaphor_physics_context',entry:'scene_context',fear:0,
    effect:'Exact passive source cue: a player-explained clever symbolic action can substitute for a literal tool; the adapter does not choose an action or grant a mechanical result.'},
  'environment:district-blackout:no-ordinary-signal':{handler:'environment_no_ordinary_signal_context',entry:'scene_context',fear:0,
    effect:'Exact passive source cue: cellular and normal network access is unreliable; alternate infrastructure or Signal magic is required. A connection attempt has no automatic outcome.'},
  'environment:veil-anchor-chamber:consensus-engine':{handler:'environment_consensus_engine_context',entry:'scene_context',fear:0,
    effect:'Exact passive source cue: obvious supernatural actions may alter Veil Exposure unpredictably; state that risk before a voluntary action. No alteration amount or outcome is supplied.'},
  'environment:pale-court-townhouse:guest-right':{handler:'environment_guest_right_context',entry:'scene_context',fear:0,
    effect:'Exact passive hospitality rule; applies only when the PC accepts formal hospitality. The adapter does not infer acceptance, protection or agreement to unstated house rules.'},
  'environment:pale-court-townhouse:private-room':{handler:'environment_private_room_context',entry:'scene_context',fear:0,
    effect:'Source-bound NPC offer prompt; fiction remains GM-authored, the PC owns their response, and context alone records no acceptance or consequence.'},
  'environment:abandoned-mall-glass-market:everything-has-a-price':{handler:'environment_price_offer_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound prompt for a useful item or answer at a tailored price stated before acceptance; the GM authors the offer and the PC chooses whether to accept, with no trade recorded.'},
  'environment:glass-market-grand-concourse:auction-of-consequences':{handler:'environment_auction_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound prompt for an auction of a campaign-relevant relic, secret or person’s contract; fiction remains GM-authored and audience-bound, with no bid, sale, transfer or PC commitment recorded by context alone.'},
  'environment:aster-vale-predictive-lab:model-room':{handler:'environment_model_room_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound prompt for a frighteningly accurate but incomplete GM-authored forecast; the PC may take Hope by accepting one listed risk as real and immediate, with no forecast fact or resource change recorded by context alone.'},
  'environment:archive-beneath-the-courthouse:sealed-docket':{handler:'environment_sealed_docket_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound prompt for a document changing the current conflict’s legal or supernatural interpretation; access costs time, secrecy or favor before acceptance, and context records no document or PC agreement.'},
  'environment:occult-crime-scene:three-vectors':{handler:'environment_three_vectors_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound prompt for three clue vectors across the printed evidence domains; the PC chooses one, and a Fear result may prompt the GM to advance another interested party on a different vector. Context records no clue, choice, roll or faction movement.'},
  'environment:abandoned-mall-glass-market:no-violence-in-the-aisles':{handler:'environment_market_neutrality_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound Market neutrality rule cue; the GM authors any triggered fictional standing and enforcement response. Context records no violation or consequence.'},
  'environment:occult-crime-scene:contaminated-scene':{handler:'environment_contaminated_scene_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound trigger and +1 Veil Exposure cue when a first careless supernatural effect occurs here with mundane investigators present; context itself applies no delta.'},
  'environment:glass-market-grand-concourse:everyone-is-watching':{handler:'environment_everyone_is_watching_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound reaction cue for a PC public threat, promise or bargain; the GM authors at least one faction witness in fiction. Context creates no durable witness receipt or PC declaration.'},
  'environment:storm-drain-shrine:wrong-offering':{handler:'environment_wrong_offering_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound reaction cue for desecrating or carelessly removing an offering; the GM authors hostility until restitution. Context records no PC action, hostility or restitution.'},
  'environment:dead-platform:last-train-rules':{handler:'environment_last_train_rules_context',entry:'scene_context',fear:0,
    effect:'Exact source-bound platform departure requirements and +2 Difficulty when the GM judges a PC-authored statement to be a lie; no statement, lie, Difficulty, dice result or action is committed by context alone.'},
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
  if(feature.native_handler==='environment_chain_of_title_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_no_consensus_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_metaphor_physics_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_no_ordinary_signal_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_consensus_engine_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_guest_right_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_private_room_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_price_offer_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_auction_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_model_room_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_sealed_docket_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_three_vectors_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_market_neutrality_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_contaminated_scene_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_everyone_is_watching_context'&&(feature.type!=='Reaction'||feature.trigger_kind!=='on_scene_event'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_wrong_offering_context'&&(feature.type!=='Reaction'||feature.trigger_kind!=='on_scene_event'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_last_train_rules_context'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  return structuredClone(contract);
}
