/** Native fictional upload countdown, one Fear cost and immutable causal action ancestry. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {featureCostPlan} from './feature-costs.js';
export function createEnvironmentCountdownRules({capabilities}){
const {inspectArbitrationOrigin,inspectNativeEnvironmentInstance,featureDisposition,nativeGmOpportunity,reservedCampaignFear,ordinaryActionProof,ordinaryPrerequisite,inspectEnvironmentSceneEffect,narrativeSourceVisible,currentScene,indexWorldEvent,inspectNativeEnvironmentRecording}=capabilities||{};
if([inspectArbitrationOrigin,inspectNativeEnvironmentInstance,featureDisposition,nativeGmOpportunity,reservedCampaignFear,ordinaryActionProof,ordinaryPrerequisite,inspectEnvironmentSceneEffect,narrativeSourceVisible,currentScene,indexWorldEvent,inspectNativeEnvironmentRecording].some(fn=>typeof fn!=='function'))throw new TypeError('Native countdown source capabilities required');
const FEATURE='environment:apartment-veil-breach:upload-in-progress';
const ISSUER='native:environment-countdown',KIND='native_environment_countdown',STEP='native_environment_countdown_step';
const SOURCE_HASH='d233c76e5b98987154cd821b871b0222594be042919cb8cc7377b0285a96c0a2';
const ref=v=>typeof v==='string'&&v.length>0&&v.length<=200;
function closed(p,keys){
  if(!p||Object.keys(p).sort().join()!==keys.split(',').sort().join())throw fail('environment_countdown_closed_input');
}
function featureFor(profile){
  const d=featureDisposition(FEATURE),f=d.feature;
  if(d.status!=='supported'||f.native_handler!=='upload_countdown'||f.source_hash!==SOURCE_HASH
    ||f.template_hash!==profile.data.template_hash)throw fail('environment_upload_exact_supported_source_handler_required');
  return f;
}
function nativeBoard(db,guild,origin,board){
  const o=inspectArbitrationOrigin(db,guild,origin);
  if(hash(board?.data.origin)!==hash(o.binding)||hash(db.getCityRecord(guild,board?.kind,board?.record_key)?.data)!==hash(board?.data))
    throw fail('environment_countdown_current_native_board_required');
  return o;
}
function source(db,guild,key){
  const e=db.getWorldEvent(guild,key);
  if(e?.status!=='active')throw fail('environment_countdown_source_retracted');
  return e;
}
function recordingCreator(db,guild,mutation,handout,creation){
  if(['human','human_gm'].includes(mutation?.actor_type))return true;
  if(mutation?.actor_type!=='ai_gm'||mutation.actor_id!=='native:environment-recording')return false;
  const key=handout.metadata?.native_recording?.receipt,user=db.getCharacter(handout.subject_character_id)?.owner_user_id;
  if(!key||!user)return false;
  const proof=inspectNativeEnvironmentRecording(db,guild,key,user);
  return proof.data.creation===creation.event_key&&hash(proof.data.handout)===hash(handout);
}
/** An actual saved clear video and its native handout creation mutation are required.
 * A proposal saying that a camera exists, or a bare event with matching prose, cannot start a clock.
 * recording metadata is an existing native artifact fact, not a boolean supplied to this executor.
 */
