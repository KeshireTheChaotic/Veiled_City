/** Source-aware distinction between temporary scene prose and entities with durable continuity. */

function containsIdentity(text,entity){
  const input=String(text||'').toLocaleLowerCase();
  const names=[entity.name,entity.key?.replace(/-/g,' ')].filter(Boolean).map(s=>String(s).toLocaleLowerCase());
  return names.some(name=>name.length>=3&&input.includes(name));
}

/**
 * Durable only if named/targeted by player, used in native actions or deliberately presented as a named
 * continuity anchor. Other details remain in narration/transcript, not entity tables or canon.
 * The GM must never emit a material scene action referencing a discarded ephemeral addition.
 */
export function tierWorldAdditions(result,authenticatedPlayerText=''){
  if(!result||!Array.isArray(result.world_additions))return {durable:[],ephemeral:[]};
  const targeted=new Set((result.scene_actions||[]).map(x=>x.entity_ref));
  const intents=result.player_intents||[];
  const durable=[],ephemeral=[];
  for(const item of result.world_additions){
    const requested=containsIdentity(authenticatedPlayerText,item);
    const intentional=intents.some(i=>i.target_key===item.key||containsIdentity(i.target_name,item));
    const used=targeted.has(item.key);
    // If the GM explicitly names a place or NPC in narration, later player references must resolve.
    const established=containsIdentity(result.narration,item);
    if(requested||intentional||used||established)durable.push(item);
    else ephemeral.push({kind:item.kind,key:item.key,reason:'No player reference, consequential use or named narrative appearance.'});
  }
  result.world_additions=durable;
  return {durable,ephemeral};
}
