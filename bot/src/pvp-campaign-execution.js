/** V4 campaign attack scope. Policy is permission to adjudicate, never another owner's consent. */
import {createHash} from 'node:crypto';
import {campaignPvpPolicy,assertPvpSafety} from './pvp-campaign-policy.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {conversationPrincipal,historicalOwnerPrincipal} from './conversation-principal.js';
import {pvpTarget} from './pvp-authority.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fail(message){throw Object.assign(new Error(message),{code:'NARRATIVE_PVP',expected:true});}
function participants(db,guild,ids,committed){return ids.map(character=>{
  const pc=db.getCharacter(character),principal=(committed?historicalOwnerPrincipal:conversationPrincipal)(db,guild,pc?.owner_user_id,character);
  if(pc?.guild_id!==guild||principal.kind!==(committed?'historical_owner':'owner'))fail('Exact current campaign owner required; never proxy participation.');
  return {character,user:pc.owner_user_id,principal_revision:principal.revision,team:null};
});}
function placement(db,guild,ids,location){
  const scene=currentScene(db,guild);
  for(const id of ids){const p=scenePresence(db,guild,'character',id);
    const pc=db.getCharacter(id),source=p&&db.getWorldEvent(guild,p.source_event);
    if(pc?.data.location!==location||p?.status!=='active'||p.data.state!=='actually_present'||p.location_key!==location
      ||p.data.hidden||p.data.scene!==scene.key||p.data.session_id!==scene.session_id
      ||['travelling','traveling','in_transit'].includes(pc.data.travel?.status)
      ||source?.status!=='active'||source.scene!==scene.key||source.session_id!==scene.session_id)
      fail('Current source-backed co-located campaign attack participants required.');}
}
export function stageCampaignPvp(db,guild,accepted){
  if(!['attack','unarmed_attack','weapon_attack'].includes(accepted.data.operation)||!pvpTarget(db,guild,accepted))return null;
  assertPvpSafety(db,guild,[accepted.data.actor,pvpTarget(db,guild,accepted).id]);
  const policy=campaignPvpPolicy(db,guild);if(!policy.enabled)return null;
  return db.transaction(()=>{
    const {row:a,scene}=consentAction(db,guild,accepted.record_key),target=pvpTarget(db,guild,a),ids=[a.data.actor,target.id];
    assertPvpSafety(db,guild,ids);
    const members=participants(db,guild,ids,false),location=db.getCharacter(ids[0]).data.location;
    placement(db,guild,ids,location);
    const key=`pvp-campaign:${hash([guild,a.record_key])}`,old=db.getCityRecord(guild,'pvp_encounter_contract',key);
    if(old){validateCampaignPvp(db,guild,key);return old;}
    const terms={version:4,profile:'campaign_damage',interaction_scope:'duel',audience:'private',
      objective:'Adjudicate the authenticated attack; no target decision or response is implied.',
      participants:ids.map(character=>({character,team:null})),
      stakes:ids.map(character=>({character,best:'No authored story stake.',worst:'Native damage may require the owner\'s SRD death choice.'})),
      target_permissions:[{actor:ids[0],target:ids[1],effect_class:'attack_damage',max_risk:'lethal'}],
      hope_policy:'no_pvp_hope_generation',critical_stress_policy:'disabled',fear_policy:'immediate_contextual_fear',
      features:[],expires_minute:Number.MAX_SAFE_INTEGER};
    const snapshot={version:4,guild,contract:key,accepted_intent:a.record_key,source_event:a.source_event,source_hash:a.data.source_hash,
      session_id:scene.session_id,scene:scene.key,location_key:location,participants:members,policy_revision:policy.revision,terms};
    const digest=hash(snapshot),binding={version:4,issuer:'native:pvp-campaign',snapshot,digest};
    const mutation=db.recordMutation(guild,{sessionId:scene.session_id,actorType:'system',actorId:'pvp_campaign',sourceLayer:'pvp_campaign',
      mutationType:'campaign_pvp_scope',entityKey:key,visibility:'gm',after:binding,rationale:'Native attack adjudication scope; no bilateral signatures or target choices.'});
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_campaign_pvp_scope',source_kind:'mutation',source_id:mutation.id,
      title:'Native campaign attack scope',session_id:scene.session_id,scene:scene.key,location_key:location,visibility:'gm',details:binding},'pvp_campaign');
    db.saveCityRecord(guild,{kind:'pvp_encounter_terms',key,source_event:source.event_key,status:'immutable',visibility:'gm',data:{version:4,digest,snapshot}});
    return db.saveCityRecord(guild,{kind:'pvp_encounter_contract',key,source_event:source.event_key,status:'locked',visibility:'gm',
      data:{...snapshot,snapshot,terms_hash:digest,terms_revision:key,approvals:[],withdrawals:[]}});
  });
}
export function validateCampaignPvp(db,guild,key,{committed=false}={}){
  const p=db.getCityRecord(guild,'pvp_encounter_contract',key),s=p?.data.snapshot,source=p&&db.getWorldEvent(guild,p.source_event),
    mutation=source?.source_kind==='mutation'&&db.getMutation(guild,source.source_id),terms=db.getCityRecord(guild,'pvp_encounter_terms',key);
  let binding;try{binding=JSON.parse(mutation?.after_json||'null');}catch{fail('Invalid campaign native scope mutation.');}
  if(!s||p.status!=='locked'||p.visibility!=='gm'||s.version!==4||s.guild!==guild||s.contract!==key
    ||key!==`pvp-campaign:${hash([guild,s.accepted_intent])}`||hash(s)!==p.data.terms_hash
    ||hash({...s,snapshot:s,terms_hash:hash(s),terms_revision:key,approvals:[],withdrawals:[]})!==hash(p.data)
    ||source?.status!=='active'||source.kind!=='native_campaign_pvp_scope'||source.visibility!=='gm'||source.subject_key!==null
    ||source.scene!==s.scene||source.session_id!==s.session_id||source.location_key!==s.location_key||p.source_event!==`${key}:source`
    ||hash(source.details)!==hash(binding)||binding?.issuer!=='native:pvp-campaign'||binding.version!==4||binding.digest!==hash(s)||hash(binding.snapshot)!==hash(s)
    ||mutation?.actor_type!=='system'||mutation.actor_id!=='pvp_campaign'||mutation.source_layer!=='pvp_campaign'
    ||mutation.mutation_type!=='campaign_pvp_scope'||mutation.entity_key!==key||mutation.session_id!==s.session_id||mutation.visibility!=='gm'
    ||terms?.status!=='immutable'||terms.source_event!==p.source_event||terms.data.digest!==hash(s)||hash(terms.data.snapshot)!==hash(s))
    fail('Exact immutable native campaign scope/source required.');
  const policy=campaignPvpPolicy(db,guild),history=db.getCityRecord(guild,'pvp_campaign_policy','campaign')?.data.history,
    enabled=history?.find(h=>h.revision===s.policy_revision)?.enabled;
  if(!enabled||!committed&&(!policy.enabled||policy.revision!==s.policy_revision))fail('Campaign mode disabled or revised; fresh scope required.');
  const {row:a,scene}=(committed?historicalActionSource:consentAction)(db,guild,s.accepted_intent),ids=[a.data.actor,pvpTarget(db,guild,a)?.id];
  if(a.data.world_source_event){
    const input=db.getWorldEvent(guild,a.data.world_source_event);
    if(input?.status!=='active'||input.kind!=='ai_gm_input'||!db.ownerAuthoredSource(guild,input.event_key,a.data.owner_user_id))
      fail('Original authored campaign input is revoked or changed; hold new execution and publication, never erase saved outcomes.');
  }
  if(!['attack','unarmed_attack','weapon_attack'].includes(a.data.operation)||a.source_event!==s.source_event||a.data.source_hash!==s.source_hash
    ||scene.key!==s.scene||scene.session_id!==s.session_id||hash(participants(db,guild,ids,committed))!==hash(s.participants)
    ||hash(s.terms.target_permissions)!==hash([{actor:ids[0],target:ids[1],effect_class:'attack_damage',max_risk:'lethal'}]))
    fail('Campaign attack source, owner, target or scene changed.');
  if(!committed){assertPvpSafety(db,guild,ids);placement(db,guild,ids,s.location_key);}
  return {contract:p,participants:s.participants,terms:s.terms};
}
