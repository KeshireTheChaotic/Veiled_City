/** Thin native execution bridge: player invitations never roll until their real owner submits. */
import {inspectNativeGmDecision,commitGmActionCost} from './gm-action-capability.js';
import {prepareArbitratedIncomingAttack} from './pc-incoming.js';
import {gmD20Roll,d} from './dice.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {EncounterLibrary} from './encounter.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {personalCharacter} from './personal-continuity.js';
import {conversationPrincipal} from './conversation-principal.js';
import {captureWorldInput} from './autonomous-world.js';
import {persistPlayerIntents} from './typed-intents.js';
import {adjudicateAcceptedIntent} from './rules-arbitration.js';
import {contributeRoll} from './roll-collaboration.js';
import {rollRevision} from './roll-requests.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {typedRollProof} from './typed-roll-proof.js';
import {indexWorldEvent} from './city-calendar.js';
import {commitFeatureChoice} from './native-feature-windows.js';

function dependencyState(db,guild,entry){
  for(const ref of entry.dependencies){
    const accepted=db.getCityRecord(guild,'typed_intent',ref);
    if(!accepted)return 'needs_review'; // No narrative-only NPC assertion may certify a consequence.
    (accepted.status==='resolved'?historicalActionSource:consentAction)(db,guild,ref,{resolved:true});
    if(accepted.status!=='resolved')return 'pending';
    const receipt=db.getCityRecord(guild,'action_outcome_receipt',accepted.data.outcome_receipt);
    if(receipt?.status!=='resolved'||receipt.source_event!==accepted.source_event||receipt.data.action_id!==ref)return 'needs_review';
    if(!['party','public'].includes(receipt.visibility))return 'needs_review'; // No actor knowledge or disclosure from a private numeric result.
    if(receipt.data.request){
      const request=db.getCityRecord(guild,'roll_request',receipt.data.request),proof=typedRollProof(db,guild,request);
      if(proof.outcome==='needs_review')return 'needs_review';if(proof.outcome!=='success')return 'failed';
    }else if(receipt.data.outcome!=='resolved_no_roll'||receipt.data.native_roll_refs.length||receipt.data.state_mutations.length)return 'needs_review';
  }
  return 'ready';
}

