import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>new Error(code);
/** Read-only legacy clear ancestry, after original condition/effect validation. Never a new clear grant. */
const clearKey=condition=>`native-condition-clear:${hash(condition)}`;
const actionHash=action=>hash({key:action.record_key,source:action.source_event,type:action.data.type,
  actor:action.data.actor,owner:action.data.owner_user_id,principal:action.data.actor_principal_revision,
  scene:action.data.scene,session:action.data.session_id,source_hash:action.data.source_hash,
  start:action.data.start,end:action.data.end,framing:action.data.framing,
  operation:action.data.operation,target:action.data.target_key});
export function inspectNativeConditionClearAncestry(db,guild,condition){
  const actual=condition&&db.getCityRecord(guild,'pc_native_condition',condition.record_key),
    receipt=actual&&db.getCityRecord(guild,'pc_native_condition_clear',clearKey(actual.record_key)),d=receipt?.data,
    source=receipt&&db.getWorldEvent(guild,receipt.source_event),mutation=d&&db.getMutation(guild,d.mutation);
  if(!actual||hash(actual)!==hash(condition)||actual.status!=='cleared'||receipt?.status!=='resolved'
    ||receipt.visibility!=='character'||receipt.subject_key!==actual.subject_key||d?.version!==1
    ||d.condition!==actual.record_key||d.condition_hash!==hash(actual.data)||d.owner!==actual.data.owner
    ||source?.status!=='active'||source.kind!=='native_condition_clear'||source.source_id!=='native:unified-gm'
    ||source.visibility!=='character'||source.subject_key!==actual.subject_key||source.scene!==d.scene||source.session_id!==d.session
    ||source.details.payload_hash!==hash(d)||source.details.input_source!==d.action_source
    ||mutation?.source_layer!=='native_condition'||mutation.mutation_type!=='owner_action_condition_clear'
    ||mutation.actor_type!=='system'||mutation.actor_id!=='native:unified-gm'
    ||mutation.entity_key!==actual.subject_key||mutation.session_id!==d.session||mutation.visibility!=='character'
    ||hash(JSON.parse(mutation.before_json))!==hash(d.before)||hash(JSON.parse(mutation.after_json))!==hash(d.after)
    ||hash(d.after)!==hash(d.before.map(c=>c.native_ref===actual.record_key?{...c,active:false}:c)))
    throw fail('native_condition_clear_immutable_ancestry');
  // This release was already committed under actionProof. Inspect its sealed ancestry,
  // not today's location, attendance or controller. This reader cannot authorize a new clear.
  const action=db.getCityRecord(guild,'typed_intent',d.action),a=action?.data,
    authored=action&&db.getWorldEvent(guild,action.source_event),s=authored?.details,
    result=db.getCityRecord(guild,'action_outcome_receipt',d.prerequisite);
  if(action?.status!=='resolved'||!a||d.action_hash!==actionHash(action)||d.action_source!==action.source_event
    ||d.character!==actual.subject_key||a.actor!==d.character||a.owner_user_id!==d.owner||a.actor_principal_revision!==d.principal
    ||a.scene!==d.scene||a.session_id!==d.session||a.type!=='interact'||a.operation!=='clear_condition'
    ||a.target_key!==actual.record_key||a.framing!=='immediate'
    ||!['party','private'].includes(d.scope?.mode)||d.scope.actorUserId!==d.owner||d.scope.actorCharacterId!==d.character
    ||authored?.status!=='active'||authored.kind!=='authored_turn'||authored.source_id!==`player:${d.owner}`
    ||authored.scene!==d.scene||authored.session_id!==d.session||s?.author!==d.owner||s.character_id!==d.character
    ||s.principal_revision!==d.principal||!db.ownerAuthoredSource(guild,authored.event_key,d.owner)
    ||typeof s.raw_text!=='string'||s.raw_hash!==a.source_hash||createHash('sha256').update(s.raw_text).digest('hex')!==a.source_hash
    ||!Number.isSafeInteger(a.start)||!Number.isSafeInteger(a.end)||a.start<0||a.end<=a.start||a.end>s.raw_text.length
    ||s.raw_text.slice(a.start,a.end)!==a.source_span||action.visibility!==authored.visibility
    ||(action.subject_key||null)!==(authored.subject_key||null)
    ||action.visibility==='character'&&(d.scope.mode!=='private'||action.subject_key!==d.character)
    ||result?.status!=='resolved'||d.prerequisite_hash!==hash(result)||a.outcome_receipt!==result.record_key
    ||result.source_event!==action.source_event||result.data.action_id!==action.record_key||result.data.actor_ref!==d.character
    ||!['resolved_no_roll','success'].includes(result.data.outcome))
    throw fail('native_condition_clear_saved_source_owner_result');
  return receipt;
}
