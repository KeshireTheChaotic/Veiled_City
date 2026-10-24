/** Ordinary World identities and reasoned human corrections; player action and movement workflows stay external. */
import {jsonHash as sceneFictionHash} from '../../kernel/json-hash.js';
import {cityAudit,cityObject,indexWorldEvent} from './city-calendar.js';
import {preflightPlaceIdentity,preflightNpcIdentity} from './location-language.js';
const hash=value=>sceneFictionHash(value).slice(0,40);
export function createWorldIdentityRules({verifiedWorldAuthoringContext,currentScene,privateWorldIdentityForGm,worldIdentityOrigin,assertIndependentWorldIdentity,assertWorldIdentityNames,BACKGROUND_WORLD_KINDS,validateBackgroundIdentity,configureSimulationEntity,validateMinorIdentity,recordScenePresence,activeCityProxy,stateRevision,fail}){
function worldAuthority(db,guild){
  return {gm_authority_mode:"autonomous",auto_create_locations:true,auto_create_npcs:true,human_review_policy:"conflicts_only",
    audit_autonomous_worldbuilding:true,...db.getCityRecord(guild,"gm_authority","campaign")?.data};
}
function establishNarrativeEntity(db,guild,input,context,{content=null}={}){
  return db.transaction(()=>establishNativeNarrativeEntity(db,guild,input,context,{content}));
}
function establishNativeNarrativeEntity(db,guild,input,context,{content=null}={}){
  const verified=verifiedWorldAuthoringContext(db,guild,context),{binding,scope,source}=verified.context,policy=worldAuthority(db,guild);
  const background=BACKGROUND_WORLD_KINDS.includes(input?.kind),permitted=input?.kind==='npc'?policy.auto_create_npcs:background?true:policy.auto_create_locations;
  if(db.getCityCalendar(guild).flags.narrative_authority!==true||source?.status!=='active'||db.getWorldEvent(guild,binding.source)?.status!=='active'
    ||binding.guild!==guild||binding.scene!==currentScene(db,guild).key||policy.gm_authority_mode!=='autonomous'
    ||permitted!==true)fail('Native GM fiction creation authority is unavailable.');
  const fields=['aliases','key','kind','location_key','name','parent_location_key','role','summary'];
  if(!input||Object.keys(input).sort().join()!==fields.join()||!['npc','location',...BACKGROUND_WORLD_KINDS].includes(input.kind)
    ||typeof input.key!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.key)||input.key.length>100
    ||['name','summary','location_key','parent_location_key','role'].some(k=>typeof input[k]!=='string')
    ||!input.name.trim()||input.name.length>160||!input.summary.trim()||input.summary.length>600||input.role.length>160
    ||!Array.isArray(input.aliases)||input.aliases.length>6||input.aliases.some(a=>typeof a!=='string'||!a.trim()||a.length>80))fail('Bounded ordinary identity required.');
  const seed=verified.private_seed,creationSource=seed?.source_ref||binding.source,
    visibility=seed?'gm':scope.mode==='private'?'character':'party',subject=!seed&&scope.mode==='private'?scope.actorCharacterId:null,
    existing=db.getCityRecord(guild,'autonomous_entity',`${input.kind}:${input.key}`);
  if(existing?.data.narrative_origin===creationSource){
    if(existing.status!=='active'||db.getWorldEvent(guild,existing.source_event)?.status!=='active')fail('Existing creation receipt is no longer active.');
    const original=db.getWorldEvent(guild,existing.data.authorship_ref||existing.source_event)?.details.identity_definition;
    if(!(seed?privateWorldIdentityForGm(db,guild,existing):worldIdentityOrigin(db,guild,existing,scope))||original&&sceneFictionHash(fields.map(k=>original[k]))!==sceneFictionHash(fields.map(k=>input[k]))
      ||!original&&sceneFictionHash([existing.data.name,existing.data.summary,existing.data.aliases||[]])!==sceneFictionHash([input.name,input.summary,input.aliases]))
      fail('Native identity replay is immutable; an altered definition cannot reuse its original authorship receipt.');
    return existing;
  }
  assertIndependentWorldIdentity(input,source);
  assertWorldIdentityNames(db,guild,input);
  if(background)validateBackgroundIdentity(db,guild,input,content);
  const check=input.kind==='npc'?preflightNpcIdentity:preflightPlaceIdentity;
  for(const name of background?[]:[input.name,...input.aliases]){
    const result=check(db,guild,{key:input.key,name,scope});
    if(result.status!=='clear')fail('New fiction identity collides with an existing/protected identity; reuse it explicitly without replacing it.');
  }
  if(db.getCharacter(input.key)||db.getReference(guild,input.kind,input.key)||db.getNpcProfile(guild,input.key)||db.getSimulationEntity(guild,input.kind,input.key))fail('Existing identity cannot be overwritten by fiction.');
  const location=input.kind==='location'?input.key:background?binding.location:input.location_key,parent=input.parent_location_key;
  if(input.kind==='location'&&parent&&parent!==binding.location)fail('Ordinary new geography must attach to the native camera location.');
  if(input.kind==='npc'&&!db.getSimulationEntity(guild,'location',location))fail('NPC needs a genuinely established camera/location.');
  if(input.kind==='npc'&&location!==binding.location){
    const place=db.getCityRecord(guild,'autonomous_entity',`location:${location}`);
    if(place?.data.narrative_origin!==creationSource||!(seed?privateWorldIdentityForGm(db,guild,place):worldIdentityOrigin(db,guild,place,scope)))
      fail('Native scene authoring cannot establish offscene NPC presence outside its camera or same-source new local setting.');
  }
  const origin=seed?{version:2,kind:'gm_private_hook',...seed,frame_ref:binding.source,frame_hash:sceneFictionHash(binding),
      audience_ref:verified.audience_ref,scope_hash:sceneFictionHash(scope),identity_hash:sceneFictionHash(input)}
    :{version:1,kind:'native_ai_gm',source_ref:binding.source,audience_ref:verified.audience_ref,scope_hash:sceneFictionHash(scope),identity_hash:sceneFictionHash(input)};
  const event=indexWorldEvent(db,guild,{key:`narrative-entity:${hash([creationSource,input.kind,input.key])}`,kind:'native_narrative_entity',
    title:'GM-owned ordinary fictional identity',source_id:'native:narrative-authority',session_id:binding.session,scene:binding.scene,location_key:location,
    visibility,subject_key:subject,details:{input_source:creationSource,entity_type:input.kind,entity_key:input.key,no_pc_movement:true,
      authorship_version:seed?2:1,identity_definition:input,authorship_origin:origin}},'native:narrative-authority');
  if(input.kind==='location')configureSimulationEntity(db,guild,'location',input.key,{name:input.name,description:input.summary,parent_location_key:parent,
    place_type:input.role,visibility,subject_character_id:subject,aliases:input.aliases,narrative_origin:creationSource,access:'public',ai_gm_origin:true,...(seed?{hidden:true}:{})});
  else if(input.kind==='npc'){
    if(typeof content?.read!=='function')fail('Packaged NPC canon must be available before creating a fresh identity.');
    for(const name of [input.name,...input.aliases])try{
      validateMinorIdentity(db,content,guild,input.key,{name,occupation:input.role||'ordinary local',public_identity:input.summary.slice(0,160),portrayal:'Ordinary local, no special knowledge or powers.'});
    }catch(error){if(error.constructor===Error&&!error.code)fail('Packaged/established NPC identity cannot be replaced.');throw error;}
    db.upsertNpcProfile(guild,{npcKey:input.key,displayName:input.name,role:input.role||'ordinary local',publicIdentity:input.summary,
      activityTier:'background',source:'native_narrative_authority',knowledgeBoundaries:['Own sourced observations and ordinary self-knowledge only.']});
    db.setSimulationEntity(guild,'npc',input.key,{name:input.name,location_key:location,visibility,subject_character_id:subject,aliases:input.aliases,
      narrative_origin:creationSource,activity_tier:'background',...(seed?{hidden:true}:{}),resources:{influence:0,materials:0,information:0,manpower:0,leverage:0,wounds:0,stress:0,favors:0}});
    recordScenePresence(db,guild,{entity_type:'npc',entity_key:input.key,location_key:location,zone:'unspecified',
      source_event:event.event_key,visibility,subject_key:subject,...(seed?{hidden:true}:{}),accepted_by:'native:narrative-authority'},'native:narrative-authority');
  }
  if(!background)db.upsertReference(guild,{kind:input.kind,key:input.key,name:input.name,summary:input.summary,visibility,subjectCharacterId:subject});
  return db.saveCityRecord(guild,{kind:'autonomous_entity',key:`${input.kind}:${input.key}`,source_event:event.event_key,location_key:background?'':location,visibility,subject_key:subject,
    data:{kind:input.kind,key:input.key,name:input.name,summary:input.summary,aliases:input.aliases,session_id:binding.session,
      ...(background?{identity_layer:'background_only',anchor_location:binding.location}:{}),
      narrative_origin:creationSource,authorship_ref:event.event_key,authority:'ordinary_GM_fiction_not_PC_effect'}});
}
function configureWorldAuthority(db,guild,input,reviewer){
  cityObject(input);
  if(!reviewer||Object.keys(input).some(k=>!["gm_authority_mode","auto_create_locations","auto_create_npcs"].includes(k))
    ||input.gm_authority_mode!==undefined&&!['autonomous','manual'].includes(input.gm_authority_mode)
    ||['auto_create_locations','auto_create_npcs'].some(k=>input[k]!==undefined&&typeof input[k]!=="boolean")) throw new Error("Closed GM authority configuration required.");
  return db.transaction(()=>{
    const before=db.getCityRecord(guild,"gm_authority","campaign");
    const source=indexWorldEvent(db,guild,{key:`gm-authority:${hash([before?.data||{},input,Date.now()])}`,kind:"gm_authority",
      title:"Explicit GM world authority configuration",source_id:reviewer},reviewer);
    const after=db.saveCityRecord(guild,{kind:"gm_authority",key:"campaign",source_event:source.event_key,data:{...worldAuthority(db,guild),...input}});
    cityAudit(db,guild,"gm_authority","campaign",before,after,reviewer);return after;
  });
}
function retconAutonomousEntity(db,guild,input,reviewer){
  cityObject(input);
  if(!reviewer||Object.keys(input).sort().join()!=="expected_revision,key,kind,op,reason,summary"||input.op!=="retcon"
    ||!['npc','location'].includes(input.kind)||typeof input.summary!=="string"||!input.summary.trim()||input.summary.length>600
    ||typeof input.reason!=="string"||!input.reason.trim()||input.reason.length>600)fail("Closed reasoned human description retcon required.");
  const before=db.getCityRecord(guild,"autonomous_entity",`${input.kind}:${input.key}`);
  if(!before||stateRevision(before)!==input.expected_revision)fail("Current autonomous entity revision required.");
  if(input.kind==="npc"&&activeCityProxy(db,guild,input.key))fail("Human-controlled NPC portrayal must be coordinated with its controller.");
  return db.transaction(()=>{
    if(input.kind==="location"){
      const location=db.getSimulationEntity(guild,"location",input.key);if(!location)fail("Location no longer exists.");
      configureSimulationEntity(db,guild,"location",input.key,{description:input.summary});
    }else{
      const p=db.getNpcProfile(guild,input.key);if(!p)fail("NPC no longer exists.");
      db.upsertNpcProfile(guild,{npcKey:p.npc_key,displayName:p.display_name,role:p.role,publicIdentity:p.public_identity,
        portrayal:input.summary.slice(0,160),activityTier:p.activity_tier,decisionProfile:p.decision_profile,
        knowledgeBoundaries:p.knowledge_boundaries,capabilities:p.capabilities,source:p.source});
    }
    const after=db.saveCityRecord(guild,{...before,key:before.record_key,data:{...before.data,summary:input.summary,
      corrections:[...(before.data.corrections||[]),{previous_summary:before.data.summary,reason:input.reason,reviewer}].slice(-20)}});
    const ref=db.getReference(guild,input.kind,input.key);
    if(ref)db.upsertReference(guild,{kind:input.kind,key:input.key,name:ref.display_name,summary:input.summary,visibility:ref.visibility,
      subjectUserId:ref.subject_user_id,subjectCharacterId:ref.subject_character_id});
    cityAudit(db,guild,"ai_gm_world_retcon",input.key,before,after,reviewer);return after;
  });
}
return Object.freeze({worldAuthority,establishNarrativeEntity,configureWorldAuthority,retconAutonomousEntity});
}
