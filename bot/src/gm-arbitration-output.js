import {intentNativeEncounter} from './frameworks/intent/public.js';
/** Owner-entitled native notices only. GM proposal prose and motives are never publication sources. */
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {inspectGmReactionInvitation} from './gm-native-rolls.js';
import {formatRollRequest} from './roll-requests.js';
import {incomingRollProjection,authorizeIncomingOffer,inspectVolley} from './pc-incoming.js';
import {typedRollProof} from './typed-roll-proof.js';
import {jsonHash as hash} from './kernel/json-hash.js';
import {intentSessionPrincipal} from './frameworks/intent/public.js';
function conversationPrincipal(...args){return intentSessionPrincipal.conversationPrincipal(...args);}
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {inspectNativeEquippedAttack} from './native-equipped-attacks.js';
import {inspectFearReservation} from './fear-reservations.js';
import {inspectNativeRollParticipation} from './native-roll-participation.js';
import {rollRevision} from './roll-requests.js';
import {inspectEnvironmentTrace,inspectEnvironmentTraceResult,traceOfferForRisk} from './native-environment-trace.js';

function traceNotice(db,guild,offer,pc){
  if(offer.data.character!==pc.id||offer.data.owner!==pc.owner_user_id)throw fail('environment_trace_notice_current_owner');
  const saved=db.getCityRecord(guild,'native_environment_trace_result',`${offer.record_key}:result`);
  if(saved){const proof=inspectEnvironmentTraceResult(db,guild,saved.record_key,pc.owner_user_id);
    return {proof,text:`Native intrusion trace: ${proof.data.trace}. Hope spent: ${proof.data.hope_spent}. Your saved roll is unchanged.`};}
  return {proof:offer,text:'Your failed intrusion left a native trace. You may spend exactly 1 Hope to suppress this trace, leave it in place, or resolve a source-backed credible suppression action. Silence never spends Hope or chooses a response for you.\n'
    +['pay_hope','leave_trace'].map(choice=>'/vc-roll window json:'+JSON.stringify({op:'environment-trace-choice',request:offer.record_key,
      revision:hash(offer.data),choice,accepted_intent:'',prerequisite:''})).join('\n')
    +'\nA credible suppression requires your separate native success/no-roll action receipt; no reaction dice or automatic success is invented.'};
}

