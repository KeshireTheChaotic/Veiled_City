/** Original native simulation row transformation, shared by execution and orchestration. */
export function saveRecord(db,guildId,row,changes){
  return db.putSimulationRecord(guildId,{id:row.id,kind:row.kind,entityKey:row.entity_key,status:row.status,
    dueTick:row.due_tick,dueMinute:row.due_minute,data:row.data,...changes});
}

