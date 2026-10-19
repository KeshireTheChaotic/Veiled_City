/** One source-bound pre-roll NPC spotlight, never paid by the interrupted action's future Fear result. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene} from './scene-continuity.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {incomingAttackEvidence,incomingRollProjection} from './pc-incoming.js';
import {revalidateOutputPublication} from './pvp-output.js';
import {assertPreRollFearDeathTerminal} from './pre-roll-fear-recovery.js';
import {fearReservationHash as hash,fearReservationFailure as fail,inspectFearReservation,writeFearReservation,
  reservedCampaignFear} from './fear-reservations.js';

export function reservePreRollFear(db,guild,origin,board,input,proposal){
  const o=inspectArbitrationOrigin(db,guild,origin),entry=board.data.entries.find(e=>e.intent_ref===input.npc_intent_ref),
    request=db.getCityRecord(guild,'roll_request',input.request_ref),pc=request&&db.getCharacter(request.subject_key);
  if(!entry||entry.actor.type!=='npc'||entry.operation!=='attack'||entry.dependencies.length||entry.target_refs.length!==1
    ||entry.target_refs[0]!==pc?.id||request?.status!=='pending'||!['action','attack'].includes(request.data.kind)
    ||request.data.tag||request.data.result||request.data.roll_id||!request.data.input.accepted_intent
    ||request.data.scene!==o.binding.scene||request.data.session_id!==o.binding.session||hash(board.data.origin)!==hash(o.binding)
    ||proposal?.intent_ref!==entry.intent_ref||proposal.disposition!=='gm_attack_roll'||proposal.feature_ref!=='standard_attack'
    ||proposal.experience_ref||proposal.advantage||proposal.disadvantage||proposal.proposal_version!==undefined)
    throw fail('one exact native standard attack against the pending action owner required');
  const {row:accepted,principal}=consentAction(db,guild,request.data.input.accepted_intent);
  if(pc.guild_id!==guild||pc.owner_user_id!==request.data.owner_user_id||principal.kind!=='owner'
    ||accepted.source_event!==request.source_event||accepted.data.actor!==pc.id||pc.data.location!==o.binding.location
    ||!narrativeSourceVisible(db,guild,request.source_event,o.scope)
    ||o.scope.mode==='private'&&(o.scope.actorUserId!==pc.owner_user_id||o.scope.actorCharacterId!==pc.id))throw fail('current source, owner, scene and audience required');
  const key=`pre-roll-fear:${request.record_key}`,binding={version:1,request:request.record_key,request_revision:hash(request),
    owner:pc.owner_user_id,character:pc.id,principal_revision:conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision,
    session:o.binding.session,scene:o.binding.scene,scope:o.scope,npc:entry.actor.key,entry_ref:entry.intent_ref,entry_hash:hash(entry),
    board:board.record_key,origin:o.binding,base_cost:1,printed_fear_cost:0,decision:`gm-decision:${hash([board.record_key,entry.intent_ref])}`};
  const prior=db.getCityRecord(guild,'pre_roll_fear_interrupt',key);
  if(prior){const checked=inspectFearReservation(db,guild,key);if(hash(checked.binding)!==hash(binding))throw fail('immutable reservation changed');return prior;}
  const fear=db.getCampaign(guild).fear;
  if(!Number.isSafeInteger(fear)||fear<1||fear>12||fear-reservedCampaignFear(db,guild)<1)throw fail('insufficient existing available campaign Fear');
  return writeFearReservation(db,guild,binding,'awaiting_announcement');
}
export function inspectPreRollFear(db,guild,key,{current=true}={}){
  const {row,binding}=inspectFearReservation(db,guild,key),request=db.getCityRecord(guild,'roll_request',binding.request),
    board=db.getCityRecord(guild,'scene_intent_board',binding.board),entry=board?.data.entries.find(e=>e.intent_ref===binding.entry_ref);
  if(!entry||hash(entry)!==binding.entry_hash||entry.actor.key!==binding.npc||hash(board.data.origin)!==hash(binding.origin))throw fail('source-bound NPC entry changed');
  if(current){
    const scene=currentScene(db,guild),principal=conversationPrincipal(db,guild,binding.owner,binding.character);
    if(scene.key!==binding.scene||scene.session_id!==binding.session||principal.kind!=='owner'||principal.revision!==binding.principal_revision
      ||!request||request.subject_key!==binding.character||request.data.owner_user_id!==binding.owner
      ||!narrativeSourceVisible(db,guild,binding.origin.source,binding.scope))throw fail('owner, source or scene changed');
    if(['awaiting_announcement','executing'].includes(row.status)&&hash(request)!==binding.request_revision)throw fail('unrolled action snapshot changed');
    const source=db.getWorldEvent(guild,entry.source_ref);
    if(source?.status!=='active'||hash(source.details)!==entry.source_hash)throw fail('NPC source revoked or changed');
    const inspectAction=['completed','cancelled'].includes(row.status)&&request.status==='resolved'?historicalActionSource:consentAction;
    inspectAction(db,guild,request.data.input.accepted_intent,{resolved:true});
  }
  return {row,binding,request,entry};
}
export function preRollFearOpportunity(db,guild,board){
  const key=`pre-roll-fear-board:${board.record_key}`,pointer=db.getCityRecord(guild,'pre_roll_fear_board',key);
  if(!pointer)return null;
  const {row,binding}=inspectPreRollFear(db,guild,pointer.data.interrupt);
  if(binding.board!==board.record_key||!['awaiting_announcement','executing'].includes(row.status))throw fail('pre-roll opportunity closed');
  return {key:row.record_key,source:binding.origin.source,request:binding.request,pre_roll_fear:row.record_key};
}
/** GM planning selectors only: exact pending owner requests, no extra model call or execution permission. */
export function preRollFearCandidates(db,guild,origin){
  const o=inspectArbitrationOrigin(db,guild,origin),character=o.scope.actorCharacterId;
  if(!character)return [];
  const rows=db.ownedRollRequests(guild,o.scope.actorUserId,character);
  return rows.filter(r=>r.status==='pending'&&r.subject_key===character&&r.data.session_id===o.binding.session&&r.data.scene===o.binding.scene
    &&['action','attack'].includes(r.data.kind)&&!r.data.tag&&!r.data.result&&!!r.data.input.accepted_intent
    &&narrativeSourceVisible(db,guild,r.source_event,o.scope)
    &&!db.getCityRecord(guild,'pre_roll_fear_interrupt',`pre-roll-fear:${r.record_key}`)).slice(0,4)
    .map(r=>({request_ref:r.record_key,base_cost:1,operation:'native_standard_npc_attack',target:character,
      authority:'Proposal only. One local native NPC, no modifiers, printed features or Experience; acknowledged owner notice before NPC dice.'}));
}
export function bindPreRollFearBoard(db,guild,reservation){
  const {binding}=inspectFearReservation(db,guild,reservation.record_key);
  return db.saveCityRecord(guild,{kind:'pre_roll_fear_board',key:`pre-roll-fear-board:${binding.board}`,source_event:reservation.source_event,
    visibility:'gm',data:{interrupt:reservation.record_key}});
}
function announcement(db,guild,row){
  const job=db.getCityRecord(guild,'pre_roll_fear_publication',`pre-roll-fear-publication:${hash(row.record_key)}`);
  if(!job?.data.turn_id)return {job,parts:[]};
  return {job,parts:db.listTurnPublications(guild,job.data.turn_id)};
}
export function assertPreRollFearAcknowledged(db,guild,key){
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
export function commitPreRollFearCost(db,guild,key,decision){
  const {row,binding}=assertPreRollFearAcknowledged(db,guild,key);
  if(binding.decision!==decision||row.status!=='awaiting_announcement')throw fail('one unused native spotlight required');
  writeFearReservation(db,guild,binding,'executing',row);
  const before=db.getCampaign(guild).fear,after=db.changeFear(guild,-1);
  if(before-after!==1)throw fail('exact reserved Fear debit required');
  return {before,after};
}
export function cancelPreRollFear(db,guild,origin,key){
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
export function settlePreRollFearForIncoming(db,guild,attackKey){
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
  return writeFearReservation(db,guild,binding,'completed',row);
}
/** Hold only this exact unrolled request; no gate for reaction rolls, independent PCs or already committed replay. */
export function assertPreRollFearRollAllowed(db,guild,request){
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
