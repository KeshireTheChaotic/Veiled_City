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
