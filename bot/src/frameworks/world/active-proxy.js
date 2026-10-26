/** Current World proxy evidence query; read-only, no control or execution grant. */
export function activeCityProxy(db,guildId,key){
  const session=db.getActiveSession(guildId);
  return session?db.listNpcProxies(session.id,{statuses:["active"]}).find(row=>row.npc_key===key):null;
}
