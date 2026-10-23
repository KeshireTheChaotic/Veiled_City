/** Typed native execution rules. Supplied source/native capabilities preserve the authoritative commit transaction; no provider, transport or global registry is constructed. */
import {createHash} from 'node:crypto';
export function createTypedRollResolver({source,mechanics,reserveCampaignAttackNotices}){
  if(typeof source?.authoredTurnEnvelope!=='function'||typeof reserveCampaignAttackNotices!=='function')throw new TypeError('Typed native source and notice capabilities required.');
  const {rollRevision,contributeRoll,isPvpIntent,consentAction,historicalActionSource,exactTypedRollSelection,exactTypedPvpSelection,rollPvpAttack,validatePvpAttackRoll,rollPvpDamage,validatePvpDamageRoll}=mechanics||{};
  if([rollRevision,contributeRoll,isPvpIntent,consentAction,historicalActionSource,exactTypedRollSelection,exactTypedPvpSelection,rollPvpAttack,validatePvpAttackRoll,rollPvpDamage,validatePvpDamageRoll].some(fn=>typeof fn!=='function'))throw new TypeError('Complete typed native mechanics capability required.');
  const {authoredTurnEnvelope}=source;
const hash=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0,32);

/** Executed ONLY inside commitGmTurn's authoritative DB transaction; never in dry-run preview. */
function resolveTypedNativeRolls(db,guild,scope,intents=[],messageId=''){
  if(!scope?.actorCharacterId||!scope.actorUserId||!messageId)return [];
  const results=[];
  for(const [index,intent] of intents.entries()){
    // Interpretation does not authorize spending, assistance, sharing, consent, or rolling for others.
    if(intent?.type!=='roll'||intent.framing!=='immediate'||!['roll','damage'].includes(intent.operation))continue;
    if(!['roll_required','conversational'].includes(intent.resolution))continue;
    if(isPvpIntent(db,guild,{data:{...intent,actor:scope.actorCharacterId}})){
      results.push({status:'needs_consent',operation:intent.operation,reason:'PC conflict requires locked bilateral narrative PvP.'});
      continue;
    }
    const envelope=authoredTurnEnvelope(db,guild,messageId,scope.actorCharacterId);
    const accepted=envelope&&db.listCityRecords(guild,{kind:'typed_intent',includeGM:true,limit:500}).filter(a=>
      a.source_event===envelope.source_event&&a.data.actor===scope.actorCharacterId&&a.data.owner_user_id===scope.actorUserId
      &&a.data.type==='roll'&&a.data.operation===intent.operation&&a.data.source_span===intent.source_span&&a.data.framing==='immediate');
    const declaration=accepted?.length===1?accepted[0]:null;
    const operationKey=`typed-roll:${hash([guild,messageId,scope.actorCharacterId,index])}`;
    const pvpPrior=declaration&&db.getCityRecord(guild,'pvp_typed_roll_operation',operationKey);
    if(pvpPrior){
      historicalActionSource(db,guild,declaration.record_key,{resolved:true});
      const data=pvpPrior.data,proof=data.operation==='roll'?validatePvpAttackRoll(db,guild,data.receipt):validatePvpDamageRoll(db,guild,data.receipt);
      if(data.accepted_intent!==declaration.record_key||data.owner!==scope.actorUserId||data.operation!==intent.operation
        ||proof.offer.actor!==scope.actorCharacterId||data.request!==declaration.data.target_key
        ||pvpPrior.source_event!==declaration.source_event||(scope.mode==='private'?declaration.visibility!=='character':declaration.visibility!=='party'))
        throw new Error('Exact owner PvP operation replay required; no new dice.');
      results.push({status:'accepted',data:{intent:{feature:'pvp',operation:intent.operation},result:{record_key:data.receipt}},source_span:intent.source_span});
      continue;
    }
    const prior=declaration&&db.getCityRecord(guild,'roll_operation',`${operationKey}:${scope.actorCharacterId}`);
    if(prior){
      historicalActionSource(db,guild,declaration.record_key,{resolved:declaration.status==='resolved'});
      const q=db.getCityRecord(guild,'roll_request',prior.data.request);
      if(prior.data.user!==scope.actorUserId||prior.data.op!==intent.operation||prior.data.authorization.accepted_intent!==declaration.record_key
        ||prior.data.authorization.key!==operationKey||!q||prior.data.result.record_key!==q.record_key
        ||q.subject_key!==scope.actorCharacterId||q.data.owner_user_id!==scope.actorUserId
        ||(scope.mode==='private'?declaration.visibility!=='character':declaration.visibility!=='party'))
        throw new Error('Exact native operation replay source, actor and audience required; no effects repeated.');
      results.push({status:'accepted',data:{intent:{feature:'roll',operation:intent.operation},result:{record_key:q.record_key}},source_span:intent.source_span});
      continue;
    }
    let verified=false;
    if(declaration){consentAction(db,guild,declaration.record_key);verified=envelope.user_id===scope.actorUserId
      &&(scope.mode==='private'?declaration.visibility==='character'&&declaration.subject_key===scope.actorCharacterId
        :declaration.visibility==='party');}
    const pvp=verified?exactTypedPvpSelection(db,guild,declaration,scope,intent.operation):null;
    if(pvp){
      const receipt=intent.operation==='roll'?rollPvpAttack(db,guild,scope.actorUserId,{attack:pvp.record_key,expected_revision:pvp.data.offer_hash})
        :rollPvpDamage(db,guild,scope.actorUserId,{attack_receipt:pvp.data.roll});
      const record=db.saveCityRecord(guild,{kind:'pvp_typed_roll_operation',key:operationKey,status:'resolved',visibility:'character',
        subject_key:scope.actorCharacterId,source_event:declaration.source_event,
        data:{version:1,accepted_intent:declaration.record_key,owner:scope.actorUserId,request:pvp.record_key,operation:intent.operation,receipt:receipt.record_key}});
      const outcome=db.saveCityRecord(guild,{kind:'action_outcome_receipt',key:`${operationKey}:pvp`,status:'resolved',visibility:'character',
        subject_key:scope.actorCharacterId,source_event:declaration.source_event,data:{action_id:declaration.record_key,
          actor_ref:scope.actorCharacterId,outcome:'native_roll_contribution',native_roll_refs:[receipt.data.roll_id],state_mutations:[],
          audience:'character',operation:record.record_key,native_receipt:receipt.record_key}});
      db.saveCityRecord(guild,{...declaration,key:declaration.record_key,status:'resolved',data:{...declaration.data,outcome_receipt:outcome.record_key,
        native_disposition:'native_pvp_roll_contribution'}});
      if(db.getCityRecord(guild,'pvp_encounter_contract',pvp.data.offer.contract)?.data.version===4)reserveCampaignAttackNotices(db,guild,pvp.record_key);
      results.push({status:'accepted',data:{intent:{feature:'pvp',operation:intent.operation},result:{record_key:receipt.record_key}},source_span:intent.source_span});
      continue;
    }
    // Explicit native identities are exact source tokens, not a model target/name guess or a sole-request heuristic.
    const selected=verified?exactTypedRollSelection(db,guild,declaration,scope,intent.operation,{targetKey:intent.target_key||''}):[];
    if(selected.length!==1){
      if(verified)db.saveCityRecord(guild,{...declaration,key:declaration.record_key,data:{...declaration.data,
        resolution:'needs_clarification',native_disposition:'exact_request_selection_required'}});
      results.push({status:'needs_clarification',operation:intent.operation,reason:'Select an exact owned request, or use its current accepted roll declaration; no unrelated request was consumed.'});
      continue;
    }
    const row=selected[0];
    const result=contributeRoll(db,guild,scope.actorUserId,{
      op:intent.operation,request:row.record_key,expected_revision:rollRevision(row),
      key:operationKey,accepted_intent:declaration.record_key});
    if(result.data.input?.accepted_intent!==declaration.record_key){
      const key=`roll-contribution:${hash([declaration.record_key,row.record_key,result.data.revision])}`;
      db.saveCityRecord(guild,{kind:'action_outcome_receipt',key,status:'resolved',source_event:declaration.source_event,
        visibility:'character',subject_key:scope.actorCharacterId,data:{action_id:declaration.record_key,source_event:declaration.source_event,
          actor_ref:scope.actorCharacterId,outcome:'native_roll_contribution',request:row.record_key,
          authorization_source:declaration.source_event,operation:`${operationKey}:${scope.actorCharacterId}`,
          native_roll_refs:result.data.roll_id?[result.data.roll_id]:[],state_mutations:[],
          audience:'character',authority:'Exact owner-authorized native operation only; underlying request receipts own game success.'}});
      db.saveCityRecord(guild,{...declaration,key:declaration.record_key,status:'resolved',data:{...declaration.data,
        outcome_receipt:key,native_disposition:'native_roll_contribution'}});
    }
    results.push({status:'accepted',data:{intent:{feature:'roll',operation:intent.operation},
      result:{record_key:result.record_key}},source_span:intent.source_span});
  }
  return results;
}

  return Object.freeze({resolveTypedNativeRolls});
}
