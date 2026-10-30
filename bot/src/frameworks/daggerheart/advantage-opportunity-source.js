/** Native pre-dice advantage evidence. GM-private evidence never becomes NPC cognition or publication. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';

export function createAdvantageOpportunitySource({currentScene,nativeEncounterActor,nativeActorControl,indexWorldEvent}){
  if([currentScene,nativeEncounterActor,nativeActorControl,indexWorldEvent].some(fn=>typeof fn!=='function'))throw new TypeError('Native advantage opportunity sources required.');
  const issuer='native:roll-opportunity';
  const keyFor=request=>`roll-opportunity:${hash([request,'advantage_gain'])}`;

  function inspectAdvantageGain(db,guild,key,{historical=false}={}){
    const row=db.getCityRecord(guild,'native_roll_opportunity',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
      mutation=event&&db.getMutation(guild,event.source_id),request=v?.request_snapshot,source=request&&db.getWorldEvent(guild,request.source_event),scene=!historical&&currentScene(db,guild);
    if(row?.status!=='committed'||row.visibility!=='gm'||v?.version!==1||v.kind!=='advantage_gain'||key!==keyFor(v.request)
      ||event?.status!=='active'||event.visibility!=='gm'||event.kind!=='native_roll_opportunity'||event.source_kind!=='mutation'
      ||event.scene!==v.scene||event.session_id!==v.session||event.location_key!==v.location||event.details.payload_hash!==hash(v)
      ||mutation?.source_layer!=='native_feature'||mutation.mutation_type!=='capture_roll_opportunity'||mutation.actor_id!==issuer
      ||mutation.actor_type!=='ai_gm'||mutation.session_id!==v.session||mutation.entity_key!==key||mutation.visibility!=='gm'||hash(JSON.parse(mutation.after_json))!==hash(v)
      ||source?.status!=='active'||event.details.input_source!==source.event_key
      ||!['authored_turn','player_declaration'].includes(source.kind)||!db.ownerAuthoredSource(guild,source.event_key,v.owner)
      ||source.source_id!==`player:${v.owner}`||source.details.author!==v.owner||source.details.character_id!==v.character
      ||source.scene!==v.scene||source.session_id!==v.session||request?.record_key!==v.request||request.status!=='pending'
      ||request.visibility!=='character'||request.subject_key!==v.character||request.data.character_id!==v.character
      ||request.data.owner_user_id!==v.owner||request.data.scene!==v.scene||request.data.session_id!==v.session
      ||!Number.isSafeInteger(request.data.breakdown.advantage)||!Number.isSafeInteger(request.data.breakdown.disadvantage)
      ||request.data.breakdown.advantage<=request.data.breakdown.disadvantage||request.data.breakdown.unresolved.length
      ||!Array.isArray(v.actors)||v.actors.some(actor=>typeof actor.key!=='string'||!actor.snapshot||!actor.control||!actor.template_hash)
      ||!historical&&(scene.key!==v.scene||scene.session_id!==v.session
        ||hash(db.getCityRecord(guild,'roll_request',v.request))!==hash(request)))throw fail('native_advantage_opportunity_ancestry');
    return {source_event:event.event_key,scene:v.scene,session:v.session,location:v.location,advantage:true,
      eligible_actors:v.actors.map(actor=>actor.key),request:v.request,request_hash:hash(request),actors:structuredClone(v.actors)};
  }

  function captureAdvantageGain(db,guild,request){
    const b=request?.data?.breakdown;
    if(request?.status!=='pending'||!b||!Number.isSafeInteger(b.advantage)||!Number.isSafeInteger(b.disadvantage)
      ||b.advantage<=b.disadvantage||b.unresolved?.length)return null;
    const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(scene.session_id),
      binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),actors=[];
    if(request.data.scene!==scene.key||request.data.session_id!==scene.session_id
      ||hash(db.getCityRecord(guild,'roll_request',request.record_key))!==hash(request))throw fail('native_advantage_current_request');
    if(encounter?.status!=='active'||binding?.status!=='active')return null;
    for(const candidate of binding.data.combatants||[]){
      try{
        const actor=nativeEncounterActor(db,guild,candidate.actor),control=nativeActorControl(db,guild,'npc',candidate.actor);
        if(control.owner_control_type!=='ai_world'||actor.scene!==scene.key||actor.session!==scene.session_id)continue;
        actors.push({key:candidate.actor,snapshot:hash(actor),control:control.revision,template_hash:hash(actor.template)});
      }catch(error){if(!['GM_ARBITRATION','PC_NATIVE_ELIGIBILITY'].includes(error.code))throw error;}
    }
    if(!actors.length)return null;
    actors.sort((a,b)=>a.key.localeCompare(b.key));
    const location=db.getCharacter(request.subject_key)?.data.location;
    if(typeof location!=='string'||!location)throw fail('native_advantage_current_location');
    const key=keyFor(request.record_key),data={version:1,kind:'advantage_gain',request:request.record_key,request_snapshot:structuredClone(request),
      scene:scene.key,session:scene.session_id,location,character:request.subject_key,owner:request.data.owner_user_id,actors};
    return db.transaction(()=>{
      const prior=db.getCityRecord(guild,'native_roll_opportunity',key);
      if(prior){inspectAdvantageGain(db,guild,key,{historical:true});return key;}
      const mutation=db.recordMutation(guild,{sessionId:scene.session_id,actorType:'ai_gm',actorId:issuer,sourceLayer:'native_feature',
        mutationType:'capture_roll_opportunity',entityKey:key,visibility:'gm',after:data});
      const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_roll_opportunity',source_kind:'mutation',source_id:mutation.id,
        title:'Native source-qualified pre-dice roll opportunity',session_id:scene.session_id,scene:scene.key,location_key:location,
        visibility:'gm',details:{input_source:request.source_event,payload_hash:hash(data)}},issuer);
      db.saveCityRecord(guild,{kind:'native_roll_opportunity',key,status:'committed',source_event:event.event_key,visibility:'gm',data});
      inspectAdvantageGain(db,guild,key);return key;
    });
  }
  return Object.freeze({captureAdvantageGain,inspectAdvantageGain});
}
