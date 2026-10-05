import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export class VeiledDB {
  constructor(dbPath, schemaPath) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    this.db.exec(fs.readFileSync(schemaPath, "utf8"));
    this.migrateSchema();
  }

  migrateSchema(){
    const add=(table,name,definition)=>{
      const cols=this.db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name);
      if(!cols.includes(name)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    };
    for(const [name,def] of [
      ["rules_channel_id","TEXT"],
      ["case_board_channel_id","TEXT"],
      ["journal_channel_id","TEXT"],
      ["known_npcs_channel_id","TEXT"],
      ["known_locations_channel_id","TEXT"],
      ["gm_log_channel_id","TEXT"],
      ["state_errors_channel_id","TEXT"],
      ["party_state_json","TEXT NOT NULL DEFAULT '{\"established\":false,\"name\":\"\",\"members\":[],\"bonds\":[]}'"]
    ]) add("campaigns",name,def);
    for(const [name,def] of [
      ["assembly_mode","TEXT NOT NULL DEFAULT 'auto'"],
      ["assembly_phase","TEXT NOT NULL DEFAULT 'assembly'"],
      ["assembly_plan_json","TEXT NOT NULL DEFAULT '{}'"]
    ]) add("sessions",name,def);
    add("messages","subject_user_id","TEXT");
    add("messages","subject_character_id","TEXT");
  }

  close() { this.db.close(); }

  getCampaign(guildId) {
    return this.db.prepare("SELECT * FROM campaigns WHERE guild_id=?").get(guildId);
  }

  ensureCampaign(guildId, defaults={}) {
    this.db.prepare(`
      INSERT INTO campaigns(guild_id,name,response_mode)
      VALUES(?,?,?)
      ON CONFLICT(guild_id) DO NOTHING
    `).run(guildId, defaults.name ?? "Veiled City", defaults.responseMode ?? "assisted");
    return this.getCampaign(guildId);
  }

  configureCampaign(guildId, {playChannelId, gmRoleId, responseMode}) {
    this.ensureCampaign(guildId);
    this.db.prepare(`
      UPDATE campaigns
      SET play_channel_id=COALESCE(?,play_channel_id),
          gm_role_id=COALESCE(?,gm_role_id),
          response_mode=COALESCE(?,response_mode),
          updated_at=CURRENT_TIMESTAMP
      WHERE guild_id=?
    `).run(playChannelId ?? null, gmRoleId ?? null, responseMode ?? null, guildId);
    return this.getCampaign(guildId);
  }

  configureChannels(guildId, patch={}){
    this.ensureCampaign(guildId);
    const map={
      rulesChannelId:"rules_channel_id",
      caseBoardChannelId:"case_board_channel_id",
      journalChannelId:"journal_channel_id",
      knownNpcsChannelId:"known_npcs_channel_id",
      knownLocationsChannelId:"known_locations_channel_id",
      gmLogChannelId:"gm_log_channel_id",
      stateErrorsChannelId:"state_errors_channel_id"
    };
    for(const [k,col] of Object.entries(map)){
      if(patch[k]!==undefined && patch[k]!==null){
        this.db.prepare(`UPDATE campaigns SET ${col}=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=?`).run(patch[k],guildId);
      }
    }
    return this.getCampaign(guildId);
  }

  upsertPlayer(guildId, userId, displayName) {
    this.ensureCampaign(guildId);
    this.db.prepare(`
      INSERT INTO players(guild_id,discord_user_id,display_name)
      VALUES(?,?,?)
      ON CONFLICT(guild_id,discord_user_id)
      DO UPDATE SET display_name=excluded.display_name, updated_at=CURRENT_TIMESTAMP
    `).run(guildId,userId,displayName);
    return this.getPlayer(guildId,userId);
  }

  getPlayer(guildId,userId) {
    return this.db.prepare("SELECT * FROM players WHERE guild_id=? AND discord_user_id=?")
      .get(guildId,userId);
  }

  getPlayerByPrivateChannel(guildId,channelId){
    return this.db.prepare("SELECT * FROM players WHERE guild_id=? AND private_channel_id=?")
      .get(guildId,channelId);
  }

  setPrivateChannel(guildId,userId,channelId) {
    this.db.prepare(`
      UPDATE players SET private_channel_id=?,updated_at=CURRENT_TIMESTAMP
      WHERE guild_id=? AND discord_user_id=?
    `).run(channelId,guildId,userId);
  }

  setAccessibility(guildId,userId,patch) {
    const p=this.getPlayer(guildId,userId);
    if (!p) throw new Error("Player not registered.");
    const current=JSON.parse(p.accessibility_json||"{}");
    const next={...current,...patch};
    this.db.prepare(`
      UPDATE players SET accessibility_json=?,updated_at=CURRENT_TIMESTAMP
      WHERE guild_id=? AND discord_user_id=?
    `).run(JSON.stringify(next),guildId,userId);
    return next;
  }

  createCharacter(guildId, ownerUserId, name, data={}, {guest=false}={}) {
    const id=randomUUID();
    const payload={
      name,
      level: data.level ?? 1,
      class: data.class ?? "",
      subclass: data.subclass ?? "",
      ancestry: data.ancestry ?? "",
      community: data.community ?? "",
      domains: data.domains ?? [],
      traits: data.traits ?? {},
      resources: {
        hp: data.resources?.hp ?? {current:0,max:0},
        stress: data.resources?.stress ?? {current:0,max:6},
        hope: data.resources?.hope ?? 2,
        armor: data.resources?.armor ?? {current:0,max:0}
      },
      experiences: data.experiences ?? [],
      domain_cards: data.domain_cards ?? [],
      inventory: data.inventory ?? [],
      background: data.background ?? "",
      home: data.home ?? "",
      person: data.person ?? "",
      obligation: data.obligation ?? "",
      opening_status: data.opening_status ?? "",
      goals: data.goals ?? [],
      unresolved_incident: data.unresolved_incident ?? "",
      gm_hooks: data.gm_hooks ?? [],
      faction_connections: data.faction_connections ?? [],
      entry_hooks: data.entry_hooks ?? [],
      exit_hooks: data.exit_hooks ?? [],
      notes: data.notes ?? ""
    };
    this.db.prepare(`
      INSERT INTO characters(id,guild_id,owner_user_id,name,status,is_guest,character_json)
      VALUES(?,?,?,?,?,?,?)
    `).run(id,guildId,ownerUserId ?? null,name,guest?"guest":"active",guest?1:0,JSON.stringify(payload));
    return this.getCharacter(id);
  }

  importCharacter(guildId,ownerUserId,data,{guest=false}={}) {
    if (!data?.name) throw new Error("Imported character JSON must include name.");
    return this.createCharacter(guildId,ownerUserId,data.name,data,{guest});
  }

  getCharacter(id) {
    const c=this.db.prepare("SELECT * FROM characters WHERE id=?").get(id);
    return c ? {...c,data:JSON.parse(c.character_json)} : null;
  }

  listCharacters(guildId,ownerUserId,{includeClosed=true}={}) {
    let sql="SELECT * FROM characters WHERE guild_id=? AND owner_user_id=?";
    if(!includeClosed) sql+=" AND status IN ('active','reserve','guest')";
    sql+=" ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'reserve' THEN 1 WHEN 'guest' THEN 2 ELSE 3 END,name";
    return this.db.prepare(sql).all(guildId,ownerUserId).map(c=>({...c,data:JSON.parse(c.character_json)}));
  }

  findOwnedCharacter(guildId,userId,query) {
    const chars=this.listCharacters(guildId,userId,{includeClosed:false});
    const q=(query||"").trim().toLowerCase();
    if(!q) return chars[0] ?? null;
    return chars.find(c=>c.name.toLowerCase()===q) ??
      chars.find(c=>c.name.toLowerCase().includes(q)) ?? null;
  }

  updateCharacterData(id,mutator) {
    const c=this.getCharacter(id);
    if(!c) throw new Error("Character not found.");
    const next=structuredClone(c.data);
    mutator(next);
    this.db.prepare("UPDATE characters SET character_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(JSON.stringify(next),id);
    return this.getCharacter(id);
  }

  setCharacterStatus(id,status,sessionId=null) {
    const allowed=new Set(["active","reserve","guest","retired","dead"]);
    if(!allowed.has(status)) throw new Error("Invalid character status.");
    this.db.prepare(`
      UPDATE characters SET status=?,
        death_session_id=CASE WHEN ?='dead' THEN ? ELSE death_session_id END,
        retired_session_id=CASE WHEN ?='retired' THEN ? ELSE retired_session_id END,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(status,status,sessionId,status,sessionId,id);
  }

  startSession(guildId,title="",assemblyMode="auto") {
    const campaign=this.ensureCampaign(guildId);
    if(campaign.active_session_id) throw new Error("A session is already active.");
    const allowed=new Set(["auto","already_together","shared_incident","common_client","crossed_cases","mutual_threat","faction_summons","chain_contacts","rescue","debt_favor","manual"]);
    if(!allowed.has(assemblyMode)) throw new Error("Invalid assembly mode.");
    const party=this.getPartyState(guildId);
    const initialPhase=(assemblyMode==="already_together" || (assemblyMode==="auto" && party.established))?"party":"assembly";
    const n=(this.db.prepare("SELECT COALESCE(MAX(session_number),0)+1 n FROM sessions WHERE guild_id=?").get(guildId)).n;
    const id=randomUUID();
    this.db.prepare("INSERT INTO sessions(id,guild_id,session_number,title,assembly_mode,assembly_phase) VALUES(?,?,?,?,?,?)")
      .run(id,guildId,n,title,assemblyMode,initialPhase);
    this.db.prepare("UPDATE campaigns SET active_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=?")
      .run(id,guildId);
    return this.getSession(id);
  }

  getSession(id) { return this.db.prepare("SELECT * FROM sessions WHERE id=?").get(id); }

  getActiveSession(guildId) {
    return this.db.prepare(`
      SELECT s.* FROM sessions s JOIN campaigns c ON c.active_session_id=s.id
      WHERE c.guild_id=? AND s.status='active'
    `).get(guildId);
  }

  getAssemblyPlan(sessionId){
    const s=this.getSession(sessionId);
    if(!s) return null;
    try{return JSON.parse(s.assembly_plan_json||"{}");}catch{return {};}
  }

  setAssemblyPlan(sessionId,plan){
    this.db.prepare("UPDATE sessions SET assembly_plan_json=? WHERE id=?")
      .run(JSON.stringify(plan||{}),sessionId);
    return this.getAssemblyPlan(sessionId);
  }

  setAssemblyPhase(sessionId,phase){
    const allowed=new Set(["assembly","converged","party"]);
    if(!allowed.has(phase)) throw new Error("Invalid assembly phase.");
    this.db.prepare("UPDATE sessions SET assembly_phase=? WHERE id=?").run(phase,sessionId);
    return this.getSession(sessionId);
  }

  getPartyState(guildId){
    const c=this.ensureCampaign(guildId);
    try{return JSON.parse(c.party_state_json||"{}");}
    catch{return {established:false,name:"",members:[],bonds:[]};}
  }

  setPartyState(guildId,state){
    this.ensureCampaign(guildId);
    const next={
      established:Boolean(state?.established),
      name:String(state?.name||""),
      members:Array.isArray(state?.members)?state.members:[],
      bonds:Array.isArray(state?.bonds)?state.bonds:[],
      updated_at:new Date().toISOString()
    };
    this.db.prepare("UPDATE campaigns SET party_state_json=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=?")
      .run(JSON.stringify(next),guildId);
    return next;
  }

  establishParty(guildId,sessionId,{name="",bonds=[]}={}){
    const roster=this.roster(sessionId).filter(r=>["present","guest","late"].includes(r.presence) && r.character_id);
    const members=roster.map(r=>({character_id:r.character_id,name:r.name,owner_user_id:r.discord_user_id}));
    if(!members.length) throw new Error("No present characters are available to establish as a party.");
    const state=this.setPartyState(guildId,{established:true,name,members,bonds});
    this.setAssemblyPhase(sessionId,"party");
    return state;
  }

  partyHasCharacter(guildId,characterId){
    const p=this.getPartyState(guildId);
    return Boolean(p.established && p.members?.some(m=>m.character_id===characterId));
  }

  endSession(guildId,recap="") {
    const s=this.getActiveSession(guildId);
    if(!s) throw new Error("No active session.");
    this.db.prepare(`
      UPDATE sessions SET status='ended',ended_at=CURRENT_TIMESTAMP,recap=? WHERE id=?
    `).run(recap,s.id);
    this.releaseNpcProxiesForSession(s.id);
    this.db.prepare("UPDATE encounters SET status='ended',ended_at=COALESCE(ended_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE session_id=? AND status IN ('planned','active')").run(s.id);
    this.db.prepare("UPDATE campaigns SET active_session_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE guild_id=?")
      .run(guildId);
    return {...s,status:"ended",recap};
  }

  setPresence(sessionId,userId,presence,absenceMode="offscreen",proxyUserId=null,note="") {
    this.db.prepare(`
      INSERT INTO session_presence(session_id,discord_user_id,presence,absence_mode,proxy_user_id,note)
      VALUES(?,?,?,?,?,?)
      ON CONFLICT(session_id,discord_user_id)
      DO UPDATE SET presence=excluded.presence,absence_mode=excluded.absence_mode,
        proxy_user_id=excluded.proxy_user_id,note=excluded.note,updated_at=CURRENT_TIMESTAMP
    `).run(sessionId,userId,presence,absenceMode,proxyUserId,note);
  }

  assignCharacter(sessionId,userId,characterId,{role="primary",controlPolicy="player_only",proxyUserId=null}={}) {
    this.db.prepare(`
      UPDATE session_characters SET left_at=CURRENT_TIMESTAMP
      WHERE session_id=? AND discord_user_id=? AND left_at IS NULL
    `).run(sessionId,userId);
    this.db.prepare(`
      INSERT INTO session_characters(session_id,discord_user_id,character_id,assignment_role,control_policy,proxy_user_id,left_at)
      VALUES(?,?,?,?,?,?,NULL)
      ON CONFLICT(session_id,discord_user_id,character_id)
      DO UPDATE SET assignment_role=excluded.assignment_role,control_policy=excluded.control_policy,
        proxy_user_id=excluded.proxy_user_id,joined_at=CURRENT_TIMESTAMP,left_at=NULL
    `).run(sessionId,userId,characterId,role,controlPolicy,proxyUserId);
  }

  activeAssignment(sessionId,userId) {
    const row=this.db.prepare(`
      SELECT sc.*,c.name,c.status,c.character_json
      FROM session_characters sc JOIN characters c ON c.id=sc.character_id
      WHERE sc.session_id=? AND sc.discord_user_id=? AND sc.left_at IS NULL
      ORDER BY sc.joined_at DESC LIMIT 1
    `).get(sessionId,userId);
    return row?{...row,data:JSON.parse(row.character_json)}:null;
  }

  controlledAssignment(sessionId,userId) {
    const own=this.activeAssignment(sessionId,userId);
    if(own) return own;
    const row=this.db.prepare(`
      SELECT sc.*,c.name,c.status,c.character_json
      FROM session_characters sc JOIN characters c ON c.id=sc.character_id
      WHERE sc.session_id=? AND sc.proxy_user_id=? AND sc.control_policy='proxy' AND sc.left_at IS NULL
      ORDER BY sc.joined_at DESC LIMIT 1
    `).get(sessionId,userId);
    return row?{...row,data:JSON.parse(row.character_json)}:null;
  }

  proxyAssignments(sessionId,userId) {
    return this.db.prepare(`
      SELECT sc.*,c.name,c.status,c.character_json
      FROM session_characters sc JOIN characters c ON c.id=sc.character_id
      WHERE sc.session_id=? AND sc.proxy_user_id=? AND sc.control_policy='proxy' AND sc.left_at IS NULL
      ORDER BY c.name
    `).all(sessionId,userId).map(r=>({...r,data:JSON.parse(r.character_json)}));
  }

  npcKnowledgeId(npcKey){
    return `npc:${String(npcKey||"").trim().toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"unknown"}`;
  }

  upsertNpcProxy(guildId,sessionId,{npcName,userId,controlLevel="tactical",status="offered",playerPacket={},gmNote=""}) {
    const name=String(npcName||"").trim();
    if(!name) throw new Error("NPC name is required.");
    const levelAllowed=new Set(["portrayal","tactical","full_npc"]);
    const statusAllowed=new Set(["offered","active","declined","released"]);
    if(!levelAllowed.has(controlLevel)) throw new Error("Invalid NPC proxy control level.");
    if(!statusAllowed.has(status)) throw new Error("Invalid NPC proxy status.");
    const npcKey=name.toLowerCase();
    const existing=this.db.prepare("SELECT * FROM npc_proxies WHERE session_id=? AND npc_key=?").get(sessionId,npcKey);
    const id=existing?.id||randomUUID();
    this.db.prepare(`
      INSERT INTO npc_proxies(id,guild_id,session_id,npc_key,npc_name,discord_user_id,control_level,status,player_packet_json,gm_note,activated_at,released_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,CASE WHEN ?='active' THEN CURRENT_TIMESTAMP ELSE NULL END,NULL)
      ON CONFLICT(session_id,npc_key) DO UPDATE SET
        npc_name=excluded.npc_name,discord_user_id=excluded.discord_user_id,control_level=excluded.control_level,
        status=excluded.status,player_packet_json=excluded.player_packet_json,gm_note=excluded.gm_note,
        activated_at=CASE WHEN excluded.status='active' THEN CURRENT_TIMESTAMP ELSE npc_proxies.activated_at END,
        released_at=NULL,updated_at=CURRENT_TIMESTAMP
    `).run(id,guildId,sessionId,npcKey,name,userId,controlLevel,status,JSON.stringify(playerPacket||{}),gmNote||"",status);
    return this.getNpcProxyById(id) || this.db.prepare("SELECT * FROM npc_proxies WHERE session_id=? AND npc_key=?").get(sessionId,npcKey);
  }

  getNpcProxyById(id){
    const r=this.db.prepare("SELECT * FROM npc_proxies WHERE id=?").get(id);
    return r?{...r,player_packet:JSON.parse(r.player_packet_json||"{}"),knowledge_id:this.npcKnowledgeId(r.npc_key)}:null;
  }

  findNpcProxy(sessionId,query,{userId=null,statuses=null}={}){
    let rows=this.db.prepare("SELECT * FROM npc_proxies WHERE session_id=? ORDER BY npc_name").all(sessionId);
    if(userId) rows=rows.filter(r=>r.discord_user_id===userId);
    if(statuses?.length) rows=rows.filter(r=>statuses.includes(r.status));
    const q=String(query||"").trim().toLowerCase();
    const r=!q?(rows[0]||null):(rows.find(x=>x.npc_name.toLowerCase()===q)||rows.find(x=>x.npc_name.toLowerCase().includes(q))||null);
    return r?{...r,player_packet:JSON.parse(r.player_packet_json||"{}"),knowledge_id:this.npcKnowledgeId(r.npc_key)}:null;
  }

  listNpcProxies(sessionId,{userId=null,statuses=null}={}){
    let rows=this.db.prepare("SELECT * FROM npc_proxies WHERE session_id=? ORDER BY npc_name").all(sessionId);
    if(userId) rows=rows.filter(r=>r.discord_user_id===userId);
    if(statuses?.length) rows=rows.filter(r=>statuses.includes(r.status));
    return rows.map(r=>({...r,player_packet:JSON.parse(r.player_packet_json||"{}"),knowledge_id:this.npcKnowledgeId(r.npc_key)}));
  }

  activateNpcProxy(id,userId=null){
    const r=this.getNpcProxyById(id);
    if(!r) throw new Error("NPC proxy assignment not found.");
    if(userId && r.discord_user_id!==userId) throw new Error("This NPC proxy was offered to another player.");
    if(!["offered","active"].includes(r.status)) throw new Error(`NPC proxy cannot be activated from status ${r.status}.`);
    this.db.prepare("UPDATE npc_proxies SET status='active',activated_at=COALESCE(activated_at,CURRENT_TIMESTAMP),released_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    return this.getNpcProxyById(id);
  }

  declineNpcProxy(id,userId){
    const r=this.getNpcProxyById(id);
    if(!r) throw new Error("NPC proxy assignment not found.");
    if(r.discord_user_id!==userId) throw new Error("This NPC proxy was offered to another player.");
    if(r.status!=="offered") throw new Error("Only an offered NPC proxy can be declined.");
    this.db.prepare("UPDATE npc_proxies SET status='declined',released_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    return this.getNpcProxyById(id);
  }

  releaseNpcProxy(id){
    const r=this.getNpcProxyById(id);
    if(!r) throw new Error("NPC proxy assignment not found.");
    this.db.prepare("UPDATE npc_proxies SET status='released',released_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    return this.getNpcProxyById(id);
  }

  releaseNpcProxiesForSession(sessionId){
    this.db.prepare("UPDATE npc_proxies SET status='released',released_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE session_id=? AND status IN ('offered','active')").run(sessionId);
  }

  npcProxyAssignments(sessionId,userId){
    return this.listNpcProxies(sessionId,{userId,statuses:["active"]}).map(r=>({
      ...r,assignment_kind:"npc_proxy",npc_proxy:true,name:r.npc_name,character_id:r.knowledge_id,
      discord_user_id:r.discord_user_id,control_policy:`npc_${r.control_level}`,data:r.player_packet
    }));
  }

  listPlayers(guildId) {
    return this.db.prepare("SELECT * FROM players WHERE guild_id=? ORDER BY display_name").all(guildId);
  }

  roster(sessionId) {
    return this.db.prepare(`
      SELECT sp.discord_user_id,sp.presence,sp.absence_mode,sp.proxy_user_id AS presence_proxy,
             sc.character_id,sc.assignment_role,sc.control_policy,sc.proxy_user_id,
             c.name,c.status,c.character_json,p.display_name,p.accessibility_json
      FROM session_presence sp
      LEFT JOIN session_characters sc ON sc.session_id=sp.session_id
        AND sc.discord_user_id=sp.discord_user_id AND sc.left_at IS NULL
      LEFT JOIN characters c ON c.id=sc.character_id
      LEFT JOIN players p ON p.discord_user_id=sp.discord_user_id
        AND p.guild_id=(SELECT guild_id FROM sessions WHERE id=sp.session_id)
      WHERE sp.session_id=?
      ORDER BY p.display_name,c.name
    `).all(sessionId).map(r=>({...r,data:r.character_json?JSON.parse(r.character_json):null}));
  }

  addFact(guildId,{category="fact",key,content,visibility="party",subjectUserId=null,subjectCharacterId=null,sessionId=null,source="gm"}) {
    const id=randomUUID();
    this.db.prepare(`
      INSERT INTO facts(id,guild_id,category,fact_key,content,visibility,subject_user_id,subject_character_id,session_id,source)
      VALUES(?,?,?,?,?,?,?,?,?,?)
    `).run(id,guildId,category,key,content,visibility,subjectUserId,subjectCharacterId,sessionId,source);
    return id;
  }

  factsFor(guildId,userId,{characterId=null,includeGM=false,limit=80}={}) {
    const sql=includeGM?`
      SELECT * FROM facts WHERE guild_id=? ORDER BY created_at DESC LIMIT ?
    `:`
      SELECT * FROM facts WHERE guild_id=?
       AND (
         visibility IN ('public','party')
         OR (visibility='player' AND subject_user_id=?)
         OR (visibility='character' AND subject_character_id=?)
       )
       ORDER BY created_at DESC LIMIT ?
    `;
    return includeGM?this.db.prepare(sql).all(guildId,limit):this.db.prepare(sql).all(guildId,userId,characterId||"",limit);
  }

  clocksFor(guildId,{includeGM=false}={}) {
    const sql=includeGM?"SELECT * FROM clocks WHERE guild_id=?":"SELECT * FROM clocks WHERE guild_id=? AND visibility!='gm'";
    return this.db.prepare(sql).all(guildId);
  }

  changeClock(guildId,key,delta,{label=null,visibility="gm",subjectUserId=null,max=6}={}) {
    const current=this.db.prepare("SELECT * FROM clocks WHERE guild_id=? AND clock_key=?").get(guildId,key);
    if(!current){
      const v=Math.max(0,Math.min(max,delta));
      this.db.prepare(`
        INSERT INTO clocks(guild_id,clock_key,label,value,max_value,visibility,subject_user_id)
        VALUES(?,?,?,?,?,?,?)
      `).run(guildId,key,label??key,v,max,visibility,subjectUserId);
      return v;
    }
    const v=Math.max(0,Math.min(current.max_value,current.value+delta));
    this.db.prepare("UPDATE clocks SET value=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND clock_key=?")
      .run(v,guildId,key);
    return v;
  }

  changeVeilExposure(guildId,delta) {
    const c=this.getCampaign(guildId);
    const v=Math.max(0,Math.min(6,(c?.veil_exposure??0)+delta));
    this.db.prepare("UPDATE campaigns SET veil_exposure=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=?").run(v,guildId);
    return v;
  }

  upsertThread(guildId,{id,label,status="active",visibility="party",subjectUserId=null,subjectCharacterId=null,notes=""}){
    this.db.prepare(`
      INSERT INTO threads(id,guild_id,label,status,visibility,subject_user_id,subject_character_id,notes)
      VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET label=excluded.label,status=excluded.status,
        visibility=excluded.visibility,subject_user_id=excluded.subject_user_id,
        subject_character_id=excluded.subject_character_id,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP
    `).run(id,guildId,label,status,visibility,subjectUserId,subjectCharacterId,notes);
    return this.db.prepare("SELECT * FROM threads WHERE id=?").get(id);
  }

  getThread(id){ return this.db.prepare("SELECT * FROM threads WHERE id=?").get(id); }

  upsertReference(guildId,{kind,key,name,summary,visibility="party",subjectUserId=null,subjectCharacterId=null}){
    this.db.prepare(`
      INSERT INTO reference_entries(guild_id,kind,entity_key,display_name,summary,visibility,subject_user_id,subject_character_id)
      VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,kind,entity_key) DO UPDATE SET
        display_name=excluded.display_name,summary=excluded.summary,visibility=excluded.visibility,
        subject_user_id=excluded.subject_user_id,subject_character_id=excluded.subject_character_id,
        updated_at=CURRENT_TIMESTAMP
    `).run(guildId,kind,key,name,summary,visibility,subjectUserId,subjectCharacterId);
    return this.getReference(guildId,kind,key);
  }

  getReference(guildId,kind,key){
    return this.db.prepare("SELECT * FROM reference_entries WHERE guild_id=? AND kind=? AND entity_key=?").get(guildId,kind,key);
  }

  listReferences(guildId,kind,{publicOnly=true}={}){
    const sql=publicOnly
      ?"SELECT * FROM reference_entries WHERE guild_id=? AND kind=? AND visibility IN ('public','party') ORDER BY display_name"
      :"SELECT * FROM reference_entries WHERE guild_id=? AND kind=? ORDER BY display_name";
    return this.db.prepare(sql).all(guildId,kind);
  }

  getPublished(guildId,surface,key){
    return this.db.prepare("SELECT * FROM published_messages WHERE guild_id=? AND surface=? AND entity_key=?").get(guildId,surface,key);
  }

  setPublished(guildId,surface,key,channelId,messageId){
    this.db.prepare(`
      INSERT INTO published_messages(guild_id,surface,entity_key,channel_id,message_id)
      VALUES(?,?,?,?,?)
      ON CONFLICT(guild_id,surface,entity_key) DO UPDATE SET
        channel_id=excluded.channel_id,message_id=excluded.message_id,updated_at=CURRENT_TIMESTAMP
    `).run(guildId,surface,key,channelId,messageId);
  }

  addMessage({guildId,sessionId=null,messageId=null,userId=null,speakerName="",characterId=null,visibility="party",subjectUserId=null,subjectCharacterId=null,content}) {
    this.db.prepare(`
      INSERT INTO messages(guild_id,session_id,discord_message_id,discord_user_id,speaker_name,character_id,visibility,subject_user_id,subject_character_id,content)
      VALUES(?,?,?,?,?,?,?,?,?,?)
    `).run(guildId,sessionId,messageId,userId,speakerName,characterId,visibility,subjectUserId,subjectCharacterId,content);
  }

  recentMessages(guildId,limit=28) {
    return this.db.prepare(`
      SELECT * FROM (SELECT * FROM messages WHERE guild_id=? ORDER BY id DESC LIMIT ?)
      ORDER BY id ASC
    `).all(guildId,limit);
  }

  recentMessagesFor(guildId,userId,{characterId=null,limit=28}={}){
    return this.db.prepare(`
      SELECT * FROM (
        SELECT * FROM messages WHERE guild_id=? AND (
          visibility IN ('public','party')
          OR (visibility='player' AND subject_user_id=?)
          OR (visibility='character' AND subject_character_id=?)
        ) ORDER BY id DESC LIMIT ?
      ) ORDER BY id ASC
    `).all(guildId,userId,characterId||"",limit);
  }

  addRoll(guildId,sessionId,userId,characterId,rollType,payload) {
    const id=randomUUID();
    this.db.prepare(`
      INSERT INTO rolls(id,guild_id,session_id,discord_user_id,character_id,roll_type,payload_json)
      VALUES(?,?,?,?,?,?,?)
    `).run(id,guildId,sessionId,userId,characterId,rollType,JSON.stringify(payload));
    return id;
  }

  createEncounter(guildId,sessionId,data){
    const id=randomUUID();
    const n=this.db.prepare("SELECT COALESCE(MAX(encounter_number),0)+1 n FROM encounters WHERE session_id=?").get(sessionId).n;
    this.db.prepare(`
      INSERT INTO encounters(id,guild_id,session_id,encounter_number,status,tier,pc_count,difficulty,style,base_bp,custom_adjustment_bp,damage_boosted,budget_bp,spent_bp,objective,environment_name,composition_json,adjustment_json,notes)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id,guildId,sessionId,n,data.status||"planned",data.tier,data.pc_count,data.difficulty||"standard",data.style||"balanced",data.base_bp,data.custom_adjustment_bp||0,data.damage_boosted?1:0,data.budget_bp,data.spent_bp||0,data.objective||"",data.environment_name||"",JSON.stringify(data.composition||[]),JSON.stringify(data.adjustments||[]),data.notes||"");
    return this.getEncounter(id);
  }

  getEncounter(id){
    const r=this.db.prepare("SELECT * FROM encounters WHERE id=?").get(id);
    return r?{...r,composition:JSON.parse(r.composition_json||"[]"),adjustments:JSON.parse(r.adjustment_json||"[]")}:null;
  }

  getCurrentEncounter(sessionId){
    const r=this.db.prepare("SELECT * FROM encounters WHERE session_id=? AND status IN ('active','planned') ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, encounter_number DESC LIMIT 1").get(sessionId);
    return r?{...r,composition:JSON.parse(r.composition_json||"[]"),adjustments:JSON.parse(r.adjustment_json||"[]")}:null;
  }

  updateEncounter(id,patch={}){
    const current=this.getEncounter(id);
    if(!current) throw new Error("Encounter not found.");
    const next={...current,...patch};
    const comp=patch.composition??current.composition;
    const adjustments=patch.adjustments??current.adjustments;
    this.db.prepare(`
      UPDATE encounters SET tier=?,pc_count=?,difficulty=?,style=?,custom_adjustment_bp=?,damage_boosted=?,budget_bp=?,spent_bp=?,objective=?,environment_name=?,composition_json=?,adjustment_json=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(next.tier,next.pc_count,next.difficulty,next.style,next.custom_adjustment_bp||0,next.damage_boosted?1:0,next.budget_bp,next.spent_bp,next.objective||"",next.environment_name||"",JSON.stringify(comp||[]),JSON.stringify(adjustments||[]),next.notes||"",id);
    return this.getEncounter(id);
  }

  setEncounterStatus(id,status){
    if(!new Set(["planned","active","ended"]).has(status)) throw new Error("Invalid encounter status.");
    if(status==="active") this.db.prepare("UPDATE encounters SET status='ended',ended_at=COALESCE(ended_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE session_id=(SELECT session_id FROM encounters WHERE id=?) AND status='active' AND id<>?").run(id,id);
    this.db.prepare(`UPDATE encounters SET status=?,started_at=CASE WHEN ?='active' THEN COALESCE(started_at,CURRENT_TIMESTAMP) ELSE started_at END,ended_at=CASE WHEN ?='ended' THEN CURRENT_TIMESTAMP ELSE ended_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(status,status,status,id);
    return this.getEncounter(id);
  }

  listEncounters(sessionId){
    return this.db.prepare("SELECT * FROM encounters WHERE session_id=? ORDER BY encounter_number DESC").all(sessionId).map(r=>({...r,composition:JSON.parse(r.composition_json||"[]"),adjustments:JSON.parse(r.adjustment_json||"[]")}));
  }

  audit(guildId,sessionId,actorType,actorId,action,payload={}) {
    this.db.prepare(`
      INSERT INTO audit_log(guild_id,session_id,actor_type,actor_id,action,payload_json)
      VALUES(?,?,?,?,?,?)
    `).run(guildId,sessionId,actorType,actorId,action,JSON.stringify(payload));
  }
}