export function nativeGmNotice(db,guild,key,scope,{library=new intentNativeEncounter.EncounterLibrary('../content')}={}){
  const stored=db.getCityRecord(guild,'gm_arbitration_decision',key),shared=stored?.data.native?.operation==='commit_adversary_volley'
    &&db.getCityRecord(guild,'npc_volley_attack',`npc-volley:${hash(key)}`),
    checked=shared?inspectVolley(db,guild,shared.record_key):null,
    {row,entry}=checked?{row:checked.decision,entry:null}:inspectNativeGmDecision(db,guild,key),n=row.data.native;
  if(n?.opportunity?.pre_roll_fear&&inspectFearReservation(db,guild,n.opportunity.pre_roll_fear).row.status==='cancelled')return null;
  const character=n?.operation==='owner_collaboration'?n.choices.find(c=>c.character===scope.actorCharacterId)?.character
    :n?.operation==='commit_adversary_volley'?n.inputs.find(i=>i.character===scope.actorCharacterId)?.character
    :entry.actor.type==='character'?entry.actor.key:n?.character||n?.input?.character,pc=character&&db.getCharacter(character);
  if(!pc||scope.mode!=='private'||scope.actorUserId!==pc.owner_user_id||scope.actorCharacterId!==pc.id
    ||conversationPrincipal(db,guild,scope.actorUserId,pc.id).kind!=='owner')throw fail('private_notice_recipient');
  let text='',proof=null;
  if(row.status==='pending_owner_choice'&&n?.operation==='environment_trace_choice'){
    ({proof,text}=traceNotice(db,guild,inspectEnvironmentTrace(db,guild,n.request),pc));
  }else if(row.status==='pending_owner_choice'&&n?.operation==='owner_collaboration'){
    const choice=n.choices.find(c=>c.character===pc.id),request=db.getCityRecord(guild,'roll_request',n.request),
      event=db.getWorldEvent(guild,choice.proof),description=event?.details?.binding?.description;
    if(!request)throw fail('private_collaboration_request');
    inspectNativeRollParticipation(db,guild,request,pc,event,choice.op,description,{historical:request.status==='resolved'});
    const available=choice.op==='participate'?request.status==='awaiting_partner'
      :request.status==='pending'&&!request.data.tag&&(choice.op!=='help'||!(request.data.helpers||[]).some(h=>h.character===pc.id));
    const {character:ignored,...fields}=choice,input={...fields,request:request.record_key,expected_revision:rollRevision(request),
      key:`collaboration:${hash([choice.proof,request.data.revision])}`};
    text=available?`Native ${choice.op==='help'?'Help (1 Hope)':choice.op==='tag'?'Tag Team proposal (3 Hope, charged only after the partner agrees)':'Tag Team participation'} eligibility is available. This is not consent, a charge or a roll.\n`
      +`Your optional owner operation: /vc-roll contribute json:${JSON.stringify(input)}`
      :'This collaboration has no current owner operation. A pending partner proposal, saved outcome or changed request is not inferred as your consent. No dice or costs were repeated.';
    proof=[request,event];
  }else if(row.status==='pending_pc_roll'){
    const request=db.getCityRecord(guild,'roll_request',n?.roll_request_ref);
    if(!request||request.subject_key!==pc.id||request.data.owner_user_id!==pc.owner_user_id)throw fail('private_notice_request');
    if(request.status==='resolved'){
      const result=typedRollProof(db,guild,request);text=`Native ${request.data.kind} result: ${request.data.result.total}, ${request.data.result.duality}; ${result.outcome}. No new world consequence is inferred.`;
    }else{
      if(request.data.input?.attack_source?.startsWith('native-unarmed:'))inspectNativeUnarmedAttack(db,guild,request.data.input,pc);
      if(request.data.input?.native_equipped_ref)inspectNativeEquippedAttack(db,guild,request.data.input,pc);
      text=formatRollRequest(request,{user:pc.owner_user_id,db,guild});
    }
    proof=request;
    if(n.environment_trace_risk){const offer=traceOfferForRisk(db,guild,n.environment_trace_risk);
      if(offer){const trace=traceNotice(db,guild,offer,pc);text+=`\n${trace.text}`;proof=[request,trace.proof];}}
  }else if(row.status==='pending_pc_reaction'){
    const {terms}=inspectGmReactionInvitation(db,guild,pc.owner_user_id,row.record_key);
    text=terms.status==='withdrawn'?'You withheld this reaction. No roll, surrender or failed response was inferred.':terms.status==='resolved'
      ?terms.native_effect?`Your reaction ${terms.native_effect.success?'succeeded':'failed'}. Native feature result: marked ${terms.native_effect.stress_marked} Stress; ${terms.native_effect.condition?`${terms.native_effect.condition_reused?'existing':'applied'} ${terms.native_effect.condition}`:'no new condition'}. ${terms.native_effect.hope_spent!==undefined?`Spent ${terms.native_effect.hope_spent} Hope. `:''}No new dice, HP effect, PC response or additional GM move is inferred.`
        :'Your reaction has a saved native result. No additional roll or GM move is inferred.'
      :terms.status==='awaiting_choice'?`Your ${n.feature==='adversary:pale-regent:command-the-blood'?'failed Command the Blood':'successful Flashbang'} reaction is saved. Choose exactly ONE consequence privately; no further dice.\n${terms.options.map(choice=>'/vc-roll window json:'+JSON.stringify({op:'gm-reaction-choice',request:row.record_key,revision:terms.revision,choice})).join('\n')}`
      :terms.status==='needs_rules_review'?'Your reaction dice are saved. The native consequence needs scoped rules/resource review; no substitute effect or new roll is inferred.'
      :`Pending owner reaction: ${terms.trait}, Difficulty ${terms.difficulty}. ${terms.stakes}\nReview: /vc-roll window json:${JSON.stringify({op:'gm-reaction-review',request:row.record_key})}\nYour response is not assumed; review does not roll.`;
    proof=terms;
  }else if(['commit_adversary_attack','commit_adversary_volley'].includes(n?.operation)){
    const attack=checked?checked.children.find(c=>c.subject_key===pc.id)
      :db.listCityRecords(guild,{kind:'pc_incoming_attack',includeGM:true,limit:200}).find(r=>r.data.offer.input.ruling===`ai-decision:${key}`);
    if(!attack)return null;
    if(attack.data.roll){
      const r=incomingRollProjection(db,guild,attack.record_key).receipt.data;
      text=`Native incoming attack: d20 ${r.face} ${r.bonus>=0?'+':''}${r.bonus} = ${r.total} against Evasion ${r.evasion}: ${r.hit?'hit':'miss'}.`
        +(r.damage?` Damage roll ${r.damage.total}; native disposition ${attack.status}. Armor and death choices remain yours.`:checked?' No damage rolled for this target.':' No damage rolled.')
        +(['awaiting_defense','hold_for_owner'].includes(attack.status)?` Your defense review remains pending; no HP effect is inferred. Review: /vc-roll effect json:${JSON.stringify({op:'review',attack:attack.record_key})}`:'');
    }else{
      authorizeIncomingOffer(db,guild,attack.record_key,{library});
      text=`Incoming native ${checked?'Coordinated Volley':'standard attack'} awaits your defense review (${attack.record_key}).\nReview: /vc-roll effect json:${JSON.stringify({op:'review',attack:attack.record_key})}\nNo attack dice, Armor spend or HP effect has occurred.`;
    }
    proof=attack;
  }else return null;
  return {text,revision:hash([row,proof,pc.owner_user_id,conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision]),source:db.getWorldEvent(guild,row.source_event)};
}
export function nativeGmNotices(db,guild,sourceRef,scope){
  const notices=[];
  for(const row of db.listCityRecords(guild,{kind:'gm_arbitration_decision',includeGM:true,limit:200})){
    if(row.data.origin.source!==sourceRef)continue;
    const board=db.getCityRecord(guild,'scene_intent_board',row.data.board),entry=board?.data.entries.find(e=>e.intent_ref===row.data.entry),n=row.data.native,
      characters=n?.operation==='owner_collaboration'?n.choices.map(i=>i.character):n?.operation==='commit_adversary_volley'?n.inputs.map(i=>i.character):[entry?.actor.type==='character'?entry.actor.key:n?.character||n?.input?.character];
    if(!['pending_owner_choice','pending_pc_roll','pending_pc_reaction','gm_action_ready'].includes(row.status))continue;
    // A public table roll is announced by its play-channel prompt instead of a private notice.
    if(row.status==='pending_pc_roll'){
      const request=db.getCityRecord(guild,'roll_request',n?.roll_request_ref),
        accepted=request?.data.input?.accepted_intent&&db.getCityRecord(guild,'typed_intent',request.data.input.accepted_intent);
      if(request?.status==='pending'&&request.data.input?.private_result!==true&&accepted?.visibility==='party')continue;
    }
    for(const character of characters){
    const pc=character&&db.getCharacter(character);
    if(!pc||scope.mode==='private'&&pc.id!==scope.actorCharacterId)continue;
    const recipient={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
    try{const projection=nativeGmNotice(db,guild,row.record_key,recipient);if(projection)notices.push({ref:row.record_key,scope:recipient,...projection});}
    catch(error){if(!['GM_ARBITRATION','PC_EFFECT_AUTHORITY','SCENE_ACTION_WINDOW','SCENE_FICTION','PRE_ROLL_FEAR'].includes(error.code))throw error;}
    }
  }
  return notices;
}
