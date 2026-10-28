/** Existing read-only simulation overview for the GM dashboard. */
export function simulationOverview(db,guildId){
  return {clock:db.getSimulationClock(guildId),entities:db.listSimulationEntities(guildId),
    pending:db.listSimulationRecords(guildId,{kind:"action",status:"pending",limit:1000}),
    deferred:db.listSimulationRecords(guildId,{kind:"action",status:"deferred",limit:1000}),
    scheduled:db.listSimulationRecords(guildId,{kind:"action",status:"scheduled",limit:1000}),
    hooks:db.listSimulationRecords(guildId,{kind:"hook",status:"ready",limit:1000})};
}
