/** Native validation of existing source-backed environment proposal contracts. */
export function createEnvironmentProposalContracts(contracts){
function environmentProposalContract(feature){
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
  if(feature.native_handler==='intrusion_trace_owner_payment'&&(feature.type!=='Passive'||feature.trigger_kind!=='passive'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='native_failed_action_trace_owner_choice'))return null;
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
  if(feature.native_handler==='environment_containment_shutters_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
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
  if(feature.native_handler==='environment_express_through_memory_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  if(feature.native_handler==='environment_third_rail_spirit_context'&&(feature.type!=='Action'||feature.trigger_kind!=='spotlight_action'
    ||feature.target_policy!=='none'||feature.roll_protocol!=='environment_scene_context'))return null;
  return structuredClone(contract);
}

return Object.freeze({environmentProposalContract});
}
