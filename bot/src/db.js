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
    add("campaigns","fear","INTEGER NOT NULL DEFAULT 0");
    add("encounters","combat_state_json",`TEXT NOT NULL DEFAULT '{"spotlight":{"counts":{},"last_character_id":null}}'`);
    add("encounters","pc_start_state_json",`TEXT NOT NULL DEFAULT '[]'`);
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
      evasion: data.evasion ?? 0,
      proficiency: data.proficiency ?? 1,
      thresholds: data.thresholds ?? {},
      subclass_rank: data.subclass_rank ?? "foundation",
      multiclass: data.multiclass ?? null,
      advancement_state: data.advancement_state ?? {trait_marks:[],slot_usage:{},history:[]},
      hook_permissions: data.hook_permissions ?? [],
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
    const created=this.getCharacter(id);
    this.seedCharacterHookRelationships(created,{markImported:true,source:"character_create"});
    return created;
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

  listGuildCharacters(guildId,{includeClosed=true}={}) {
    let sql="SELECT * FROM characters WHERE guild_id=?";
    if(!includeClosed) sql+=" AND status IN ('active','reserve','guest')";
    sql+=" ORDER BY name";
    return this.db.prepare(sql).all(guildId).map(c=>({...c,data:JSON.parse(c.character_json)}));
  }

  findGuildCharacter(guildId,query,{includeClosed=true}={}) {
    const chars=this.listGuildCharacters(guildId,{includeClosed});
    const q=String(query||"").trim().toLowerCase();
    if(!q) return chars[0] ?? null;
    return chars.find(c=>c.name.toLowerCase()===q) ?? chars.find(c=>c.name.toLowerCase().includes(q)) ?? null;
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

  characterPrivateFacts(guildId,characterId,ownerUserId="") {
    return this.db.prepare(`
      SELECT * FROM facts WHERE guild_id=? AND (
        subject_character_id=?
        OR (subject_user_id=? AND visibility IN ('player','gm'))
      ) AND visibility IN ('player','character','gm')
      ORDER BY created_at
    `).all(guildId,characterId,ownerUserId);
  }

  characterPrivateClocks(guildId,characterId,ownerUserId="") {
    return this.db.prepare(`
      SELECT * FROM clocks WHERE guild_id=? AND (subject_character_id=? OR subject_user_id=?)
        AND visibility IN ('player','character','gm') ORDER BY clock_key
    `).all(guildId,characterId,ownerUserId);
  }

  characterPrivateThreads(guildId,characterId,ownerUserId="") {
    return this.db.prepare(`
      SELECT * FROM threads WHERE guild_id=? AND (subject_character_id=? OR subject_user_id=?)
        AND visibility IN ('player','character','gm') ORDER BY updated_at DESC
    `).all(guildId,characterId,ownerUserId);
  }

  characterPrivateReferences(guildId,characterId,ownerUserId="") {
    return this.db.prepare(`
      SELECT * FROM reference_entries WHERE guild_id=? AND (subject_character_id=? OR subject_user_id=?)
        AND visibility IN ('player','character','gm') ORDER BY kind,display_name
    `).all(guildId,characterId,ownerUserId);
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
    return r?{...r,composition:JSON.parse(r.composition_json||"[]"),adjustments:JSON.parse(r.adjustment_json||"[]"),combat_state:JSON.parse(r.combat_state_json||"{\"spotlight\":{\"counts\":{},\"last_character_id\":null}}"),pc_start_state:JSON.parse(r.pc_start_state_json||"[]")}:null;
  }

  getCurrentEncounter(sessionId){
    const r=this.db.prepare("SELECT * FROM encounters WHERE session_id=? AND status IN ('active','planned') ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, encounter_number DESC LIMIT 1").get(sessionId);
    return r?{...r,composition:JSON.parse(r.composition_json||"[]"),adjustments:JSON.parse(r.adjustment_json||"[]"),combat_state:JSON.parse(r.combat_state_json||"{\"spotlight\":{\"counts\":{},\"last_character_id\":null}}"),pc_start_state:JSON.parse(r.pc_start_state_json||"[]")}:null;
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
    return this.db.prepare("SELECT * FROM encounters WHERE session_id=? ORDER BY encounter_number DESC").all(sessionId).map(r=>({...r,composition:JSON.parse(r.composition_json||"[]"),adjustments:JSON.parse(r.adjustment_json||"[]"),combat_state:JSON.parse(r.combat_state_json||"{\"spotlight\":{\"counts\":{},\"last_character_id\":null}}"),pc_start_state:JSON.parse(r.pc_start_state_json||"[]")}));
  }


  changeFear(guildId,delta){
    this.ensureCampaign(guildId);
    const c=this.getCampaign(guildId); const next=Math.max(0,Math.min(12,Number(c.fear||0)+(Number(delta)||0)));
    this.db.prepare("UPDATE campaigns SET fear=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=?").run(next,guildId);
    return next;
  }

  updateEncounterCombatState(id,mutator){
    const e=this.getEncounter(id); if(!e) throw new Error("Encounter not found.");
    const next=structuredClone(e.combat_state||{spotlight:{counts:{},last_character_id:null}});
    mutator(next);
    this.db.prepare("UPDATE encounters SET combat_state_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(next),id);
    return this.getEncounter(id);
  }

  recordSpotlight(encounterId,characterId){
    return this.updateEncounterCombatState(encounterId,state=>{
      state.spotlight=state.spotlight||{counts:{},last_character_id:null}; state.spotlight.counts=state.spotlight.counts||{};
      state.spotlight.counts[characterId]=Number(state.spotlight.counts[characterId]||0)+1;
      state.spotlight.last_character_id=characterId;
    });
  }

  createCharacterDraft(guildId,userId,description,draft){
    const id=randomUUID();
    this.db.prepare(`INSERT INTO character_drafts(id,guild_id,discord_user_id,description,draft_json) VALUES(?,?,?,?,?)`)
      .run(id,guildId,userId,description,JSON.stringify(draft||{}));
    return this.getCharacterDraft(id);
  }

  getCharacterDraft(id){
    const r=this.db.prepare("SELECT * FROM character_drafts WHERE id=?").get(id);
    return r?{...r,draft:JSON.parse(r.draft_json||"{}")} : null;
  }

  latestCharacterDraft(guildId,userId,{status="draft"}={}){
    const r=this.db.prepare("SELECT * FROM character_drafts WHERE guild_id=? AND discord_user_id=? AND status=? ORDER BY created_at DESC LIMIT 1").get(guildId,userId,status);
    return r?{...r,draft:JSON.parse(r.draft_json||"{}")} : null;
  }

  setCharacterDraftStatus(id,status){
    if(!new Set(["draft","accepted","discarded"]).has(status)) throw new Error("Invalid character draft status.");
    this.db.prepare("UPDATE character_drafts SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status,id);
    return this.getCharacterDraft(id);
  }

  createLevelupDraft(guildId,userId,characterId,fromLevel,toLevel,choices={}){
    this.db.prepare("UPDATE levelup_drafts SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND discord_user_id=? AND character_id=? AND status IN ('draft','ready')")
      .run(guildId,userId,characterId);
    const id=randomUUID();
    this.db.prepare(`INSERT INTO levelup_drafts(id,guild_id,discord_user_id,character_id,from_level,to_level,choices_json) VALUES(?,?,?,?,?,?,?)`)
      .run(id,guildId,userId,characterId,fromLevel,toLevel,JSON.stringify(choices||{}));
    return this.getLevelupDraft(id);
  }

  getLevelupDraft(id){
    const r=this.db.prepare("SELECT * FROM levelup_drafts WHERE id=?").get(id);
    return r?{...r,choices:JSON.parse(r.choices_json||"{}")} : null;
  }

  latestLevelupDraft(guildId,userId,characterId=null){
    let r;
    if(characterId) r=this.db.prepare("SELECT * FROM levelup_drafts WHERE guild_id=? AND discord_user_id=? AND character_id=? AND status IN ('draft','ready') ORDER BY created_at DESC LIMIT 1").get(guildId,userId,characterId);
    else r=this.db.prepare("SELECT * FROM levelup_drafts WHERE guild_id=? AND discord_user_id=? AND status IN ('draft','ready') ORDER BY created_at DESC LIMIT 1").get(guildId,userId);
    return r?{...r,choices:JSON.parse(r.choices_json||"{}")} : null;
  }

  updateLevelupDraft(id,choices,status="ready"){
    if(!new Set(["draft","ready","applied","cancelled"]).has(status)) throw new Error("Invalid level-up draft status.");
    this.db.prepare("UPDATE levelup_drafts SET choices_json=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(JSON.stringify(choices||{}),status,id);
    return this.getLevelupDraft(id);
  }

  initializeCombatants(encounterId,rows=[]){
    const enc=this.getEncounter(encounterId); if(!enc) throw new Error("Encounter not found.");
    this.db.prepare("DELETE FROM encounter_combatants WHERE encounter_id=?").run(encounterId);
    const ins=this.db.prepare(`INSERT INTO encounter_combatants(id,encounter_id,guild_id,session_id,base_name,display_name,role,tier,instance_index,difficulty,major_threshold,severe_threshold,hp_current,hp_max,stress_current,stress_max,conditions_json,status,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for(const r of rows){
      const id=randomUUID();
      ins.run(id,encounterId,enc.guild_id,enc.session_id,r.base_name,r.display_name,r.role,r.tier,r.instance_index||1,r.difficulty||10,r.major_threshold??null,r.severe_threshold??null,r.hp_max||1,r.hp_max||1,0,r.stress_max||0,JSON.stringify([]),"active",r.notes||"");
    }
    return this.listCombatants(encounterId);
  }

  listCombatants(encounterId,{includeRemoved=false}={}){
    const sql=includeRemoved?"SELECT * FROM encounter_combatants WHERE encounter_id=? ORDER BY base_name,instance_index":"SELECT * FROM encounter_combatants WHERE encounter_id=? AND status!='removed' ORDER BY base_name,instance_index";
    return this.db.prepare(sql).all(encounterId).map(r=>({...r,conditions:JSON.parse(r.conditions_json||"[]")}));
  }

  findCombatant(encounterId,query){
    const rows=this.listCombatants(encounterId,{includeRemoved:true});
    const q=String(query||"").trim().toLowerCase();
    const r=rows.find(x=>x.id.toLowerCase().startsWith(q))||rows.find(x=>x.display_name.toLowerCase()===q)||rows.find(x=>x.display_name.toLowerCase().includes(q));
    return r||null;
  }

  updateCombatant(id,patch={}){
    const cur=this.db.prepare("SELECT * FROM encounter_combatants WHERE id=?").get(id); if(!cur) throw new Error("Combatant not found.");
    let conditions=JSON.parse(cur.conditions_json||"[]");
    if(patch.conditions) conditions=patch.conditions;
    const next={...cur,...patch};
    this.db.prepare(`UPDATE encounter_combatants SET hp_current=?,stress_current=?,conditions_json=?,status=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(Math.max(0,Math.min(cur.hp_max,Number(next.hp_current))),Math.max(0,Math.min(cur.stress_max,Number(next.stress_current))),JSON.stringify(conditions),next.status,next.notes||"",id);
    const r=this.db.prepare("SELECT * FROM encounter_combatants WHERE id=?").get(id);
    return {...r,conditions:JSON.parse(r.conditions_json||"[]")};
  }

  captureEncounterStartState(encounterId){
    const e=this.getEncounter(encounterId); if(!e) throw new Error("Encounter not found.");
    const roster=this.roster(e.session_id).filter(r=>["present","guest","late"].includes(r.presence)&&r.character_id);
    const state=roster.map(r=>({
      character_id:r.character_id,name:r.name,owner_user_id:r.discord_user_id,
      resources:r.data?.resources||{},conditions:r.data?.conditions||[]
    }));
    this.db.prepare("UPDATE encounters SET pc_start_state_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(state),encounterId);
    return state;
  }

  // ----- v3.3.0 structured relationship graph -----
  relationshipEntityKey(type,labelOrKey){
    const raw=String(labelOrKey||"").trim();
    const slug=raw.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"unknown";
    return `${type}:${slug}`;
  }

  upsertRelationship(guildId,{fromType,fromKey,fromLabel="",toType,toKey,toLabel="",relationshipType="contact",score=0,visibility="party",note="",source="gm",sourceCharacterId=null}={}){
    const allowedType=new Set(["character","npc","faction","location","entity","obligation"]);
    const allowedRel=new Set(["trust","debt","fear","hostility","affection","authority","obligation","family","ally","rival","contact","important_person","home","suspicion","protective","other"]);
    if(!allowedType.has(fromType)||!allowedType.has(toType)) throw new Error("Invalid relationship entity type.");
    if(!allowedRel.has(relationshipType)) relationshipType="other";
    if(!new Set(["public","party","player","character","gm"]).has(visibility)) throw new Error("Invalid relationship visibility.");
    const fk=String(fromKey||"").trim(), tk=String(toKey||"").trim(); if(!fk||!tk) throw new Error("Relationship endpoints are required.");
    const existing=this.db.prepare(`SELECT * FROM relationships WHERE guild_id=? AND from_type=? AND from_key=? AND to_type=? AND to_key=? AND relationship_type=?`).get(guildId,fromType,fk,toType,tk,relationshipType);
    const id=existing?.id||randomUUID();
    this.db.prepare(`INSERT INTO relationships(id,guild_id,from_type,from_key,from_label,to_type,to_key,to_label,relationship_type,score,visibility,note,source,source_character_id)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(guild_id,from_type,from_key,to_type,to_key,relationship_type) DO UPDATE SET
      from_label=excluded.from_label,to_label=excluded.to_label,score=excluded.score,visibility=excluded.visibility,note=excluded.note,source=excluded.source,source_character_id=COALESCE(excluded.source_character_id,relationships.source_character_id),updated_at=CURRENT_TIMESTAMP`)
      .run(id,guildId,fromType,fk,fromLabel||fk,toType,tk,toLabel||tk,relationshipType,Math.max(-5,Math.min(5,Number(score)||0)),visibility,note||"",source||"gm",sourceCharacterId||null);
    return this.getRelationship(id);
  }

  getRelationship(id){ return this.db.prepare("SELECT * FROM relationships WHERE id=?").get(id); }
  listRelationships(guildId,{includeGM=false,characterId=null,userId=null}={}){
    const rows=this.db.prepare("SELECT * FROM relationships WHERE guild_id=? ORDER BY updated_at DESC").all(guildId);
    return rows.filter(r=>includeGM||["public","party"].includes(r.visibility)||(r.visibility==="character"&&characterId&&(r.from_key===characterId||r.to_key===characterId||r.source_character_id===characterId))||(r.visibility==="player"&&userId&&r.note.includes(`player:${userId}`)));
  }
  adjustRelationship(id,delta){
    const r=this.getRelationship(id); if(!r) throw new Error("Relationship not found.");
    const score=Math.max(-5,Math.min(5,Number(r.score||0)+(Number(delta)||0)));
    this.db.prepare("UPDATE relationships SET score=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(score,id); return this.getRelationship(id);
  }

  seedCharacterHookRelationships(character,{markImported=false,source="hook_import"}={}){
    if(!character) return {created:0,skipped:true};
    const already=this.db.prepare("SELECT * FROM relationship_hook_imports WHERE character_id=?").get(character.id);
    if(already&&markImported) return {created:0,skipped:true};
    const d=character.data||{}; let created=0;
    const add=(toType,label,rel,score=1,note="")=>{
      const text=String(label||"").trim(); if(!text) return;
      this.upsertRelationship(character.guild_id,{fromType:"character",fromKey:character.id,fromLabel:character.name,toType,toKey:this.relationshipEntityKey(toType,text),toLabel:text,relationshipType:rel,score,visibility:"character",note,source,sourceCharacterId:character.id}); created++;
    };
    add("location",d.home,"home",2,"Imported from character Home hook.");
    add("entity",d.person,"important_person",2,"Imported from character Person hook.");
    add("obligation",d.obligation,"obligation",2,"Imported from character Obligation hook.");
    for(const f of d.faction_connections||[]) add("faction",typeof f==="string"?f:(f.name||JSON.stringify(f)),"contact",1,"Imported from character Faction Connection hook.");
    if(markImported){
      this.db.prepare(`INSERT INTO relationship_hook_imports(character_id,guild_id,imported_count,source) VALUES(?,?,?,?) ON CONFLICT(character_id) DO UPDATE SET imported_count=excluded.imported_count,source=excluded.source,imported_at=CURRENT_TIMESTAMP`).run(character.id,character.guild_id,created,source);
    }
    return {created,skipped:false};
  }

  importExistingHookRelationships(guildId,{characterId=null}={}){
    const chars=characterId?[this.getCharacter(characterId)].filter(Boolean):this.listGuildCharacters(guildId,{includeClosed:true});
    let created=0,skipped=0,processed=0;
    for(const c of chars){ if(c.guild_id!==guildId) continue; const r=this.seedCharacterHookRelationships(c,{markImported:true,source:"v3.3.0_backfill"}); processed++; created+=r.created; if(r.skipped) skipped++; }
    return {processed,created,skipped};
  }

  // ----- v3.3.0 evidence / handouts -----
  createHandout(guildId,{sessionId=null,title,kind="document",authority="canonical",visibility="party",subjectUserId=null,subjectCharacterId=null,content="",canonicalFacts=[],caseKey="",npcKey="",locationKey="",source="human_gm",metadata={}}={}){
    if(!String(title||"").trim()) throw new Error("Handout title is required.");
    const id=randomUUID();
    this.db.prepare(`INSERT INTO handouts(id,guild_id,session_id,title,kind,authority,visibility,subject_user_id,subject_character_id,content,canonical_facts_json,case_key,npc_key,location_key,source,metadata_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,guildId,sessionId,String(title).trim(),kind,authority,visibility,subjectUserId,subjectCharacterId,String(content||""),JSON.stringify(canonicalFacts||[]),caseKey||"",npcKey||"",locationKey||"",source,JSON.stringify(metadata||{}));
    return this.getHandout(id);
  }
  getHandout(id){ const r=this.db.prepare("SELECT * FROM handouts WHERE id=?").get(id); return r?{...r,canonical_facts:JSON.parse(r.canonical_facts_json||"[]"),metadata:JSON.parse(r.metadata_json||"{}")} : null; }
  findHandout(guildId,query){ const rows=this.db.prepare("SELECT * FROM handouts WHERE guild_id=? AND status='active' ORDER BY created_at DESC").all(guildId); const q=String(query||"").trim().toLowerCase(); const r=rows.find(x=>x.id.toLowerCase().startsWith(q))||rows.find(x=>x.title.toLowerCase()===q)||rows.find(x=>x.title.toLowerCase().includes(q)); return r?this.getHandout(r.id):null; }
  listHandoutsFor(guildId,userId,{characterId=null,includeGM=false,limit=100}={}){
    const rows=this.db.prepare("SELECT * FROM handouts WHERE guild_id=? AND status='active' ORDER BY created_at DESC LIMIT ?").all(guildId,limit);
    return rows.filter(r=>includeGM||["public","party"].includes(r.visibility)||(r.visibility==="player"&&r.subject_user_id===userId)||(r.visibility==="character"&&r.subject_character_id===characterId)).map(r=>this.getHandout(r.id));
  }
  archiveHandout(id){ this.db.prepare("UPDATE handouts SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id); return this.getHandout(id); }

  // ----- v3.3.0 encounter aftermath drafts -----
  createEncounterAftermath(encounterId,guildId,sessionId,draft,status="pending"){
    const existing=this.db.prepare("SELECT * FROM encounter_aftermath WHERE encounter_id=?").get(encounterId); const id=existing?.id||randomUUID();
    this.db.prepare(`INSERT INTO encounter_aftermath(id,encounter_id,guild_id,session_id,status,draft_json) VALUES(?,?,?,?,?,?) ON CONFLICT(encounter_id) DO UPDATE SET status=excluded.status,draft_json=excluded.draft_json,updated_at=CURRENT_TIMESTAMP`).run(id,encounterId,guildId,sessionId,status,JSON.stringify(draft||{}));
    return this.getEncounterAftermath(encounterId);
  }
  getEncounterAftermath(encounterId){ const r=this.db.prepare("SELECT * FROM encounter_aftermath WHERE encounter_id=?").get(encounterId); return r?{...r,draft:JSON.parse(r.draft_json||"{}")} : null; }
  setEncounterAftermathStatus(encounterId,status){ if(!new Set(["pending","applied","discarded"]).has(status)) throw new Error("Invalid aftermath status."); this.db.prepare("UPDATE encounter_aftermath SET status=?,applied_at=CASE WHEN ?='applied' THEN CURRENT_TIMESTAMP ELSE applied_at END,updated_at=CURRENT_TIMESTAMP WHERE encounter_id=?").run(status,status,encounterId); return this.getEncounterAftermath(encounterId); }

  snapshotCampaign(guildId,{label="Snapshot",reason="",createdBy=null}={}){
    const id=randomUUID();
    const sessionIds=this.db.prepare("SELECT id FROM sessions WHERE guild_id=?").all(guildId).map(x=>x.id);
    const qmarks=sessionIds.length?sessionIds.map(()=>"?").join(","):"NULL";
    const directTables=["players","characters","sessions","facts","clocks","threads","reference_entries","published_messages","npc_proxies","encounters","encounter_combatants","character_drafts","levelup_drafts","canon_events","canon_conflicts","downtime_cycles","downtime_projects","rules_rulings","relationships","relationship_hook_imports","handouts","encounter_aftermath"];
    const state={campaign:this.getCampaign(guildId),tables:{}};
    for(const table of directTables){
      try{state.tables[table]=this.db.prepare(`SELECT * FROM ${table} WHERE guild_id=?`).all(guildId);}catch{state.tables[table]=[];}
    }
    for(const table of ["session_presence","session_characters"]){
      state.tables[table]=sessionIds.length?this.db.prepare(`SELECT * FROM ${table} WHERE session_id IN (${qmarks})`).all(...sessionIds):[];
    }
    this.db.prepare("INSERT INTO campaign_snapshots(id,guild_id,label,reason,state_json,created_by) VALUES(?,?,?,?,?,?)")
      .run(id,guildId,label,reason,JSON.stringify(state),createdBy);
    return this.getSnapshot(id);
  }

  getSnapshot(id){
    const r=this.db.prepare("SELECT * FROM campaign_snapshots WHERE id=?").get(id);
    return r?{...r,state:JSON.parse(r.state_json)}:null;
  }

  listSnapshots(guildId,limit=12){
    return this.db.prepare("SELECT id,label,reason,created_by,created_at FROM campaign_snapshots WHERE guild_id=? ORDER BY created_at DESC LIMIT ?").all(guildId,limit);
  }

  restoreSnapshot(guildId,snapshotId,{actorId=null}={}){
    const snap=this.getSnapshot(snapshotId); if(!snap||snap.guild_id!==guildId) throw new Error("Snapshot not found for this campaign.");
    this.snapshotCampaign(guildId,{label:"Pre-rollback safety",reason:`Before rollback to ${snapshotId}`,createdBy:actorId});
    const state=snap.state;
    const delOrder=["encounter_aftermath","encounter_combatants","npc_proxies","session_characters","session_presence","levelup_drafts","downtime_projects","canon_conflicts","canon_events","relationships","relationship_hook_imports","handouts","encounters","sessions","character_drafts","characters","players","facts","clocks","threads","reference_entries","published_messages","downtime_cycles","rules_rulings"];
    const insertOrder=["players","characters","sessions","session_presence","session_characters","facts","clocks","threads","reference_entries","published_messages","npc_proxies","encounters","encounter_combatants","character_drafts","levelup_drafts","canon_events","canon_conflicts","downtime_cycles","downtime_projects","rules_rulings","relationships","relationship_hook_imports","handouts","encounter_aftermath"];
    this.db.exec("BEGIN IMMEDIATE");
    try{
      for(const t of delOrder){
        if(["session_presence","session_characters"].includes(t)){
          this.db.prepare(`DELETE FROM ${t} WHERE session_id IN (SELECT id FROM sessions WHERE guild_id=?)`).run(guildId);
        }else this.db.prepare(`DELETE FROM ${t} WHERE guild_id=?`).run(guildId);
      }
      const c=state.campaign||{};
      const ccols=this.db.prepare("PRAGMA table_info(campaigns)").all().map(x=>x.name).filter(x=>x!=="guild_id");
      const set=ccols.map(x=>`${x}=?`).join(",");
      this.db.prepare(`UPDATE campaigns SET ${set} WHERE guild_id=?`).run(...ccols.map(x=>c[x]),guildId);
      for(const t of insertOrder){
        for(const row of state.tables?.[t]||[]){
          const cols=Object.keys(row); if(!cols.length) continue;
          const sql=`INSERT INTO ${t}(${cols.join(",")}) VALUES(${cols.map(()=>"?").join(",")})`;
          this.db.prepare(sql).run(...cols.map(k=>row[k]));
        }
      }
      this.db.exec("COMMIT");
    }catch(err){this.db.exec("ROLLBACK"); throw err;}
    return snap;
  }

  currentCanon(guildId,key){
    return this.db.prepare("SELECT * FROM canon_events WHERE guild_id=? AND canon_key=? AND status='current' ORDER BY created_at DESC LIMIT 1").get(guildId,key);
  }

  proposeCanon(guildId,{key,value,visibility="party",sessionId=null,sourceType="ai",sourceId=null,provenance=""}={}){
    if(!key?.trim()||!value?.trim()) throw new Error("Canon key and value are required.");
    const k=key.trim().toLowerCase(); const existing=this.currentCanon(guildId,k);
    if(existing && existing.value.trim()!==value.trim()){
      const id=randomUUID();
      this.db.prepare(`INSERT INTO canon_conflicts(id,guild_id,canon_key,existing_event_id,proposed_value,proposed_visibility,session_id,source_type,source_id,provenance) VALUES(?,?,?,?,?,?,?,?,?,?)`)
        .run(id,guildId,k,existing.id,value.trim(),visibility,sessionId,sourceType,sourceId,provenance);
      return {status:"conflict",conflict:this.db.prepare("SELECT * FROM canon_conflicts WHERE id=?").get(id),existing};
    }
    if(existing) return {status:"unchanged",event:existing};
    const id=randomUUID();
    this.db.prepare(`INSERT INTO canon_events(id,guild_id,canon_key,value,visibility,session_id,source_type,source_id,provenance) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(id,guildId,k,value.trim(),visibility,sessionId,sourceType,sourceId,provenance);
    return {status:"accepted",event:this.currentCanon(guildId,k)};
  }

  listCanon(guildId,{includeGM=false,limit=100}={}){
    const sql=includeGM?"SELECT * FROM canon_events WHERE guild_id=? AND status='current' ORDER BY canon_key LIMIT ?":"SELECT * FROM canon_events WHERE guild_id=? AND status='current' AND visibility!='gm' ORDER BY canon_key LIMIT ?";
    return this.db.prepare(sql).all(guildId,limit);
  }

  listCanonConflicts(guildId){ return this.db.prepare("SELECT cc.*,ce.value existing_value FROM canon_conflicts cc LEFT JOIN canon_events ce ON ce.id=cc.existing_event_id WHERE cc.guild_id=? AND cc.status='pending' ORDER BY cc.created_at").all(guildId); }

  resolveCanonConflict(guildId,id,{resolution="existing",customValue="",actorId=null}={}){
    const c=this.db.prepare("SELECT * FROM canon_conflicts WHERE id=? AND guild_id=? AND status='pending'").get(id,guildId); if(!c) throw new Error("Pending canon conflict not found.");
    const existing=c.existing_event_id?this.db.prepare("SELECT * FROM canon_events WHERE id=?").get(c.existing_event_id):null;
    if(resolution==="existing"){
      this.db.prepare("UPDATE canon_conflicts SET status='resolved_existing',resolved_value=?,resolved_by=?,resolved_at=CURRENT_TIMESTAMP WHERE id=?").run(existing?.value||"",actorId,id);
      return existing;
    }
    const value=resolution==="custom"?String(customValue||"").trim():c.proposed_value;
    if(!value) throw new Error("A custom canon resolution requires a value.");
    if(existing) this.db.prepare("UPDATE canon_events SET status='superseded' WHERE id=?").run(existing.id);
    const eid=randomUUID();
    this.db.prepare(`INSERT INTO canon_events(id,guild_id,canon_key,value,visibility,session_id,source_type,source_id,provenance,supersedes_id) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(eid,guildId,c.canon_key,value,c.proposed_visibility,c.session_id,"human_gm",actorId,`Resolved canon conflict ${id}`,existing?.id||null);
    this.db.prepare("UPDATE canon_conflicts SET status=?,resolved_value=?,resolved_by=?,resolved_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(resolution==="custom"?"resolved_custom":"resolved_proposed",value,actorId,id);
    return this.currentCanon(guildId,c.canon_key);
  }

  openDowntime(guildId,{label="Downtime",sourceSessionId=null,notes="",openedBy=null}={}){
    const existing=this.db.prepare("SELECT * FROM downtime_cycles WHERE guild_id=? AND status='open' ORDER BY opened_at DESC LIMIT 1").get(guildId); if(existing) return existing;
    const id=randomUUID();
    this.db.prepare("INSERT INTO downtime_cycles(id,guild_id,source_session_id,label,notes,opened_by) VALUES(?,?,?,?,?,?)").run(id,guildId,sourceSessionId,label,notes,openedBy);
    return this.getDowntimeCycle(id);
  }

  getDowntimeCycle(id){ return this.db.prepare("SELECT * FROM downtime_cycles WHERE id=?").get(id); }
  currentDowntime(guildId){ return this.db.prepare("SELECT * FROM downtime_cycles WHERE guild_id=? AND status IN ('open','resolving') ORDER BY opened_at DESC LIMIT 1").get(guildId); }

  addDowntimeProject(cycleId,guildId,{userId=null,characterId=null,type="project",title,objective="",maxProgress=4,visibility="party"}={}){
    const id=randomUUID();
    this.db.prepare(`INSERT INTO downtime_projects(id,cycle_id,guild_id,discord_user_id,character_id,project_type,title,objective,max_progress,visibility) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(id,cycleId,guildId,userId,characterId,type,title,objective,maxProgress,visibility);
    return this.db.prepare("SELECT * FROM downtime_projects WHERE id=?").get(id);
  }
  listDowntimeProjects(cycleId){ return this.db.prepare("SELECT * FROM downtime_projects WHERE cycle_id=? ORDER BY created_at").all(cycleId); }
  updateDowntimeProject(id,patch={}){
    const r=this.db.prepare("SELECT * FROM downtime_projects WHERE id=?").get(id); if(!r) throw new Error("Downtime project not found.");
    const n={...r,...patch};
    this.db.prepare("UPDATE downtime_projects SET progress=?,status=?,result=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(n.progress,n.status,n.result||"",id);
    return this.db.prepare("SELECT * FROM downtime_projects WHERE id=?").get(id);
  }
  resolveDowntimeCycle(id,summary=""){
    this.db.prepare("UPDATE downtime_cycles SET status='resolved',summary=?,resolved_at=CURRENT_TIMESTAMP WHERE id=?").run(summary,id);
    return this.getDowntimeCycle(id);
  }

  upsertRulesRuling(guildId,{key,question,ruling,createdBy=null}={}){
    const id=randomUUID(); const k=String(key||question||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    if(!k||!ruling?.trim()) throw new Error("Ruling key/question and text are required.");
    this.db.prepare(`INSERT INTO rules_rulings(id,guild_id,ruling_key,question,ruling,created_by) VALUES(?,?,?,?,?,?) ON CONFLICT(guild_id,ruling_key) DO UPDATE SET question=excluded.question,ruling=excluded.ruling,created_by=excluded.created_by,active=1,updated_at=CURRENT_TIMESTAMP`)
      .run(id,guildId,k,question||key,ruling.trim(),createdBy);
    return this.db.prepare("SELECT * FROM rules_rulings WHERE guild_id=? AND ruling_key=?").get(guildId,k);
  }
  searchRulesRulings(guildId,query=""){
    const q=String(query).toLowerCase();
    return this.db.prepare("SELECT * FROM rules_rulings WHERE guild_id=? AND active=1 ORDER BY updated_at DESC").all(guildId)
      .filter(r=>!q||q.includes(r.ruling_key)||r.question.toLowerCase().split(/\\s+/).some(w=>w.length>4&&q.includes(w))).slice(0,8);
  }

  audit(guildId,sessionId,actorType,actorId,action,payload={}) {
    this.db.prepare(`
      INSERT INTO audit_log(guild_id,session_id,actor_type,actor_id,action,payload_json)
      VALUES(?,?,?,?,?,?)
    `).run(guildId,sessionId,actorType,actorId,action,JSON.stringify(payload));
  }
}
