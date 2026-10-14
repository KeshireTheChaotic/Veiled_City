/** Owner-private initial setup only. Never travel, adjudication of prior declarations, proxy consent or GM impersonation. */
import {createHash,randomUUID} from 'node:crypto';
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene,recordScenePresence} from './scene-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fail(){throw Object.assign(new Error('Current owner, empty initial position and unchanged safe scene setup required.'),{code:'SCENE_SETUP',expected:true});}
function owner(db,guild,user,character){
  let principal;try{principal=conversationPrincipal(db,guild,user,character);}catch{fail();}
  const pc=db.getCharacter(character);if(principal.kind!=='owner'||pc?.owner_user_id!==user)fail();
  return {principal,pc,scene:currentScene(db,guild)};
}
function snapshot(db,guild,user,character){
  const {principal,pc,scene}=owner(db,guild,user,character),session=db.getActiveSession(guild);
  if(session.assembly_phase!=='assembly'||pc.data.location||db.hasCharacterPlacementHistory(guild,pc.id)
    ||db.getCurrentEncounter(session.id)?.status==='active'||db.getCityCalendar(guild).flags.scene_continuity!==true)fail();
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
export function prepareSceneSetup(db,guild,user,character){
  let state;try{state=snapshot(db,guild,user,character);}catch(error){if(error.code==='SCENE_SETUP')return null;throw error;}
  if(!state.locations.length)return null;
  const options=state.locations.flatMap(location=>['party','character'].map(visibility=>({location:location.key,visibility})))
    .map((option,index)=>({...option,value:String(index)}));
  const key=randomUUID(),source=indexWorldEvent(db,guild,{key:`scene-setup-offer:${key}`,kind:'native_scene_setup_offer',
    title:'Owner-private initial scene setup; not placement or travel',source_id:'native:scene-setup',visibility:'character',subject_key:character,
    session_id:state.session,scene:state.scene,details:{version:1,state,options}},'native:scene-setup');
  db.saveCityRecord(guild,{kind:'scene_setup',key,status:'offered',visibility:'character',subject_key:character,source_event:source.event_key,
    data:{version:1,state,revision:hash(state),options,expires_at:Date.now()+600000}});
  return {key,options,components:[{type:1,components:[{type:3,custom_id:`vcsetup:${key}`,min_values:1,max_values:1,
    placeholder:'Confirm initial location and disclosure, or leave unplaced',options:[...options.map(o=>({label:`${o.visibility==='party'?'Share':'Private'}: ${o.location}`.slice(0,100),value:o.value})),
      {label:'Leave my initial position unconfirmed',value:'decline'}]}]}]};
}
export function confirmSceneSetup(db,guild,user,key,value,{interactionId=null}={}){
  const row=db.getCityRecord(guild,'scene_setup',key);if(!row||row.data.state.user!==user)fail();
  const {pc,principal}=owner(db,guild,user,row.data.state.character);
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
        initial_setup:true,not_travel:true}},user);
    recordScenePresence(db,guild,{entity_type:'character',entity_key:pc.id,location_key:option.location,source_event:arrival.event_key,
      accepted_by:user,visibility:option.visibility,subject_key:option.visibility==='character'?pc.id:null},'native:scene-setup');
    return db.saveCityRecord(guild,{...row,key,status:'confirmed',data:{...row.data,choice:value,confirmation:confirmation.event_key,arrival:arrival.event_key,interaction:interactionId}});
  });
}
