/** Shared availability/delegation guards; preferences never move NPCs or override a human-controlled proxy. */
export function activeCityProxy(db,guildId,key){
  const session=db.getActiveSession(guildId);
  return session?db.listNpcProxies(session.id,{statuses:["active"]}).find(row=>row.npc_key===key):null;
}
export function assertNpcAvailability(db,guildId,key,action){
  if(activeCityProxy(db,guildId,key)) throw new Error("An active human NPC proxy retains voluntary control.");
  const clock=db.getSimulationClock(guildId);
  const commitment=db.overlappingCommitment(guildId,`npc:${key}`,clock.minute,clock.minute+1);
  if(commitment&&commitment.location_key&&action.location_key&&commitment.location_key!==action.location_key)
    throw new Error("NPC has an incompatible established commitment; cancel or delegate explicitly.");
  if(action.type==="travel"){
    const state=db.getSimulationEntity(guildId,"npc",key)?.state;
    const route=db.cityEdges(guildId,"route").find(edge=>edge.from_key===state?.location_key&&edge.to_key===action.location_key);
    if(route&&(action.delay_minutes||0)<route.duration_minutes) throw new Error("Travel delay is shorter than the established route duration.");
  }
}
export function npcAvailability(db,guildId,key){
  const clock=db.getSimulationClock(guildId);
  return {location_key:db.getSimulationEntity(guildId,"npc",key)?.state?.location_key||"",
    proxy_controlled:!!activeCityProxy(db,guildId,key),
    current_commitment:db.overlappingCommitment(guildId,`npc:${key}`,clock.minute,clock.minute+1)?.record_key||null,
    preferences:db.listCityRecords(guildId,{kind:"routine",actor:key,includeGM:true,limit:4})
      .flatMap(row=>row.data.intervals.filter(slot=>slot.start<=clock.minute&&slot.end>clock.minute)).slice(0,4),
    authority:"routine_preferences_are_not_actual_position"};
}
export function assertInstitutionDelegation(db,guildId,institution,input){
  const roles=institution.data.personnel||[];
  if(!roles.length&&!input.personnel_key) return;
  const role=db.getCityRecord(guildId,"personnel",input.personnel_key||"");
  if(!role||role.status!=="active"||role.data.institution!==institution.record_key||!role.data.actions.includes(input.type))
    throw new Error("No established personnel delegation authorizes this institutional action.");
  if(activeCityProxy(db,guildId,role.data.npc)) throw new Error("Delegated NPC is under human proxy control.");
  if(role.data.capacity<1) throw new Error("Delegated personnel have no operational capacity.");
  if(role.data.dissent_actions?.includes(input.type)) throw new Error("Established personnel dissent blocks this delegated procedure.");
}
/** Chronological exclusion, not a new reservation/currency manager; physical travel never resolves contested title. */
export function assertQueuedCompatibility(db,guildId,record){
  if(db.getCityCalendar(guildId).flags.conflict_mediation!==true) return;
  const action=record.data,queued=db.queuedActorActions(guildId,record.entity_key);
  for(const other of queued){
    if(other.id===record.id) break;
    const peer=other.data;
    if((action.type==="travel"||peer.type==="travel")
      &&(action.location_key||action.target_key)!==(peer.location_key||peer.target_key))
      throw new Error(`Earlier queued action ${other.id} has incompatible travel/location; cancel, defer or seek GM review.`);
  }
  if(action.strategy_key){
    const plan=db.getCityRecord(guildId,"strategy",action.strategy_key);
    if(!plan||plan.status!=="active"||plan.data.revision!==action.strategy_revision) throw new Error("Strategy no longer authorizes this queued step.");
    const source=db.getWorldEvent(guildId,plan.source_event);
    if(!source||source.status!=="active") throw new Error("Strategy source retracted; reconcile before spending.");
  }
}
