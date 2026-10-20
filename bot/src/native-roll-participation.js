/** Source-bound collaboration eligibility. This never enrolls an owner, spends Hope or rolls dice. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {sceneAccess,scenePresence} from './scene-continuity.js';
import {mayKnowRoll} from './roll-collaboration.js';
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
import {isPvpIntent} from './pvp-authority.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

const issuer='native:roll-participation';
const declaration=a=>({key:a.record_key,source:a.source_event,source_hash:a.data.source_hash,actor:a.data.actor,
  owner:a.data.owner_user_id,principal:a.data.actor_principal_revision,session:a.data.session_id,scene:a.data.scene,
  audience:a.visibility,subject:a.subject_key||null,span:a.data.source_span,operation:a.data.operation,type:a.data.type,
  framing:a.data.framing,target:a.data.target_key||'',dependencies:a.data.dependencies||[],coordination:a.data.coordination||null});
function action(db,guild,key,historical,{helpEligibility=false}={}){
  const a=db.getCityRecord(guild,'typed_intent',key);
  if(!a)throw fail('participation_exact_action_missing');
  (historical?historicalActionSource:consentAction)(db,guild,key,{resolved:a.status==='resolved'});
  const scopedHelp=helpEligibility&&a.data.type==='interact'&&a.data.operation==='help_ally';
  if(isPvpIntent(db,guild,a)&&!scopedHelp||a.data.framing!=='immediate'||a.data.coordination
    ||!historical&&a.data.dependencies?.some(ref=>db.getCityRecord(guild,'typed_intent',ref)?.status!=='resolved'))throw fail('participation_exact_unblocked_nonpvp_action');
  return a;
}
function request(db,guild,key,historical){
  const q=db.getCityRecord(guild,'roll_request',key),a=action(db,guild,q?.data.input?.accepted_intent,historical);
  if(!q||q.visibility!=='character'||q.subject_key!==a.data.actor||q.source_event!==a.source_event
    ||q.data.owner_user_id!==a.data.owner_user_id||q.data.session_id!==a.data.session_id||q.data.scene!==a.data.scene
    ||!historical&&q.status!=='pending')throw fail('participation_exact_pending_request');
  return {q,a};
}
function communication(db,guild,q,pc){
  if(!mayKnowRoll(db,guild,q,pc.id)||!sceneAccess(db,guild,{observer_type:'character',observer_key:pc.id,
    target_type:'character',target_key:q.subject_key,sense:'sound'}))throw fail('participation_private_or_inaccessible_attempt');
}
function mint(db,guild,o,q,a,kind,partnerRequest=null){
  const pc=db.getCharacter(a.data.actor),target=action(db,guild,q.data.input.accepted_intent,false);
  communication(db,guild,q,pc);
  const presence=scenePresence(db,guild,'character',pc.id),targetPresence=scenePresence(db,guild,'character',q.subject_key);
  if(presence?.data.state!=='actually_present'||targetPresence?.data.state!=='actually_present'
    ||presence.location_key!==targetPresence.location_key||presence.data.scene!==a.data.scene
    ||!narrativeSourceVisible(db,guild,a.source_event,o.scope)||!narrativeSourceVisible(db,guild,target.source_event,o.scope))
    throw fail('participation_current_source_presence_audience');
  const binding={version:1,issuer,origin:o.binding,request:q.record_key,request_source:q.source_event,
    target:declaration(target),contributor:declaration(a),kind,description:a.data.source_span,partner_request:partnerRequest,
    roll_kind:q.data.kind,trait:q.data.input.trait,presence:hash(presence),target_presence:hash(targetPresence)};
  const key=`native-participation:${hash(binding)}`;
  if(!db.getWorldEvent(guild,key)){
    const mutation=db.recordMutation(guild,{sessionId:a.data.session_id,actorType:'ai_gm',actorId:issuer,
      sourceLayer:'native_roll_participation',mutationType:'prepare_participation',entityKey:q.record_key,visibility:'gm',after:binding});
    indexWorldEvent(db,guild,{key,kind:'roll_adjudication',title:'Native collaboration eligibility',source_kind:'mutation',source_id:mutation.id,
      session_id:a.data.session_id,scene:a.data.scene,visibility:'gm',
      details:{issuer,binding,payload_hash:hash(binding),roll_participation:{request:q.record_key,character_id:pc.id,kind,description:a.data.source_span}}},issuer);
  }
  return key;
}

export function prepareNativeRollParticipation(db,guild,origin,entry,proposal){
  const o=inspectArbitrationOrigin(db,guild,origin),c=proposal.collaboration,a=action(db,guild,entry.intent_ref,false,{helpEligibility:c.kind==='help'}),
    {q,targetAction}=(()=>{const r=request(db,guild,c.request,false);return {q:r.q,targetAction:r.a};})();
  if(entry.actor.type!=='character'||entry.actor.key!==a.data.actor||proposal.disposition!=='native_feature_resolution'
    ||proposal.stakes_kind!=='attempt_only'||proposal.feature_ref||proposal.experience_ref||proposal.advantage||proposal.disadvantage
    ||proposal.difficulty!==null||proposal.trait!==null||a.data.scene!==o.binding.scene||a.data.session_id!==o.binding.session
    ||q.data.scene!==a.data.scene||q.data.session_id!==a.data.session_id)throw fail('participation_exact_native_selection');
  return db.transaction(()=>{
    if(c.kind==='help'){
      if(a.data.operation!=='help_ally'||a.data.target_key!==q.subject_key||a.data.actor===q.subject_key||q.data.kind!=='action'
        ||q.data.tag||q.data.breakdown.disadvantage>q.data.breakdown.advantage||c.partner_request
        ||!proposal.rule_basis_refs.includes('srd:help-an-ally'))throw fail('help_source_or_disadvantage_requires_review');
      const proof=mint(db,guild,o,q,a,'help');
      return {operation:'owner_collaboration',request:q.record_key,choices:[{character:a.data.actor,proof,op:'help',pay_hope:true}]};
    }
    const other=request(db,guild,c.partner_request,false);
    if(c.kind!=='tag'||targetAction.record_key!==a.record_key||q.subject_key===other.q.subject_key||q.data.kind==='reaction'
      ||q.data.kind!==other.q.data.kind||q.data.tag||other.q.data.tag||q.data.helpers?.length||other.q.data.helpers?.length
      ||q.data.experiences?.length||other.q.data.experiences?.length
      ||q.data.kind==='attack'&&q.data.breakdown.attack?.target_id!==other.q.data.breakdown.attack?.target_id
      ||!proposal.rule_basis_refs.includes('srd:tag-team-rolls'))throw fail('tag_exact_compatible_independent_requests');
    const initiator=mint(db,guild,o,q,a,'tag',other.q.record_key),partner=mint(db,guild,o,q,other.a,'participate',other.q.record_key);
    return {operation:'owner_collaboration',request:q.record_key,choices:[
      {character:a.data.actor,proof:initiator,op:'tag',partner_request:other.q.record_key,pay_hope:true},
      {character:other.a.data.actor,proof:partner,op:'participate'}]};
  });
}

export function inspectNativeRollParticipation(db,guild,row,pc,event,kind,description,{historical=false}={}){
  const b=event?.details?.binding,m=event&&db.getMutation(guild,event.source_id);
  if(!b||b.version!==1||b.issuer!==issuer||event.status!=='active'||event.kind!=='roll_adjudication'||event.source_kind!=='mutation'
    ||event.details.issuer!==issuer||event.details.payload_hash!==hash(b)||event.event_key!==`native-participation:${hash(b)}`
    ||m?.actor_type!=='ai_gm'||m.actor_id!==issuer||m.source_layer!=='native_roll_participation'||m.mutation_type!=='prepare_participation'
    ||m.entity_key!==row.record_key||m.visibility!=='gm'||hash(JSON.parse(m.after_json))!==hash(b)
    ||event.visibility!=='gm'||event.subject_key!==null||event.session_id!==row.data.session_id||event.scene!==row.data.scene
    ||b.request!==row.record_key||b.request_source!==row.source_event||b.kind!==kind||b.description!==description
    ||b.roll_kind!==row.data.kind||b.trait!==row.data.input.trait)throw fail('participation_native_ancestry');
  const contributor=action(db,guild,b.contributor.key,historical,{helpEligibility:kind==='help'}),target=action(db,guild,b.target.key,historical),source=db.getWorldEvent(guild,b.origin.source);
  if(hash(declaration(contributor))!==hash(b.contributor)||hash(declaration(target))!==hash(b.target)
    ||contributor.data.actor!==pc.id||row.data.input.accepted_intent!==target.record_key
    ||source?.status!=='active'||hash(source.details)!==b.origin.source_hash
    ||hash(event.details.roll_participation)!==hash({request:row.record_key,character_id:pc.id,kind,description}))throw fail('participation_source_owner_or_terms_changed');
  if(!historical){
    if(db.getCityCalendar(guild).flags.gm_discretion!==true||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual')throw fail('participation_native_authority_disabled');
    communication(db,guild,row,pc);
    if(hash(scenePresence(db,guild,'character',pc.id))!==b.presence
      ||hash(scenePresence(db,guild,'character',row.subject_key))!==b.target_presence)throw fail('participation_presence_changed');
  }
  return event.details.roll_participation;
}
