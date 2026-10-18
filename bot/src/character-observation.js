/** Read-side PC observations. A question supplies no fact, consent, reaction or mechanical outcome. */
import { createHash } from "node:crypto";
import { conversationPrincipal } from "./conversation-principal.js";
import { currentScene, sceneAccess, scenePresence } from "./scene-continuity.js";
import { indexWorldEvent } from "./city-calendar.js";
import { renderWorldObservation } from "./world-observation.js";
import { visibleIncomingInjury } from "./pc-incoming.js";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const vocabulary={
  hair:["black","brown","blond","red","gray","white","blue","green","purple","bald"],
  coat:["black","brown","gray","white","blue","green","red","yellow","olive","navy","cream","rust"],
  coat_material:["canvas","wool","leather","denim","cotton","synthetic"],
  coat_finish:["weathered","clean","faded","patched","polished"],
  coat_detail:["patched elbows","brass buttons","rolled sleeves","broad lapels","narrow lapels"],
  disguise:["hooded","masked"],visible_condition:["injured"]
};
function fail(){throw Object.assign(new Error("Current owner, exact source and explicit visible fields required."),{code:"CHARACTER_OBSERVATION"});}
function sourceProof(db,guild,character,user,ref){
  let principal;try{principal=conversationPrincipal(db,guild,user,character);}catch{fail();}
  const s=db.getWorldEvent(guild,ref);
  if(principal.kind!=="owner"||!s||s.kind!=="authored_turn"||s.status!=="active"||s.source_id!==`player:${user}`
    ||s.details.character_id!==character||s.details.principal_revision!==principal.revision
    ||!db.ownerAuthoredSource(guild,ref,user))fail();
  if(createHash("sha256").update(s.details.raw_text||"").digest("hex")!==s.details.raw_hash)fail();
  return {s,principal};
}
/** Explicit owner adapter only; never called with model-produced fields or inferred sheet visibility. */
export function saveVisibleCharacterFacts(db,guild,user,character,input){
  const {s,principal}=sourceProof(db,guild,character,user,input.source_event);
  if(!["party","character"].includes(input.visibility)
    ||!Array.isArray(input.facts)||!input.facts.length||input.facts.length>8
    ||!Array.isArray(input.observers)||input.observers.length>30)fail();
  if(input.observers.some(id=>db.getCharacter(id)?.guild_id!==guild||!visible(db,guild,id,character)))fail();
  return db.transaction(()=>input.facts.map(f=>{
    if(!vocabulary[f.field]?.includes(f.value)||!Number.isSafeInteger(f.start)||!Number.isSafeInteger(f.end)
      ||f.start<0||f.end<=f.start||s.details.raw_text.slice(f.start,f.end)!==f.value)fail();
    let condition=null;
    if(f.field==="visible_condition"){
      try{condition=visibleIncomingInjury(db,guild,f.cause_receipt,character);}catch(error){if(error.code!=="PC_EFFECT_AUTHORITY")throw error;fail();}
    }else if(f.cause_receipt)fail();
    const disclosure=input.visibility==="party"?indexWorldEvent(db,guild,{
      key:`description-disclosure:${hash([s.event_key,f,principal.revision])}`,kind:"character_description_disclosure",
      title:"Owner-selected visible description field",source_id:`player:${user}`,visibility:"party",session_id:s.session_id,
      scene:s.scene,details:{author:user,character_id:character,source_ref:s.event_key,principal_revision:principal.revision,
        field:f.field,value:f.value,start:f.start,end:f.end}},user):null;
    const data={version:1,character,user,principal_revision:principal.revision,source_hash:hash(s.details),
      source_event:s.event_key,field:f.field,value:f.value,start:f.start,end:f.end,
      visibility:input.visibility,observers:[...new Set(input.observers)],location:db.getCharacter(character).data.location||null,
      disclosure_ref:disclosure?.event_key||null,disclosure_hash:disclosure?hash(disclosure.details):null,
      ...(condition?{cause_receipt:condition.record_key,cause_hash:hash(condition.data)}:{})};
    const key=`visible-fact:${hash(data)}`;
    return db.getCityRecord(guild,"character_visible_fact",key)||db.saveCityRecord(guild,{
      kind:"character_visible_fact",key,source_event:s.event_key,status:"active",visibility:input.visibility,
      subject_key:character,data});
  }));
}
function factProof(db,guild,row){
  const d=row.data,{s,principal}=sourceProof(db,guild,d.character,d.user,d.source_event);
  if(row.kind!=="character_visible_fact"||row.record_key!==`visible-fact:${hash(d)}`||row.status!=="active"
    ||d.version!==1||row.visibility!==d.visibility||row.subject_key!==d.character||row.source_event!==s.event_key
    ||hash(s.details)!==d.source_hash||d.principal_revision!==principal.revision
    ||!vocabulary[d.field]?.includes(d.value)||s.details.raw_text.slice(d.start,d.end)!==d.value)fail();
  if(d.field==="visible_condition"){
    try{if(hash(visibleIncomingInjury(db,guild,d.cause_receipt,d.character).data)!==d.cause_hash)fail();}
    catch(error){if(error.code!=="PC_EFFECT_AUTHORITY")throw error;fail();}
  }
  if(d.visibility==="party"){
    const disclosure=db.getWorldEvent(guild,d.disclosure_ref);
    if(disclosure?.status!=="active"||disclosure.kind!=="character_description_disclosure"||disclosure.visibility!=="party"
      ||hash(disclosure.details)!==d.disclosure_hash||disclosure.details.source_ref!==s.event_key
      ||!db.ownerAuthoredSource(guild,disclosure.event_key,d.user))fail();
  }
  return row;
}
function visible(db,guild,observer,target){
  const a=scenePresence(db,guild,"character",observer),b=scenePresence(db,guild,"character",target);
  if(a||b)return a?.location_key===db.getCharacter(observer)?.data.location&&b?.location_key===db.getCharacter(target)?.data.location
    &&(["party","public"].includes(b?.visibility)||b?.subject_key===observer||b?.data.known_to?.includes(`character:${observer}`))
    &&sceneAccess(db,guild,{observer_type:"character",observer_key:observer,target_type:"character",target_key:target});
  const session=db.getActiveSession(guild),roster=session?db.roster(session.id):[];
  return [observer,target].every(id=>roster.some(r=>r.character_id===id&&["present","late","guest"].includes(r.presence)))
    &&!!db.getCharacter(observer)?.data.location&&db.getCharacter(observer).data.location===db.getCharacter(target)?.data.location;
}
function audienceAllows(row,scope){
  return row.visibility==="party"||scope.mode==="private"&&row.data.character===scope.actorCharacterId;
}
// Lossless display encoding, not semantic filtering: prevent Markdown/mentions from impersonating framing.
const ownerLiteral=text=>JSON.stringify(text).replace(/[`*_~|<>@#[\]]/gu,c=>`\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
/** Owner testimony is a separate epistemic lane, NOT a visible fact, consent or material outcome. */
export function saveCharacterSelfDescription(db,guild,user,character,input){
  const {s,principal}=sourceProof(db,guild,character,user,input.source_event),text=s.details.raw_text;
  if(!['party','character'].includes(input.visibility)||typeof text!=='string'||!text.trim()||text.length>700||ownerLiteral(text).length>1200
    ||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(text)
    ||!Array.isArray(input.observers)||input.observers.length>30
    ||input.observers.some(id=>typeof id!=='string'||db.getCharacter(id)?.guild_id!==guild||!visible(db,guild,id,character)))fail();
  return db.transaction(()=>{
    const data={version:1,character,user,principal_revision:principal.revision,source_event:s.event_key,source_hash:hash(s.details),
      text,visibility:input.visibility,observers:[...new Set(input.observers)],epistemic:'unverified_owner_report',
      canonical:false,effect_authority:false,observation_authority:false};
    const key=`self-description:${hash(data)}`;
    const disclosure=input.visibility==='party'?indexWorldEvent(db,guild,{key:`${key}:disclosure`,kind:'character_self_description_disclosure',
      title:'Owner selected sharing of unverified self-description',source_id:`player:${user}`,visibility:'party',
      session_id:s.session_id,scene:s.scene,details:{character,user,source_ref:s.event_key,description:key,
        principal_revision:principal.revision,epistemic:data.epistemic}},user):null;
    const body={...data,disclosure_ref:disclosure?.event_key||null,disclosure_hash:disclosure?hash(disclosure.details):null};
    return db.getCityRecord(guild,'character_self_description',key)||db.saveCityRecord(guild,{
      kind:'character_self_description',key,status:'active',visibility:input.visibility,subject_key:character,source_event:s.event_key,data:body});
  });
}
function selfDescriptionProof(db,guild,ref){
  const row=db.getCityRecord(guild,'character_self_description',ref);if(!row)fail();
  const {disclosure_ref,disclosure_hash,...data}=row.data,{s,principal}=sourceProof(db,guild,data.character,data.user,data.source_event);
  if(row.status!=='active'||row.record_key!==`self-description:${hash(data)}`||data.version!==1
    ||row.source_event!==s.event_key||row.subject_key!==data.character||row.visibility!==data.visibility
    ||hash(s.details)!==data.source_hash||data.principal_revision!==principal.revision||s.details.raw_text!==data.text
    ||data.epistemic!=='unverified_owner_report'||data.canonical!==false||data.effect_authority!==false||data.observation_authority!==false)fail();
  if(data.visibility==='party'){
    const disclosure=db.getWorldEvent(guild,disclosure_ref);
    if(disclosure?.kind!=='character_self_description_disclosure'||disclosure.status!=='active'||disclosure.visibility!=='party'
      ||hash(disclosure.details)!==disclosure_hash||!db.ownerAuthoredSource(guild,disclosure.event_key,data.user))fail();
  }else if(data.visibility!=='character'||disclosure_ref||disclosure_hash)fail();
  return row;
}
/** Exact attributed quotation; source authentication does not certify the paragraph's semantic claims. */
export function renderCharacterSelfDescription(db,guild,ref,query,scope){
  if(scope.actorUserId!==query.user||scope.actorCharacterId!==query.observer)fail();
  renderObservation(db,guild,query,scope); // Revalidate current query/actor/scene independently of the owner report.
  const row=selfDescriptionProof(db,guild,ref),d=row.data;
  if(query.target_type!=='character'||query.target!==d.character||!['appearance','clothing'].includes(query.operation)
    ||!audienceAllows(row,scope)||!visible(db,guild,query.observer,d.character)&&!d.observers.includes(query.observer))fail();
  // Display encoding preserves exact words on decoding; it is NOT a semantic proof of any claims inside them.
  return `Owner-attributed self-description by ${ownerLiteral(db.getCharacter(d.character).name)} (unverified owner report; not verified appearance, actions, knowledge or outcomes):\n${ownerLiteral(d.text)}`;
}
export function characterSelfDescriptionForQuery(db,guild,query,scope){
  if(query.target_type!=='character'||!['appearance','clothing'].includes(query.operation))return null;
  for(const row of db.listCityRecords(guild,{kind:'character_self_description',includeGM:true,limit:500})){
    if(row.subject_key!==query.target)continue;
    try{renderCharacterSelfDescription(db,guild,row.record_key,query,scope);return row;}
    catch(error){if(error.code!=='CHARACTER_OBSERVATION')throw error;}
  }
  return null;
}
/** Called by the native movement transaction BEFORE location/presence changes. Never model-authored witnesses. */
export function captureDepartureWitnesses(db,guild,character,visibility){
  const session=db.getActiveSession(guild),pc=db.getCharacter(character);
  if(!session||!pc?.data.location)return null;
  return {location:pc.data.location,observers:visibility==="party"?db.roster(session.id).filter(r=>r.character_id
    &&visible(db,guild,r.character_id,character)).map(r=>r.character_id):[character]};
}
/** Capture only actual native arrivals and exact owner utterances, with witnesses at commit time. */
export function recordCharacterPerceptions(db,guild,{world=[],intents=[],scope,sourceRef}){
  const session=db.getActiveSession(guild),source=sourceRef&&db.getWorldEvent(guild,sourceRef);
  if(!session||!source||source.status!=="active")return [];
  const candidates=[];
  for(const action of world.filter(r=>r.status==="arrived")){
    const arrival=db.getWorldEvent(guild,action.source_event);
    if(arrival?.kind==="arrival"&&arrival.details.entity_type==="character"){
      candidates.push({kind:"arrival",actor:arrival.details.entity_key,ref:arrival.event_key,location:arrival.location_key});
      const departed=arrival.details.departure;
      if(departed?.location&&Array.isArray(departed.observers)&&departed.location!==arrival.location_key)
        candidates.push({kind:"departure",actor:arrival.details.entity_key,ref:arrival.event_key,location:departed.location,
          observers:departed.observers});
    }
  }
  for(const row of intents.filter(i=>i.data.type==="speak"&&i.data.utterance&&i.data.source_span.includes(i.data.utterance)))
    candidates.push({kind:"dialogue",actor:row.data.actor,ref:row.data.world_source_event,quote:row.data.utterance});
  const saved=[];
  for(const candidate of candidates){
    const native=db.getWorldEvent(guild,candidate.ref),pc=db.getCharacter(candidate.actor);
    if(!native||native.status!=="active"||source.details.character_id!==pc?.id
      ||!db.ownerAuthoredSource(guild,source.event_key,pc.owner_user_id))continue;
    const observers=source.visibility==="party"?(candidate.kind==="departure"?candidate.observers
      :db.roster(session.id).filter(r=>r.character_id&&visible(db,guild,r.character_id,pc.id)).map(r=>r.character_id)):[pc.id];
    const data={version:1,...candidate,source_ref:source.event_key,source_hash:hash(source.details),native_hash:hash(native.details),
      actor_owner:pc.owner_user_id,principal_revision:conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision,
      observers,visibility:source.visibility,scene:currentScene(db,guild).key};
    const key=`perception:${hash(data)}`;
    saved.push(db.getCityRecord(guild,"character_perception_receipt",key)||db.saveCityRecord(guild,{
      kind:"character_perception_receipt",key,source_event:source.event_key,status:"active",visibility:source.visibility,
      subject_key:source.subject_key||null,data}));
  }
  return saved;
}
function perception(db,guild,query,scope){
  for(const row of db.listCityRecords(guild,{kind:"character_perception_receipt",includeGM:true,limit:500})){
    const d=row.data,s=db.getWorldEvent(guild,d.source_ref),n=db.getWorldEvent(guild,d.ref);
    if(row.status!=="active"||d.actor!==query.target||!d.observers.includes(query.observer)
      ||scope.mode!=="private"&&row.visibility!=="party"||row.visibility==="character"&&row.subject_key!==query.observer)continue;
    if(row.record_key!==`perception:${hash(d)}`||s?.status!=="active"||n?.status!=="active"
      ||hash(s.details)!==d.source_hash||hash(n.details)!==d.native_hash
      ||!db.ownerAuthoredSource(guild,s.event_key,d.actor_owner))continue;
    try{if(conversationPrincipal(db,guild,d.actor_owner,d.actor).revision!==d.principal_revision)continue;}catch{continue;}
    if(query.operation==="dialogue"&&d.kind==="dialogue"&&s.details.text.includes(d.quote))return {ref:row.record_key,
      text:`You previously heard ${db.getCharacter(query.target).name} say: “${d.quote}” (authored speech, not proof of its claims).`};
    if(query.operation==="location"&&d.kind==="arrival"&&n.kind==="arrival")return {ref:row.record_key,
      text:`Your last witnessed arrival of ${db.getCharacter(query.target).name} was at ${d.location}; this does not establish their current whereabouts.`};
    if(["location","activity"].includes(query.operation)&&d.kind==="departure"&&n.kind==="arrival"
      &&n.details.departure?.location===d.location&&hash(n.details.departure.observers)===hash(d.observers))return {ref:row.record_key,
      text:`You witnessed ${db.getCharacter(query.target).name} depart from ${d.location}; their current whereabouts are not established by that observation.`};
  }
  return null;
}
/** A typed inquiry is an information request, not evidence that the model's proposed answer is true. */
export function observationQueries(db,guild,intents,scope,sourceRef){
  if(!sourceRef||!scope.actorCharacterId||!scope.actorUserId)return [];
  const s=db.getWorldEvent(guild,sourceRef),pc=db.getCharacter(scope.actorCharacterId);
  if(!s||s.status!=="active"||s.details.author!==scope.actorUserId||s.details.character_id!==pc?.id
    ||s.details.private_scene!==(scope.mode==="private")
    ||pc.owner_user_id!==scope.actorUserId||!db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId))return [];
  const raw=s.details.text??s.details.raw_text??"",scene=currentScene(db,guild);
  if(s.scene!==scene.key||s.session_id!==scene.session_id)return [];
  return (intents||[]).filter(i=>i.type==="observe"&&i.framing==="immediate"&&i.source_span
    &&raw.includes(i.source_span)&&(db.getCharacter(i.target_key)?.guild_id===guild
      ||db.getNpcProfile(guild,i.target_key)||db.getSimulationEntity(guild,"location",i.target_key))).map(i=>({
    version:2,observer:pc.id,user:scope.actorUserId,target:i.target_key,operation:i.operation||"appearance",
    target_type:db.getCharacter(i.target_key)?"character":db.getNpcProfile(guild,i.target_key)?"npc":"location",
    source_ref:sourceRef,source_hash:hash(s.details),source_span:i.source_span,
    principal_revision:conversationPrincipal(db,guild,scope.actorUserId,pc.id).revision,scene:scene.key,session:scene.session_id
  }));
}
/** Native environment/GM NPC selection is descriptive authority, not a player action or a PC response. */
export function ambientWorldQueries(db,guild,scope,sourceRef){
  const source=sourceRef&&db.getWorldEvent(guild,sourceRef),raw=source?.details.text??source?.details.raw_text;
  if(!raw||!scope.actorCharacterId)return [];
  const location=db.getCharacter(scope.actorCharacterId)?.data.location;
  const candidates=db.listCityRecords(guild,{kind:"world_visible_fact",includeGM:true,limit:500})
    .filter(r=>r.data.location_key===location&&(r.data.facts.weather||r.data.facts.greeting));
  const queries=[],seen=new Set();
  for(const row of candidates){
    const key=`${row.data.entity_type}:${row.data.entity_key}`;if(seen.has(key))continue;seen.add(key);
    const query=observationQueries(db,guild,[{type:"observe",framing:"immediate",source_span:raw,
      target_key:row.data.entity_key,operation:"activity"}],scope,sourceRef)[0];
    if(query&&renderWorldObservation(db,guild,query,scope).proof_refs.length)queries.push(query);
  }
  return queries;
}
/** Render deterministic known/partial/unknown. Never reads arbitrary sheet text, GM hooks or private logs. */
export function renderObservation(db,guild,query,scope){
  const s=db.getWorldEvent(guild,query.source_ref),principal=conversationPrincipal(db,guild,query.user,query.observer);
  if(s?.status!=="active"||hash(s.details)!==query.source_hash||principal.kind!=="owner"
    ||principal.revision!==query.principal_revision||scope.actorCharacterId!==query.observer
    ||currentScene(db,guild).key!==query.scene)fail();
  if(query.target_type&&query.target_type!=="character")return renderWorldObservation(db,guild,query,scope);
  const target=db.getCharacter(query.target);if(target?.guild_id!==guild)fail();
  const canSee=visible(db,guild,query.observer,query.target),facts=[],selectedFields=new Set();
  for(const row of db.visibleCharacterFacts(guild,target.id)){
    if(row.data.character!==target.id)continue;
    try{factProof(db,guild,row);}catch(e){if(e.code==="CHARACTER_OBSERVATION")continue;throw e;}
    if(canSee){
      if(selectedFields.has(row.data.field))continue;selectedFields.add(row.data.field);
    }
    if(!audienceAllows(row,scope))continue;
    if(!canSee&&(row.data.field==="visible_condition"||!row.data.observers.includes(query.observer)))continue;
    if(!canSee){if(selectedFields.has(row.data.field))continue;selectedFields.add(row.data.field);}
    facts.push(row);
  }
  const name=target.name,proof_refs=[];
  const witnessed=perception(db,guild,query,scope);
  let state="not_established",text;
  // Historical queries retain their original field projection and payload.
  // V2 adds only owner-selected nonmechanical styling, never equipment/Armor capabilities.
  const coatFields=["coat","coat_material","coat_finish","coat_detail"],modern=query.version===2;
  const category=({appearance:modern?["hair","disguise",...coatFields]:["hair","disguise"],
    clothing:modern?[...coatFields,"disguise"]:["coat","disguise"],condition:["visible_condition"]})[query.operation];
  if(category){
    const selected=facts.filter(f=>category.includes(f.data.field));
    if(selected.length){
      const coat=selected.find(row=>row.data.field==="coat"),styling=modern?selected.filter(row=>coatFields.includes(row.data.field)):[],
        style=Object.fromEntries(styling.map(row=>[row.data.field,row.data.value]));
      const descriptions=selected.filter(row=>!coat||row.data.field==="coat"||!coatFields.includes(row.data.field)).map(row=>{
        proof_refs.push(row.record_key);
        if(row.data.field==="hair")return row.data.value==="bald"?"a bald head":`${row.data.value} hair`;
        if(row.data.field==="coat"){
          proof_refs.push(...styling.filter(other=>other.record_key!==row.record_key).map(other=>other.record_key));
          const description=[style.coat_finish,row.data.value,style.coat_material,"coat"].filter(Boolean).join(" ")
            +(style.coat_detail?` with ${style.coat_detail}`:"");
          const location=db.getCharacter(query.target)?.data.location;
          if(canSee&&location&&db.getSimulationEntity(guild,"location",location)){
            const weather=renderWorldObservation(db,guild,{...query,target_type:"location",target:location,operation:"appearance"},scope);
            if(weather.canSee&&weather.facts.weather==="rain"&&weather.facts.exposure==="outdoors"){
              proof_refs.push(...weather.proof_refs);return `a rain-wet ${description}`;
            }
          }
          return `a ${description}`;
        }
        if(coatFields.includes(row.data.field))return `${row.data.value} (${({coat_material:"coat fabric",coat_finish:"coat finish",coat_detail:"coat detail"})[row.data.field]})`;
        if(row.data.field==="disguise")return `a ${row.data.value} appearance`;
        return `an established ${row.data.value} visible condition`;
      });
      state=canSee?"partial":"remembered";
      text=`${canSee?"Visible established details":"Previously witnessed details"} of ${name}: ${descriptions.join(", ")}. Other details remain unspecified.`;
    }else if(!canSee){state="not_visible";text=`You cannot currently see ${name}, and have no reliable description to go on.`;}
    else text=`${name} is nearby, but that description is not established in enough detail to report reliably.`;
  }else if(witnessed){state="remembered";text=witnessed.text;proof_refs.push(witnessed.ref);
  }else if(query.operation==="location"){
    if(canSee){state="known";text=`You can currently see ${name} here.`;}
    else{state="not_known_to_observer";text=`${name}'s current whereabouts are not known from your available observations.`;}
  }else{
    state="not_known_to_observer";
    text=query.operation==="thoughts"?`${name}'s internal thoughts and feelings are not known from available evidence.`
      :`No established ${query.operation==="dialogue"?"heard response":"witnessed activity"} is available to report about ${name}.`;
  }
  return {kind:"observation_answer",state,text,query,proof_refs};
}
