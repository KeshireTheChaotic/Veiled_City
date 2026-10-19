/** Campaign PvP mode and owner-only sticky safety stops. This module grants no PvP consent or effects. */
import {createHash} from 'node:crypto';
import {indexWorldEvent} from './city-calendar.js';

const ISSUER='native:pvp-campaign-policy';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fail(message){throw Object.assign(new Error(message),{code:'NARRATIVE_PVP',expected:true});}
function validId(value){return typeof value==='string'&&!!value&&value.length<=120;}
function closed(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!(k in value)))
    fail('Closed PvP safety-control fields required.');
}
function sourceMutation(db,guild,event,mutationType,actorType,actorId,entityKey,binding){
  const e=db.getWorldEvent(guild,event),m=e?.source_kind==='mutation'&&db.getMutation(guild,e.source_id);
  let after;try{after=JSON.parse(m?.after_json||'null');}catch{return false;}
  if(!e||e.status!=='active'||e.kind!=='native_pvp_safety_control'||e.event_key!==event||e.visibility!=='gm'
    ||e.session_id!==null||e.scene!==''||e.location_key!==''||e.subject_key!==null
    ||e.source_id!==m?.id||e.details.issuer!==ISSUER||e.details.payload_hash!==hash(binding)
    ||m?.mutation_type!==mutationType||m.actor_type!==actorType||m.actor_id!==actorId||m.source_layer!=='command'
    ||m.source_interaction_id!==binding.interaction_id
    ||m.session_id!==null||m.entity_key!==entityKey||m.visibility!=='gm'||hash(after)!==hash(binding))return false;
  return true;
}
function write(db,guild,{interactionId,actorType,actorId,mutationType,entityKey,binding,key}){
  const existing=db.getWorldEvent(guild,key);
  if(existing){if(existing.status!=='active'||existing.details.payload_hash!==hash(binding)
    ||!sourceMutation(db,guild,key,mutationType,actorType,actorId,entityKey,binding))fail('Safety control replay differs or its native source is invalid.');return existing;}
  const mutation=db.recordMutation(guild,{actorType,actorId,sourceLayer:'command',sourceInteractionId:interactionId,
    mutationType,entityKey,visibility:'gm',rationale:'Authenticated PvP campaign safety control; no consent or fictional effect.',after:binding});
  return indexWorldEvent(db,guild,{key,kind:'native_pvp_safety_control',source_kind:'mutation',source_id:mutation.id,
    title:'Native PvP campaign safety control',visibility:'gm',details:{issuer:ISSUER,payload_hash:hash(binding)}},actorId);
}
export function campaignPvpPolicy(db,guild){
  const row=db.getCityRecord(guild,'pvp_campaign_policy','campaign');if(!row)return {enabled:false,revision:0};
  const d=row.data,history=d?.history;
  if(row.status!=='active'||row.visibility!=='gm'||row.actor_key!=='campaign'||row.record_key!=='campaign'
    ||d?.version!==1||d.issuer!==ISSUER||!Array.isArray(history)||!history.length||history.length>10000
    ||d.revision!==history.length||row.source_event!==history.at(-1)?.source_event)fail('PvP campaign policy ancestry is stale or invalid.');
  const seen=new Set();
  for(let i=0;i<history.length;i++){
    const h=history[i],binding={version:1,issuer:ISSUER,enabled:h?.enabled,revision:h?.revision,interaction_id:h?.interaction_id,author:h?.author};
    if(h?.revision!==i+1||typeof h.enabled!=='boolean'||!validId(h.author)||!validId(h.interaction_id)
      ||seen.has(h.interaction_id)||h.source_event!==`pvp-policy:${h.interaction_id}`
      ||!sourceMutation(db,guild,h.source_event,'pvp_campaign_mode','human_gm',h.author,'campaign',binding))
      fail('PvP campaign policy history has invalid native source ancestry.');
    seen.add(h.interaction_id);
  }
  const latest=history.at(-1);if(d.enabled!==latest.enabled||d.author!==latest.author||d.interaction_id!==latest.interaction_id)
    fail('PvP campaign policy projection differs from its native source history.');
  return {enabled:d.enabled,revision:d.revision};
}
export function setCampaignPvpMode(db,guild,user,input={},options={}){
  closed(input,['enabled']);closed(options,['gm','interactionId']);
  const enabled=input?.enabled,{gm=false,interactionId}=options;
  if(!gm||!validId(user)||!validId(interactionId)||typeof enabled!=='boolean')fail('Authenticated GM mode command with explicit enabled boolean required.');
  return db.transaction(()=>{
    const existing=db.getCityRecord(guild,'pvp_campaign_policy','campaign'),current=campaignPvpPolicy(db,guild),history=existing?.data.history||[],prior=history.find(h=>h.interaction_id===interactionId);
    if(prior){if(prior.enabled!==enabled||prior.author!==user)fail('PvP policy interaction replay differs.');return existing;}
    const revision=current.revision+1,binding={version:1,issuer:ISSUER,enabled,revision,interaction_id:interactionId,author:user},
      key=`pvp-policy:${interactionId}`,event=write(db,guild,{interactionId,actorType:'human_gm',actorId:user,
        mutationType:'pvp_campaign_mode',entityKey:'campaign',binding,key}),nextHistory=[...history,{...binding,source_event:event.event_key}];
    const row=db.saveCityRecord(guild,{kind:'pvp_campaign_policy',key:'campaign',status:'active',actor_key:'campaign',source_event:event.event_key,
      visibility:'gm',data:{...binding,history:nextHistory}});
    return row;
  });
}
function inspectStop(db,guild,row){
  const d=row?.data,b=d&&{version:1,issuer:ISSUER,character:d.character,owner:d.owner,owner_binding:d.owner_binding,interaction_id:d.interaction_id};
  const pc=d&&db.getCharacter(d.character);
  if(!d||row.status!=='stopped'||row.visibility!=='gm'||row.subject_key!==null||row.actor_key!==d.character
    ||row.record_key!==d.character||d.version!==1||d.issuer!==ISSUER||!validId(d.owner)||!validId(d.interaction_id)
    ||d.owner_binding!==hash([guild,d.character,d.owner])||pc?.guild_id!==guild
    ||!sourceMutation(db,guild,row.source_event,'pvp_safety_stop','player',d.owner,d.character,b))
    fail('PvP safety-stop receipt is invalid or stale; execution held.');
  // Ownership changes do not erase an earlier owner's stop; hold until separately reconciled.
  if(pc.owner_user_id!==d.owner)fail('PvP safety stop predates current ownership; execution held for owner reconciliation.');
  return row;
}
export function setPvpSafetyStop(db,guild,user,input={},options={}){
  closed(input,['character_id']);closed(options,['interactionId']);
  const character_id=input?.character_id,{interactionId}=options;
  if(!validId(user)||!validId(interactionId)||!validId(character_id))fail('Authenticated current PC owner and stop operation required.');
  return db.transaction(()=>{
    const pc=db.getCharacter(character_id);if(pc?.guild_id!==guild||pc.owner_user_id!==user)fail('Only the actual current PC owner may set a safety stop; proxies and absent-owner substitutions are not accepted.');
    const key=character_id,prior=db.getCityRecord(guild,'pvp_safety_stop',key);
    if(prior)return inspectStop(db,guild,prior);
    const binding={version:1,issuer:ISSUER,character:character_id,owner:user,owner_binding:hash([guild,character_id,user]),interaction_id:interactionId},
      event=write(db,guild,{interactionId,actorType:'player',actorId:user,mutationType:'pvp_safety_stop',entityKey:character_id,binding,key:`pvp-stop:${hash([guild,character_id])}`});
    return db.saveCityRecord(guild,{kind:'pvp_safety_stop',key,status:'stopped',actor_key:character_id,source_event:event.event_key,
      visibility:'gm',subject_key:null,data:binding});
  });
}
export function assertPvpSafety(db,guild,characters){
  if(!Array.isArray(characters)||characters.some(id=>typeof id!=='string'||!id))fail('Exact bounded PvP participant identities required.');
  for(const character of new Set(characters)){
    const row=db.getCityRecord(guild,'pvp_safety_stop',character);if(!row)continue;
    inspectStop(db,guild,row);
    fail('An affected PC owner set a sticky PvP safety stop; no new or unfinished hostile effect may proceed.');
  }
  return true;
}