function recording(db,guild,id,scope,location,{snapshot=null}={}){
  const h=snapshot||db.getHandout(id),r=h?.metadata?.recording,e=r&&source(db,guild,r.source_event),m=e?.source_kind==='mutation'&&db.getMutation(guild,e.source_id);
  let after;try{after=JSON.parse(m?.after_json||'null');}catch{throw fail('environment_upload_recording_mutation_required');}
  // The recording source pins the artifact before the source_event back-reference was attached.
  const artifact=h&&{...h,metadata:{...h.metadata,recording:{...r,source_event:null}}};
  if(h?.guild_id!==guild||h.status!=='active'||h.kind!=='video'||h.location_key!==location
    ||r?.clarity!=='clear'||r.upload!=='pending'||!ref(r.destination)||!db.getSimulationEntity(guild,'location',r.destination)
    ||r.destination===location||e?.kind!=='native_recording_upload'||e.location_key!==location||e.details.handout_id!==id
    ||m?.mutation_type!=='establish_recording_upload'||m.actor_type!=='ai_gm'||m.actor_id!==ISSUER||m.source_layer!=='native_environment'||m.entity_key!==id
    ||hash(after)!==hash(artifact)||e.details.payload_hash!==hash(artifact)
    ||!narrativeSourceVisible(db,guild,e.event_key,scope)
    ||!(['public','party'].includes(h.visibility)||scope.mode==='private'&&h.visibility==='character'&&h.subject_character_id===scope.actorCharacterId))
    throw fail('environment_upload_actual_clear_local_pending_video_required');
  const creation=source(db,guild,e.details.creation_source),created=creation.source_kind==='mutation'&&db.getMutation(guild,creation.source_id);
  if(hash(creation)!==e.details.creation_hash||created?.mutation_type!=='handout'||!recordingCreator(db,guild,created,h,creation)
    ||created.entity_key!==id||hash(JSON.parse(created.after_json))!==hash(h))throw fail('environment_upload_actual_native_video_creation_required');
  if(hash(source(db,guild,e.details.input_source))!==e.details.input_hash)throw fail('environment_upload_registration_origin_changed');
  return {handout:h,source:e,destination:db.getSimulationEntity(guild,'location',r.destination)};
}
/** Registers an existing clear video artifact and its already-established pending upload.
 * Its actual native artifact creation mutation owns those facts; this adapter cannot create footage.
 */
