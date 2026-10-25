/** Owner-controlled initial position and exact disclosure; original source policy unchanged. */
import {createHash,randomUUID} from 'node:crypto';
import {conversationPrincipal} from './conversation-principal.js';
export function createSceneSetup({currentScene,recordScenePresence,indexWorldEvent}){
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function fail(setup_reason='owner_invalid'){throw Object.assign(new Error('Current owner, empty initial position and unchanged safe scene setup required.'),{code:'SCENE_SETUP',setup_reason,expected:true});}

function owner(db,guild,user,character){
  let principal;try{principal=conversationPrincipal(db,guild,user,character);}catch{fail();}
  const pc=db.getCharacter(character);if(principal.kind!=='owner'||pc?.owner_user_id!==user)fail();
  return {principal,pc,scene:currentScene(db,guild)};
}

function snapshot(db,guild,user,character){
  const {principal,pc,scene}=owner(db,guild,user,character),session=db.getActiveSession(guild);
  if(session.assembly_phase!=='assembly')fail('not_in_assembly_phase');
  if(pc.data.location)fail('position_already_set');
  if(db.hasCharacterPlacementHistory(guild,pc.id))fail('placement_history_requires_review');
  if(db.getCurrentEncounter(session.id)?.status==='active')fail('encounter_active');
  if(db.getCityCalendar(guild).flags.scene_continuity!==true)fail('scene_continuity_disabled');
  // Confirming an unset initial position is descriptive setup, not an in-fiction action or travel.
  // Marked HP/death workflow stays untouched; native action services still enforce eligibility and exact ability exceptions.
  const locations=db.listSimulationEntities(guild,'location').flatMap(entity=>{
    const state=entity.state,authored=db.getCityRecord(guild,'autonomous_entity',`location:${entity.entity_key}`);
    const source=authored&&db.getWorldEvent(guild,authored.source_event);
    if(!/^[a-z0-9][a-z0-9:_-]{0,159}$/i.test(entity.entity_key)||!['party','public'].includes(state.visibility||'party')
      ||authored&&(!['party','public'].includes(authored.visibility)||source?.status!=='active')
      ||['hidden','removed','restricted','locked','contested','hazard','travel_required'].some(key=>state[key])
      ||state.hazards?.length||state.wards?.length||Number(state.travel_cost)||Number(state.travel_minutes))return [];
    return [{key:entity.entity_key,digest:hash([entity,authored,source])}];
  }).sort((a,b)=>a.key.localeCompare(b.key)).slice(0,12);
  return {session:session.id,scene:scene.key,user,character,principal:principal.revision,locations};
}

const setupGuidance=Object.freeze({
  owner_invalid:'An active checked-in owner role is required. Select your own character; no position was assigned.',
  not_in_assembly_phase:'Initial setup is closed for this established session. Existing continuity remains in effect.',
  position_already_set:'Your saved position is already recorded. Changing it requires a player declaration and native adjudication.',
  placement_history_requires_review:'Earlier placement history exists. Ask the GM to reconcile it; initial setup cannot reset that history.',
  encounter_active:'An encounter is active. Initial setup cannot relocate a character during it.',
  scene_continuity_disabled:'Initial scene setup is not enabled. Your position can remain unconfirmed while an independent world scene opens.',
  no_eligible_safe_locations:'No entitled initial-location choices are available. You may remain unplaced and describe what you want to explore; a world camera does not place your character.',
  setup_offer_available:'You may confirm an initial position and its disclosure, or leave it unconfirmed.'
});

function sceneSetupAvailability(db,guild,user,character){
  let code;
  try{code=snapshot(db,guild,user,character).locations.length?'setup_offer_available':'no_eligible_safe_locations';}
  catch(error){if(error.code!=='SCENE_SETUP')throw error;code=error.setup_reason||'owner_invalid';}
  return {code,available:code==='setup_offer_available',message:setupGuidance[code]};
}

function prepareSceneSetup(db,guild,user,character,{declarationKey=null}={}){
  let state;try{state=snapshot(db,guild,user,character);}catch(error){if(error.code==='SCENE_SETUP')return null;throw error;}
  if(!state.locations.length)return null;
  const options=state.locations.flatMap(location=>['party','character'].map(visibility=>({location:location.key,visibility})))
    .map((option,index)=>({...option,value:String(index)}));
  const key=declarationKey?`declaration-${hash(declarationKey)}`:randomUUID(),source=indexWorldEvent(db,guild,{key:`scene-setup-offer:${key}`,kind:'native_scene_setup_offer',
    title:'Owner-private initial scene setup; not placement or travel',source_id:'native:scene-setup',visibility:'character',subject_key:character,
    session_id:state.session,scene:state.scene,details:{version:1,state,options}},'native:scene-setup');
  db.saveCityRecord(guild,{kind:'scene_setup',key,status:'offered',visibility:'character',subject_key:character,source_event:source.event_key,
    data:{version:1,state,revision:hash(state),options,expires_at:Date.now()+600000}});
  return {key,options,components:[{type:1,components:[{type:3,custom_id:`vcsetup:${key}`,min_values:1,max_values:1,
    placeholder:'Confirm initial location and disclosure, or leave unplaced',options:[...options.map(o=>({label:`${o.visibility==='party'?'Share':'Private'}: ${o.location}`.slice(0,100),value:o.value})),
      {label:'Leave my initial position unconfirmed',value:'decline'}]}]}]};
}

function confirmSceneSetup(db,guild,user,key,value,{interactionId=null,authoredSource=null}={}){
  const row=db.getCityRecord(guild,'scene_setup',key);if(!row||row.data.state.user!==user)fail();
  const {pc,principal}=owner(db,guild,user,row.data.state.character);
  if(authoredSource){
    const declaration=db.getWorldEvent(guild,authoredSource);
    if(declaration?.status!=='active'||declaration.kind!=='ai_gm_input'||declaration.details.author!==user
      ||declaration.details.character_id!==pc.id||declaration.details.revision!==principal.revision
      ||declaration.session_id!==row.data.state.session||declaration.scene!==row.data.state.scene
      ||!db.ownerAuthoredSource(guild,authoredSource,user))fail();
  }
  if(principal.revision!==row.data.state.principal)fail();
  if(['confirmed','declined'].includes(row.status)){if(row.data.choice!==value)fail();return row;}
  const source=db.getWorldEvent(guild,row.source_event);
  if(row.status!=='offered'||Date.now()>row.data.expires_at||source?.status!=='active'
    ||source.kind!=='native_scene_setup_offer'||source.source_id!=='native:scene-setup'
    ||source.event_key!==`scene-setup-offer:${key}`||row.visibility!=='character'||row.subject_key!==pc.id
    ||hash(source.details)!==hash({version:1,state:row.data.state,options:row.data.options})
    ||hash(snapshot(db,guild,user,pc.id))!==row.data.revision)fail();
  const option=row.data.options.find(o=>o.value===value);if(value!=='decline'&&!option)fail();
  return db.transaction(()=>{
    if(value==='decline')return db.saveCityRecord(guild,{...row,key,status:'declined',data:{...row.data,choice:value,interaction:interactionId}});
    const confirmation=indexWorldEvent(db,guild,{key:`scene-setup-choice:${key}`,kind:'owner_initial_scene_confirmation',
      title:'Owner confirmed initial setup and exact disclosure; not travel',source_id:`player:${user}`,visibility:option.visibility,subject_key:option.visibility==='character'?pc.id:null,
      session_id:row.data.state.session,scene:row.data.state.scene,location_key:option.location,
      details:{author:user,character_id:pc.id,principal_revision:principal.revision,offer:row.source_event,choice:value,interaction:interactionId,
        authority:'Initial setup only; prior attempts, costs, dice, knowledge and consent remain unchanged.'}},user);
    db.updateCharacterData(pc.id,data=>{data.location=option.location;});
    const arrival=indexWorldEvent(db,guild,{key:`scene-setup-arrival:${key}`,kind:'arrival',title:'Owner-established initial scene position',
      source_id:`player:${user}`,visibility:option.visibility,subject_key:option.visibility==='character'?pc.id:null,
      session_id:row.data.state.session,scene:row.data.state.scene,location_key:option.location,
      details:{entity_type:'character',entity_key:pc.id,owner_user_id:user,principal_revision:principal.revision,confirmation:confirmation.event_key,
        initial_setup:true,not_travel:true,...(authoredSource?{input_source:authoredSource}:{})}},user);
    recordScenePresence(db,guild,{entity_type:'character',entity_key:pc.id,location_key:option.location,source_event:arrival.event_key,
      accepted_by:user,visibility:option.visibility,subject_key:option.visibility==='character'?pc.id:null},'native:scene-setup');
    return db.saveCityRecord(guild,{...row,key,status:'confirmed',data:{...row.data,choice:value,confirmation:confirmation.event_key,arrival:arrival.event_key,interaction:interactionId}});
  });
}

function applyAuthoredInitialPosition(db,guild,intent,scope){
  if(!db.getCityCalendar(guild).flags.narrative_camera||!db.getCityCalendar(guild).flags.narrative_authority)fail();
  const row=intent&&db.getCityRecord(guild,'typed_intent',intent.record_key),source=row&&db.getWorldEvent(guild,row.source_event);
  if(!row||row.data.operation!=='initial_position'||row.data.type!=='other'||row.data.framing!=='immediate'
    ||row.data.actor!==scope.actorCharacterId||row.data.owner_user_id!==scope.actorUserId||source?.status!=='active'
    ||!db.ownerAuthoredSource(guild,source.event_key,scope.actorUserId))fail();
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),prior=db.getCityRecord(guild,'scene_setup_declaration',row.record_key);
  const scene=currentScene(db,guild);
  if(row.data.scene!==scene.key||row.data.session_id!==scene.session_id||row.data.actor_principal_revision!==principal.revision)fail();
  if(prior){if(prior.data.owner!==scope.actorUserId||prior.data.principal!==principal.revision)fail();return prior;}
  if(source.details.raw_text?.slice(row.data.start,row.data.end)!==row.data.source_span)fail();
  const input=db.listWorldEvents(guild,{includeGM:true,limit:500}).find(e=>e.kind==='ai_gm_input'&&e.status==='active'
    &&e.details.message_id===source.details.discord_message_id&&e.details.character_id===scope.actorCharacterId);
  if(!input||input.details.text!==source.details.raw_text||input.details.private_scene!==(scope.mode==='private'))fail();
  const offer=prepareSceneSetup(db,guild,scope.actorUserId,scope.actorCharacterId,{declarationKey:row.record_key}),choice=offer?.options.find(o=>o.location===row.data.target_key
    &&o.visibility===(scope.mode==='private'?'character':'party'));
  if(!choice)fail();
  const result=confirmSceneSetup(db,guild,scope.actorUserId,offer.key,choice.value,{authoredSource:input.event_key});
  return db.saveCityRecord(guild,{kind:'scene_setup_declaration',key:row.record_key,status:'confirmed',source_event:result.source_event,
    visibility:result.visibility,subject_key:result.subject_key,data:{owner:scope.actorUserId,principal:principal.revision,arrival:result.data.arrival,
      declaration:row.record_key,not_travel:true}});
}
return Object.freeze({sceneSetupAvailability,prepareSceneSetup,confirmSceneSetup,applyAuthoredInitialPosition});
}
