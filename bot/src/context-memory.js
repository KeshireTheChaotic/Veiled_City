/** Audience-bound descriptive memory; never canon, possession, or NPC knowledge. */
import { createHash } from "node:crypto";
import { rememberEntity } from "./memory-lifecycle.js";

const text=n=>({type:"string",maxLength:n});
const object=properties=>({type:"object",additionalProperties:false,properties,required:Object.keys(properties)});
const AUDIENCE_CONTRACT=1;

export const contextMemorySchema={type:"array",maxItems:8,items:object({
  kind:{type:"string",enum:["object","detail","rumor"]},key:text(100),name:text(160),summary:text(600),
  retention:{type:"string",enum:["durable","temporary"]}
})};

export const CONTEXT_MEMORY_PROMPT=[
  "context_memories are optional descriptions, NEVER authoritative canon, player inventory, NPC knowledge or ownership.",
  "Use for distinctive props, signs, incidental witnesses, environmental clues or contextual objects not covered by world_additions.",
  "Choose durable only when explicitly named/referenced/acted on by a player OR deliberately introduced as an important returning story detail.",
  "Choose temporary for incidental atmosphere. Temporary details remain in the narration, not persistent tables.",
  "Never create a durable memory of a GM-only secret in a public player scene. Do not elevate a rumor to objective truth.",
  "NPCs and actionable locations need world_additions, not generic context_memories."
].join(" ");

function validateRows(result){
  const rows=result?.context_memories||[];
  if(!Array.isArray(rows)||rows.length>8) throw Object.assign(new Error("Bounded context memories required."),{code:"CONTEXT_MEMORY"});
  for(const row of rows){
    if(!["object","detail","rumor"].includes(row?.kind)||!["durable","temporary"].includes(row?.retention)||
      ![row.key,row.name,row.summary].every(value=>typeof value==="string")||!row.key||!row.name||!row.summary||
      row.key.length>100||row.name.length>160||row.summary.length>600||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.key))
      throw Object.assign(new Error("Closed, named context memory required."),{code:"CONTEXT_MEMORY"});
  }
  return rows;
}

function mentions(textValue,name){
  return String(textValue||"").toLocaleLowerCase().includes(String(name||"").toLocaleLowerCase());
}

function matchingIntent(result,row,surfaceText){
  return (result?.player_intents||[]).find(intent=>{
    const span=String(intent?.source_span||"");
    return span&&String(surfaceText||"").includes(span)&&
      (intent.target_key===row.key||String(intent.target_name||"").toLocaleLowerCase()===row.name.toLocaleLowerCase());
  });
}

function supportingExcerpt(surfaceText,row,intent=null){
  const source=String(surfaceText||"");
  const needle=intent?.source_span||row.name;
  const at=source.toLocaleLowerCase().indexOf(String(needle).toLocaleLowerCase());
  if(at<0) return "";
  let start=Math.max(0,source.lastIndexOf("\n",at)+1),end=source.indexOf("\n",at+String(needle).length);
  if(end<0) end=source.length;
  if(end-start>600){start=Math.max(start,at-240);end=Math.min(end,start+600);}
  return source.slice(start,end).trim();
}

function safeIdentity(name){
  const slug=String(name||"").normalize("NFKD").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase();
  return (slug||createHash("sha256").update(String(name)).digest("hex").slice(0,20)).slice(0,100);
}

function sourceKey(messageId,characterId){
  return `world-input:${createHash("sha256").update(JSON.stringify([messageId,characterId])).digest("hex").slice(0,40)}`;
}

function audienceId(surface){
  return `${surface.visibility}:${surface.subjectKey||"shared"}`;
}

function outputSurfaces(db,guild,result,scope,source){
  const privateTurn=scope.mode==="private";
  const turnVisibility=privateTurn?(scope.actorCharacterId?"character":"player"):"party";
  const turnSubject=privateTurn?(scope.actorCharacterId||scope.actorUserId):null;
  const surfaces=[
    {kind:"player_input",text:source.details.text,visibility:turnVisibility,subjectKey:turnSubject},
    {kind:"narration",text:result?.narration||"",visibility:turnVisibility,subjectKey:turnSubject}
  ];
  const session=db.getActiveSession(guild);
  const activeUsers=new Set((session?db.roster(session.id):[]).filter(row=>["present","late","guest"].includes(row.presence))
    .map(row=>row.discord_user_id).filter(Boolean));
  for(const message of result?.private_messages||[]){
    const recipient=String(message?.discord_user_id||"");
    if(!recipient||!session||privateTurn&&recipient!==scope.actorUserId||!privateTurn&&!activeUsers.has(recipient)) continue;
    const assignment=db.activeAssignment(session.id,recipient);
    if(assignment) surfaces.push({kind:"private_message",text:message.content||"",visibility:"character",
      subjectKey:assignment.character_id,recipient});
    else if(recipient===scope.actorUserId) surfaces.push({kind:"private_message",text:message.content||"",visibility:"player",
      subjectKey:recipient,recipient});
  }
  return surfaces.filter(surface=>surface.text&&surface.subjectKey!==undefined);
}