function establishEnvironmentUploadRecording(db,guild,origin,board,input){
  closed(input,'environment,handout,creation_source');
  if(!Object.values(input).every(ref))throw fail('environment_upload_native_artifact_source_required');
  return db.transaction(()=>{
    const o=nativeBoard(db,guild,origin,board),profile=inspectNativeEnvironmentInstance(db,guild,input.environment,o.scope);
    featureFor(profile);
    const h=db.getHandout(input.handout),r=h?.metadata?.recording,creation=source(db,guild,input.creation_source),
      m=creation.source_kind==='mutation'&&db.getMutation(guild,creation.source_id),key=r?.source_event;
    if(h?.guild_id!==guild||h.status!=='active'||h.kind!=='video'||h.location_key!==o.binding.location
      ||r?.clarity!=='clear'||r.upload!=='pending'||!ref(r.destination)||!ref(key)||key===creation.event_key
      ||profile.data.location!==o.binding.location||m?.mutation_type!=='handout'||!recordingCreator(db,guild,m,h,creation)
      ||m.entity_key!==h.id||hash(JSON.parse(m.after_json))!==hash(h)||creation.location_key!==o.binding.location
      ||!narrativeSourceVisible(db,guild,creation.event_key,o.scope))throw fail('environment_upload_existing_native_clear_video_required');
    if(db.getWorldEvent(guild,key))return recording(db,guild,h.id,o.scope,o.binding.location).source;
    const artifact={...h,metadata:{...h.metadata,recording:{...r,source_event:null}}},
      mutation=db.recordMutation(guild,{sessionId:o.binding.session,actorType:'ai_gm',actorId:ISSUER,sourceLayer:'native_environment',
        mutationType:'establish_recording_upload',entityKey:h.id,visibility:'gm',after:artifact});
    const event=indexWorldEvent(db,guild,{key,kind:'native_recording_upload',title:'Existing recording and pending upload registered',
      source_kind:'mutation',source_id:mutation.id,session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location,
      visibility:h.visibility,subject_key:h.visibility==='character'?h.subject_character_id:null,
      details:{handout_id:h.id,payload_hash:hash(artifact),creation_source:creation.event_key,creation_hash:hash(creation),
        input_source:o.binding.source,input_hash:hash(source(db,guild,o.binding.source))}},ISSUER);
    recording(db,guild,h.id,o.scope,o.binding.location);return event;
  });
}
function write(db,guild,kind,key,data,inputSource){
  const mutation=db.recordMutation(guild,{sessionId:data.origin.session,actorType:'ai_gm',actorId:ISSUER,sourceLayer:'native_environment',
    mutationType:kind,entityKey:key,visibility:'gm',after:data}),event=indexWorldEvent(db,guild,{key:`${key}:source`,kind,
    source_kind:'mutation',source_id:mutation.id,title:'Source-bound fictional environmental countdown',session_id:data.origin.session,
    scene:data.origin.scene,location_key:data.origin.location,visibility:'gm',details:{input_source:inputSource,payload_hash:hash(data)}},ISSUER);
  return db.saveCityRecord(guild,{kind,key,status:'resolved',source_event:event.event_key,visibility:'gm',location_key:data.origin.location,data});
}
function inspectReceipt(db,guild,kind,key){
  const row=db.getCityRecord(guild,kind,key),d=row?.data,e=row&&source(db,guild,row.source_event),m=e?.source_kind==='mutation'&&db.getMutation(guild,e.source_id);
  if(row?.status!=='resolved'||row.visibility!=='gm'||row.subject_key||d?.version!==1||d.issuer!==ISSUER
    ||e.kind!==kind||e.visibility!=='gm'||e.subject_key||e.session_id!==d.origin.session||e.scene!==d.origin.scene
    ||e.location_key!==d.origin.location||row.location_key!==d.origin.location||e.details.payload_hash!==hash(d)
    ||m?.actor_type!=='ai_gm'||m.actor_id!==ISSUER||m.source_layer!=='native_environment'||m.mutation_type!==kind
    ||m.entity_key!==key||m.session_id!==d.origin.session||m.visibility!=='gm'||hash(JSON.parse(m.after_json))!==hash(d))
    throw fail('environment_countdown_native_receipt_ancestry');
  return {row,data:d,event:e};
}
const rootKey=(environment,handout)=>`environment-countdown:${hash([environment,handout])}`;
const headKey=key=>`${key}:head`;
const stepKey=(key,beat)=>`${key}:step:${hash([beat.kind,beat.ref])}`;
function setHead(db,guild,root,row){
  return db.saveCityRecord(guild,{kind:`${KIND}_head`,key:headKey(root.record_key),status:'active',visibility:'gm',
    location_key:root.data.origin.location,source_event:row.source_event,data:{root:root.record_key,step:row.record_key,step_hash:hash(row)}});
}
/** Printed cost is exactly 1 Fear. No timer, automatic ticking, PC state, or disclosure is created. */
function startEnvironmentUploadCountdown(db,guild,origin,board,input){
  closed(input,'version,feature_ref,environment,handout');
  if(input.version!==1||input.feature_ref!==FEATURE||![input.environment,input.handout].every(ref))throw fail('environment_upload_closed_start');
  return db.transaction(()=>{
    const o=nativeBoard(db,guild,origin,board),profile=inspectNativeEnvironmentInstance(db,guild,input.environment,o.scope),feature=featureFor(profile),
      key=rootKey(input.environment,input.handout),prior=db.getCityRecord(guild,KIND,key);
    if(prior){
      const saved=inspectEnvironmentCountdown(db,guild,key,o.scope,{current:true}).root;
      if(hash(input)!==saved.data.proposal_hash)throw fail('environment_upload_immutable_restart');return saved;
    }
    const actual=recording(db,guild,input.handout,o.scope,o.binding.location),opportunity=nativeGmOpportunity(db,guild,board);
    if(profile.data.location!==o.binding.location||opportunity.pre_roll_fear)throw fail('environment_upload_exact_local_spotlight_required');
    const before=db.getCampaign(guild).fear,cost=featureCostPlan(feature,{timing:'spotlight_action',additionalSpotlight:false,experience:false,
      fear:before-reservedCampaignFear(db,guild),stress:0,stressMax:0});
    if(cost.fear!==1||cost.npc_stress!==0||db.getClock(guild,key))throw fail('environment_upload_exact_cost_and_unused_clock_required');
    const data={version:1,issuer:ISSUER,origin:structuredClone(o.binding),origin_hash:hash(source(db,guild,o.binding.source)),scope:structuredClone(o.scope),
      environment:profile.record_key,environment_hash:hash(profile),feature:FEATURE,feature_hash:hash(feature),proposal:structuredClone(input),proposal_hash:hash(input),
      recording:actual.handout,recording_source:actual.source.event_key,recording_source_hash:hash(actual.source),destination:actual.destination,
      opportunity,cost,fear:{before,after:before-1,spent:1},clock:key,value:0,max:4,state:'pending',previous:null,
      authority:'Fictional upload progress only. No observation, knowledge, custody, publication, PC action or injury is authorized.'};
    db.changeFear(guild,-1);db.changeClock(guild,key,0,{label:'Upload in Progress',visibility:'gm',max:4});
    const root=write(db,guild,KIND,key,data,o.binding.source);setHead(db,guild,root,root);return root;
  });
}
const actionIdentity=a=>({actor:a.data.actor,owner:a.data.owner_user_id,principal:a.data.actor_principal_revision,
  start:a.data.start,end:a.data.end,source_hash:a.data.source_hash,type:a.data.type,operation:a.data.operation,target:a.data.target_key,
  source_span:a.data.source_span,accepted_scope:a.data.accepted_scope,world_source:a.data.world_source_event||null,
  framing:a.data.framing,source:a.source_event,scene:a.data.scene,session:a.data.session_id});
