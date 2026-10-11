/** Bounded audience-safe memory projection for interpretation. Never consequence authority. */
import { contextMemoriesForScope } from "./context-memory.js";
import { retrieveMemoryRevisions } from "./memory-lifecycle.js";
import { currentScene, sceneView } from "./scene-continuity.js";

const pendingStatuses=new Set(["pending","suspended","clarification","awaiting_referent","awaiting_selection","needs_review"]);
const normalize=value=>String(value||"").normalize("NFKD").toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g," ").trim().replace(/^(?:the|a|an|my|our)\s+/,"");

function pendingIdentityRefs(db,guild,scope){
  const refs=new Set();
  for(const kind of ["compound_action","semantic_intent_proposal","roll_request","scene_action_pending"]){
    for(const row of db.listCityRecords(guild,{kind,includeGM:true,limit:100})){
      if(!["public","party"].includes(row.visibility)&&!(scope.mode==="private"&&(
        row.visibility==="character"&&row.subject_key===scope.actorCharacterId
        ||row.visibility==="player"&&row.subject_key===scope.actorUserId)))continue;
      if(!pendingStatuses.has(row.status)&&!pendingStatuses.has(row.data?.status))continue;
      for(const key of row.data?.memory_identity_refs||[])if(typeof key==="string"&&key.startsWith("memory-id:"))refs.add(key);
      for(const key of [row.data?.target_key,row.data?.target?.key])if(typeof key==="string"&&key.startsWith("memory-id:"))refs.add(key);
    }
  }
  return [...refs];
}

function visiblePositions(db,guild,scope,currentLocation){
  const session=db.getActiveSession(guild);if(!session)return [];
  if(!currentLocation||!scope.actorCharacterId)return [];
  const rows=[];
  const accessible=new Set(sceneView(db,guild,{observer_type:"character",observer_key:scope.actorCharacterId})
    .occupants.map(row=>`${row.entity_type}:${row.entity_key}`));
  for(const row of db.listCityRecords(guild,{kind:"scene_presence",includeGM:true,limit:100})){
    const source=db.getWorldEvent(guild,row.source_event),data=row.data||{};
    if(row.status!=="active"||data.state!=="actually_present"||source?.status!=="active"
      ||data.scene!==currentScene(db,guild).key||data.hidden||!accessible.has(`${data.entity_type}:${data.entity_key}`)
      ||!["public","party"].includes(row.visibility)||row.location_key!==currentLocation
      ||!["public","party"].includes(source.visibility))continue;
    if(!rows.some(item=>item.entity_type===data.entity_type&&item.entity_key===data.entity_key))
      rows.push({entity_type:data.entity_type,entity_key:data.entity_key,
        name:data.entity_type==="npc"?(db.getNpcProfile(guild,data.entity_key)?.display_name||data.entity_key)
          :data.entity_type==="character"?(db.getCharacter(data.entity_key)?.name||data.entity_key):data.entity_key,location_key:row.location_key,
        zone:data.zone,source_event:row.source_event,authority:"active native scene-presence receipt"});
  }
  return rows.slice(0,32);
}

function score(row,{query,currentLocation,sourceEvent,pending}){
  const terms=normalize(query),names=[row.name,...(row.aliases||[])].map(normalize).filter(Boolean);
  let value=0;
  if(currentLocation&&row.parent_key===`location:${currentLocation}`)value+=100;
  if(sourceEvent&&row.source_event===sourceEvent)value+=80;
  if(pending.has(row.identity))value+=60;
  if(terms&&names.some(name=>terms.includes(name)))value+=40;
  if(row.epistemic==="native_fact")value+=10;
  return value;
}

/** Retrieve only memories visible on the current output surface, with explicit epistemic labels. */
export function scopedSceneMemory(db,guild,scope={},options={}){
  const limit=Math.max(1,Math.min(40,options.limit||20));
  const pending=new Set(pendingIdentityRefs(db,guild,scope));
  const lifecycle=retrieveMemoryRevisions(db,guild,scope,{limit:100,at_tick:options.atTick,
    pending_identity_refs:[...pending]});
  const rows=lifecycle.map(row=>({...row,authority:"memory evidence only; never access, presence, consent, canon or outcome authority"}))
    .sort((a,b)=>score(b,{...options,pending})-score(a,{...options,pending})
      ||a.identity.localeCompare(b.identity)).slice(0,limit);
  const represented=new Set(rows.map(row=>normalize(row.name)));
  const compatibility=contextMemoriesForScope(db,guild,scope,{limit}).filter(row=>!represented.has(normalize(row.name)))
    .map(row=>({...row,identity:null,aliases:[],parent_key:"",epistemic:"observation",source_event:null,
      authority:"legacy audience-bound descriptive evidence only; never consequence authority"}))
    .slice(0,Math.max(0,limit-rows.length));
  return {authority:"Evidence only: interpretation may resolve context; native receipts separately authorize consequences.",
    current_location:options.currentLocation||null,pending_identity_refs:[...pending],memories:[...rows,...compatibility],
    positions:visiblePositions(db,guild,scope,options.currentLocation||"")};
}

/** Resolve an audience-visible identity. Parent/location scoping outranks names; ties stay ambiguous. */
export function resolveScopedMemoryReference(db,guild,scope,phrase,options={}){
  const wanted=normalize(phrase);if(!wanted)return {status:"unknown",candidates:[]};
  const context=scopedSceneMemory(db,guild,scope,{...options,query:phrase,limit:40});
  const matches=context.memories.filter(row=>[row.name,...(row.aliases||[])].some(value=>normalize(value)===wanted));
  if(!matches.length){
    const people=context.positions.filter(row=>normalize(row.name)===wanted||normalize(row.entity_key)===wanted);
    return people.length===1?{status:"resolved",identity:null,entity_type:people[0].entity_type,entity_key:people[0].entity_key,
      source_event:people[0].source_event||null,authority:people[0].authority}:
      {status:people.length?"ambiguous":"unknown",candidates:people.map(row=>row.entity_key)};
  }
  const located=options.currentLocation?matches.filter(row=>row.parent_key===`location:${options.currentLocation}`):matches;
  const candidates=located.length?located:matches;
  if(candidates.length!==1)return {status:"ambiguous",candidates:candidates.map(row=>row.identity)};
  const row=candidates[0];return {status:"resolved",identity:row.identity,entity_type:"memory",entity_key:row.identity,
    parent_key:row.parent_key,source_event:row.source_event,epistemic:row.epistemic,authority:row.authority};
}
