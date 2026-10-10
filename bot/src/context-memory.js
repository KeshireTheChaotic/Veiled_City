/** Lightweight narrative memory for named/used objects and continuity details; not canon or possession. */
import { worldInputKey } from './autonomous-world.js';

const text=n=>({type:'string',maxLength:n});
const object=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
export const contextMemorySchema={type:'array',maxItems:8,items:object({
  kind:{type:'string',enum:['object','detail','rumor']},key:text(100),name:text(160),summary:text(600),
  retention:{type:'string',enum:['durable','temporary']}
})};
export const CONTEXT_MEMORY_PROMPT=[
  'context_memories are optional descriptions, NEVER authoritative canon, player inventory, NPC knowledge or ownership.',
  'Use for distinctive props, signs, incidental witnesses, environmental clues or contextual objects not covered by world_additions.',
  'Choose durable only when explicitly named/referenced/acted on by a player OR deliberately introduced as an important returning story detail.',
  'Choose temporary for incidental atmosphere. Temporary details remain in the narration, not persistent tables.',
  'Never create a durable memory of a GM-only secret in a public player scene. Do not elevate a rumor to objective truth.',
  'NPCs and actionable locations need world_additions, not generic context_memories.'
].join(' ');

export function persistentMemories(result,playerText=''){
  const rows=result?.context_memories||[];
  if(!Array.isArray(rows)||rows.length>8)throw Object.assign(new Error('Bounded context memories required.'),{code:'CONTEXT_MEMORY'});
  const text=(String(playerText)+' '+String(result?.narration||'')+' '+(result?.private_messages||[]).map(x=>x.content||'').join(' ')).toLowerCase();
  return rows.filter(x=>{
    if(!['object','detail','rumor'].includes(x?.kind)||!['durable','temporary'].includes(x?.retention)||
      ![x.key,x.name,x.summary].every(v=>typeof v==='string')||!x.key||!x.name||!x.summary||
      x.key.length>100||x.name.length>160||x.summary.length>600||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.key))
      throw Object.assign(new Error('Closed, named context memory required.'),{code:'CONTEXT_MEMORY'});
    const action=(result?.player_intents||[]).some(i=>i.target_key===x.key||i.target_name.toLowerCase()===x.name.toLowerCase());
    return x.retention==='durable'&&(action||text.includes(x.name.toLowerCase()));
  });
}

export function saveContextMemories(db,guild,result,scope,provenance){
  if(!(result?.context_memories||[]).length)return [];
  if(!scope.actorCharacterId||!scope.actorUserId||!provenance.messageId)throw Object.assign(new Error('Context memory needs current authenticated character input.'),{code:'CONTEXT_MEMORY'});
  const pc=db.getCharacter(scope.actorCharacterId);
  if(!pc||pc.guild_id!==guild)throw Object.assign(new Error('Cross-guild/unknown character.'),{code:'CONTEXT_MEMORY'});
  const source=db.getWorldEvent(guild,worldInputKey(provenance.messageId,pc.id));
  if(!source||source.status!=='active'||source.details.author!==scope.actorUserId||source.details.character_id!==pc.id||
    source.details.private_scene!==(scope.mode==='private')||!db.ownerAuthoredSource(guild,source.event_key,scope.actorUserId))
    throw Object.assign(new Error('Memory requires current authenticated source.'),{code:'CONTEXT_MEMORY'});
  const durable=persistentMemories(result,source.details.text);
  const vis=scope.mode==='private'?'character':'party';
  return durable.map(row=>{
    const key=`context:${row.kind}:${row.key}`;
    const prior=db.getCityRecord(guild,'context_memory',key);
    if(prior)return prior; // No silent replacement of established narrative memory.
    return db.saveCityRecord(guild,{kind:'context_memory',key,source_event:source.event_key,status:'active',
      visibility:vis,subject_key:vis==='character'?pc.id:null,location_key:pc.data.location||null,
      data:{...row,provenance:'gm_descriptive_context_not_canon_or_inventory',owner_source:source.event_key}});
  });
}