const requestMechanics=q=>q&&({key:q.record_key,source:q.source_event,subject:q.subject_key,visibility:q.visibility,status:q.status,
  kind:q.data.kind,session:q.data.session_id,scene:q.data.scene,character:q.data.character_id,owner:q.data.owner_user_id,
  input:q.data.input,breakdown:q.data.breakdown,roll:q.data.roll_id,result:q.data.result,outcome_review:q.data.outcome_review||null,
  tag:q.data.tag||null,helpers:q.data.helpers||[],experiences:q.data.experiences||[]});
const rollMechanics=(r,q)=>r&&({id:r.id,session:r.session_id,character:r.character_id,owner:r.discord_user_id,type:r.roll_type,
  request:r.payload.request,result:Object.fromEntries(Object.keys(q.data.result).map(k=>[k,r.payload[k]]))});
/** Called only while the authentic ordinary action/ruling/result is current. Its returned snapshot
 * is read-only ancestry, never an authority token; executors still call ordinaryActionProof themselves.
 */
function captureCountdownActionAncestry(db,guild,actionRef,scope){
  const proof=ordinaryActionProof(db,guild,actionRef,scope),r=ordinaryPrerequisite(db,guild,{},proof).receipt,
    ruling=db.getCityRecord(guild,'gm_action_ruling',`gm-ruling:${hash([actionRef,1])}`),
    request=r.data.request?db.getCityRecord(guild,'roll_request',r.data.request):null,
    roll=request?db.getSavedRoll(guild,request.data.roll_id):null,
    adjudications=r.data.outcome==='resolved_no_roll'?db.listCityRecords(guild,{kind:'native_adjudication',includeGM:true,limit:500})
      .filter(q=>q.status==='resolved'&&q.data.action_id===actionRef&&q.data.receipts?.includes(r.record_key)):[],
    operations=request?db.listCityRecords(guild,{kind:'roll_operation',includeGM:true,limit:500})
      .filter(op=>op.data.request===request.record_key&&['roll','help','experience','tag','participate','reroll'].includes(op.data.op)):[],
    data={version:1,action:structuredClone(proof.row),identity:actionIdentity(proof.row),source:structuredClone(proof.source),
      world:structuredClone(proof.world||null),owner:proof.principal.user,principal:proof.principal.revision,character:proof.pc.id,
      session:proof.scene.session_id,scene:proof.scene.key,location:proof.pc.data.location,receipt:r,ruling,request,roll,adjudications,operations};
  // Pin actual transitive world-source ancestry, including context_refs, native modifiers and their input sources.
  const events=new Map(),queue=[data];let nodes=0;
  while(queue.length){const v=queue.pop();if(++nodes>20000)throw fail('environment_upload_bounded_action_ancestry_required');
    if(typeof v==='string'){const e=db.getWorldEvent(guild,v);if(e&&!events.has(e.event_key)){
      if(e.status!=='active'||events.size>=128)throw fail('environment_upload_action_source_not_current');events.set(e.event_key,e);queue.push(e);
    }}else if(v&&typeof v==='object')queue.push(...Object.values(v));
  }
  return {...data,events:[...events.values()]};
}
/** Exact saved proofs only, so scene/session end never becomes permission or invalidates sound history. */
function inspectCountdownActionAncestry(db,guild,snapshot){
  const s=snapshot,a=s&&db.getCityRecord(guild,'typed_intent',s.action?.record_key),pc=s&&db.getCharacter(s.character);
  if(s?.version!==1||a?.status!=='resolved'||hash(actionIdentity(a))!==hash(s.identity)||hash(actionIdentity(s.action))!==hash(s.identity)
    ||pc?.guild_id!==guild||pc.owner_user_id!==s.owner||s.identity.owner!==s.owner||s.identity.principal!==s.principal
    ||s.identity.actor!==s.character||s.identity.scene!==s.scene||s.identity.session!==s.session||db.getSession(s.session)?.guild_id!==guild
    ||a.data.outcome_receipt!==s.receipt?.record_key||s.receipt.data.action_id!==a.record_key||s.receipt.source_event!==a.source_event
    ||hash(db.getCityRecord(guild,'action_outcome_receipt',s.receipt.record_key))!==hash(s.receipt)
    ||hash(db.getCityRecord(guild,'gm_action_ruling',s.ruling?.record_key))!==hash(s.ruling)
    ||s.ruling.data.location!==s.location||s.ruling.data.scene!==s.scene||s.ruling.data.session_id!==s.session
    ||!Array.isArray(s.events)||s.events.length>128||!s.events.some(e=>e.event_key===s.source?.event_key))
    throw fail('environment_upload_saved_action_ancestry_changed');
  if(s.source.kind!=='authored_turn'||s.source.details.author!==s.owner||s.source.details.character_id!==s.character
    ||s.source.details.principal_revision!==s.principal||s.source.details.raw_hash!==s.identity.source_hash
    ||typeof s.source.details.raw_text!=='string'||s.source.details.raw_text.slice(s.identity.start,s.identity.end)!==s.identity.source_span
    ||!db.ownerAuthoredSource(guild,s.source.event_key,s.owner))throw fail('environment_upload_saved_exact_owner_declaration_changed');
  for(const e of s.events)if(e.status!=='active'||hash(source(db,guild,e.event_key))!==hash(e))throw fail('environment_upload_saved_action_source_changed');
  if(hash(source(db,guild,s.source.event_key))!==hash(s.source)||s.world&&hash(source(db,guild,s.world.event_key))!==hash(s.world))
    throw fail('environment_upload_saved_authored_source_changed');
  if(s.request){
    if(hash(requestMechanics(db.getCityRecord(guild,'roll_request',s.request.record_key)))!==hash(requestMechanics(s.request))
      ||hash(rollMechanics(db.getSavedRoll(guild,s.roll?.id),s.request))!==hash(rollMechanics(s.roll,s.request))
      ||s.receipt.data.request!==s.request.record_key||s.request.data.input.accepted_intent!==a.record_key)
      throw fail('environment_upload_saved_native_roll_changed');
  }else if(s.receipt.data.outcome!=='resolved_no_roll'||!s.adjudications.length)throw fail('environment_upload_saved_no_roll_required');
  for(const q of s.adjudications)if(hash(db.getCityRecord(guild,'native_adjudication',q.record_key))!==hash(q))
    throw fail('environment_upload_saved_adjudication_changed');
  for(const op of s.operations||[])if(hash(db.getCityRecord(guild,'roll_operation',op.record_key))!==hash(op))
    throw fail('environment_upload_saved_owner_roll_operation_changed');
  return snapshot;
}
function actionBeat(db,guild,accepted,prerequisite,scope){
  const ancestry=captureCountdownActionAncestry(db,guild,accepted,scope),proof={row:ancestry.action,source:ancestry.source},result=ancestry.receipt;
  if(result.record_key!==prerequisite)throw fail('environment_upload_exact_prerequisite_required');
  return {kind:'owner_action',ref:result.record_key,action:accepted,action_source:proof.row.source_event,source_hash:hash(proof.source),
    action_hash:hash(actionIdentity(proof.row)),receipt_hash:hash(result),ancestry,
    owner:ancestry.owner,character:ancestry.character,principal:ancestry.principal,outcome:result.data.outcome,
    target:proof.row.data.target_key,operation:proof.row.data.operation,location:ancestry.location,scene:ancestry.scene,session:ancestry.session};
}
function sceneBeat(db,guild,ref,scope){
  const row=inspectEnvironmentSceneEffect(db,guild,ref,scope),d=row.data;
  return {kind:'scene_effect',ref,row_hash:hash(row),source:row.source_event,source_hash:hash(source(db,guild,row.source_event)),
    location:d.origin.location,scene:d.origin.scene,session:d.origin.session};
}
function contextualRuling(value){if(typeof value!=='string'||!value.trim()||value.length>600)throw fail('environment_upload_contextual_beat_ruling_required');}
/** GM selects one actual native fictional occurrence and declares its contextual single-step relevance.
 * This does not define a universal cadence. Simulation ticks, elapsed seconds and model booleans have no route.
 */
