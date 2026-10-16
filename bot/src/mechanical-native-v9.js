/** Read-only v9 adapters over accepted input and native receipts. Never invoke RNG. */
import {projectMechanicalInput,projectMechanicalOutput} from './mechanical-boundary-v9.js';
import {consentAction} from './action-consent.js';
import {pendingRollRequests} from './roll-requests.js';
import {nativeOutcomeProjection} from './native-outcome-output.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail} from './scene-fiction-context.js';
import {isPvpIntent} from './pvp-authority.js';
import {incomingRollProjection} from './pc-incoming.js';
import {revalidateNarrativeAudience} from './audience-native-v9.js';

/** Shared exact selection rule; no sole-pending heuristic or generated request authority. */
export function exactTypedRollSelection(db,guild,declaration,scope,operation,{targetKey=declaration.data.target_key}={}){
  const {row}=consentAction(db,guild,declaration.record_key);
  if(hash(row)!==hash(declaration)||row.data.actor!==scope.actorCharacterId||row.data.owner_user_id!==scope.actorUserId
    ||(scope.mode==='private'?row.visibility!=='character'||row.subject_key!==scope.actorCharacterId:row.visibility!=='party')
    ||isPvpIntent(db,guild,row))throw fail('mechanical_input_owner_or_scope');
  return pendingRollRequests(db,guild,scope.actorUserId).filter(q=>q.subject_key===scope.actorCharacterId
    &&q.status===(operation==='damage'?'awaiting_damage':'pending')
    &&(q.data.input?.accepted_intent===row.record_key||targetKey===q.record_key&&row.data.target_key===q.record_key
      &&row.data.source_span.split(/\s|[.,;!?()[\]{}"'`]/).includes(q.record_key)));
}
export function nativeMechanicalInput(db,guild,{authority,grant},typedKey){
  const b=authority.inspect(grant),{row}=consentAction(db,guild,typedKey),d=row.data;
  revalidateNarrativeAudience(db,guild,b,b.scope);
  if(d.type!=='roll'||d.framing!=='immediate'||d.world_source_event!==b.source_event
    ||!['request_roll','roll','damage'].includes(d.operation))throw fail('mechanical_input_source');
  const kind=d.operation==='request_roll'?'request_roll':'submit_roll';
  return projectMechanicalInput({authority,grant,intent:{kind,typed_intent_key:typedKey,task_id:b.task_ids[0]},
    verifyInput:()=>{
      if(d.actor!==b.recipient_character_id||d.owner_user_id!==b.recipient_user_id||d.actor_principal_revision!==b.principal
        ||d.scene!==b.scene||d.session_id!==b.session)throw fail('mechanical_input_binding');
      const selected=kind==='submit_roll'?exactTypedRollSelection(db,guild,row,b.scope,d.operation):[];
      return {verified:true,source_event:b.source_event,typed_intent_key:typedKey,proof_ref:typedKey,
        disposition:kind==='request_roll'?'needs_adjudication':selected.length===1?'native_pending':'needs_selection',
        exact_request_ref:selected.length===1?selected[0].record_key:null,actor_character_id:d.actor,owner_user_id:d.owner_user_id};
    }});
}
export function nativeMechanicalOutput(db,guild,{authority,grant},input){
  const b=authority.inspect(grant);
  revalidateNarrativeAudience(db,guild,b,b.scope);
  return projectMechanicalOutput({authority,grant,receiptRef:input?.ref,verifyReceipt:ref=>{
    if(input?.version===9&&input.kind==='mechanical_output'&&input.receipt_kind==='npc_attack_roll_receipt'){
      if(Object.keys(input).sort().join()!=='kind,receipt_kind,ref,version')throw fail('gm_roll_output_shape');
      const native=incomingRollProjection(db,guild,ref.replace(/:roll$/u,'')),r=native.receipt;
      if(ref!==r.record_key||b.audience!=='player_private'||b.recipient_character_id!==r.subject_key
        ||native.offer.snapshot.owner!==b.recipient_user_id)throw fail('gm_roll_output_audience');
      return {verified:true,ref,proof_ref:`gm-output-v9:${hash([r,b.proof_ref])}`,audience:b.audience,
        request_source_event:b.source_event,native_source_event:r.source_event,subject:{kind:'adversary',id:native.offer.input.npc},
        native_detail:{roll_id:r.data.roll,attack:native.row.record_key,source:r.source_event,faces:r.data.gm_d20?.faces||[r.data.face],selected_d20:r.data.face,
          modifier:r.data.bonus,evasion:r.data.evasion,critical:r.data.face===20?'gm_attack_critical':'none',damage:r.data.damage,
          disposition:native.row.status,payment_refs:r.data.cost_ref?[r.data.cost_ref]:[],fingerprint:hash(r)},
        rendered_text:`Native adversary attack: d20 ${r.data.face} ${r.data.bonus>=0?'+':''}${r.data.bonus} = ${r.data.total}; Evasion ${r.data.evasion}; ${r.data.hit?'hit':'miss'}.`
          +(r.data.damage?` Damage roll ${r.data.damage.total}; target Armor/effect resolution remains native (${native.row.status}).`:' No damage rolled.')};
    }
    const projected=nativeOutcomeProjection(db,guild,input,b.scope),row=db.getCityRecord(guild,input.receipt_kind,ref);
    if(!row)throw fail('mechanical_output_receipt');
    return {verified:true,ref,proof_ref:`mechanical-v9:${hash([input,projected.revision,b.proof_ref])}`,
      audience:b.audience,request_source_event:b.source_event,native_source_event:projected.source.event_key,
      subject_character_id:row.subject_key||b.recipient_character_id,rendered_text:projected.text};
  }});
}