export function executeUnifiedGmActions(db,guild,decisions,{library=new EncounterLibrary('../content'),rng=d}={}){
  return decisions.filter(r=>['gm_action_ready','pending_pc_reaction'].includes(r.status)).map(decision=>{
    try{return db.transaction(()=>{
    const {row,entry}=inspectNativeGmDecision(db,guild,decision.record_key),n=row.data.native;
    if(!['gm_action_ready','pending_pc_reaction'].includes(row.status))return row;
    const dependency=dependencyState(db,guild,entry),continuationKey=`gm-continuation:${hash(row.record_key)}`;
    if(dependency!=='ready')return db.saveCityRecord(guild,{kind:'gm_action_continuation',key:continuationKey,status:dependency,visibility:'gm',source_event:row.source_event,
      data:{decision:row.record_key,dependencies:entry.dependencies,authority:'Only exact successful native prerequisites resume the preauthorized GM action; no PC action or new spotlight is inferred.'}});
    if(n.operation==='request_pc_reaction_roll')return commitGmActionCost(db,guild,row.record_key);
    if(n.operation==='commit_adversary_attack')return prepareArbitratedIncomingAttack(db,guild,row.record_key,{library});
    if(n.operation==='commit_adversary_feature')return commitFeatureChoice(db,guild,row.record_key,{library});
    const key=`gm-execution:${hash(row.record_key)}`,prior=db.getCityRecord(guild,'gm_native_roll_receipt',key);
    if(prior)return inspectGmRollReceipt(db,guild,prior.record_key);
    if(n.operation!=='commit_exceptional_adversary_action')throw fail('native_gm_executor_missing');
    const c=db.listCombatants(db.getCurrentEncounter(row.data.origin.session)?.id).find(c=>c.id===n.combatant),template=c&&library.findAdversary(c.base_name);
    if(c?.status!=='active'||hash(template)!==n.template_hash)throw fail('exceptional_statblock_changed');
    const cost=commitGmActionCost(db,guild,row.record_key),p=row.data.proposal,result=gmD20Roll({kind:'action',modifier:n.experience?.modifier||0,
      difficulty:p.difficulty,advantage:p.advantage,disadvantage:p.disadvantage},rng);
    const payload={decision:row.record_key,actor:{kind:'adversary',id:entry.actor.key},source:row.source_event,cost:cost.record_key,result};
    const roll=db.addRoll(guild,row.data.origin.session,'native:unified-gm',null,'gm_exceptional_action',payload);
    return db.saveCityRecord(guild,{kind:'gm_native_roll_receipt',key,status:'resolved',source_event:row.source_event,visibility:'gm',data:{...payload,roll}});
    });}catch(error){
      if(!['GM_ARBITRATION','PC_EFFECT_AUTHORITY','PC_NATIVE_ELIGIBILITY','SCENE_FICTION','SCENE_ACTION_WINDOW','TYPED_ROLL_PROOF'].includes(error.code))throw error;
      return db.saveCityRecord(guild,{kind:'gm_execution_review',key:`gm-execution-review:${hash(decision.record_key)}`,status:'needs_review',visibility:'gm',source_event:decision.source_event,
        data:{decision:decision.record_key,reason:error.message,authority:'No unsupported effect, RNG replay or automatic substitute. Independent actions remain valid.'}});
    }
  });
}
export function resumePendingGmActions(db,guild,options={}){
  const decisions=db.listCityRecords(guild,{kind:'gm_action_continuation',includeGM:true,limit:200})
    .filter(r=>r.status==='pending').map(r=>db.getCityRecord(guild,'gm_arbitration_decision',r.data.decision)).filter(Boolean);
  const results=executeUnifiedGmActions(db,guild,decisions,options);
  for(const result of results){
    const decision=result.data.decision||decisions.find(d=>result.data.offer?.input.ruling===`ai-decision:${d.record_key}`)?.record_key;
    if(!decision)continue;
    const key=`gm-continuation:${hash(decision)}`,row=db.getCityRecord(guild,'gm_action_continuation',key);
    if(row&&result.kind!=='gm_action_continuation')db.saveCityRecord(guild,{...row,key,status:result.kind==='gm_execution_review'?'needs_review':'resumed',data:{...row.data,result_kind:result.kind,result:result.record_key}});
  }
  return results;
}
export function inspectGmRollReceipt(db,guild,key){
  const row=db.getCityRecord(guild,'gm_native_roll_receipt',key),roll=row&&db.getSavedRoll(guild,row.data.roll),{roll:ignored,...payload}=row?.data||{};
  if(row?.status!=='resolved'||roll?.roll_type!=='gm_exceptional_action'||hash(roll.payload)!==hash(payload))throw fail('native_gm_roll_ancestry');
  const decision=inspectNativeGmDecision(db,guild,row.data.decision).row;
  const r=row.data.result,p=r&&gmD20Roll({kind:'action',modifier:decision.data.native.experience?.modifier||0,difficulty:decision.data.proposal.difficulty,
    advantage:decision.data.proposal.advantage,disadvantage:decision.data.proposal.disadvantage},(()=>{let i=0;return()=>r.faces[i++];})());
  if(hash(r)!==hash(p))throw fail('native_gm_roll_arithmetic');return row;
}
export function inspectGmReactionInvitation(db,guild,user,key){
  const {row}=inspectNativeGmDecision(db,guild,key),n=row.data.native,p=row.data.proposal;
  if(row.status!=='pending_pc_reaction'||n?.operation!=='request_pc_reaction_roll')throw fail('exact_reaction_invitation');
  const cost=db.listCityRecords(guild,{kind:'gm_action_cost_receipt',includeGM:true,limit:200}).find(r=>r.data.decision===row.record_key);
  if(cost?.status!=='committed'||cost.source_event!==row.source_event)throw fail('reaction_gm_move_not_committed');
  const pc=personalCharacter(db,guild,user,n.character),principal=conversationPrincipal(db,guild,user,pc.id);
  if(user!==n.owner||principal.revision!==n.principal)throw fail('reaction_invitation_owner_changed');
  const terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,user])}`);
  if(terminal){
    const source=db.getWorldEvent(guild,terminal.source_event);
    if(terminal.visibility!=='character'||terminal.subject_key!==pc.id||terminal.data.owner!==user||terminal.data.invitation!==row.record_key
      ||terminal.data.invitation_hash!==hash(row.data)||source?.status!=='active'||!db.ownerAuthoredSource(guild,source.event_key,user))throw fail('reaction_terminal_source');
    if(terminal.status==='resolved'){
      const request=db.getCityRecord(guild,'roll_request',terminal.data.request);typedRollProof(db,guild,request);
      if(request.status!=='resolved'||request.subject_key!==pc.id||request.data.input.gm_invitation!==row.record_key)throw fail('reaction_terminal_result');
    }else if(terminal.status!=='withdrawn'||source.kind!=='native_gm_reaction_withdrawal'||source.details.invitation!==row.record_key
      ||source.details.revision!==hash(row.data))throw fail('reaction_terminal_withdrawal');
  }
  return {row,pc,terms:{request:row.record_key,revision:hash(row.data),status:terminal?.status||'pending',trait:p.trait,difficulty:p.difficulty,
    stakes:'Success or failure settles your reaction to the local NPC attempt only. Damage, custody, movement and costs require separate native receipts.',
    reason:'Native source-bound local NPC reaction request; you choose whether and how to respond.',
    authority:'Pending only. Choose your response; no roll, damage or spending is inferred.'}};
}
export function gmReactionInbox(db,guild,user){
  const pc=personalCharacter(db,guild,user);
  return db.listCityRecords(guild,{kind:'gm_arbitration_decision',includeGM:true,limit:200}).filter(row=>row.status==='pending_pc_reaction'
    &&row.data.native?.owner===user&&row.data.native.character===pc.id).map(row=>{
      try{return inspectGmReactionInvitation(db,guild,user,row.record_key).terms;}
      catch(error){if(!['GM_ARBITRATION','SCENE_FICTION','TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW'].includes(error.code))throw error;
        return {request:row.record_key,status:'needs_review',authority:'Current native source/scene/owner proof unavailable; no roll or response inferred.'};}
    });
}
export function withdrawGmReactionInvitation(db,guild,user,input,{interactionId,authoredText}={}){
  if(!interactionId||typeof authoredText!=='string'||hash(JSON.parse(authoredText))!==hash(input)||Object.keys(input).sort().join()!=='op,request,revision'
    ||input.op!=='gm-reaction-withdraw')throw fail('exact_owner_withdrawal');
  return db.transaction(()=>{
    const {row,pc,terms}=inspectGmReactionInvitation(db,guild,user,input.request);
    if(input.revision!==terms.revision)throw fail('reaction_withdrawal_revision');
    const key=`gm-reaction-submit:${hash([row.record_key,user])}`,prior=db.getCityRecord(guild,'gm_reaction_submission',key);
    if(prior){if(prior.status!=='withdrawn')throw fail('committed_reaction_cannot_be_erased');return prior;}
    const source=indexWorldEvent(db,guild,{key:`${key}:withdrawal`,kind:'native_gm_reaction_withdrawal',source_id:`player:${user}`,title:'Owner withheld a reaction without fictional consequences',
      session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'character',subject_key:pc.id,
      details:{author:user,character_id:pc.id,invitation:row.record_key,revision:terms.revision,interaction:interactionId,authored_text:authoredText}},user);
    return db.saveCityRecord(guild,{kind:'gm_reaction_submission',key,status:'withdrawn',source_event:source.event_key,visibility:'character',subject_key:pc.id,
      data:{invitation:row.record_key,owner:user,invitation_hash:terms.revision,interaction:interactionId,authority:'No surrender, failure, dice or reaction is inferred.'}});
  });
}
/** Authenticated command input is preserved verbatim, not attributed to the model or another owner. */
export function submitGmReactionInvitation(db,guild,user,input,{interactionId,authoredText,rng=d}={}){
  if(!interactionId||typeof authoredText!=='string'||hash(JSON.parse(authoredText))!==hash(input)
    ||Object.keys(input).sort().join()!=='op,request,revision'||input.op!=='gm-reaction-roll')throw fail('authenticated_exact_reaction_submission');
  return db.transaction(()=>{
    const {row,pc,terms}=inspectGmReactionInvitation(db,guild,user,input.request);
    if(input.revision!==terms.revision)throw fail('reaction_invitation_revision');
    const key=`gm-reaction-submit:${hash([row.record_key,user])}`,prior=db.getCityRecord(guild,'gm_reaction_submission',key);
    if(prior){if(prior.status!=='resolved')throw fail('reaction_invitation_withdrawn');return db.getCityRecord(guild,'roll_request',prior.data.request);}
    const text=authoredText,messageId=`interaction:${interactionId}`,scope={mode:'private',actorUserId:user,actorCharacterId:pc.id};
    captureWorldInput(db,guild,user,pc.id,messageId,text,{privateScene:true});
    const [accepted]=persistPlayerIntents(db,guild,[{type:'roll',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation:'request_roll',utterance:'',
      excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Authenticated exact owner reaction submission.'}],scope,{messageId});
    const native=adjudicateAcceptedIntent(db,guild,{acceptedIntent:accepted.record_key,mode:'roll_required',trait:terms.trait,kind:'reaction',difficulty:terms.difficulty,
      risk:terms.stakes,stakes:terms.stakes,rawRefs:['srd:reaction-rolls'],explanation:terms.reason},'native:unified-gm',{scope});
    let request=db.getCityRecord(guild,'roll_request',native.roll_request_ref);
    request=db.saveCityRecord(guild,{...request,key:request.record_key,data:{...request.data,input:{...request.data.input,gm_invitation:row.record_key,private_result:true}}});
    const result=contributeRoll(db,guild,user,{op:'roll',request:request.record_key,expected_revision:rollRevision(request),key:interactionId},{rng});
    db.saveCityRecord(guild,{kind:'gm_reaction_submission',key,status:'resolved',source_event:accepted.source_event,visibility:'character',subject_key:pc.id,
      data:{invitation:row.record_key,request:result.record_key,owner:user,invitation_hash:terms.revision,interaction:interactionId}});return result;
  });
}
export function assertGmInvitationRequest(db,guild,request){
  if(!request.data.input.gm_invitation)return;
  const {row}=inspectGmReactionInvitation(db,guild,request.data.owner_user_id,request.data.input.gm_invitation),p=row.data.proposal;
  if(request.data.kind!=='reaction'||request.data.breakdown.difficulty!==p.difficulty||request.data.breakdown.trait!==p.trait)throw fail('exact_reaction_ruling_terms');
}