function advanceEnvironmentUploadCountdown(db,guild,origin,board,input){
  closed(input,'countdown,beat_kind,beat_ref,accepted_intent,ruling');contextualRuling(input.ruling);
  if(!ref(input.countdown)||!ref(input.beat_ref)||!['scene_effect','owner_action'].includes(input.beat_kind)
    ||input.beat_kind==='scene_effect'&&input.accepted_intent!==''||input.beat_kind==='owner_action'&&!ref(input.accepted_intent))
    throw fail('environment_upload_actual_native_beat_required');
  return db.transaction(()=>{
    const o=nativeBoard(db,guild,origin,board),state=inspectEnvironmentCountdown(db,guild,input.countdown,o.scope,{current:true}),
      beat=input.beat_kind==='scene_effect'?sceneBeat(db,guild,input.beat_ref,o.scope):actionBeat(db,guild,input.accepted_intent,input.beat_ref,o.scope);
    return transition(db,guild,state,o,beat,'advance',input.ruling,null);
  });
}
/** The accepted typed owner intent selects tick-back or redirect; a GM proposal cannot select it for them. */
function adjustEnvironmentUploadCountdown(db,guild,origin,board,input){
  closed(input,'countdown,accepted_intent,prerequisite,ruling');contextualRuling(input.ruling);
  if(![input.countdown,input.accepted_intent,input.prerequisite].every(ref))throw fail('environment_upload_exact_owner_result_required');
  return db.transaction(()=>{
    const o=nativeBoard(db,guild,origin,board),state=inspectEnvironmentCountdown(db,guild,input.countdown,o.scope,{current:true}),
      beat=actionBeat(db,guild,input.accepted_intent,input.prerequisite,o.scope),action=db.getCityRecord(guild,'typed_intent',input.accepted_intent),
      mode=beat.operation==='tick_back_upload'?'tick_back':beat.operation==='redirect_upload'?'redirect':null;
    if(!mode||action.data.type!=='interact'||beat.target!==state.root.data.recording.id||beat.owner!==o.scope.actorUserId
      ||beat.character!==o.scope.actorCharacterId||!['success','resolved_no_roll'].includes(beat.outcome))
      throw fail('environment_upload_successful_relevant_owner_choice_required');
    // Redirect means diverting this upload away from the existing external route. It does not
    // choose a new recipient or transfer evidence; a subsequent transfer needs its own adapter.
    return transition(db,guild,state,o,beat,mode,input.ruling,action.record_key);
  });
}
function transition(db,guild,state,o,beat,mode,ruling,ownerAction){
  const root=state.root,d=root.data,key=stepKey(root.record_key,beat),prior=db.getCityRecord(guild,STEP,key);
  if(prior){
    if(hash(prior.data.beat)!==hash(beat)||prior.data.mode!==mode||prior.data.ruling!==ruling)throw fail('environment_upload_occurrence_already_consumed');
    return prior;
  }
  if(state.state!=='pending'||beat.location!==d.origin.location||beat.scene!==d.origin.scene||beat.session!==d.origin.session
    ||o.binding.location!==d.origin.location||o.binding.scene!==d.origin.scene||o.binding.session!==d.origin.session
    ||state.history.length>=256)throw fail('environment_upload_current_unfinished_bounded_occurrence_required');
  // One actual source occurrence cannot be renamed to obtain a second fictional beat.
  const occurrence=beat.kind==='scene_effect'?beat.source:beat.action_source;
  if(state.history.some(r=>(r.data.beat.kind==='scene_effect'?r.data.beat.source:r.data.beat.action_source)===occurrence))
    throw fail('environment_upload_native_source_occurrence_already_consumed');
  const beatSource=beat.kind==='scene_effect'?beat.source:beat.action_source;
  if(db.worldEventSequence(guild,beatSource)<=db.worldEventSequence(guild,root.source_event))
    throw fail('environment_upload_beat_must_follow_countdown_start');
  const clock=db.getClock(guild,d.clock),next=mode==='advance'?state.value+1:mode==='tick_back'?Math.max(0,state.value-1):state.value;
  if(clock?.value!==state.value||clock.max_value!==4||clock.visibility!=='gm')throw fail('environment_upload_clock_compare_and_swap');
  const data={version:1,issuer:ISSUER,root:root.record_key,origin:structuredClone(o.binding),origin_hash:hash(source(db,guild,o.binding.source)),
    scope:structuredClone(o.scope),previous:state.head.record_key,previous_hash:hash(state.head),beat,mode,ruling,owner_action:ownerAction,
    before:state.value,value:next,max:4,state:mode==='redirect'?'redirected':next===4?'left_building':'pending'};
  db.changeClock(guild,d.clock,next-state.value,{visibility:'gm'});
  const row=write(db,guild,STEP,key,data,o.binding.source);setHead(db,guild,root,row);return row;
}
/** Rebuild immutable ancestry after restart. Retraction holds readback; no refund, rewind or repeat execution. */
function inspectEnvironmentCountdown(db,guild,key,scope,{current=false}={}){
  const {row:root,data:d,event}=inspectReceipt(db,guild,KIND,key);
  if(key!==rootKey(d.environment,d.recording?.id)||hash(d.scope)!==hash(scope)||d.feature!==FEATURE||hash(d.proposal)!==d.proposal_hash
    ||event.details.input_source!==d.origin.source||hash(source(db,guild,d.origin.source))!==d.origin_hash
    ||d.value!==0||d.max!==4||d.previous!==null||d.state!=='pending'||d.fear.spent!==1||d.cost.fear!==1||d.cost.npc_stress!==0
    ||!Number.isSafeInteger(d.fear.before)||d.fear.before<1||d.fear.before>12||d.fear.after!==d.fear.before-1)
    throw fail('environment_upload_original_terms_changed');
  const profile=inspectNativeEnvironmentInstance(db,guild,d.environment,scope,{historical:!current}),f=featureFor(profile),
    recorded=recording(db,guild,d.recording.id,scope,d.origin.location,{snapshot:d.recording});
  if(hash(profile)!==d.environment_hash||hash(f)!==d.feature_hash||hash(recorded.source)!==d.recording_source_hash
    ||recorded.source.event_key!==d.recording_source||current&&hash(recorded.destination)!==hash(d.destination))throw fail('environment_upload_original_sources_changed');
  if(current&&hash(db.getHandout(d.recording.id))!==hash(d.recording))throw fail('environment_upload_current_recording_changed');
  const headRecord=db.getCityRecord(guild,`${KIND}_head`,headKey(key));
  if(headRecord?.status!=='active'||headRecord.visibility!=='gm'||headRecord.subject_key||headRecord.data.root!==key)
    throw fail('environment_upload_native_head_required');
  let cursor=headRecord.data.step,history=[],seen=new Set();
  while(cursor!==key){
    if(seen.has(cursor)||history.length>=256)throw fail('environment_upload_bounded_history_required');seen.add(cursor);
    const receipt=inspectReceipt(db,guild,STEP,cursor),s=receipt.data;
    if(s.root!==key||hash(s.scope)!==hash(scope)||cursor!==stepKey(key,s.beat)||!['advance','tick_back','redirect'].includes(s.mode)
      ||!['scene_effect','owner_action'].includes(s.beat?.kind)
      ||receipt.event.details.input_source!==s.origin.source||hash(source(db,guild,s.origin.source))!==s.origin_hash
      ||s.origin.scene!==d.origin.scene||s.origin.session!==d.origin.session||s.origin.location!==d.origin.location
      ||s.beat.scene!==d.origin.scene||s.beat.session!==d.origin.session||s.beat.location!==d.origin.location)
      throw fail('environment_upload_step_source_changed');
    contextualRuling(s.ruling);
    const actual=s.beat.kind==='scene_effect'?sceneBeat(db,guild,s.beat.ref,scope):s.beat;
    if(s.beat.kind==='owner_action'){
      const a=inspectCountdownActionAncestry(db,guild,s.beat.ancestry);
      if(s.beat.ref!==a.receipt.record_key||s.beat.action!==a.action.record_key||s.beat.action_source!==a.source.event_key
        ||s.beat.action_hash!==hash(a.identity)||s.beat.receipt_hash!==hash(a.receipt)||s.beat.source_hash!==hash(a.source)
        ||s.beat.outcome!==a.receipt.data.outcome||s.beat.target!==a.identity.target||s.beat.operation!==a.identity.operation
        ||s.beat.owner!==a.owner||s.beat.character!==a.character||s.beat.principal!==a.principal||s.beat.location!==a.location
        ||s.beat.scene!==a.scene||s.beat.session!==a.session)throw fail('environment_upload_saved_beat_identity_changed');
    }
    if(db.worldEventSequence(guild,s.beat.kind==='scene_effect'?s.beat.source:s.beat.action_source)<=db.worldEventSequence(guild,root.source_event))
      throw fail('environment_upload_original_beat_precedes_start');
    if(hash(actual)!==hash(s.beat)||s.mode!=='advance'&&(s.beat.kind!=='owner_action'||s.owner_action!==s.beat.action
      ||!['success','resolved_no_roll'].includes(s.beat.outcome)||s.beat.target!==d.recording.id
      ||s.beat.character!==scope.actorCharacterId||s.beat.owner!==scope.actorUserId
      ||s.beat.operation!==(s.mode==='tick_back'?'tick_back_upload':'redirect_upload')))
      throw fail('environment_upload_original_native_beat_or_owner_result_changed');
    history.unshift(receipt.row);cursor=s.previous;
  }
  // A pointer rollback cannot hide committed history and make an old native occurrence available again.
  const saved=[];
  for(let offset=0;;offset+=100){const page=db.listCityRecords(guild,{kind:STEP,includeGM:true,limit:100,offset});
    saved.push(...page.filter(r=>r.data.root===key));if(page.length<100)break;}
  if(saved.length!==history.length||saved.some(r=>!seen.has(r.record_key)))throw fail('environment_upload_committed_history_cannot_be_truncated');
  let prior=root,value=0,status='pending';const occurrences=new Set();
  for(const row of history){const s=row.data,next=s.mode==='advance'?value+1:s.mode==='tick_back'?Math.max(0,value-1):value;
    const occurrence=s.beat.kind==='scene_effect'?s.beat.source:s.beat.action_source;
    if(status!=='pending'||s.previous!==prior.record_key||s.previous_hash!==hash(prior)||s.before!==value||s.value!==next||s.max!==4
      ||occurrences.has(occurrence)||s.state!==(s.mode==='redirect'?'redirected':next===4?'left_building':'pending'))throw fail('environment_upload_history_arithmetic_changed');
    occurrences.add(occurrence);prior=row;value=next;status=s.state;
  }
  if(headRecord.data.step_hash!==hash(prior)||headRecord.source_event!==prior.source_event)throw fail('environment_upload_head_history_changed');
  if(current){const c=db.getClock(guild,d.clock),scene=currentScene(db,guild);
    if(c?.value!==value||c.max_value!==4||c.visibility!=='gm'||scene.key!==d.origin.scene||scene.session_id!==d.origin.session)
      throw fail('environment_upload_current_clock_or_scene_changed');}
  return {root,head:prior,history,value,max:4,state:status};
}
/** Entitled status only. Clear footage contents, recipients, recording identities and private ancestry stay private. */
function environmentCountdownProjection(db,guild,key,scope){
  const s=inspectEnvironmentCountdown(db,guild,key,scope,{current:true}),d=s.root.data;
  if(!narrativeSourceVisible(db,guild,d.recording_source,scope))throw fail('environment_upload_observation_not_entitled');
  return {text:s.state==='redirected'?'The upload has been redirected away from its external route.'
    :s.state==='left_building'?'The upload countdown completes; the existing clear footage has left the building.'
      :`Upload in Progress: ${s.value} of 4 fictional steps completed.`,source:db.getWorldEvent(guild,s.head.source_event),
    revision:hash([s.root,s.head]),authority:'Status only; no recipient knowledge or PC response is inferred.'};
}
/** Current consumers join the real artifact to its exact environment countdown, not metadata guesses. */
function environmentUploadState(db,guild,environment,handout,scope){
  const key=rootKey(environment,handout);
  if(!db.getCityRecord(guild,KIND,key))return null;
  const s=inspectEnvironmentCountdown(db,guild,key,scope,{current:true});
  return {recording:handout,countdown:key,value:s.value,max:s.max,state:s.state,receipt:s.head.record_key,
    footage_left_building:s.state==='left_building',redirected_away:s.state==='redirected',knowledge_authorized:false};
}
/** Internal implementation gap, not absent owner policy: no exact completed-exchange/exit consumer is installed here. */
function closingTimeMovesReadiness(){return {feature:'environment:abandoned-mall-glass-market:closing-time-moves',status:'held',
  reason:'INTERNAL_IMPLEMENTATION_REQUIRED: source-bound completed meaningful-exchange producer, established alternate-exit receipts and current/saved route consumers.',
  fear_spent:0,pc_relocation_authorized:false};}

return Object.freeze({establishEnvironmentUploadRecording,startEnvironmentUploadCountdown,captureCountdownActionAncestry,inspectCountdownActionAncestry,advanceEnvironmentUploadCountdown,adjustEnvironmentUploadCountdown,inspectEnvironmentCountdown,environmentCountdownProjection,environmentUploadState,closingTimeMovesReadiness});
}
