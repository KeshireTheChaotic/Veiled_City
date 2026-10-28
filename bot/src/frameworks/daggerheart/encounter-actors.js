/** Native source, presence and acquired-evidence checks for encounter actors. */
export function createEncounterActors({requireCitySource,currentScene,scenePresence,actorSource,cityKey}){
function encounterActors(db,guild,input){
  requireCitySource(db,guild,input.source_event);
  const scene=currentScene(db,guild),actors=input.actors;
  if(!Array.isArray(actors)||!actors.length||actors.length>12||new Set(actors).size!==actors.length) throw new Error("One to twelve distinct established encounter actors required.");
  return actors.map(key=>{
    const binding=db.getCityRecord(guild,"encounter_actor",cityKey(key)),presence=scenePresence(db,guild,"npc",key);
    if(!binding||binding.status!=="active") throw new Error("GM-approved actor template binding required.");
    requireCitySource(db,guild,binding.source_event);
    if(presence?.data.state!=="actually_present"||presence.location_key!==input.location_key
      ||db.getSimulationEntity(guild,"npc",key)?.state.location_key!==input.location_key) throw new Error("Actor must actually occupy this scene; budget cannot create arrivals.");
    requireCitySource(db,guild,presence.source_event);
    actorSource(db,guild,{actor_type:"npc",actor_key:key,information_key:binding.data.information_key,source_event:input.source_event});
    return {key,template:binding.data.template,source_event:binding.source_event,presence_source:presence.source_event,scene:scene.key};
  });
}
return encounterActors;
}
