/** Native explicit delegation/current owner/NPC authority and immutable encounter activation bookkeeping. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
export function createEncounterActivationRules({capabilities}){
const {principalAllows,manageWorldEncounter,EncounterLibrary,livePcRoster,encounterActors,nativeActorControl,indexWorldEvent,conversationPrincipal,scenePresence}=capabilities||{};
if([principalAllows,manageWorldEncounter,EncounterLibrary,livePcRoster,encounterActors,nativeActorControl,indexWorldEvent,conversationPrincipal,scenePresence].some(fn=>typeof fn!=='function'))throw new TypeError('Native encounter activation capabilities required');
const issuer='native:encounter-activation';
function fail(reason){throw Object.assign(new Error(`Native encounter activation held: ${reason}`),{code:'NATIVE_ENCOUNTER_ACTIVATION',expected:true});}
const bindingTerms=b=>({source:b.source_event,proposal:b.data.proposal,composition:b.data.composition,roster:b.data.roster});
function rosterProof(db,guild,session,location){
  return livePcRoster(db,session).filter(r=>scenePresence(db,guild,'character',r.character_id)?.location_key===location).map(r=>{
    const pc=db.getCharacter(r.character_id),p=pc&&conversationPrincipal(db,guild,pc.owner_user_id,pc.id),presence=pc&&scenePresence(db,guild,'character',pc.id),
      source=presence&&db.getWorldEvent(guild,presence.source_event);
    if(pc?.guild_id!==guild||p?.kind!=='owner'||presence?.status!=='active'||presence.data.state!=='actually_present'
      ||source?.status!=='active'||pc.data.location!==location)fail('CURRENT_OWNER_CONTROLLED_ROSTER_REQUIRED');
    return {character:pc.id,owner:pc.owner_user_id,principal:p.revision,presence:hash(presence),source:source.event_key,source_hash:hash(source)};
  }).sort((a,b)=>a.character.localeCompare(b.character));
}
function activateDelegatedEncounter(db,guild,intent,{principal,library=new EncounterLibrary('../content')}={}){
  if(!principalAllows(principal,guild,'encounter.activate'))fail('APPLICATION_AUTHORITY_REQUIRED');
  return db.transaction(()=>{
    const proposal=db.getCityRecord(guild,'encounter_proposal',intent.target_key),source=proposal&&db.getWorldEvent(guild,proposal.source_event),
      policy=db.getCityRecord(guild,'ai_delegation','campaign'),p=policy?.data,policySource=policy&&db.getWorldEvent(guild,policy.source_event);
    const key=`native-encounter-activation:${hash(intent.target_key)}`,prior=db.getCityRecord(guild,'native_encounter_activation',key);
    if(prior){
      if(intent.payload.proposal_key!==prior.data.proposal||intent.payload.source_event!==prior.data.source)fail('EXACT_SAVED_ACTIVATION_SOURCE_REQUIRED');
      inspectNativeEncounterActivation(db,guild,prior.record_key,{current:true});return db.getCityRecord(guild,'encounter_proposal',intent.target_key);
    }
    if(proposal?.status!=='pending'||intent.payload.proposal_key!==proposal.record_key||intent.payload.source_event!==proposal.source_event
      ||source?.status!=='active'||policySource?.status!=='active'||!p||p.mode!=='routine_delegated'
      ||!p.allow.includes('encounter.activate')||p.expires_minute===null||db.getSimulationClock(guild).minute>=p.expires_minute
      ||db.getCityCalendar(guild).flags.gm_discretion!==true||db.getCityCalendar(guild).flags.encounter_intelligence!==true
      ||db.isDirectorPaused(guild)||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual'
      ||!proposal.data.actors?.length||proposal.data.actors.some(actor=>nativeActorControl(db,guild,'npc',actor).owner_control_type!=='ai_world'))
      fail('EXACT_PROPOSAL_AND_EXPLICIT_OPERATOR_DELEGATION_REQUIRED');
    if(intent.expected_revision!==hash(proposal))fail('CURRENT_PROPOSAL_REVISION_REQUIRED');
    const owners=rosterProof(db,guild,db.getActiveSession(guild).id,proposal.location_key);
    const before=structuredClone(proposal),after=manageWorldEncounter(db,guild,{op:'accept',key:proposal.record_key},issuer,library),
      encounter=db.getCurrentEncounter(db.getActiveSession(guild).id),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id);
    if(!encounter||after.data.encounter_id!==encounter.id||!binding)fail('NATIVE_ACTIVATION_RECEIPT_REQUIRED');
    const data={version:1,issuer,proposal:before.record_key,proposal_before:before,proposal_after:after,encounter:encounter.id,
      composition:encounter.composition,roster:binding.data.roster,source:source.event_key,source_hash:hash(source),
      policy:structuredClone(policy),policy_source:structuredClone(policySource),binding_hash:hash(bindingTerms(binding)),owners};
    const mutation=db.recordMutation(guild,{sessionId:encounter.session_id,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_encounter_activation',
      mutationType:'activate_encounter',entityKey:encounter.id,visibility:'gm',after:data});
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_encounter_activation',title:'Delegated native encounter bookkeeping',
      source_kind:'mutation',source_id:mutation.id,session_id:encounter.session_id,scene:before.data.scene,visibility:'gm',details:{payload_hash:hash(data)}},issuer);
    db.saveCityRecord(guild,{kind:'native_encounter_activation',key,status:'committed',visibility:'gm',source_event:event.event_key,data});
    // Additive link: old human-approved encounter bindings have no native_activation field and retain their reader.
    db.saveCityRecord(guild,{...binding,key:binding.record_key,data:{...binding.data,native_activation:key}});
    return after;
  });
}
function inspectNativeEncounterActivation(db,guild,key,{current=false}={}){
  const row=db.getCityRecord(guild,'native_encounter_activation',key),d=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    mutation=event&&db.getMutation(guild,event.source_id),source=d&&db.getWorldEvent(guild,d.source),
    proposal=d&&db.getCityRecord(guild,'encounter_proposal',d.proposal),policySource=d&&db.getWorldEvent(guild,d.policy.source_event),
    binding=d&&db.getCityRecord(guild,'encounter_binding',d.encounter);
  if(row?.status!=='committed'||row.visibility!=='gm'||d?.version!==1||d.issuer!==issuer||event?.status!=='active'
    ||event.kind!=='native_encounter_activation'||event.source_kind!=='mutation'||event.visibility!=='gm'
    ||event.details.payload_hash!==hash(d)||mutation?.actor_type!=='ai_gm'||mutation.actor_id!==issuer
    ||mutation.source_layer!=='native_encounter_activation'||mutation.mutation_type!=='activate_encounter'||mutation.entity_key!==d.encounter
    ||hash(JSON.parse(mutation.after_json))!==hash(d)||source?.status!=='active'||hash(source)!==d.source_hash
    ||policySource?.status!=='active'||hash(policySource)!==hash(d.policy_source)||hash(proposal)!==hash(d.proposal_after)
    ||binding?.data.native_activation!==key||hash(bindingTerms(binding))!==d.binding_hash)
    fail('SAVED_NATIVE_ACTIVATION_ANCESTRY_CHANGED');
  for(const owner of d.owners||[]){
    const pc=db.getCharacter(owner.character),s=db.getWorldEvent(guild,owner.source);
    // Immutable bookkeeping history does not grant a live player principal or require renewed attendance.
    if(pc?.guild_id!==guild||pc.owner_user_id!==owner.owner||s?.status!=='active'||hash(s)!==owner.source_hash)fail('SAVED_ACTIVATION_OWNER_SOURCE_CHANGED');
  }
  if(current){
    const encounter=db.getEncounter(d.encounter);
    if(!encounter||db.getCurrentEncounter(encounter.session_id)?.id!==encounter.id
      ||hash(rosterProof(db,guild,encounter.session_id,proposal.location_key))!==hash(d.owners))fail('CURRENT_ACTIVATION_ROSTER_CHANGED');
    const actors=encounterActors(db,guild,{...proposal.data,source_event:proposal.source_event,location_key:proposal.location_key});
    if(hash(actors)!==hash(proposal.data.bindings)
      ||actors.some(a=>nativeActorControl(db,guild,'npc',a.key).owner_control_type!=='ai_world'))fail('CURRENT_ACTIVATION_NPC_BINDING_OR_CONTROL_CHANGED');
  }
  return row;
}

return Object.freeze({activateDelegatedEncounter,inspectNativeEncounterActivation});
}