/** Compatibility selector: only the turn's shared/own narration surface can establish its memory. */
export function persistentMemories(result,playerText=""){
  return validateRows(result).filter(row=>{
    if(row.retention!=="durable") return false;
    const surface=`${String(playerText)} ${String(result?.narration||"")}`;
    return mentions(surface,row.name)||!!matchingIntent(result,row,playerText);
  });
}

export function saveContextMemories(db,guild,result,scope,provenance){
  const rows=validateRows(result);
  if(!rows.length) return [];
  if(!scope.actorCharacterId||!scope.actorUserId||!provenance.messageId)
    throw Object.assign(new Error("Context memory needs current authenticated character input."),{code:"CONTEXT_MEMORY"});
  const pc=db.getCharacter(scope.actorCharacterId);
  if(!pc||pc.guild_id!==guild) throw Object.assign(new Error("Cross-guild/unknown character."),{code:"CONTEXT_MEMORY"});
  const source=db.getWorldEvent(guild,sourceKey(provenance.messageId,pc.id));
  if(!source||source.status!=="active"||source.details.author!==scope.actorUserId||source.details.character_id!==pc.id||
    source.details.private_scene!==(scope.mode==="private")||!db.ownerAuthoredSource(guild,source.event_key,scope.actorUserId))
    throw Object.assign(new Error("Memory requires current authenticated source."),{code:"CONTEXT_MEMORY"});

  const surfaces=outputSurfaces(db,guild,result,scope,source),saved=[];
  for(const row of rows.filter(item=>item.retention==="durable")){
    const supported=new Map();
    for(const surface of surfaces){
      const intent=surface.kind==="player_input"?matchingIntent(result,row,surface.text):null;
      if(!mentions(surface.text,row.name)&&!intent) continue;
      const excerpt=supportingExcerpt(surface.text,row,intent);
      if(excerpt&&!supported.has(audienceId(surface))) supported.set(audienceId(surface),{surface,excerpt});
    }
    for(const {surface,excerpt} of supported.values()){
      const identity=safeIdentity(row.name);
      const key=`context:${row.kind}:${identity}:${surface.visibility}:${surface.subjectKey||"shared"}`;
      const prior=db.getCityRecord(guild,"context_memory",key);
      if(prior){saved.push(prior);continue;}
      const context=db.saveCityRecord(guild,{kind:"context_memory",key,source_event:source.event_key,status:"active",
        visibility:surface.visibility,subject_key:surface.subjectKey||null,location_key:pc.data.location||"",
        data:{kind:row.kind,key:identity,name:row.name,summary:excerpt,retention:"durable",
          provenance:"audience_bound_gm_descriptive_context_not_canon_inventory_or_knowledge",
          audience_contract:AUDIENCE_CONTRACT,origin_surface:surface.kind,origin_visibility:surface.visibility,
          origin_subject:surface.subjectKey||null,owner_source:source.event_key}});
      rememberEntity(db,guild,{kind:row.kind,name:row.name,parent_key:pc.data.location?`location:${pc.data.location}`:`scene:${source.scene}`,
        aliases:[],source_event:source.event_key,visibility:surface.visibility,subject_key:surface.subjectKey||null,
        epistemic:row.kind==="rumor"?"testimony":"observation",summary:excerpt});
      saved.push(context);
    }
  }
  return saved;
}

function recordVisible(row,scope){
  return ["public","party"].includes(row.visibility)||scope.mode==="private"&&(
    row.visibility==="player"&&row.subject_key===scope.actorUserId||
    row.visibility==="character"&&row.subject_key===scope.actorCharacterId);
}

function sourceCompatible(row,source){
  if(!source||source.status!=="active") return false;
  if(["public","party"].includes(row.visibility)) return ["public","party"].includes(source.visibility);
  if(["public","party"].includes(source.visibility)) return true;
  return source.visibility===row.visibility&&source.subject_key===row.subject_key;
}

/** Fail-closed read projection: legacy/unbound memory rows are not player-turn context. */
export function contextMemoriesForScope(db,guild,scope,{limit=40}={}){
  return db.listCityRecords(guild,{kind:"context_memory",includeGM:true,limit:100}).filter(row=>{
    const data=row.data||{},source=db.getWorldEvent(guild,row.source_event);
    return row.status==="active"&&data.audience_contract===AUDIENCE_CONTRACT&&recordVisible(row,scope)&&
      data.origin_visibility===row.visibility&&(data.origin_subject||null)===(row.subject_key||null)&&sourceCompatible(row,source);
  }).slice(0,Math.max(1,Math.min(100,limit))).map(row=>({kind:row.data.kind,key:row.data.key,name:row.data.name,
    summary:row.data.summary,authority:"descriptive_only_not_canon",visibility:row.visibility}));
}
