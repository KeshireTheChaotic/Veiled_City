/** GM-only active-session controller/character roster formatting. */
const ACTIVE_PRESENCE=new Set(["present","guest","late"]);

function mention(userId){ return userId?`<@${userId}>`:"—"; }
function playerLabel(row){
  const display=String(row?.display_name||"").trim();
  return `${mention(row.discord_user_id)}${display?` (${display})`:""}`;
}
function titleCase(value){
  return String(value||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}
function attendanceLabel(row){
  const p=String(row.presence||"unknown");
  if(p==="present") return "Present";
  if(p==="guest") return "Present (guest)";
  if(p==="late") return "Present (late arrival)";
  if(p==="left_early") return "Left early";
  if(p==="absent") return "Absent";
  return titleCase(p);
}
function assignmentLabel(row){
  if(row.assignment_role==="guest") return "Guest character";
  if(row.assignment_role==="proxy") return "Proxy assignment";
  return "Primary character";
}
function controlLabel(row){
  const proxy=row.proxy_user_id||row.presence_proxy||null;
  if(row.absence_mode==="proxy"||row.control_policy==="proxy") return proxy?`PC proxy → ${mention(proxy)}`:"PC proxy (controller missing)";
  if(!ACTIVE_PRESENCE.has(row.presence)){
    if(row.absence_mode==="background") return "Background-safe only";
    return "Offscreen / no AI control";
  }
  if(row.control_policy==="background_safe") return "Background-safe only";
  return "Player control";
}

export function buildSessionRosterReport(db,guildId,session){
  const rows=db.roster(session.id);
  const npcProxies=db.listNpcProxies(session.id,{statuses:["offered","active"]});
  const lines=[`**Session ${session.session_number} — GM Roster**`];

  lines.push("**Player Characters**");
  if(!rows.length) lines.push("• No session players are recorded.");
  for(const row of rows){
    if(row.character_id){
      const icon=ACTIVE_PRESENCE.has(row.presence)?(row.presence==="late"?"🟡":"🟢"):"⚪";
      lines.push(`${icon} ${playerLabel(row)} → **${row.name}** — ${attendanceLabel(row)} • ${assignmentLabel(row)} • ${controlLabel(row)}`);
    }else{
      const active=ACTIVE_PRESENCE.has(row.presence);
      lines.push(`${active?"⚠️":"⚪"} ${playerLabel(row)} → **No active character assignment** — ${attendanceLabel(row)}${active?" • GM attention":""}`);
    }
  }

  const pcProxyRows=rows.filter(r=>r.character_id&&(r.control_policy==="proxy"||r.absence_mode==="proxy")&&(r.proxy_user_id||r.presence_proxy));
  const activeNpc=npcProxies.filter(p=>p.status==="active");
  const offeredNpc=npcProxies.filter(p=>p.status==="offered");
  lines.push("**Additional Human-Controlled Roles**");
  if(!pcProxyRows.length&&!activeNpc.length) lines.push("• None.");
  for(const row of pcProxyRows){
    const controller=row.proxy_user_id||row.presence_proxy;
    lines.push(`• ${mention(controller)} → **${row.name}** — PC proxy for ${mention(row.discord_user_id)}`);
  }
  for(const proxy of activeNpc){
    lines.push(`• ${mention(proxy.discord_user_id)} → **${proxy.npc_name}** — NPC proxy • ${titleCase(proxy.control_level)} control`);
  }

  if(offeredNpc.length){
    lines.push("**Pending NPC Proxy Offers**");
    for(const proxy of offeredNpc) lines.push(`• ${mention(proxy.discord_user_id)} ⇢ **${proxy.npc_name}** — offered • ${titleCase(proxy.control_level)} control`);
  }

  const warnings=rows.filter(r=>ACTIVE_PRESENCE.has(r.presence)&&!r.character_id);
  if(warnings.length){
    lines.push(`⚠️ **Assignment warning:** ${warnings.length} present player${warnings.length===1?" has":"s have"} no active PC/guest character assignment.`);
  }
  return lines;
}

export function chunkRosterReport(lines,maxChars=1900){
  const src=(Array.isArray(lines)?lines:[String(lines||"")]).map(String);
  if(!src.length) return ["No roster data."];
  const chunks=[];
  let current="";
  for(const line of src){
    const next=current?`${current}\n${line}`:line;
    if(next.length<=maxChars){ current=next; continue; }
    if(current) chunks.push(current);
    if(line.length<=maxChars){ current=line; continue; }
    for(let i=0;i<line.length;i+=maxChars) chunks.push(line.slice(i,i+maxChars));
    current="";
  }
  if(current) chunks.push(current);
  return chunks.length?chunks:["No roster data."];
}
