/** Owner-entitled native notices only. GM proposal prose and motives are never publication sources. */
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {inspectGmReactionInvitation} from './gm-native-rolls.js';
import {formatRollRequest} from './roll-requests.js';
import {incomingRollProjection,authorizeIncomingOffer} from './pc-incoming.js';
import {typedRollProof} from './typed-roll-proof.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {conversationPrincipal} from './conversation-principal.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {EncounterLibrary} from './encounter.js';

export function nativeGmNotice(db,guild,key,scope,{library=new EncounterLibrary('../content')}={}){
  const {row,entry}=inspectNativeGmDecision(db,guild,key),n=row.data.native;
  const character=entry.actor.type==='character'?entry.actor.key:n?.character||n?.input?.character,pc=character&&db.getCharacter(character);
  if(!pc||scope.mode!=='private'||scope.actorUserId!==pc.owner_user_id||scope.actorCharacterId!==pc.id
    ||conversationPrincipal(db,guild,scope.actorUserId,pc.id).kind!=='owner')throw fail('private_notice_recipient');
  let text='',proof=null;
  if(row.status==='pending_pc_roll'){
    const request=db.getCityRecord(guild,'roll_request',n?.roll_request_ref);
    if(!request||request.subject_key!==pc.id||request.data.owner_user_id!==pc.owner_user_id)throw fail('private_notice_request');
    if(request.status==='resolved'){
      const result=typedRollProof(db,guild,request);text=`Native ${request.data.kind} result: ${request.data.result.total}, ${request.data.result.duality}; ${result.outcome}. No new world consequence is inferred.`;
    }else text=formatRollRequest(request,{user:pc.owner_user_id,db,guild});
    proof=request;
  }else if(row.status==='pending_pc_reaction'){
    const {terms}=inspectGmReactionInvitation(db,guild,pc.owner_user_id,row.record_key);
    text=terms.status==='withdrawn'?'You withheld this reaction. No roll, surrender or failed response was inferred.':terms.status==='resolved'
      ?'Your reaction has a saved native result. No additional roll or GM move is inferred.'
      :`Pending owner reaction: ${terms.trait}, Difficulty ${terms.difficulty}. ${terms.stakes}\nReview: /vc-roll window json:${JSON.stringify({op:'gm-reaction-review',request:row.record_key})}\nYour response is not assumed; review does not roll.`;
    proof=terms;
  }else if(n?.operation==='commit_adversary_attack'){
    const attack=db.listCityRecords(guild,{kind:'pc_incoming_attack',includeGM:true,limit:200}).find(r=>r.data.offer.input.ruling===`ai-decision:${key}`);
    if(!attack)return null;
    if(attack.data.roll){
      const r=incomingRollProjection(db,guild,attack.record_key).receipt.data;
      text=`Native incoming attack: d20 ${r.face} ${r.bonus>=0?'+':''}${r.bonus} = ${r.total} against Evasion ${r.evasion}: ${r.hit?'hit':'miss'}.`
        +(r.damage?` Damage roll ${r.damage.total}; native disposition ${attack.status}. Armor and death choices remain yours.`:' No damage rolled.');
    }else{
      authorizeIncomingOffer(db,guild,attack.record_key,{library});
      text=`Incoming native standard attack awaits your defense review (${attack.record_key}).\nReview: /vc-roll effect json:${JSON.stringify({op:'review',attack:attack.record_key})}\nNo attack dice, Armor spend or HP effect has occurred.`;
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
      character=entry?.actor.type==='character'?entry.actor.key:n?.character||n?.input?.character,pc=character&&db.getCharacter(character);
    if(!pc||scope.mode==='private'&&pc.id!==scope.actorCharacterId||!['pending_pc_roll','pending_pc_reaction','gm_action_ready'].includes(row.status))continue;
    const recipient={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
    try{const projection=nativeGmNotice(db,guild,row.record_key,recipient);if(projection)notices.push({ref:row.record_key,scope:recipient,...projection});}
    catch(error){if(!['GM_ARBITRATION','PC_EFFECT_AUTHORITY','SCENE_ACTION_WINDOW','SCENE_FICTION'].includes(error.code))throw error;}
  }
  return notices;
}
