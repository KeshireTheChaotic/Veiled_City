/** Bounded feature consequences from actual owner reaction receipts. Never model-authored PC effects. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {inspectFeatureWindow} from './native-feature-windows.js';
import {typedRollProof} from './typed-roll-proof.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

const FEEDBACK='adversary:static-wraith:feedback';
const effectKey=decision=>`feature-effect:${hash(decision)}`;
/** Restriction only: an inventory marker never certifies a new effect or grants reset authority. */
export function nativeDeviceUseIssue(pc,accepted){
  if(accepted?.data.type!=='interact'||accepted.data.operation!=='use_device')return null;
  const device=pc?.data.inventory?.find(i=>i?.id===accepted.data.target_key);
  return device?.disabled_by?'NATIVE_DEVICE_RESET_REQUIRED':null;
}
export function featureReactionStakes(feature){
  if(feature!==FEEDBACK)throw fail('feature_reaction_stakes_adapter');
  return 'On a failed Instinct reaction, mark 1 Stress and the electronic device shuts down until repaired or reset. On success it does not. Your roll is not assumed.';
}
function paymentProof(db,guild,row){
  const n=row.data.native,cost=db.getCityRecord(guild,'gm_action_cost_receipt',`gm-feature-cost:${hash(row.record_key)}`);
  const {payment_source,...paid}=cost?.data||{},payment=payment_source&&db.getWorldEvent(guild,payment_source);
  if(n.feature!==FEEDBACK||n.operation!=='request_feature_reaction_roll'
    ||cost?.status!=='committed'||cost.visibility!=='gm'||cost.source_event!==row.source_event||hash(cost.data.feature_cost)!==hash(n.cost)
    ||payment?.status!=='active'||payment.visibility!=='gm'||payment.kind!=='native_feature_payment'||payment.source_id!=='native:unified-gm'
    ||payment.details.input_source!==row.source_event||payment.details.payload_hash!==hash(paid)
    ||cost.data.amount!==0||cost.data.before!==cost.data.after||cost.data.npc_stress?.after-cost.data.npc_stress?.before!==1)
    throw fail('feature_invitation_cost_source');
  return cost;
}
export function validateFeatureInvitation(db,guild,row,terminal){
  const n=row.data.native,w=inspectFeatureWindow(db,guild,n.window),pc=db.getCharacter(n.character);
  paymentProof(db,guild,row);
  if(pc?.owner_user_id!==n.owner)throw fail('feature_invitation_current_owner');
  if(terminal?.status==='withdrawn'){
    if(w.status!=='cancelled')throw fail('feature_withdrawal_terminal');return;
  }
  const effect=db.getCityRecord(guild,'gm_feature_effect_receipt',effectKey(row.record_key));
  if(effect){validateFeatureReactionEffect(db,guild,effect.record_key);return;}
  const device=pc.data.inventory.find(i=>i?.id===n.device_key);
  if(w.status!=='hold_for_owner'||hash(pc.data.resources)!==n.resources_hash||hash(device)!==w.data.device_hash||device?.disabled_by)
    throw fail('feature_pending_target_state_changed');
}
export function cancelFeatureReaction(db,guild,decision){
  const {row}=inspectNativeGmDecision(db,guild,decision),n=row.data.native,w=inspectFeatureWindow(db,guild,n.window),
    terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([decision,n.owner])}`);
  if(n.feature!==FEEDBACK||terminal?.status!=='withdrawn'||terminal.data.invitation_hash!==hash(row.data))throw fail('feature_exact_owner_withdrawal');
  db.saveCityRecord(guild,{...w,key:w.record_key,status:'cancelled'});
}
export function applyFeatureReactionOutcome(db,guild,decision,request){
  return db.transaction(()=>{
    const {row}=inspectNativeGmDecision(db,guild,decision),n=row.data.native,key=effectKey(decision),prior=db.getCityRecord(guild,'gm_feature_effect_receipt',key);
    if(prior)return validateFeatureReactionEffect(db,guild,key);
    const terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([decision,n.owner])}`),proof=typedRollProof(db,guild,request);
    if(n.feature!==FEEDBACK||request.data.kind!=='reaction'||request.data.input.gm_invitation!==decision||terminal?.status!=='resolved'
      ||terminal.data.request!==request.record_key||request.subject_key!==n.character||request.data.owner_user_id!==n.owner
      ||request.data.breakdown.trait!=='Instinct'||proof.difficulty!==12||proof.outcome==='needs_review')throw fail('feature_actual_owner_reaction');
    validateFeatureInvitation(db,guild,row,terminal);
    const pc=db.getCharacter(n.character),before=structuredClone(pc.data.resources),device=pc.data.inventory.find(i=>i?.id===n.device_key),success=proof.outcome==='success';
    if(!success&&before.stress.current>=before.stress.max)throw fail('feature_stress_overflow_adapter_required');
    if(!success)db.updateCharacterData(pc.id,data=>{data.resources.stress.current++;data.inventory.find(i=>i?.id===n.device_key).disabled_by=key;});
    const current=db.getCharacter(pc.id),after=current.data.resources,nextDevice=current.data.inventory.find(i=>i?.id===n.device_key),
      mutation=db.recordMutation(guild,{sessionId:row.data.origin.session,actorType:'ai_gm',actorId:'native:unified-gm',sourceLayer:'native_feature',
        mutationType:'verified_feedback_reaction',entityKey:pc.id,visibility:'character',before:{resources:before,device_hash:hash(device)},
        after:{resources:after,device_hash:hash(nextDevice)},rationale:'Actual owner reaction to a source-verified native adversary feature.',payload:{decision,request:request.record_key}});
    const data={version:1,feature:n.feature,feature_hash:n.feature_hash,decision,window:n.window,character:pc.id,owner:n.owner,
      request:request.record_key,roll:request.data.roll_id,source:request.source_event,success,before,after,device_key:n.device_key,
      device_before:hash(device),device_after:hash(nextDevice),disabled_before:device.disabled_by||null,disabled_after:nextDevice.disabled_by||null,mutation:mutation.id};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_feature_effect',source_id:'native:unified-gm',title:'Native owner reaction consequence',
      session_id:row.data.origin.session,scene:row.data.origin.scene,location_key:row.data.origin.location,visibility:'character',subject_key:pc.id,
      details:{input_source:row.source_event,owner_source:request.source_event,payload_hash:hash(data)}},'native:unified-gm');
    const saved=db.saveCityRecord(guild,{kind:'gm_feature_effect_receipt',key,status:'resolved',source_event:source.event_key,visibility:'character',subject_key:pc.id,data});
    const w=db.getCityRecord(guild,'native_feature_window',n.window);db.saveCityRecord(guild,{...w,key:w.record_key,status:'resolved'});return saved;
  });
}
export function validateFeatureReactionEffect(db,guild,key){
  const receipt=db.getCityRecord(guild,'gm_feature_effect_receipt',key),v=receipt?.data,event=receipt&&db.getWorldEvent(guild,receipt.source_event),
    row=v&&inspectNativeGmDecision(db,guild,v.decision).row,n=row?.data.native,request=v&&db.getCityRecord(guild,'roll_request',v.request),proof=request&&typedRollProof(db,guild,request),
    terminal=v&&db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([v.decision,v.owner])}`),mutation=v&&db.getMutation(guild,v.mutation),expected=v&&structuredClone(v.before);
  if(v&&!v.success)expected.stress.current++;
  if(row)paymentProof(db,guild,row);
  if(!v||!row||receipt.status!=='resolved'||receipt.visibility!=='character'||receipt.subject_key!==v.character||v.feature!==FEEDBACK
    ||event?.status!=='active'||event.kind!=='native_feature_effect'||event.source_id!=='native:unified-gm'||event.visibility!=='character'||event.subject_key!==v.character
    ||event.session_id!==row.data.origin.session||event.scene!==row.data.origin.scene||event.details.payload_hash!==hash(v)
    ||event.details.input_source!==row.source_event||event.details.owner_source!==request.source_event||key!==effectKey(v.decision)
    ||n.feature!==v.feature||n.character!==v.character||n.owner!==v.owner||n.window!==v.window||n.feature_hash!==v.feature_hash
    ||request.data.kind!=='reaction'||request.data.input.gm_invitation!==v.decision||request.data.roll_id!==v.roll||request.source_event!==v.source
    ||request.data.owner_user_id!==v.owner||request.subject_key!==v.character||proof.difficulty!==12||proof.outcome==='needs_review'||v.success!==(proof.outcome==='success')
    ||terminal?.status!=='resolved'||terminal.data.request!==v.request||terminal.data.invitation_hash!==hash(row.data)
    ||hash(v.before)!==n.resources_hash||hash(v.after)!==hash(expected)||v.before.stress.current>=v.before.stress.max
    ||v.device_key!==n.device_key||v.device_before!==db.getCityRecord(guild,'native_feature_window',n.window)?.data.device_hash||v.disabled_before!==null
    ||(v.success?(v.disabled_after!==null||v.device_after!==v.device_before):v.disabled_after!==key)
    ||mutation?.source_layer!=='native_feature'||mutation.entity_key!==v.character
    ||hash(JSON.parse(mutation.before_json))!==hash({resources:v.before,device_hash:v.device_before})
    ||hash(JSON.parse(mutation.after_json))!==hash({resources:v.after,device_hash:v.device_after}))throw fail('native_feature_effect_ancestry');
  return receipt;
}
