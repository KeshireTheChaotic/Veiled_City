/** Visibility-safe identity/referent resolution; understands destinations but never grants travel or access. */
import { normalizeNpcKey } from "./npc-cognition.js";
const normalized=value=>normalizeNpcKey(String(value||"").replace(/^(?:the|my|our)\s+/i,""));
export function resolvePlaceReference(db,guild,character,phrase,{mode="party",user=""}={}){
  const wanted=normalized(phrase),pc=db.getCharacter(character);
  const rows=db.listSimulationEntities(guild,"location");
  const matches=rows.filter(row=>[row.entity_key,row.state.name,row.state.title,row.state.display_name,...(row.state.aliases||[])]
    .filter(v=>typeof v==="string").some(v=>normalized(v)===wanted));
  const context=db.characterContinuity(guild,character,{kind:"narrative_context",limit:30});
  for(const row of context){
    const source=db.getWorldEvent(guild,row.source_event);
    if(source?.status!=="active"||source.details.author!==user||source.details.character_id!==character
      ||mode!=="private"&&source.details.private_scene)continue;
    for(const ref of row.data.interpretation?.references||[]){
      if(ref.entity_type!=="location"||ref.status!=="resolved"||normalized(ref.phrase)!==wanted)continue;
      if(!ref.source_refs.every(key=>db.getWorldEvent(guild,key.replace(/^event:/,""))?.status==="active"))continue;
      const target=rows.find(location=>location.entity_key===ref.entity_key);if(target)matches.push(target);
    }
  }
  if(['inside','it'].includes(wanted)&&pc?.guild_id===guild&&pc.data.location){
    const current=rows.find(row=>row.entity_key===pc.data.location);if(current)matches.push(current);
  }
  const unique=[...new Map(matches.map(row=>[row.entity_key,row])).values()];
  return unique.length===1?{status:"resolved_existing",location:unique[0]}:
    {status:unique.length?"needs_player_clarification":"unknown",candidates:unique.map(row=>row.entity_key)};
}

/** Bounded GM-side identity/canon preflight; protected collisions return no secret details. */
export function preflightPlaceIdentity(db,guild,{key,name,scope}){
  const wanted=new Set([normalized(key),normalized(name)]),visible=[],protectedMatches=[];
  for(const row of db.listSimulationEntities(guild,"location")){
    const aliases=[row.entity_key,row.state.name,row.state.title,row.state.display_name,...(row.state.aliases||[])].map(normalized);
    if(!aliases.some(alias=>wanted.has(alias)))continue;
    const reference=db.getReference(guild,"location",row.entity_key),allowed=!reference||["public","party"].includes(reference.visibility)
      ||scope.mode==="private"&&reference.visibility==="character"&&reference.subject_character_id===scope.actorCharacterId;
    (allowed?visible:protectedMatches).push(row);
  }
  const canonCollision=db.listCanon(guild,{includeGM:true,limit:500}).some(row=>{
    const canonNames=[row.canon_key.split(".").at(-1),row.value].map(normalized);return canonNames.some(value=>wanted.has(value));
  });
  if(protectedMatches.length||canonCollision)return {status:"protected_collision",matches:[]};
  if(visible.length===1)return {status:"reuse",matches:visible};
  if(visible.length>1)return {status:"ambiguous",matches:visible};
  return {status:"clear",matches:[]};
}

/** NPC equivalent of place preflight, including aliases and protected references. */
export function preflightNpcIdentity(db,guild,{key,name,scope}){
  const wanted=new Set([normalized(key),normalized(name)]),visible=[],protectedMatches=[];
  const profiles=new Map(db.listNpcProfiles(guild,{limit:500}).map(row=>[row.npc_key,row]));
  for(const row of db.listSimulationEntities(guild,"npc")){
    const profile=profiles.get(row.entity_key),aliases=[row.entity_key,row.state.name,row.state.display_name,
      profile?.display_name,...(row.state.aliases||[])].map(normalized);
    if(!aliases.some(alias=>wanted.has(alias)))continue;
    const reference=db.getReference(guild,"npc",row.entity_key),allowed=!reference||["public","party"].includes(reference.visibility)
      ||scope.mode==="private"&&reference.visibility==="character"&&reference.subject_character_id===scope.actorCharacterId;
    (allowed?visible:protectedMatches).push({...row,npc_key:row.entity_key});
  }
  for(const reference of db.listReferences(guild,"npc",{publicOnly:false})){
    if(!wanted.has(normalized(reference.display_name))&&!wanted.has(normalized(reference.entity_key)))continue;
    const allowed=["public","party"].includes(reference.visibility)
      ||scope.mode==="private"&&reference.visibility==="character"&&reference.subject_character_id===scope.actorCharacterId;
    const bucket=allowed?visible:protectedMatches;
    if(!bucket.some(row=>(row.entity_key||row.npc_key)===reference.entity_key))bucket.push({npc_key:reference.entity_key,entity_key:reference.entity_key});
  }
  const canonCollision=db.listCanon(guild,{includeGM:true,limit:500}).some(row=>
    [row.canon_key.split(".").at(-1),row.value].map(normalized).some(value=>wanted.has(value)));
  if(protectedMatches.length||canonCollision)return {status:"protected_collision",matches:[]};
  const unique=[...new Map(visible.map(row=>[row.entity_key||row.npc_key,row])).values()];
  if(unique.length===1)return {status:"reuse",matches:unique};
  if(unique.length>1)return {status:"ambiguous",matches:unique};
  return {status:"clear",matches:[]};
}
