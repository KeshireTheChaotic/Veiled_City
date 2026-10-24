/** Native pre-roll Fear policy; explicit source/publication ports, unchanged receipts and owner choices. */
import {fearReservationHash as hash,fearReservationFailure as fail,inspectFearReservation,reservedCampaignFear} from './fear-reservation-proof.js';
export function createPreRollFearRules({sources,mechanics,publication,writeFearReservation}){
const {inspectArbitrationOrigin,consentAction,historicalActionSource,conversationPrincipal,currentScene,narrativeSourceVisible}=sources||{};
const {incomingAttackEvidence,incomingRollProjection,assertPreRollFearDeathTerminal,inspectPvpAttackRequest,inspectUnrolledInterruptRequest,validatePcDeathOutcome}=mechanics||{};
const {revalidateOutputPublication}=publication||{};
if([inspectArbitrationOrigin,consentAction,historicalActionSource,conversationPrincipal,currentScene,narrativeSourceVisible,incomingAttackEvidence,incomingRollProjection,assertPreRollFearDeathTerminal,inspectPvpAttackRequest,inspectUnrolledInterruptRequest,validatePcDeathOutcome,revalidateOutputPublication,writeFearReservation].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native Fear capabilities required.');
function interruptedRequest(db,guild,key,{historical=false,kind=null}={}){
  const ordinary=kind!=='pvp_attack_request'&&db.getCityRecord(guild,'roll_request',key);
  if(ordinary)return {request:ordinary,owner:ordinary.data.owner_user_id,character:ordinary.subject_key,
    accepted:ordinary.data.input?.accepted_intent,source:ordinary.source_event,kind:'roll_request',
    unrolled:historical?false:inspectUnrolledInterruptRequest(db,guild,ordinary)};
  const pvp=db.getCityRecord(guild,'pvp_attack_request',key);if(!pvp||kind&&kind!=='pvp_attack_request')return null;
  const proof=inspectPvpAttackRequest(db,guild,key,{historical});
  return {...proof,accepted:proof.accepted.record_key,source:proof.accepted.source_event,kind:'pvp_attack_request',
    unrolled:pvp.status==='ready'&&!pvp.data.roll};
}

function reservePreRollFear(db,guild,origin,board,input,proposal){
  const o=inspectArbitrationOrigin(db,guild,origin),entry=board.data.entries.find(e=>e.intent_ref===input.npc_intent_ref),
    interrupted=interruptedRequest(db,guild,input.request_ref),request=interrupted?.request,pc=interrupted&&db.getCharacter(interrupted.character);
  if(!entry||entry.actor.type!=='npc'||entry.operation!=='attack'||entry.dependencies.length||entry.target_refs.length!==1
    ||entry.target_refs[0]!==pc?.id||!interrupted?.unrolled||!interrupted.accepted
    ||(interrupted.kind==='pvp_attack_request'?(interrupted.scene!==o.binding.scene||interrupted.session!==o.binding.session)
      :request.data.scene!==o.binding.scene||request.data.session_id!==o.binding.session)||hash(board.data.origin)!==hash(o.binding)
    ||proposal?.intent_ref!==entry.intent_ref||proposal.disposition!=='gm_attack_roll'||proposal.feature_ref!=='standard_attack'
    ||proposal.experience_ref||proposal.advantage||proposal.disadvantage||proposal.proposal_version!==undefined)
    throw fail('one exact native standard attack against the pending action owner required');
  const {row:accepted,principal}=consentAction(db,guild,interrupted.accepted);
  if(pc.guild_id!==guild||pc.owner_user_id!==interrupted.owner||principal.kind!=='owner'
    ||accepted.source_event!==interrupted.source||accepted.data.actor!==pc.id||pc.data.location!==o.binding.location
    ||!narrativeSourceVisible(db,guild,interrupted.source,o.scope)
    ||o.scope.mode==='private'&&(o.scope.actorUserId!==pc.owner_user_id||o.scope.actorCharacterId!==pc.id))throw fail('current source, owner, scene and audience required');
  const key=`pre-roll-fear:${request.record_key}`,binding={version:1,request:request.record_key,request_revision:hash(request),
    ...(interrupted.kind==='pvp_attack_request'?{request_kind:interrupted.kind}:{}),
    owner:pc.owner_user_id,character:pc.id,principal_revision:conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision,
    session:o.binding.session,scene:o.binding.scene,scope:o.scope,npc:entry.actor.key,entry_ref:entry.intent_ref,entry_hash:hash(entry),
    board:board.record_key,origin:o.binding,base_cost:1,printed_fear_cost:0,decision:`gm-decision:${hash([board.record_key,entry.intent_ref])}`};
  const prior=db.getCityRecord(guild,'pre_roll_fear_interrupt',key);
  if(prior){const checked=inspectFearReservation(db,guild,key);if(hash(checked.binding)!==hash(binding))throw fail('immutable reservation changed');return prior;}
  const fear=db.getCampaign(guild).fear;
  if(!Number.isSafeInteger(fear)||fear<1||fear>12||fear-reservedCampaignFear(db,guild)<1)throw fail('insufficient existing available campaign Fear');
  return writeFearReservation(db,guild,binding,'awaiting_announcement');
}
function inspectPreRollFear(db,guild,key,{current=true}={}){
  const {row,binding}=inspectFearReservation(db,guild,key),
    request=db.getCityRecord(guild,binding.request_kind||'roll_request',binding.request),
    board=db.getCityRecord(guild,'scene_intent_board',binding.board),entry=board?.data.entries.find(e=>e.intent_ref===binding.entry_ref);
  if(!entry||hash(entry)!==binding.entry_hash||entry.actor.key!==binding.npc||hash(board.data.origin)!==hash(binding.origin))throw fail('source-bound NPC entry changed');
  if(current){
    const interrupted=interruptedRequest(db,guild,binding.request,{kind:binding.request_kind||'roll_request',historical:['executing','completed','cancelled'].includes(row.status)});
    const scene=currentScene(db,guild),principal=conversationPrincipal(db,guild,binding.owner,binding.character);
    if(scene.key!==binding.scene||scene.session_id!==binding.session||principal.kind!=='owner'||principal.revision!==binding.principal_revision
      ||!request||interrupted?.character!==binding.character||interrupted.owner!==binding.owner
      ||!narrativeSourceVisible(db,guild,binding.origin.source,binding.scope))throw fail('owner, source or scene changed');
    if(['awaiting_announcement','executing'].includes(row.status)&&hash(request)!==binding.request_revision)throw fail('unrolled action snapshot changed');
    const source=db.getWorldEvent(guild,entry.source_ref);
    if(source?.status!=='active'||hash(source.details)!==entry.source_hash)throw fail('NPC source revoked or changed');
    const inspectAction=['completed','cancelled'].includes(row.status)&&['resolved','missed'].includes(request.status)?historicalActionSource:consentAction;
    inspectAction(db,guild,interrupted.accepted,{resolved:true});
  }
  return {row,binding,request,entry};
}
function preRollFearOpportunity(db,guild,board){
  const key=`pre-roll-fear-board:${board.record_key}`,pointer=db.getCityRecord(guild,'pre_roll_fear_board',key);
  if(!pointer)return null;
  const {row,binding}=inspectPreRollFear(db,guild,pointer.data.interrupt);
  if(binding.board!==board.record_key||!['awaiting_announcement','executing'].includes(row.status))throw fail('pre-roll opportunity closed');
  return {key:row.record_key,source:binding.origin.source,request:binding.request,pre_roll_fear:row.record_key};
}
/** GM planning selectors only: exact pending owner requests, no extra model call or execution permission. */
function preRollFearCandidates(db,guild,origin){
  const o=inspectArbitrationOrigin(db,guild,origin),character=o.scope.actorCharacterId;
  if(!character)return [];
  const rows=db.ownedRollRequests(guild,o.scope.actorUserId,character);
  const ordinary=rows.filter(r=>r.status==='pending'&&r.subject_key===character&&r.data.session_id===o.binding.session&&r.data.scene===o.binding.scene
    &&['action','attack'].includes(r.data.kind)&&!r.data.result&&!!r.data.input.accepted_intent
    &&narrativeSourceVisible(db,guild,r.source_event,o.scope)
    &&!db.getCityRecord(guild,'pre_roll_fear_interrupt',`pre-roll-fear:${r.record_key}`))
    .filter(r=>{try{return inspectUnrolledInterruptRequest(db,guild,r);}catch(error){
      if(error.expected===true||['ROLL_REQUEST','SCENE_ACTION_WINDOW','PC_NATIVE_ELIGIBILITY','GM_ARBITRATION'].includes(error.code)
        ||error.message==='An active source event in this campaign is required.')return false;throw error;
    }}).slice(0,4)
    .map(r=>({request_ref:r.record_key,base_cost:1,operation:'native_standard_npc_attack',target:character,
      authority:'Proposal only. One local native NPC, no modifiers, printed features or Experience; acknowledged owner notice before NPC dice.'}));
  const campaign=[];
  for(const r of db.listCityRecords(guild,{kind:'pvp_attack_request',includeGM:true,limit:100})){
    if(ordinary.length+campaign.length>=4)break;
    if(r.data.offer?.actor!==character||r.data.offer.snapshot.actor_owner!==o.scope.actorUserId||r.status!=='ready'||r.data.roll
      ||db.getCityRecord(guild,'pre_roll_fear_interrupt',`pre-roll-fear:${r.record_key}`))continue;
    try{
      const proof=interruptedRequest(db,guild,r.record_key,{kind:'pvp_attack_request'});
      if(!proof.unrolled||proof.scene!==o.binding.scene||proof.session!==o.binding.session
        ||!narrativeSourceVisible(db,guild,proof.source,o.scope))continue;
      campaign.push({request_ref:r.record_key,base_cost:1,operation:'native_standard_npc_attack',target:character,
        authority:'Pending native PvP attack only; same acknowledged campaign-Fear interruption, never target consent or extra damage.'});
    }catch(error){if(!['NARRATIVE_PVP','SCENE_ACTION_WINDOW','PC_NATIVE_ELIGIBILITY'].includes(error.code))throw error;}
  }
  return [...ordinary,...campaign];
}
function bindPreRollFearBoard(db,guild,reservation){
  const {binding}=inspectFearReservation(db,guild,reservation.record_key);
  return db.saveCityRecord(guild,{kind:'pre_roll_fear_board',key:`pre-roll-fear-board:${binding.board}`,source_event:reservation.source_event,
    visibility:'gm',data:{interrupt:reservation.record_key}});
}
function announcement(db,guild,row){
  const job=db.getCityRecord(guild,'pre_roll_fear_publication',`pre-roll-fear-publication:${hash(row.record_key)}`);
  if(!job?.data.turn_id)return {job,parts:[]};
  return {job,parts:db.listTurnPublications(guild,job.data.turn_id)};
}
function assertPreRollFearAcknowledged(db,guild,key){
  const checked=inspectPreRollFear(db,guild,key),{row,binding}=checked,{job,parts}=announcement(db,guild,row);
  const notice=job?.data.notice&&db.getCityRecord(guild,'native_notice',job.data.notice);
  if(!job||job.source_event!==row.source_event||job.data.kind!=='pre_roll_fear'||job.data.ref!==key
    ||job.data.revision!==hash(binding)||job.data.user!==binding.owner||job.data.character!==binding.character
    ||notice?.source_event!==row.source_event||notice.data.kind!=='pre_roll_fear'||notice.data.ref!==key
    ||notice.data.user!==binding.owner||notice.data.character!==binding.character||notice.data.revision!==hash(binding)
    ||!parts.length||parts.some(p=>p.status!=='delivered'||!p.discord_message_id||!p.channel_id
    ||p.visibility!=='character'||p.target_character_id!==binding.character||p.target_user_id!==binding.owner))
    throw fail('exact spend announcement must have acknowledged owner delivery before NPC execution');
  for(const part of parts){
    const proof=db.getCityRecord(guild,'pvp_output_publication',part.id),ids=proof?.data.parts;
    if(!Array.isArray(ids)||ids.length!==1)throw fail('exact native announcement part proof required');
    const output=db.getCityRecord(guild,'pvp_output_part',ids[0]);
    if(output?.data.kind!=='native_notice'||output.data.ref!==notice.record_key)throw fail('acknowledged notice is not this native announcement');
    revalidateOutputPublication(db,guild,part);
  }
  return checked;
}
function commitPreRollFearCost(db,guild,key,decision){
  const {row,binding}=assertPreRollFearAcknowledged(db,guild,key);
  if(binding.decision!==decision||row.status!=='awaiting_announcement')throw fail('one unused native spotlight required');
  writeFearReservation(db,guild,binding,'executing',row);
  const before=db.getCampaign(guild).fear,after=db.changeFear(guild,-1);
  if(before-after!==1)throw fail('exact reserved Fear debit required');
  return {before,after};
}
function cancelPreRollFear(db,guild,origin,key){
  const o=inspectArbitrationOrigin(db,guild,origin);
  return db.transaction(()=>{
    const {row,binding}=inspectPreRollFear(db,guild,key);
    if(hash(o.binding)!==hash(binding.origin))throw fail('native cancellation origin changed');
    if(row.status==='cancelled')return row;
    if(row.status!=='awaiting_announcement')throw fail('committed interruption cannot be cancelled or refunded');
    const {parts}=announcement(db,guild,row);
    if(parts.some(p=>['delivering','uncertain','delivered'].includes(p.status)||p.attempt_count>0))throw fail('delivery uncertainty or acknowledgement requires reviewed recovery');
    return writeFearReservation(db,guild,binding,'cancelled',row);
  });
}
/** Close only a saved native interruption. This never grants a dead PC an action or changes any outcome. */
function settlePreRollFearForIncoming(db,guild,attackKey){
  const actual=db.getCityRecord(guild,'pc_incoming_attack',attackKey),ruling=actual?.data.offer.input.ruling;
  if(!ruling?.startsWith('ai-decision:'))return null;
  const decision=db.getCityRecord(guild,'gm_arbitration_decision',ruling.slice(12)),key=decision?.data.native?.opportunity?.pre_roll_fear;
  if(!key)return null;
  const {row,binding}=inspectPreRollFear(db,guild,key,{current:false});
  if(binding.decision!==decision.record_key||actual.subject_key!==binding.character||actual.data.offer.input.npc!==binding.npc)
    throw fail('terminal incoming interruption identity changed');
  if(row.status==='completed')return row;
  if(row.status!=='executing'||!['resolved','missed'].includes(actual.status))return row;
  incomingAttackEvidence(db,guild,attackKey,{terminal:true});incomingRollProjection(db,guild,attackKey);
  const hp=db.getCityRecord(guild,'pc_effect_receipt',`${attackKey}:damage`)?.data.after?.hp;
  if(hp?.current===hp?.max&&hp&&db.getCityRecord(guild,'pc_death_move_request',`${attackKey}:death`)?.status!=='resolved')return row;
  assertPreRollFearDeathTerminal(db,guild,actual);
  const deathRequest=db.getCityRecord(guild,'pc_death_move_request',`${attackKey}:death`);
  if(deathRequest?.status==='resolved'){
    const outcome=validatePcDeathOutcome(db,guild,`${deathRequest.record_key}:outcome`);
    if(['unconscious','dead','journey_ended'].includes(outcome.data.result)||outcome.data.blaze_final){
      // Completion of the NPC spotlight is not permission for an incapacitated PC to act.
      // Leave shared/Tag costs, other owners and saved declarations untouched; make recovery explicit.
      const reviewKey=`${key}:action-review`,old=db.getCityRecord(guild,'pre_roll_fear_action_review',reviewKey);
      if(!old)db.saveCityRecord(guild,{kind:'pre_roll_fear_action_review',key:reviewKey,status:'needs_review',visibility:'gm',
        source_event:outcome.source_event,subject_key:binding.character,data:{version:1,request:binding.request,
          request_kind:binding.request_kind||'roll_request',interrupt:key,owner:binding.owner,character:binding.character,
          death_outcome:outcome.record_key,death_digest:hash(outcome),
          reason:'The native owner death outcome prevents this unfinished action. Use lawful recovery or a fresh owner declaration; no compelled action, reroll, refund or erased outcome.'}});
    }
  }
  return writeFearReservation(db,guild,binding,'completed',row);
}
/** Hold only this exact unrolled request; no gate for reaction rolls, independent PCs or already committed replay. */
function assertPreRollFearRollAllowed(db,guild,request){
  const key=`pre-roll-fear:${request.record_key}`,raw=db.getCityRecord(guild,'pre_roll_fear_interrupt',key);if(!raw)return;
  const {row,binding}=inspectFearReservation(db,guild,key);
  if(['completed','cancelled'].includes(row.status))return;
  inspectPreRollFear(db,guild,key);
  if(row.status==='executing'){
    const actual=db.incomingAttackForNativeDecision(guild,binding.decision);
    if(actual&&['resolved','missed'].includes(actual.status)){
      settlePreRollFearForIncoming(db,guild,actual.record_key);
      if(inspectFearReservation(db,guild,key).row.status==='completed')return;
      assertPreRollFearDeathTerminal(db,guild,actual);
    }
  }
  throw fail('native interrupt remains pending; original action stays unrolled');
}

return Object.freeze({reservePreRollFear,inspectPreRollFear,preRollFearOpportunity,preRollFearCandidates,bindPreRollFearBoard,assertPreRollFearAcknowledged,commitPreRollFearCost,cancelPreRollFear,settlePreRollFearForIncoming,assertPreRollFearRollAllowed});
}
