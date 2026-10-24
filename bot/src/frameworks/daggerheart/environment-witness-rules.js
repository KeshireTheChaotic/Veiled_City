/** Existing source-bound attributed witness testimony policy; no truth, knowledge or PC-state minting. */
export function createEnvironmentWitnessRules({capabilities}){
const {inspectArbitrationOrigin,inspectNativeEnvironmentInstance,featureDisposition,nativeGmOpportunity,renderNarrativeUnit,actorReferenceVisible,activeCityProxy,assertNpcAvailability,nativeActorControl,scenePresence,currentScene,objectiveEvidence,evidenceType,nativeEstablishedFact,hash,narrativeSourceVisible,assertEnvironmentAudience,indexWorldEvent,fail}=capabilities||{};
if([inspectArbitrationOrigin,inspectNativeEnvironmentInstance,featureDisposition,nativeGmOpportunity,renderNarrativeUnit,actorReferenceVisible,activeCityProxy,assertNpcAvailability,nativeActorControl,scenePresence,currentScene,objectiveEvidence,evidenceType,nativeEstablishedFact,hash,narrativeSourceVisible,assertEnvironmentAudience,indexWorldEvent,fail].some(fn=>typeof fn!=='function'))throw new TypeError('Native witness capabilities required');
const issuer='native:environment-witnesses',featureKey='environment:haunted-nightclub:everybody-saw-something-different';
const kind='native_environment_witness_accounts';
const keyFor=d=>`environment-witnesses:${hash([d.origin.source,d.scope,d.environment,d.feature])}`;
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys;
const ref=v=>typeof v==='string'&&v.length>0&&v.length<=200;
function feature(){
  const d=featureDisposition(featureKey);
  if(d.status!=='supported'||d.feature?.native_handler!=='nightclub_inconsistent_witnesses')
    throw fail('environment_witness_feature_not_qualified');
  return d.feature;
}
function shape(p){
  if(!exact(p,'accounts,environment,feature_ref,inconsistency,incident_ref,version')||p.version!==1
    ||p.feature_ref!==featureKey||!ref(p.environment)||!ref(p.incident_ref)||!Array.isArray(p.accounts)||p.accounts.length!==3
    ||p.accounts.some(a=>!exact(a,'evidence_ref,npc,truth_ref,unit_ref')||Object.values(a).some(v=>!ref(v)))
    ||new Set(p.accounts.map(a=>a.npc)).size!==3||new Set(p.accounts.map(a=>a.unit_ref)).size!==3
    ||!Array.isArray(p.inconsistency)||p.inconsistency.length!==3
    ||p.inconsistency.some((pair,i)=>!exact(pair,'left,right')||!ref(pair.left)||!ref(pair.right)||pair.left===pair.right))
    throw fail('environment_witness_closed_three_account_proposal');
}
/** Only the existing authenticated GM establishment receipt promotes a fact. No legacy/model certainty. */
function established(db,guild,id,scope){
  nativeEstablishedFact(db,guild,id,scope);
  const f=db.getFact(guild,id),e=f&&evidenceType(f),r=e?.source_refs?.length===1&&db.getWorldEvent(guild,e.source_refs[0]);
  if(!objectiveEvidence(db,guild,f)||e.kind!=='established'||!r||r.status!=='active'||r.kind!=='gm_fact_ruling'
    ||!r.details.reviewed_by||r.source_id!==r.details.reviewed_by||r.details.fact_id!==id
    ||e.perspective!==`gm:${r.details.reviewed_by}`||!narrativeSourceVisible(db,guild,id,scope)
    ||!narrativeSourceVisible(db,guild,r.event_key,scope)||typeof f.content!=='string'||!f.content.trim())
    throw fail('environment_witness_authenticated_established_fact_required');
  return {fact:f,ruling:r};
}
function incident(db,guild,id,scope,origin){
  const proof=established(db,guild,id,scope),r=proof.ruling;
  // The GM-established category is the classification, not a supernatural:true model field.
  // establishFact's ruling has no scene binding. The fact must cite a separate local
  // committed event as prior evidence; a template or this action's own origin is insufficient.
  const prior=evidenceType(proof.fact).prior,events=prior?.source_refs?.map(k=>db.getWorldEvent(guild,k))||[];
  if(proof.fact.category!=='supernatural_incident'||!events.length||!events.some(s=>s?.status==='active'
    &&s.session_id===origin.session&&s.scene===origin.scene&&s.location_key===origin.location
    &&s.event_key!==origin.source&&narrativeSourceVisible(db,guild,s.event_key,scope)))
    throw fail('environment_witness_local_established_supernatural_incident_required');
  return {...proof,events};
}
function account(db,guild,a,scope,origin,{current=true}={}){
  const u=db.getCityRecord(guild,'narrative_unit',a.unit_ref),d=u?.data,s=u&&db.getWorldEvent(guild,u.source_event),
    truth=established(db,guild,a.truth_ref,scope),e=db.getWorldEvent(guild,a.evidence_ref);
  if(u?.status!=='accepted_established'||d?.issuer!=='native:narrative-authority'||d.unit?.kind!=='npc_speech'
    ||d.unit.subject_key!==a.npc||d.epistemic!=='attributed'||d.semantic_verification!==false
    ||a.unit_ref!==`narrative-unit:${hash([d.binding,d.unit])}`||s?.status!=='active'||s.kind!=='native_narrative_unit'
    ||s.source_id!=='native:narrative-authority'||s.details.payload_hash!==hash(d)
    ||hash(d.binding.scope)!==hash(scope)||d.binding.session!==origin.session||d.binding.scene!==origin.scene
    ||d.binding.location!==origin.location||!d.unit.source_refs.includes(a.evidence_ref)
    // The certified detail is a complete leading sentence, never a substring
    // under denial ("not ...") or an alleged PC reaction buried in the account.
    ||!/[.!?]$/.test(truth.fact.content)||typeof d.unit.text!=='string'
    ||!(d.unit.text===truth.fact.content||d.unit.text.startsWith(`${truth.fact.content} `))
    ||!e||e.status!=='active'||!narrativeSourceVisible(db,guild,u.source_event,scope))
    throw fail('environment_witness_native_speech_and_true_detail_required');
  if(current){
    const p=scenePresence(db,guild,'npc',a.npc),entity=db.getSimulationEntity(guild,'npc',a.npc),
      knowledge=db.listNpcKnowledge(guild,a.npc,{limit:200}).find(k=>k.source_ref===a.evidence_ref&&k.belief_state==='known'
        &&!k.is_secret&&k.content===truth.fact.content);
    if(db.getCharacter(a.npc)||activeCityProxy(db,guild,a.npc)||nativeActorControl(db,guild,'npc',a.npc).owner_control_type!=='ai_world'
      ||!entity||entity.state.hidden||entity.state.removed||entity.state.location_key!==origin.location
      ||p?.data.state!=='actually_present'||p.location_key!==origin.location||p.data.scene!==origin.scene
      ||!narrativeSourceVisible(db,guild,p.source_event,scope)||!knowledge||!actorReferenceVisible(db,guild,a.npc,a.evidence_ref,scope))
      throw fail('environment_witness_actual_local_nonproxy_actor_and_own_evidence_required');
    assertNpcAvailability(db,guild,a.npc,{type:'contact',location_key:origin.location});
    const text=renderNarrativeUnit(db,guild,a.unit_ref,scope);
    if(text!==d.text)throw fail('environment_witness_speech_reader_changed');
  }
  return {proposal:a,unit:u,source:s,evidence:e,truth,text:d.text};
}
function comparison(p,accounts){
  // Pairwise inconsistency is the sealed GM's contextual judgment, not a logical
  // truth claim. Quote anchors constrain it to the three actual attributed accounts.
  for(const [i,[left,right]] of [[0,1],[0,2],[1,2]].entries()){
    const pair=p.inconsistency[i];
    if(!accounts[left].unit.data.unit.text.includes(pair.left)||!accounts[right].unit.data.unit.text.includes(pair.right))
      throw fail('environment_witness_pairwise_judgment_requires_exact_account_anchors');
  }
  return {epistemic:'gm_contextual_judgment',pairs:structuredClone(p.inconsistency),truth_promotion:false};
}
/** Execute only from the registered sealed GM origin and its persisted actual board. */
function applyEnvironmentWitnessAccounts(db,guild,origin,board,input){
  shape(input);const o=inspectArbitrationOrigin(db,guild,origin),f=feature(),
    profile=inspectNativeEnvironmentInstance(db,guild,input.environment,o.scope),
    actual=board?.kind==='scene_intent_board'&&db.getCityRecord(guild,board.kind,board.record_key),
    source=actual&&db.getWorldEvent(guild,actual.source_event);
  if(!actual||hash(actual)!==hash(board)||hash(actual.data.origin)!==hash(o.binding)||source?.status!=='active'
    ||source.kind!=='native_scene_intent_board'||source.source_id!=='native:unified-gm'||source.details.payload_hash!==hash(actual.data)
    ||profile.data.template_hash!==f.template_hash||profile.data.location!==o.binding.location)
    throw fail('environment_witness_exact_native_board_profile_required');
  const base={origin:o.binding,scope:structuredClone(o.scope),environment:profile.record_key,feature:featureKey},key=keyFor(base),
    prior=db.getCityRecord(guild,kind,key);
  if(prior){const row=inspectEnvironmentWitnessAccounts(db,guild,key,o.scope,{current:true});
    if(hash(input)!==row.data.proposal_hash)throw fail('environment_witness_immutable_replay');return row;}
  const opportunity=nativeGmOpportunity(db,guild,actual);
  if(opportunity.pre_roll_fear)throw fail('environment_witness_not_pre_roll_purchase');
  const incidentProof=incident(db,guild,input.incident_ref,o.scope,o.binding),
    accounts=input.accounts.map(a=>account(db,guild,a,o.scope,o.binding)),judgment=comparison(input,accounts),
    visibility=o.scope.mode==='private'?'character':'party',subject=o.scope.mode==='private'?o.scope.actorCharacterId:null,
    data={version:1,issuer,...base,feature_hash:hash(f),environment_hash:hash(profile),board:actual.record_key,board_hash:hash(actual),
      proposal:structuredClone(input),proposal_hash:hash(input),incident:incidentProof,accounts,judgment,opportunity,visibility,subject,
      cost:{fear:0,npc_stress:0},authority:'Attributed NPC testimony only; true details retain independent GM-established sources. No PC state or knowledge effect.'};
  return db.transaction(()=>{
    const mutation=db.recordMutation(guild,{sessionId:o.binding.session,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_environment',
      mutationType:'commit_inconsistent_witness_accounts',entityKey:key,visibility,after:data}),
      event=indexWorldEvent(db,guild,{key:`${key}:source`,kind,source_kind:'mutation',source_id:mutation.id,
        title:'Three attributed local witness accounts',session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,
        visibility,subject_key:subject,details:{input_source:o.binding.source,payload_hash:hash(data)}},issuer);
    return db.saveCityRecord(guild,{kind,key,status:'resolved',visibility,subject_key:subject,location_key:o.binding.location,source_event:event.event_key,data});
  });
}
/** Default is a historical receipt reader. It cannot publish or authorize another effect. */
function inspectEnvironmentWitnessAccounts(db,guild,key,scope,{current=false}={}){
  const row=db.getCityRecord(guild,kind,key),d=row?.data,s=row&&db.getWorldEvent(guild,row.source_event),m=s&&db.getMutation(guild,s.source_id);
  if(row?.status!=='resolved'||d?.version!==1||d.issuer!==issuer||key!==keyFor(d)||row.visibility!==d.visibility
    ||(row.subject_key||null)!==d.subject||row.location_key!==d.origin.location
    ||d.visibility!==(d.scope.mode==='private'?'character':'party')||d.subject!==(d.scope.mode==='private'?d.scope.actorCharacterId:null)
    ||s?.status!=='active'||s.kind!==kind||s.source_kind!=='mutation'||s.details.payload_hash!==hash(d)||s.details.input_source!==d.origin.source
    ||s.session_id!==d.origin.session||s.scene!==d.origin.scene||s.location_key!==d.origin.location||s.visibility!==d.visibility
    ||(s.subject_key||null)!==d.subject||m?.actor_type!=='ai_gm'||m.actor_id!==issuer||m.source_layer!=='native_environment'
    ||m.mutation_type!=='commit_inconsistent_witness_accounts'||m.entity_key!==key||m.visibility!==d.visibility
    ||m.session_id!==d.origin.session||hash(JSON.parse(m.after_json))!==hash(d)||hash(d.proposal)!==d.proposal_hash)
    throw fail('environment_witness_saved_native_ancestry');
  shape(d.proposal);assertEnvironmentAudience(db,guild,d.scope,scope,d.origin,{current});
  const f=feature(),profile=inspectNativeEnvironmentInstance(db,guild,d.environment,d.scope,{historical:true}),
    board=db.getCityRecord(guild,'scene_intent_board',d.board),boardSource=board&&db.getWorldEvent(guild,board.source_event);
  if(hash(f)!==d.feature_hash||hash(profile)!==d.environment_hash||profile.data.template_hash!==f.template_hash
    ||profile.data.scene!==d.origin.scene||profile.data.session!==d.origin.session||profile.data.location!==d.origin.location
    ||hash(board)!==d.board_hash||hash(board.data.origin)!==hash(d.origin)||boardSource?.status!=='active'
    ||boardSource.kind!=='native_scene_intent_board'||boardSource.source_id!=='native:unified-gm'||boardSource.details.payload_hash!==hash(board.data)
    ||d.proposal.environment!==d.environment||d.proposal.feature_ref!==d.feature||hash(d.cost)!==hash({fear:0,npc_stress:0})
    ||hash(incident(db,guild,d.proposal.incident_ref,d.scope,d.origin))!==hash(d.incident))
    throw fail('environment_witness_original_sources_changed');
  const accounts=d.proposal.accounts.map(a=>account(db,guild,a,d.scope,d.origin,{current}));
  if(hash(accounts)!==hash(d.accounts)||hash(comparison(d.proposal,accounts))!==hash(d.judgment))
    throw fail('environment_witness_testimony_or_truth_sources_changed');
  if(current){
    const scene=currentScene(db,guild),flags=db.getCityCalendar(guild).flags;
    if(scene.session_id!==d.origin.session||scene.key!==d.origin.scene||flags.gm_discretion!==true
      ||flags.narrative_authority!==true||flags.playable_narration!==true
      ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual')throw fail('environment_witness_current_authority_changed');
  }
  return row;
}
function environmentWitnessAccountsProjection(db,guild,key,scope){
  const row=inspectEnvironmentWitnessAccounts(db,guild,key,scope,{current:true}),d=row.data;
  // Re-read for the original audience. A recipient change must also have every
  // source independently visible; it never relabels a private speech unit.
  if(d.accounts.some(a=>!narrativeSourceVisible(db,guild,a.unit.source_event,scope)
    ||!narrativeSourceVisible(db,guild,a.proposal.truth_ref,scope)))throw fail('environment_witness_output_source_visibility');
  return {text:'Three witnesses give conflicting accounts (each account is attributed testimony):\n'+d.accounts.map(a=>a.text).join('\n'),
    source:db.getWorldEvent(guild,row.source_event),revision:hash(row)};
}

return Object.freeze({applyEnvironmentWitnessAccounts,inspectEnvironmentWitnessAccounts,environmentWitnessAccountsProjection});
}
