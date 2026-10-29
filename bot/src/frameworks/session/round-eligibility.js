/** Original active character/proxy participation used by World cadence; no action or consent grant. */
export function eligibleRoundUsers(db,sessionId){
  const activePresence=new Set(["present","guest","late"]);
  const users=new Set(
    db.roster(sessionId)
      .filter(r=>activePresence.has(r.presence)&&r.character_id)
      .map(r=>String(r.discord_user_id))
  );
  const roster=db.roster(sessionId);
  const activeUsers=new Set(roster.filter(r=>activePresence.has(r.presence)).map(r=>String(r.discord_user_id)));
  for(const p of db.listNpcProxies(sessionId,{statuses:["active"]})||[]) if(activeUsers.has(String(p.discord_user_id))) users.add(String(p.discord_user_id));
  return [...users];
}

