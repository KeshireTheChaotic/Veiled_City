/**
 * SQLite persistence boundary for Veiled City.
 *
 * Callers should use VeiledDB methods instead of reaching into `db.db`. This
 * keeps schema knowledge, visibility filtering, and transaction semantics in
 * one reviewable layer.
 */
import fs from "node:fs";
import { updateRelationshipDimensions, relationshipPairKey } from "./relationship-state.js";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { processCityDue } from "./city-calendar.js";
import { normalizeNpcKey } from "./npc-cognition.js";
import { archiveScenePresence } from "./scene-continuity.js";

/** SQLite repository facade and transaction boundary for campaign state. */
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
      ["assembly_plan_json","TEXT NOT NULL DEFAULT '{}'"],
      ["director_state_json",`TEXT NOT NULL DEFAULT '{"version":1,"round_number":1,"acted_user_ids":[],"scene_number":1,"scene_label":"","pass_counts":{"round":0,"scene":0,"downtime":0},"pending_pass":null}'`]
    ]) add("sessions",name,def);
    add("messages","subject_user_id","TEXT");
    add("messages","subject_character_id","TEXT");
    for(const [name,def] of [
      ["proposed_by_user_id","TEXT"],
      ["proposed_by_character_id","TEXT"],
      ["source_session_id","TEXT"],
      ["source_channel_id","TEXT"],
      ["source_message_id","TEXT"]
    ]) add("canon_proposals",name,def);
    add("campaigns","fear","INTEGER NOT NULL DEFAULT 0");
    add("campaigns","director_paused","INTEGER NOT NULL DEFAULT 0");
    add("facts","archived","INTEGER NOT NULL DEFAULT 0");
    add("facts","provenance_json","TEXT NOT NULL DEFAULT '{}'");
    add("facts","confidence","INTEGER NOT NULL DEFAULT 100");
    add("encounters","combat_state_json",`TEXT NOT NULL DEFAULT '{"spotlight":{"counts":{},"last_character_id":null}}'`);
    add("encounters","pc_start_state_json",`TEXT NOT NULL DEFAULT '[]'`);
    add("npc_memories","visibility","TEXT NOT NULL DEFAULT 'gm'");
    add("npc_memories","source_session","TEXT");
    add("npc_memories","source_scene","TEXT NOT NULL DEFAULT ''");
    add("npc_memories","created_tick","INTEGER NOT NULL DEFAULT 0");
    // Older databases used globally unique thread keys. Preserve their IDs so
    // snapshots and published-message references continue to resolve.
    const threadColumns=this.db.prepare("PRAGMA table_info(threads)").all();
    if(!threadColumns.find(c=>c.name==="guild_id")?.pk){
      this.transaction(()=>{
        this.db.exec(`
          CREATE TABLE threads_scoped (
            id TEXT NOT NULL, guild_id TEXT NOT NULL, label TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','resolved','failed','dormant')),
            visibility TEXT NOT NULL DEFAULT 'party' CHECK(visibility IN ('public','party','player','character','gm')),
            subject_user_id TEXT, subject_character_id TEXT,
            notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(guild_id,id),
            FOREIGN KEY(guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
          );
          INSERT INTO threads_scoped SELECT id,guild_id,label,status,visibility,
            subject_user_id,subject_character_id,notes,updated_at FROM threads;
          DROP TABLE threads;
          ALTER TABLE threads_scoped RENAME TO threads;
        `);
      });
    }
    const knownPairs=new Set(this.db.prepare("SELECT guild_id,entity_key FROM simulation_entities WHERE entity_type='relationship'")
      .all().map(row=>`${row.guild_id}:${row.entity_key}`));
    this.transaction(()=>{
      for(const relation of this.db.prepare("SELECT * FROM relationships ORDER BY created_at").all()){
        const pair=relationshipPairKey(relation);
        if(!knownPairs.has(`${relation.guild_id}:${pair}`)) updateRelationshipDimensions(this,relation.guild_id,relation);
      }
    });
    this.db.exec("PRAGMA user_version=440;");
  }

  close() { this.db.close(); }
  schemaVersion(){ return this.db.prepare("PRAGMA user_version").get().user_version; }
  cityRecordCounts(guildId){
    return this.db.prepare("SELECT kind,status,COUNT(*) count FROM city_records WHERE guild_id=? GROUP BY kind,status ORDER BY kind,status LIMIT 200").all(guildId);
  }

  contextFacts(guildId,{scope,userId="",characterId="",query="",limit=20}){
    return this.db.prepare(`SELECT * FROM facts WHERE guild_id=? AND archived=0 AND
      (?='gm' OR visibility='public' OR (? IN ('party','player','character') AND visibility='party')
      OR (? IN ('player','character') AND visibility='player' AND subject_user_id=?)
      OR (?='character' AND visibility='character' AND subject_character_id=?))
      AND (?='' OR instr(lower(content),lower(?))>0) ORDER BY created_at DESC,id LIMIT ?`)
      .all(guildId,scope,scope,scope,userId,scope,characterId,query,query,Math.min(50,limit));
  }

  getCityCalendar(guildId){
    const row=this.db.prepare("SELECT * FROM city_calendar WHERE guild_id=?").get(guildId);
    return row?{...row,flags:JSON.parse(row.flags_json)}:{guild_id:guildId,epoch:null,timezone:"UTC",flags:{}};
  }
  characterContinuity(guildId,characterId,{kind="arc",query="",limit=30}={}){
    return this.db.prepare(`SELECT * FROM city_records WHERE guild_id=? AND visibility='character' AND subject_key=?
      AND kind=? AND (?='' OR instr(lower(data_json),lower(?))>0) ORDER BY minute DESC,rowid DESC LIMIT ?`)
      .all(guildId,characterId,kind,query,query,Math.max(1,Math.min(50,limit))).map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  ownedExternalConsentOffers(guildId,character,user){
    return this.db.prepare(`SELECT r.* FROM city_records r JOIN world_events w ON w.guild_id=r.guild_id AND w.event_key=r.source_event AND w.status='active'
      WHERE r.guild_id=? AND r.status IN ('active','pending','offered','awaiting_consent')
      AND (w.visibility IN ('public','party') OR w.visibility='character' AND w.subject_key=? OR w.visibility='player' AND w.subject_key=?)
      AND ((r.kind='negotiation' AND EXISTS(SELECT 1 FROM json_each(r.data_json,'$.participants') WHERE json_extract(value,'$.type')='character' AND json_extract(value,'$.key')=?))
        OR (r.kind='commitment_offer' AND EXISTS(SELECT 1 FROM json_each(r.data_json,'$.proposal.participants') WHERE value=?))
        OR (r.kind='long_project' AND EXISTS(SELECT 1 FROM json_each(r.data_json,'$.participants') WHERE value=?)))
      ORDER BY r.minute DESC,r.rowid DESC LIMIT 50`).all(guildId,character,user,character,`character:${character}`,character)
      .map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  ownerAuthoredSource(guildId,key,user){
    return !!this.db.prepare("SELECT 1 FROM mutation_ledger WHERE guild_id=? AND source_layer='city' AND mutation_type='world_event_index' AND entity_key=? AND actor_id=? LIMIT 1")
      .get(guildId,key,user);
  }
  hasOwnerConsent(guildId,{proposal,revision,terms,character,user}){
    const session=this.getActiveSession(guildId),pc=this.getCharacter(character);
    if(!session||pc?.guild_id!==guildId||pc.owner_user_id!==user||this.activeAssignment(session.id,user)?.character_id!==character
      ||!this.roster(session.id).some(row=>row.character_id===character&&["present","late","guest"].includes(row.presence))) return false;
    return !!this.db.prepare(`SELECT 1 FROM city_records r JOIN world_events w ON w.guild_id=r.guild_id AND w.event_key=r.source_event AND w.status='active'
      WHERE r.guild_id=? AND r.kind='consent_reply' AND r.visibility='character' AND r.subject_key=?
      AND json_extract(r.data_json,'$.user')=? AND json_extract(r.data_json,'$.proposal')=? AND json_extract(r.data_json,'$.revision')=?
      AND json_extract(r.data_json,'$.terms')=? AND json_extract(r.data_json,'$.accepted')=1
      AND NOT EXISTS(SELECT 1 FROM city_records n WHERE n.guild_id=r.guild_id AND n.kind='consent_reply' AND n.subject_key=r.subject_key AND n.rowid>r.rowid
        AND json_extract(n.data_json,'$.user')=json_extract(r.data_json,'$.user') AND json_extract(n.data_json,'$.proposal')=json_extract(r.data_json,'$.proposal'))
      AND w.kind='owner_offer_reply' AND w.session_id=? AND w.source_id=? AND json_extract(w.details_json,'$.author')=?
      AND EXISTS(SELECT 1 FROM mutation_ledger m WHERE m.guild_id=r.guild_id AND m.source_layer='city' AND m.mutation_type='world_event_index' AND m.entity_key=w.event_key AND m.actor_id=?) LIMIT 1`)
      .get(guildId,character,user,proposal,revision,terms,session.id,`player:${user}`,user,user);
  }
  setCityCalendar(guildId,{epoch=null,timezone="UTC",flags={}}){
    this.db.prepare(`INSERT INTO city_calendar(guild_id,epoch,timezone,flags_json) VALUES(?,?,?,?)
      ON CONFLICT(guild_id) DO UPDATE SET epoch=excluded.epoch,timezone=excluded.timezone,flags_json=excluded.flags_json`)
      .run(guildId,epoch,timezone,JSON.stringify(flags));
    return this.getCityCalendar(guildId);
  }
  acceptedProjectContinuity(guildId,characterId,userId,query=""){
    return this.db.prepare(`SELECT r.record_key,r.status,json_extract(r.data_json,'$.title') title,
      json_extract(r.data_json,'$.phases['||json_extract(r.data_json,'$.index')||'].title') phase
      FROM city_records r JOIN world_events w ON w.guild_id=r.guild_id AND w.event_key=r.source_event AND w.status='active'
      WHERE r.guild_id=? AND r.kind='long_project'
      AND (w.visibility IN ('public','party') OR (w.visibility='character' AND w.subject_key=?) OR (w.visibility='player' AND w.subject_key=?))
      AND EXISTS(SELECT 1 FROM json_each(r.data_json,'$.participants') WHERE value=?)
      AND EXISTS(SELECT 1 FROM json_each(json_extract(r.data_json,'$.phases['||json_extract(r.data_json,'$.index')||'].consents'))
        WHERE key=? AND json_extract(value,'$.decision')='accept' AND json_extract(value,'$.by')=?)
      AND (?='' OR instr(lower(json_extract(r.data_json,'$.title')||' '||json_extract(r.data_json,'$.phases['||json_extract(r.data_json,'$.index')||'].title')),lower(?))>0)
      ORDER BY r.minute DESC,r.rowid DESC LIMIT 30`).all(guildId,characterId,userId,characterId,characterId,userId,query,query);
  }
  ownedCommunities(guildId,characterId,query=""){
    return this.db.prepare(`SELECT json_extract(m.data_json,'$.community_key') key,json_extract(m.data_json,'$.role') role,
      COALESCE(json_extract(c.data_json,'$.name'),'Historical community') name FROM city_records m
      LEFT JOIN city_records c ON c.guild_id=m.guild_id AND c.kind='community' AND c.record_key=json_extract(m.data_json,'$.community_key')
      WHERE m.guild_id=? AND m.kind='community_membership' AND m.visibility='character' AND m.subject_key=? AND m.status='active'
      AND (?='' OR instr(lower(COALESCE(json_extract(c.data_json,'$.name'),'')||' '||m.data_json),lower(?))>0)
      ORDER BY m.minute DESC,m.rowid DESC LIMIT 50`).all(guildId,characterId,query,query);
  }
  getWorldEvent(guildId,key){
    const row=this.db.prepare("SELECT * FROM world_events WHERE guild_id=? AND event_key=?").get(guildId,key);
    return row?{...row,details:JSON.parse(row.details_json)}:null;
  }
  saveWorldEvent(guildId,row){
    this.db.prepare(`INSERT INTO world_events(guild_id,event_key,kind,title,status,truth_status,visibility,subject_key,
      location_key,source_kind,source_id,session_id,scene,tick,minute,details_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,event_key) DO UPDATE SET status=excluded.status,details_json=excluded.details_json`)
      .run(guildId,row.key,row.kind,row.title,row.status,row.truth_status,row.visibility,row.subject_key||null,
        row.location_key||"",row.source_kind,row.source_id,row.session_id||null,row.scene||"",row.tick,row.minute,JSON.stringify(row.details||{}));
    return this.getWorldEvent(guildId,row.key);
  }
  listWorldEvents(guildId,{includeGM=false,userId=null,characterId=null,query="",limit=50}={}){
    return this.db.prepare(`SELECT * FROM world_events WHERE guild_id=? AND
      (?=1 OR visibility IN ('public','party') OR (visibility='player' AND subject_key=?) OR (visibility='character' AND subject_key=?))
      AND (?='' OR instr(lower(title||' '||location_key||' '||details_json),lower(?))>0)
      ORDER BY minute DESC,rowid DESC LIMIT ?`).all(guildId,includeGM?1:0,userId,characterId,query,query,Math.min(100,limit))
      .map(row=>({...row,details:JSON.parse(row.details_json)}));
  }
  rollModifierSources(guildId,character,trait,kind){
    return this.db.prepare(`SELECT * FROM world_events WHERE guild_id=? AND status='active' AND kind='roll_adjudication'
      AND visibility='character' AND subject_key=? AND json_extract(details_json,'$.roll_modifier.trait')=?
      AND json_extract(details_json,'$.roll_modifier.roll_kind')=? ORDER BY rowid LIMIT 101`)
      .all(guildId,character,trait,kind).map(row=>({...row,details:JSON.parse(row.details_json)}));
  }
  ownedRollRequests(guildId,user,character){
    return this.db.prepare(`SELECT * FROM city_records WHERE guild_id=? AND kind='roll_request' AND visibility='character'
      AND status IN ('pending','needs_review','awaiting_partner','awaiting_selection','awaiting_damage','awaiting_damage_type')
      AND json_extract(data_json,'$.session_id')=?
      AND (subject_key=? OR json_extract(data_json,'$.tag.partner_user')=? OR EXISTS (SELECT 1 FROM json_each(data_json,'$.tag.participants') p
        WHERE json_extract(p.value,'$.user')=? AND json_extract(p.value,'$.character')=?) OR EXISTS(SELECT 1 FROM json_each(data_json,'$.disclosures') d
        WHERE json_extract(d.value,'$.user')=? AND json_extract(d.value,'$.character')=?) OR EXISTS(SELECT 1 FROM json_each(data_json,'$.helpers') h
        WHERE json_extract(h.value,'$.user')=? AND json_extract(h.value,'$.character')=?))
      ORDER BY minute DESC,rowid DESC LIMIT 100`).all(guildId,this.getActiveSession(guildId)?.id||null,character,user,user,character,user,character,user,character)
      .map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  currentRollRequests(guildId,session,scene){
    return this.db.prepare(`SELECT * FROM city_records WHERE guild_id=? AND kind='roll_request' AND status='pending'
      AND json_extract(data_json,'$.session_id')=? AND json_extract(data_json,'$.scene')=? ORDER BY rowid DESC LIMIT 101`)
      .all(guildId,session,scene).map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  playerInitiatedTagTeam(guildId,session,user){
    const prefix=`${session}:`;
    return !!this.db.prepare(`SELECT 1 FROM city_records WHERE guild_id=? AND kind='tag_usage'
      AND json_extract(data_json,'$.user')=? AND substr(record_key,1,length(?))=? LIMIT 1`).get(guildId,user,prefix,prefix);
  }
  worldEventsAfter(guildId,{after=0,limit=50}={}){
    return this.db.prepare("SELECT rowid AS sequence,* FROM world_events WHERE guild_id=? AND rowid>? ORDER BY rowid LIMIT ?")
      .all(guildId,Math.max(0,after),Math.max(1,Math.min(50,limit))).map(row=>({...row,details:JSON.parse(row.details_json)}));
  }
  consequenceSourceCount(guildId,source){
    return this.db.prepare("SELECT count(*) n FROM city_records WHERE guild_id=? AND kind='consequence' AND source_event=?")
      .get(guildId,source).n;
  }
  getCitySchedule(guildId,key){
    const row=this.db.prepare("SELECT * FROM city_schedule WHERE guild_id=? AND schedule_key=?").get(guildId,key);
    return row?{...row,data:JSON.parse(row.data_json)}:null;
  }
  saveCitySchedule(guildId,row){
    this.db.prepare(`INSERT INTO city_schedule(guild_id,schedule_key,due_minute,due_tick,status,review_status,data_json) VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,schedule_key) DO UPDATE SET due_minute=excluded.due_minute,due_tick=excluded.due_tick,
        status=excluded.status,review_status=excluded.review_status,data_json=excluded.data_json`)
      .run(guildId,row.key,row.due_minute,row.due_tick,row.status,row.review_status,JSON.stringify(row.data));
    return this.getCitySchedule(guildId,row.key);
  }
  dueCitySchedules(guildId,limit=20){
    const clock=this.getSimulationClock(guildId);
    return this.db.prepare(`SELECT * FROM city_schedule WHERE guild_id=? AND status='scheduled' AND review_status='approved'
      AND due_minute<=? AND due_tick<=? ORDER BY due_minute,schedule_key LIMIT ?`).all(guildId,clock.minute,clock.tick,limit)
      .map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  upcomingCitySchedules(guildId,limit=20){
    return this.db.prepare("SELECT * FROM city_schedule WHERE guild_id=? AND status='scheduled' ORDER BY due_minute,due_tick,schedule_key LIMIT ?")
      .all(guildId,Math.max(1,Math.min(50,limit))).map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  getMutation(guildId,id){
    return this.db.prepare("SELECT * FROM mutation_ledger WHERE guild_id=? AND id=?").get(guildId,id)||null;
  }

  mutationsForEntity(guildId,key,limit=8){
    return this.db.prepare("SELECT * FROM mutation_ledger WHERE guild_id=? AND entity_key=? ORDER BY rowid DESC LIMIT ?")
      .all(guildId,key,Math.min(20,limit));
  }
  cityRecordsBySource(guildId,source){
    return this.db.prepare("SELECT * FROM city_records WHERE guild_id=? AND source_event=? ORDER BY rowid DESC LIMIT 12")
      .all(guildId,source).map(row=>({...row,data:JSON.parse(row.data_json)}));
  }

  getCityRecord(guildId,kind,key){
    const row=this.db.prepare("SELECT * FROM city_records WHERE guild_id=? AND kind=? AND record_key=?").get(guildId,kind,key);
    return row?{...row,data:JSON.parse(row.data_json)}:null;
  }
  saveCityRecord(guildId,{kind,key,actor_key="",location_key="",district_key="",status="active",source_event,data,visibility="gm",subject_key=null}){
    const clock=this.getSimulationClock(guildId);
    this.db.prepare(`INSERT INTO city_records(guild_id,kind,record_key,actor_key,location_key,district_key,status,visibility,
      subject_key,source_event,tick,minute,data_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,kind,record_key) DO UPDATE SET actor_key=excluded.actor_key,location_key=excluded.location_key,
        district_key=excluded.district_key,status=excluded.status,visibility=excluded.visibility,subject_key=excluded.subject_key,
        source_event=excluded.source_event,tick=excluded.tick,minute=excluded.minute,data_json=excluded.data_json`)
      .run(guildId,kind,key,actor_key,location_key,district_key,status,visibility,subject_key,source_event,clock.tick,clock.minute,JSON.stringify(data));
    return this.getCityRecord(guildId,kind,key);
  }
  listCityRecords(guildId,{kind="",actor="",status="",query="",limit=30,offset=0,includeGM=false}={}){
    return this.db.prepare(`SELECT * FROM city_records WHERE guild_id=? AND (?=1 OR visibility IN ('public','party'))
      AND (?='' OR kind=?) AND (?='' OR actor_key=?) AND (?='' OR status=?)
      AND (?='' OR instr(lower(record_key||' '||location_key||' '||district_key||' '||data_json),lower(?))>0)
      ORDER BY minute DESC,rowid DESC LIMIT ? OFFSET ?`).all(guildId,includeGM?1:0,kind,kind,actor,actor,status,status,query,query,
        Math.max(1,Math.min(100,limit)),Math.max(0,offset))
      .map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  saveWorldLink(guildId,{from,to,relation,asserted_by=""}){
    this.db.prepare("INSERT OR IGNORE INTO world_event_links(guild_id,from_event,to_event,relation,asserted_by) VALUES(?,?,?,?,?)")
      .run(guildId,from,to,relation,asserted_by);
    return {from,to,relation,asserted_by};
  }
  worldLinks(guildId){
    return this.db.prepare("SELECT * FROM world_event_links WHERE guild_id=? ORDER BY rowid LIMIT 1000").all(guildId);
  }
  setDistrictLocation(guildId,location,district,source){
    this.db.prepare(`INSERT INTO district_locations(guild_id,location_key,district_key,source_event) VALUES(?,?,?,?)
      ON CONFLICT(guild_id,location_key) DO UPDATE SET district_key=excluded.district_key,source_event=excluded.source_event`)
      .run(guildId,location,district,source);
  }
  districtLocations(guildId,district){
    return this.db.prepare("SELECT * FROM district_locations WHERE guild_id=? AND district_key=? ORDER BY location_key").all(guildId,district);
  }
  cityEdges(guildId,kind){
    return this.db.prepare("SELECT * FROM city_edges WHERE guild_id=? AND kind=? ORDER BY from_key,to_key LIMIT 1000").all(guildId,kind)
      .map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  saveCityEdge(guildId,{kind,from,to,duration=0,source_event,data={}}){
    this.db.prepare(`INSERT INTO city_edges(guild_id,kind,from_key,to_key,duration_minutes,source_event,data_json) VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,kind,from_key,to_key) DO UPDATE SET duration_minutes=excluded.duration_minutes,source_event=excluded.source_event,data_json=excluded.data_json`)
      .run(guildId,kind,from,to,duration,source_event,JSON.stringify(data));
    return {kind,from,to,duration,source_event,data};
  }
  overlappingCommitment(guildId,actor,start,end){
    const row=this.db.prepare(`SELECT * FROM city_records WHERE guild_id=? AND kind='commitment' AND status='active'
      AND json_extract(data_json,'$.start')<? AND json_extract(data_json,'$.end')>?
      AND EXISTS (SELECT 1 FROM json_each(city_records.data_json,'$.participants') WHERE value=?) LIMIT 1`).get(guildId,end,start,actor);
    return row?{...row,data:JSON.parse(row.data_json)}:null;
  }
  longProjectInbox(guildId,userId,{gm=false,limit=30}={}){
    return this.db.prepare(`SELECT * FROM city_records WHERE guild_id=? AND kind IN ('long_project','project_draft')
      AND (?=1 OR EXISTS(SELECT 1 FROM json_each(city_records.data_json,'$.participants') p
      JOIN characters c ON c.id=p.value WHERE c.guild_id=city_records.guild_id AND c.owner_user_id=?))
      ORDER BY minute DESC,rowid DESC LIMIT ?`).all(guildId,gm?1:0,userId,Math.max(1,Math.min(50,limit)))
      .map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  memoryCandidateActors(guildId,after=""){
    return this.db.prepare(`SELECT actor FROM (
      SELECT 'npc:'||npc_key actor FROM npc_memories WHERE guild_id=? AND status IN ('active','challenged') AND importance<80 GROUP BY npc_key HAVING count(*)>=2
      UNION SELECT entity_key actor FROM simulation_records WHERE guild_id=? AND kind='memory' AND status='active' AND entity_key LIKE 'faction:%' GROUP BY entity_key HAVING count(*)>=2
      UNION SELECT 'institution:'||actor_key actor FROM city_records WHERE guild_id=? AND kind='report' AND status='active' GROUP BY actor_key HAVING count(*)>=2
      ) WHERE actor>? ORDER BY actor LIMIT 8`).all(guildId,guildId,guildId,after);
  }
  memoryMaintenanceClusters(guildId,after=0){
    return this.db.prepare("SELECT rowid AS sequence,* FROM city_records WHERE guild_id=? AND kind='memory_cluster' AND status='active' AND rowid>? ORDER BY rowid LIMIT 8")
      .all(guildId,after).map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  lowPriorityNpcMemories(guildId,npc){
    return this.db.prepare("SELECT id FROM npc_memories WHERE guild_id=? AND npc_key=? AND status IN ('active','challenged') AND importance<80 ORDER BY created_at,id LIMIT 8")
      .all(guildId,npc);
  }

  getSeedDocument(guildId,sourcePath){
    return this.db.prepare("SELECT * FROM seed_documents WHERE guild_id=? AND source_path=?").get(guildId,sourcePath)||null;
  }

  insertSeedDocument(guildId,{sourcePath,sha256,encoding,body,visibility,characterId=null,actorId}){
    if(visibility==="character"&&!characterId) throw new Error("Character content requires an explicit character boundary.");
    if(characterId&&this.getCharacter(characterId)?.guild_id!==guildId) throw new Error("Character belongs to another campaign.");
    this.db.prepare(`INSERT INTO seed_documents
      (guild_id,source_path,sha256,encoding,body,visibility,subject_character_id,imported_by) VALUES(?,?,?,?,?,?,?,?)`)
      .run(guildId,sourcePath,sha256,encoding,body,visibility,characterId,actorId);
  }

  listSeedDocuments(guildId,{includeGM=false,characterId=null}={}){
    return this.db.prepare(`SELECT * FROM seed_documents WHERE guild_id=?
      AND (?=1 OR visibility='party' OR (visibility='character' AND subject_character_id=?)) ORDER BY source_path`)
      .all(guildId,includeGM?1:0,characterId);
  }

  insertSeedCatalog(guildId,{sourcePath,key,kind,data,visibility,characterId=null}){
    const source=this.getSeedDocument(guildId,sourcePath);
    if(!source||source.visibility!==visibility||source.subject_character_id!==characterId){
      throw new Error("Catalog privacy must match its source document.");
    }
    this.db.prepare(`INSERT INTO seed_catalog
      (guild_id,source_path,entry_key,kind,data_json,visibility,subject_character_id) VALUES(?,?,?,?,?,?,?)`)
      .run(guildId,sourcePath,key,kind,JSON.stringify(data),visibility,characterId);
  }

  listSeedCatalog(guildId,{includeGM=false,characterId=null}={}){
    return this.db.prepare(`SELECT * FROM seed_catalog WHERE guild_id=?
      AND (?=1 OR visibility='party' OR (visibility='character' AND subject_character_id=?)) ORDER BY source_path,entry_key`)
      .all(guildId,includeGM?1:0,characterId).map(row=>({...row,data:JSON.parse(row.data_json)}));
  }

  campaignCharacters(guildId){
    return this.db.prepare("SELECT id,name FROM characters WHERE guild_id=? ORDER BY name").all(guildId);
  }

  getSimulationEntity(guildId,type,key){
    const row=this.db.prepare("SELECT * FROM simulation_entities WHERE guild_id=? AND entity_type=? AND entity_key=?").get(guildId,type,key);
    return row?{...row,state:JSON.parse(row.state_json)}:null;
  }

  setSimulationEntity(guildId,type,key,state){
    this.db.prepare(`INSERT INTO simulation_entities(guild_id,entity_type,entity_key,state_json) VALUES(?,?,?,?)
      ON CONFLICT(guild_id,entity_type,entity_key) DO UPDATE SET state_json=excluded.state_json`).run(guildId,type,key,JSON.stringify(state));
    return this.getSimulationEntity(guildId,type,key);
  }

  listSimulationEntities(guildId,type=""){
    return this.db.prepare("SELECT * FROM simulation_entities WHERE guild_id=? AND (?='' OR entity_type=?) ORDER BY entity_key")
      .all(guildId,type,type).map(row=>({...row,state:JSON.parse(row.state_json)}));
  }
  densityActorSelection(guildId,query=""){
    const npcs=this.db.prepare(`WITH candidates AS (
      SELECT p.npc_key AS actor_key,COALESCE(json_extract(e.state_json,'$.activity_tier'),p.activity_tier) tier,
      COALESCE(json_extract(e.state_json,'$.removed'),0) removed,
      EXISTS(SELECT 1 FROM npc_knowledge n JOIN world_events w ON w.guild_id=n.guild_id AND w.event_key=n.source_ref
        WHERE n.guild_id=p.guild_id AND n.npc_key=p.npc_key AND n.belief_state!='unknown' AND w.status='active'
        AND ?!='' AND instr(lower(n.content),lower(?))>0) wake,
      COALESCE((SELECT MAX(g.priority) FROM npc_goals g LEFT JOIN city_records m ON m.guild_id=g.guild_id AND m.kind='goal_state'
        AND m.record_key=json_array('npc',g.npc_key,g.goal_key) WHERE g.guild_id=p.guild_id AND g.npc_key=p.npc_key
        AND COALESCE(json_extract(m.data_json,'$.status'),g.status)='active'),0)
      +CASE WHEN ?!='' AND (instr(lower(?),lower(p.npc_key))>0 OR instr(lower(?),lower(COALESCE(json_extract(e.state_json,'$.location_key'),'@none')))>0)
        THEN 100 ELSE 0 END AS score
      FROM npc_profiles p LEFT JOIN simulation_entities e ON e.guild_id=p.guild_id AND e.entity_type='npc' AND e.entity_key=p.npc_key WHERE p.guild_id=?
    ) SELECT actor_key,wake,score FROM candidates WHERE removed=0 AND (tier!='dormant' OR wake=1) ORDER BY score DESC,actor_key LIMIT 32`)
      .all(query,query,query,query,query,guildId).map(row=>({...row,type:"npc"}));
    const factions=this.db.prepare(`SELECT entity_key actor_key,0 wake,COALESCE((SELECT MAX(CAST(json_extract(r.data_json,'$.priority') AS INTEGER))
      FROM simulation_records r WHERE r.guild_id=e.guild_id AND r.entity_key='faction:'||e.entity_key AND r.kind='goal' AND r.status='active'),0) score
      FROM simulation_entities e WHERE guild_id=? AND entity_type='faction' AND COALESCE(json_extract(state_json,'$.removed'),0)=0
      AND COALESCE(json_extract(state_json,'$.activity_tier'),'background')!='dormant' ORDER BY score DESC,entity_key LIMIT 16`)
      .all(guildId).map(row=>({...row,type:"faction"}));
    return [...npcs,...factions].sort((a,b)=>b.score-a.score||`${a.type}:${a.actor_key}`.localeCompare(`${b.type}:${b.actor_key}`)).slice(0,32);
  }
  actorSimulationRelations(guildId,entity){
    return this.db.prepare(`SELECT state_json FROM simulation_entities WHERE guild_id=? AND entity_type='relationship'
      AND (json_extract(state_json,'$.from')=? OR json_extract(state_json,'$.to')=?) ORDER BY entity_key LIMIT 16`)
      .all(guildId,entity,entity).map(row=>JSON.parse(row.state_json));
  }

  putSimulationRecord(guildId,{id=randomUUID(),kind,entityKey="",status="active",dueTick=null,dueMinute=null,data={}}){
    this.db.prepare(`INSERT INTO simulation_records(id,guild_id,kind,entity_key,status,due_tick,due_minute,data_json) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status,due_tick=excluded.due_tick,due_minute=excluded.due_minute,data_json=excluded.data_json
      WHERE simulation_records.guild_id=excluded.guild_id AND simulation_records.kind=excluded.kind`)
      .run(id,guildId,kind,entityKey,status,dueTick,dueMinute,JSON.stringify(data));
    const row=this.getSimulationRecord(guildId,id);
    if(!row||row.kind!==kind) throw new Error("Simulation record identity belongs to another campaign or kind.");
    return row;
  }

  getSimulationRecord(guildId,id){
    const row=this.db.prepare("SELECT * FROM simulation_records WHERE guild_id=? AND id=?").get(guildId,id);
    return row?{...row,data:JSON.parse(row.data_json)}:null;
  }

  listSimulationRecords(guildId,{kind="",status="",entityKey="",limit=100}={}){
    return this.db.prepare(`SELECT * FROM simulation_records WHERE guild_id=? AND (?='' OR kind=?)
      AND (?='' OR status=?) AND (?='' OR entity_key=?) ORDER BY rowid DESC LIMIT ?`)
      .all(guildId,kind,kind,status,status,entityKey,entityKey,Math.max(1,Math.min(1000,Number(limit)||100)))
      .map(row=>({...row,data:JSON.parse(row.data_json)}));
  }

  getSimulationClock(guildId){
    return this.db.prepare("SELECT * FROM simulation_clock WHERE guild_id=?").get(guildId)||{guild_id:guildId,tick:0,minute:0};
  }

  listDueSimulationActions(guildId){
    const clock=this.getSimulationClock(guildId);
    return this.db.prepare(`SELECT * FROM simulation_records WHERE rowid IN (
      SELECT MIN(rowid) FROM simulation_records WHERE guild_id=? AND kind='action' AND status='scheduled'
      AND (due_tick IS NULL OR due_tick<=?) AND (due_minute IS NULL OR due_minute<=?) GROUP BY entity_key
    ) ORDER BY rowid LIMIT 100`)
      .all(guildId,clock.tick,clock.minute).map(row=>({...row,data:JSON.parse(row.data_json)}));
  }

  advanceSimulationClock(guildId,{ticks=0,minutes=0}={}){
    if(!Number.isSafeInteger(ticks)||ticks<0||!Number.isSafeInteger(minutes)||minutes<0) throw new Error("Fictional time increments must be nonnegative integers.");
    const prior=this.getSimulationClock(guildId);
    if(!Number.isSafeInteger(prior.minute+minutes)||!Number.isSafeInteger(prior.tick+ticks)) throw new Error("Fictional clock overflow.");
    return this.transaction(()=>{
      this.db.prepare(`INSERT INTO simulation_clock(guild_id,tick,minute) VALUES(?,?,?)
        ON CONFLICT(guild_id) DO UPDATE SET tick=tick+excluded.tick,minute=minute+excluded.minute`).run(guildId,ticks,minutes);
      processCityDue(this,guildId);
      return this.getSimulationClock(guildId);
    });
  }

  annotateNpcMemory(guildId,id,{sessionId=null,scene="",tick=0,status="active",supersededBy=null}={}){
    this.db.prepare(`UPDATE npc_memories SET source_session=?,source_scene=?,created_tick=?,status=?,superseded_by=?,updated_at=CURRENT_TIMESTAMP
      WHERE guild_id=? AND id=?`).run(sessionId,scene,tick,status,supersededBy,guildId,id);
    return this.getNpcMemory(id);
  }

  transaction(fn){
    if(typeof fn!=="function") throw new TypeError("transaction requires a synchronous callback.");
    this._transactionDepth=(this._transactionDepth||0)+1;
    const depth=this._transactionDepth;
    const savepoint=`vc_tx_${depth}`;
    try{
      if(depth===1) this.db.exec("BEGIN IMMEDIATE");
      else this.db.exec(`SAVEPOINT ${savepoint}`);
      const value=fn();
      if(value&&typeof value.then==="function") throw new Error("VeiledDB.transaction callbacks must be synchronous.");
      if(depth===1) this.db.exec("COMMIT");
      else this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
      return value;
    }catch(err){
      try{
        if(depth===1) this.db.exec("ROLLBACK");
        else { this.db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`); this.db.exec(`RELEASE SAVEPOINT ${savepoint}`); }
      }catch{
        // Preserve the original transaction error even if SQLite rollback cleanup also fails.
      }
      throw err;
    }finally{
      this._transactionDepth=depth-1;
    }
  }

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

  upsertCharacterNarrative(guildId,characterId,scope,markdown,{sourceFilename="",importedBy=null}={}) {
    if(!new Set(["player","gm_private"]).has(scope)) throw new Error("Narrative scope must be player or gm_private.");
    const c=this.getCharacter(characterId);
    if(!c||c.guild_id!==guildId) throw new Error("Campaign character not found.");
    const text=String(markdown??"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trimEnd()+"\n";
    if(!text.trim()) throw new Error("Narrative Markdown cannot be empty.");
    if(Buffer.byteLength(text,"utf8")>131072) throw new Error("Narrative Markdown is too large; maximum is 128 KiB.");
    const existing=this.db.prepare("SELECT id FROM character_narratives WHERE guild_id=? AND character_id=? AND scope=?").get(guildId,characterId,scope);
    const id=existing?.id||randomUUID();
    this.db.prepare(`INSERT INTO character_narratives(id,guild_id,character_id,scope,markdown,source_filename,imported_by)
      VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,character_id,scope) DO UPDATE SET markdown=excluded.markdown,source_filename=excluded.source_filename,imported_by=excluded.imported_by,updated_at=CURRENT_TIMESTAMP`)
      .run(id,guildId,characterId,scope,text,String(sourceFilename||""),importedBy);
    return this.getCharacterNarrative(guildId,characterId,scope);
  }

  getCharacterNarrative(guildId,characterId,scope) {
    return this.db.prepare("SELECT * FROM character_narratives WHERE guild_id=? AND character_id=? AND scope=?").get(guildId,characterId,scope)||null;
  }

  listCharacterNarratives(guildId,{characterIds=null,includeGM=false}={}) {
    let sql="SELECT * FROM character_narratives WHERE guild_id=?";
    const args=[guildId];
    if(!includeGM) sql+=" AND scope='player'";
    if(Array.isArray(characterIds)&&characterIds.length){ sql+=` AND character_id IN (${characterIds.map(()=>"?").join(",")})`; args.push(...characterIds); }
    sql+=" ORDER BY updated_at DESC";
    return this.db.prepare(sql).all(...args);
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

  getDirectorState(sessionId){
    const row=this.db.prepare("SELECT director_state_json FROM sessions WHERE id=?").get(sessionId);
    const fallback={version:1,round_number:1,acted_user_ids:[],scene_number:1,scene_label:"",pass_counts:{round:0,scene:0,downtime:0},pending_pass:null};
    if(!row) return fallback;
    try{
      const parsed=JSON.parse(row.director_state_json||"{}");
      return {...fallback,...parsed,acted_user_ids:Array.isArray(parsed.acted_user_ids)?parsed.acted_user_ids:[],pass_counts:{...fallback.pass_counts,...(parsed.pass_counts||{})}};
    }catch{return fallback;}
  }

  setDirectorState(sessionId,state){
    return this.transaction(()=>{
    const current=this.getDirectorState(sessionId);
    const next={...current,...state,acted_user_ids:Array.isArray(state?.acted_user_ids)?state.acted_user_ids:current.acted_user_ids,pass_counts:{...current.pass_counts,...(state?.pass_counts||{})}};
    if(next.scene_number!==current.scene_number){
      const session=this.getSession(sessionId);if(session) archiveScenePresence(this,session.guild_id,sessionId);
    }
    this.db.prepare("UPDATE sessions SET director_state_json=? WHERE id=?").run(JSON.stringify(next),sessionId);
    return next;
    });
  }

  resetDirectorRound(sessionId,{sceneLabel=null,advanceScene=false}={}){
    const current=this.getDirectorState(sessionId);
    return this.setDirectorState(sessionId,{
      acted_user_ids:[],
      round_number:Math.max(1,Number(current.round_number||1)),
      scene_number:advanceScene?Math.max(1,Number(current.scene_number||1))+1:Math.max(1,Number(current.scene_number||1)),
      scene_label:sceneLabel===null?current.scene_label:String(sceneLabel||"")
    });
  }

  recordDirectorActor(sessionId,userId){
    const current=this.getDirectorState(sessionId);
    const acted=new Set(current.acted_user_ids||[]);
    if(userId) acted.add(String(userId));
    return this.setDirectorState(sessionId,{acted_user_ids:[...acted]});
  }

  queueDirectorPass(sessionId,pass){
    const current=this.getDirectorState(sessionId);
    if(current.pending_pass) return current.pending_pass;
    const pending={...pass,queued_at:new Date().toISOString()};
    this.setDirectorState(sessionId,{pending_pass:pending});
    return pending;
  }

  getPendingDirectorPass(sessionId){ return this.getDirectorState(sessionId).pending_pass||null; }

  completeDirectorPass(sessionId,layer,{sceneLabel=null}={}){
    return this.transaction(()=>{
    const current=this.getDirectorState(sessionId);
    const counts={...current.pass_counts,[layer]:Number(current.pass_counts?.[layer]||0)+1};
    const patch={pass_counts:counts,pending_pass:null};
    if(layer==="round"){patch.round_number=Math.max(1,Number(current.round_number||1))+1;patch.acted_user_ids=[];}
    if(layer==="scene"){
      patch.scene_number=Math.max(1,Number(current.scene_number||1))+1;patch.scene_label=String(sceneLabel||current.scene_label||"");patch.acted_user_ids=[];
    }
    return this.setDirectorState(sessionId,patch);
    });
  }

  addFact(guildId,{category="fact",key,content,visibility="party",subjectUserId=null,subjectCharacterId=null,sessionId=null,source="gm",provenance={},confidence=100,dedupe=true}) {
    const normalizedContent=String(content||"").trim();
    const normalizedKey=String(key||"").trim();
    if(dedupe){
      const existing=this.db.prepare(`SELECT id FROM facts WHERE guild_id=? AND archived=0 AND category=? AND fact_key=? AND content=? AND visibility=? AND COALESCE(subject_user_id,'')=COALESCE(?,'') AND COALESCE(subject_character_id,'')=COALESCE(?,'') ORDER BY created_at DESC LIMIT 1`)
        .get(guildId,category,normalizedKey,normalizedContent,visibility,subjectUserId,subjectCharacterId);
      if(existing) return existing.id;
    }
    const id=randomUUID();
    const conf=Math.max(0,Math.min(100,Number(confidence)||0));
    this.db.prepare(`
      INSERT INTO facts(id,guild_id,category,fact_key,content,visibility,subject_user_id,subject_character_id,session_id,source,provenance_json,confidence)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id,guildId,category,normalizedKey,normalizedContent,visibility,subjectUserId,subjectCharacterId,sessionId,source,JSON.stringify(provenance||{}),conf);
    return id;
  }

  getFact(guildId,id){ return this.db.prepare("SELECT * FROM facts WHERE guild_id=? AND id=?").get(guildId,id); }
  npcKnowledgeForFact(guildId,npcKey,factId){
    return this.db.prepare("SELECT * FROM npc_knowledge WHERE guild_id=? AND npc_key=? AND (knowledge_key=? OR source_ref=?)")
      .all(guildId,npcKey,factId,factId);
  }
  findFactForGM(guildId,query){
    const q=String(query||"").trim(); if(!q) return null;
    return this.db.prepare(`SELECT * FROM facts WHERE guild_id=? AND archived=0 AND (id LIKE ? OR lower(fact_key)=lower(?)) ORDER BY created_at DESC LIMIT 1`).get(guildId,`${q}%`,q);
  }

  updateFact(guildId,id,patch={}){
    const row=this.getFact(guildId,id); if(!row) throw new Error("Fact not found.");
    const next={
      content:patch.content??row.content,visibility:patch.visibility??row.visibility,category:patch.category??row.category,
      subject_user_id:patch.subjectUserId===undefined?row.subject_user_id:patch.subjectUserId,
      subject_character_id:patch.subjectCharacterId===undefined?row.subject_character_id:patch.subjectCharacterId,
      archived:patch.archived===undefined?row.archived:(patch.archived?1:0)
    };
    this.db.prepare(`UPDATE facts SET content=?,visibility=?,category=?,subject_user_id=?,subject_character_id=?,archived=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND id=?`)
      .run(next.content,next.visibility,next.category,next.subject_user_id,next.subject_character_id,next.archived,guildId,id);
    return this.getFact(guildId,id);
  }

  archiveFact(guildId,id){ return this.updateFact(guildId,id,{archived:true}); }

  factsFor(guildId,userId,{characterId=null,includeGM=false,limit=80}={}) {
    const sql=includeGM?`
      SELECT * FROM facts WHERE guild_id=? AND archived=0 ORDER BY created_at DESC LIMIT ?
    `:`
      SELECT * FROM facts WHERE guild_id=? AND archived=0
       AND (
         visibility IN ('public','party')
         OR (visibility='player' AND subject_user_id=?)
         OR (visibility='character' AND subject_character_id=?)
       )
       ORDER BY created_at DESC LIMIT ?
    `;
    return includeGM?this.db.prepare(sql).all(guildId,limit):this.db.prepare(sql).all(guildId,userId,characterId||"",limit);
  }

  // Hard player-safe fact boundary. This method intentionally has no includeGM
  // switch so player-facing commands cannot accidentally expose visibility='gm'.
  playerFactsFor(guildId,userId,{characterId=null,category="",limit=80}={}) {
    const capped=Math.max(1,Math.min(200,Number(limit)||80));
    const wanted=String(category||"").trim().toLowerCase();
    return this.db.prepare(`
      SELECT * FROM facts WHERE guild_id=? AND archived=0
       AND (
         visibility IN ('public','party')
         OR (visibility='player' AND subject_user_id=?)
         OR (visibility='character' AND subject_character_id=?)
       )
       AND (?='' OR lower(category)=?)
       ORDER BY created_at DESC LIMIT ?
    `).all(guildId,userId,characterId||"",wanted,wanted,capped);
  }

  /** List GM-visible facts with filtering performed before LIMIT in SQLite. */
  listFactsForGM(guildId,{visibility="all",category="",subjectUserId="",search="",limit=50}={}) {
    const capped=Math.max(1,Math.min(100,Number(limit)||50));
    const vis=String(visibility||"all").trim().toLowerCase();
    const cat=String(category||"").trim().toLowerCase();
    const user=String(subjectUserId||"").trim();
    const q=String(search||"").trim().toLowerCase();
    return this.db.prepare(`
      SELECT rowid AS _rowid,* FROM facts
      WHERE guild_id=? AND archived=0
        AND (?='all' OR visibility=?)
        AND (?='' OR lower(category)=?)
        AND (?='' OR subject_user_id=?)
        AND (?='' OR lower(fact_key) LIKE '%' || ? || '%' OR lower(content) LIKE '%' || ? || '%')
      ORDER BY created_at DESC,_rowid DESC
      LIMIT ?
    `).all(guildId,vis,vis,cat,cat,user,user,q,q,q,capped);
  }

  // v3.7 operational services -------------------------------------------------
  getOperationReceipt(guildId,interactionId){ return this.db.prepare("SELECT * FROM operation_receipts WHERE guild_id=? AND interaction_id=?").get(guildId,interactionId); }
  recordOperationReceipt(guildId,{interactionId,commandKey,actorUserId,responseText="",payload={},status="completed"}){
    this.db.prepare(`INSERT INTO operation_receipts(guild_id,interaction_id,command_key,actor_user_id,status,response_text,payload_json) VALUES(?,?,?,?,?,?,?) ON CONFLICT(guild_id,interaction_id) DO UPDATE SET status=excluded.status,response_text=excluded.response_text,payload_json=excluded.payload_json`).run(guildId,interactionId,commandKey,actorUserId,status,String(responseText||""),JSON.stringify(payload||{}));
    return this.getOperationReceipt(guildId,interactionId);
  }

  recordMutation(guildId,{sessionId=null,actorType="system",actorId=null,sourceLayer="unknown",sourceInteractionId=null,sourceMessageId=null,mutationType,entityKey="",visibility="gm",confidence=100,rationale="",triggerText="",before={},after={},payload={}}={}){
    const id=randomUUID();
    this.db.prepare(`INSERT INTO mutation_ledger(id,guild_id,session_id,actor_type,actor_id,source_layer,source_interaction_id,source_message_id,mutation_type,entity_key,visibility,confidence,rationale,trigger_text,before_json,after_json,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,guildId,sessionId,actorType,actorId,sourceLayer,sourceInteractionId,sourceMessageId,mutationType||"unknown",String(entityKey||""),visibility||"gm",Math.max(0,Math.min(100,Number(confidence)||0)),String(rationale||""),String(triggerText||""),JSON.stringify(before||{}),JSON.stringify(after||{}),JSON.stringify(payload||{}));
    const row=this.db.prepare("SELECT * FROM mutation_ledger WHERE id=?").get(id);
    if(["simulation","npc_director"].includes(sourceLayer)){
      const clock=this.getSimulationClock(guildId);
      this.saveWorldEvent(guildId,{key:`mutation:${id}`,kind:mutationType||"simulation",title:String(rationale||mutationType||"Simulation event").slice(0,160),
        status:"active",truth_status:"asserted",visibility:"gm",source_kind:"mutation",source_id:id,
        session_id:sessionId,tick:clock.tick,minute:clock.minute,details:{entity_key:entityKey}});
    }
    return row;
  }
  listMutationLedger(guildId,{limit=40,sourceLayer="",mutationType=""}={}){
    const cap=Math.max(1,Math.min(100,Number(limit)||40));
    return this.db.prepare(`SELECT * FROM mutation_ledger WHERE guild_id=? AND (?='' OR source_layer=?) AND (?='' OR mutation_type=?) ORDER BY created_at DESC LIMIT ?`).all(guildId,sourceLayer,sourceLayer,mutationType,mutationType,cap);
  }

  setDirectorPaused(guildId,paused){ this.ensureCampaign(guildId); this.db.prepare("UPDATE campaigns SET director_paused=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=?").run(paused?1:0,guildId); return !!paused; }
  isDirectorPaused(guildId){ return !!this.getCampaign(guildId)?.director_paused; }
  recordDirectorHistory(guildId,{sessionId=null,layer="manual",trigger={},acted=false,rationale="",publicNarration="",mutationSummary={},status="completed",error=""}={}){
    const id=randomUUID();
    this.db.prepare(`INSERT INTO director_history(id,guild_id,session_id,layer,trigger_json,acted,rationale,public_narration,mutation_summary_json,status,error) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,guildId,sessionId,layer,JSON.stringify(trigger||{}),acted?1:0,String(rationale||""),String(publicNarration||""),JSON.stringify(mutationSummary||{}),status,String(error||""));
    return this.db.prepare("SELECT * FROM director_history WHERE id=?").get(id);
  }
  listDirectorHistory(guildId,limit=20){ return this.db.prepare("SELECT * FROM director_history WHERE guild_id=? ORDER BY created_at DESC LIMIT ?").all(guildId,Math.max(1,Math.min(50,Number(limit)||20))); }

  createBackup(guildId,{label="Manual backup",reason="",createdBy=null}={}){
    const snap=this.snapshotCampaign(guildId,{label:`Backup staging: ${label}`,reason:`Internal snapshot source for backup: ${reason}`,createdBy});
    const id=randomUUID();
    this.db.prepare("INSERT INTO campaign_backups(id,guild_id,label,reason,state_json,created_by) VALUES(?,?,?,?,?,?)").run(id,guildId,label,reason,JSON.stringify(snap.state),createdBy);
    this.db.prepare("DELETE FROM campaign_snapshots WHERE id=?").run(snap.id);
    return this.getBackup(id);
  }
  getBackup(id){ const r=this.db.prepare("SELECT * FROM campaign_backups WHERE id=?").get(id); return r?{...r,state:JSON.parse(r.state_json||"{}")} : null; }
  listBackups(guildId,limit=20){ return this.db.prepare("SELECT id,label,reason,created_by,created_at FROM campaign_backups WHERE guild_id=? ORDER BY created_at DESC LIMIT ?").all(guildId,Math.max(1,Math.min(50,Number(limit)||20))); }
  backupPreview(guildId,id){
    const b=this.getBackup(id); if(!b||b.guild_id!==guildId) throw new Error("Backup not found.");
    const current={players:this.listPlayers(guildId).length,characters:this.listGuildCharacters(guildId,{includeClosed:true}).length,facts:this.listFactsForGM(guildId,{limit:100}).length,sessions:this.db.prepare("SELECT count(*) n FROM sessions WHERE guild_id=?").get(guildId).n};
    const tables=b.state?.tables||{};
    const backup={players:(tables.players||[]).length,characters:(tables.characters||[]).length,facts:(tables.facts||[]).length,sessions:(tables.sessions||[]).length};
    return {backup:b,current,counts:backup};
  }
  restoreBackup(guildId,id,{actorId=null}={}){
    const b=this.getBackup(id); if(!b||b.guild_id!==guildId) throw new Error("Backup not found.");
    const tempId=randomUUID();
    this.db.prepare("INSERT INTO campaign_snapshots(id,guild_id,label,reason,state_json,created_by) VALUES(?,?,?,?,?,?)").run(tempId,guildId,`Restore source ${b.label}`,`Generated from backup ${id}`,JSON.stringify(b.state),actorId);
    try{return this.restoreSnapshot(guildId,tempId,{actorId});}
    finally{this.db.prepare("DELETE FROM campaign_snapshots WHERE id=?").run(tempId);}
  }

  doctorData(guildId){
    const active=this.getActiveSession(guildId);
    const presentWithoutCharacter=active?this.roster(active.id).filter(r=>["present","late","guest"].includes(r.presence)&&!r.character_id):[];
    const duplicateCanon=this.db.prepare(`SELECT canon_key,count(*) n FROM canon_events WHERE guild_id=? AND status='current' GROUP BY canon_key HAVING count(*)>1`).all(guildId);
    const orphanCharacters=this.db.prepare(`SELECT c.id,c.name FROM characters c LEFT JOIN players p ON p.guild_id=c.guild_id AND p.discord_user_id=c.owner_user_id WHERE c.guild_id=? AND c.owner_user_id IS NOT NULL AND p.discord_user_id IS NULL`).all(guildId);
    const orphanAssignments=this.db.prepare(`SELECT sc.session_id,sc.discord_user_id,sc.character_id FROM session_characters sc JOIN sessions s ON s.id=sc.session_id LEFT JOIN characters c ON c.id=sc.character_id WHERE s.guild_id=? AND c.id IS NULL`).all(guildId);
    const orphanHandouts=this.db.prepare(`SELECT h.id,h.title FROM handouts h LEFT JOIN characters c ON c.id=h.subject_character_id LEFT JOIN players p ON p.guild_id=h.guild_id AND p.discord_user_id=h.subject_user_id WHERE h.guild_id=? AND ((h.subject_character_id IS NOT NULL AND c.id IS NULL) OR (h.subject_user_id IS NOT NULL AND p.discord_user_id IS NULL))`).all(guildId);
    const brokenProxies=active?this.db.prepare(`SELECT sp.discord_user_id,sp.absence_mode,sp.proxy_user_id FROM session_presence sp LEFT JOIN session_presence pp ON pp.session_id=sp.session_id AND pp.discord_user_id=sp.proxy_user_id WHERE sp.session_id=? AND sp.absence_mode='proxy' AND (sp.proxy_user_id IS NULL OR pp.discord_user_id IS NULL OR pp.presence NOT IN ('present','late','guest'))`).all(active.id):[];
    const absentControl=active?this.db.prepare(`SELECT sp.discord_user_id,sc.character_id,sc.control_policy FROM session_presence sp JOIN session_characters sc ON sc.session_id=sp.session_id AND sc.discord_user_id=sp.discord_user_id AND sc.left_at IS NULL WHERE sp.session_id=? AND sp.presence='absent' AND sc.control_policy='player_only'`).all(active.id):[];
    const invalidVisibility=[];
    for(const table of ["facts","clocks","threads","reference_entries","relationships","handouts"]){
      try{
        const rows=this.db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE guild_id=? AND visibility NOT IN ('public','party','player','character','gm')`).get(guildId);
        if(rows?.n) invalidVisibility.push({table,count:rows.n});
      }catch{}
    }
    const pending=active?this.getPendingDirectorPass(active.id):null;
    const npcCognition={
      profiles:this.db.prepare("SELECT COUNT(*) n FROM npc_profiles WHERE guild_id=?").get(guildId).n,
      memories:this.db.prepare("SELECT COUNT(*) n FROM npc_memories WHERE guild_id=?").get(guildId).n,
      knowledge:this.db.prepare("SELECT COUNT(*) n FROM npc_knowledge WHERE guild_id=?").get(guildId).n,
      goals:this.db.prepare("SELECT COUNT(*) n FROM npc_goals WHERE guild_id=?").get(guildId).n,
      seed:this.getSeedRun(guildId,"npc_cognition_v1")
    };
    const contentSeed={seed:this.getSeedRun(guildId,"seed_data_v1"),
      documents:this.db.prepare("SELECT COUNT(*) n FROM seed_documents WHERE guild_id=?").get(guildId).n};
    return {schemaVersion:this.db.prepare("PRAGMA user_version").get().user_version,activeSession:active,presentWithoutCharacter,duplicateCanon,orphanCharacters,orphanAssignments,orphanHandouts,brokenProxies,absentControl,invalidVisibility,pendingDirector:pending,npcCognition,contentSeed};
  }

  findGuestCharacter(guildId,name,userId) {
    const q=String(name||"").toLowerCase();
    const rows=this.db.prepare(`
      SELECT * FROM characters WHERE guild_id=? AND is_guest=1 AND status='guest'
        AND (owner_user_id IS NULL OR owner_user_id=?)
    `).all(guildId,userId);
    const row=rows.find(x=>x.name.toLowerCase()===q)||rows.find(x=>x.name.toLowerCase().includes(q));
    return row?{...row,data:JSON.parse(row.character_json)}:null;
  }

  listPublishedMessages(guildId) {
    return this.db.prepare("SELECT * FROM published_messages WHERE guild_id=?").all(guildId);
  }

  markSessionCharacterLeft(sessionId,characterId) {
    this.db.prepare("UPDATE session_characters SET left_at=CURRENT_TIMESTAMP WHERE session_id=? AND character_id=? AND left_at IS NULL").run(sessionId,characterId);
  }

  latestEndedSession(guildId) {
    return this.db.prepare("SELECT * FROM sessions WHERE guild_id=? AND status='ended' ORDER BY session_number DESC LIMIT 1").get(guildId);
  }

  listVisibleActiveThreads(guildId,userId) {
    return this.db.prepare(`
      SELECT * FROM threads WHERE guild_id=? AND status='active'
        AND (visibility IN ('public','party') OR (visibility='player' AND subject_user_id=?))
      ORDER BY updated_at DESC
    `).all(guildId,userId);
  }

  listPublicPartyThreads(guildId) {
    return this.db.prepare("SELECT * FROM threads WHERE guild_id=? AND visibility IN ('public','party') ORDER BY updated_at DESC").all(guildId);
  }

  findRelationship(guildId,{fromType,fromKey,toType,toKey,relationshipType="other"}) {
    return this.db.prepare(`SELECT * FROM relationships WHERE guild_id=? AND from_type=? AND from_key=? AND to_type=? AND to_key=? AND relationship_type=?`)
      .get(guildId,fromType,fromKey,toType,toKey,relationshipType);
  }

  findCanonProposalByCharacterValue(characterId,key,value) {
    return this.db.prepare("SELECT * FROM canon_proposals WHERE character_id=? AND canon_key=? AND proposed_value=?").get(characterId,key,value);
  }

  listSessionPublicHandouts(guildId,sessionId) {
    return this.db.prepare("SELECT id,title,kind,authority,case_key,npc_key,location_key FROM handouts WHERE guild_id=? AND session_id=? AND status='active' AND visibility IN ('public','party') ORDER BY created_at").all(guildId,sessionId);
  }

  getClock(guildId,key){ return this.db.prepare("SELECT * FROM clocks WHERE guild_id=? AND clock_key=?").get(guildId,key); }

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

  changeClock(guildId,key,delta,{label=null,visibility="gm",subjectUserId=null,subjectCharacterId=null,max=6}={}) {
    const current=this.db.prepare("SELECT * FROM clocks WHERE guild_id=? AND clock_key=?").get(guildId,key);
    if(!current){
      const v=Math.max(0,Math.min(max,delta));
      this.db.prepare(`
        INSERT INTO clocks(guild_id,clock_key,label,value,max_value,visibility,subject_user_id,subject_character_id)
        VALUES(?,?,?,?,?,?,?,?)
      `).run(guildId,key,label??key,v,max,visibility,subjectUserId,subjectCharacterId);
      return v;
    }
    const v=Math.max(0,Math.min(current.max_value,current.value+delta));
    this.db.prepare(`
      UPDATE clocks SET value=?,label=COALESCE(?,label),visibility=?,subject_user_id=?,subject_character_id=?,updated_at=CURRENT_TIMESTAMP
      WHERE guild_id=? AND clock_key=?
    `).run(v,label,visibility,subjectUserId,subjectCharacterId,guildId,key);
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
      ON CONFLICT(guild_id,id) DO UPDATE SET label=excluded.label,status=excluded.status,
        visibility=excluded.visibility,subject_user_id=excluded.subject_user_id,
        subject_character_id=excluded.subject_character_id,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP
    `).run(id,guildId,label,status,visibility,subjectUserId,subjectCharacterId,notes);
    return this.getThread(guildId,id);
  }

  getThread(guildId,id){ return this.db.prepare("SELECT * FROM threads WHERE guild_id=? AND id=?").get(guildId,id); }

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

  // v3.8 NPC cognition -------------------------------------------------------
  upsertNpcProfile(guildId,{npcKey,displayName,role="",publicIdentity="",portrayal="",activityTier="background",decisionProfile={},knowledgeBoundaries=[],capabilities=[],source="gm"}={}){
    const key=String(npcKey||"").trim().toLowerCase();
    if(!key) throw new Error("NPC profile requires npcKey.");
    const name=String(displayName||npcKey||"").trim();
    if(!name) throw new Error("NPC profile requires displayName.");
    this.db.prepare(`INSERT INTO npc_profiles(guild_id,npc_key,display_name,role,public_identity,portrayal,activity_tier,decision_profile_json,knowledge_boundaries_json,capabilities_json,source)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,npc_key) DO UPDATE SET display_name=excluded.display_name,role=excluded.role,public_identity=excluded.public_identity,portrayal=excluded.portrayal,activity_tier=excluded.activity_tier,decision_profile_json=excluded.decision_profile_json,knowledge_boundaries_json=excluded.knowledge_boundaries_json,capabilities_json=excluded.capabilities_json,source=excluded.source,updated_at=CURRENT_TIMESTAMP`)
      .run(guildId,key,name,String(role||""),String(publicIdentity||""),String(portrayal||""),activityTier,JSON.stringify(decisionProfile||{}),JSON.stringify(knowledgeBoundaries||[]),JSON.stringify(capabilities||[]),String(source||"gm"));
    return this.getNpcProfile(guildId,key);
  }

  getNpcProfile(guildId,npcKey){
    const r=this.db.prepare("SELECT * FROM npc_profiles WHERE guild_id=? AND npc_key=?").get(guildId,String(npcKey||"").trim().toLowerCase());
    return r?{...r,decision_profile:JSON.parse(r.decision_profile_json||"{}"),knowledge_boundaries:JSON.parse(r.knowledge_boundaries_json||"[]"),capabilities:JSON.parse(r.capabilities_json||"[]")} : null;
  }

  findNpcProfile(guildId,query){
    const q=String(query||"").trim().toLowerCase(); if(!q) return null;
    const rows=this.listNpcProfiles(guildId);
    return rows.find(x=>x.npc_key===q||x.display_name.toLowerCase()===q)
      ||rows.find(x=>x.npc_key.startsWith(q)||x.display_name.toLowerCase().includes(q))||null;
  }

  listNpcProfiles(guildId,{activityTier="",limit=200}={}){
    const cap=Math.max(1,Math.min(500,Number(limit)||200));
    const rows=this.db.prepare(`SELECT * FROM npc_profiles WHERE guild_id=? AND (?='' OR activity_tier=?) ORDER BY display_name LIMIT ?`).all(guildId,activityTier,activityTier,cap);
    return rows.map(r=>({...r,decision_profile:JSON.parse(r.decision_profile_json||"{}"),knowledge_boundaries:JSON.parse(r.knowledge_boundaries_json||"[]"),capabilities:JSON.parse(r.capabilities_json||"[]")}));
  }

  addNpcMemory(guildId,{npcKey,memoryType="episodic",content,subjectType="entity",subjectKey="",sentiment=0,importance=50,confidence=100,sourceType="observed",sourceRef="",tags=[],status="active",dedupe=true}={}){
    const key=String(npcKey||"").trim().toLowerCase(); const text=String(content||"").trim();
    if(!key||!text) throw new Error("NPC memory requires npcKey and content.");
    if(!this.getNpcProfile(guildId,key)) throw new Error(`NPC profile not found: ${key}.`);
    if(dedupe){
      const existing=this.db.prepare(`SELECT id FROM npc_memories WHERE guild_id=? AND npc_key=? AND status='active' AND memory_type=? AND content=? AND subject_type=? AND subject_key=? ORDER BY created_at DESC LIMIT 1`).get(guildId,key,memoryType,text,subjectType,String(subjectKey||""));
      if(existing) return this.getNpcMemory(existing.id);
    }
    const id=randomUUID();
    this.db.prepare(`INSERT INTO npc_memories(id,guild_id,npc_key,memory_type,content,subject_type,subject_key,sentiment,importance,confidence,source_type,source_ref,tags_json,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,guildId,key,memoryType,text,subjectType,String(subjectKey||""),Math.max(-5,Math.min(5,Number(sentiment)||0)),Math.max(0,Math.min(100,Number(importance)||0)),Math.max(0,Math.min(100,Number(confidence)||0)),String(sourceType||"observed"),String(sourceRef||""),JSON.stringify(tags||[]),status);
    return this.getNpcMemory(id);
  }

  getNpcMemory(id){
    const r=this.db.prepare("SELECT * FROM npc_memories WHERE id=?").get(id);
    return r?{...r,tags:JSON.parse(r.tags_json||"[]")}:null;
  }

  npcMemoryCorrections(guildId,npcKey,id){
    return this.db.prepare(`SELECT * FROM npc_memories WHERE guild_id=? AND npc_key=? AND status IN ('active','challenged')
      AND EXISTS (SELECT 1 FROM json_each(tags_json) WHERE value=?) ORDER BY created_at DESC,id LIMIT 20`)
      .all(guildId,npcKey,`corrects:${id}`).map(row=>({...row,tags:JSON.parse(row.tags_json||"[]")}));
  }

  listNpcMemories(guildId,npcKey,{status="",limit=100,queryTokens=[]}={}){
    const cap=Math.max(1,Math.min(500,Number(limit)||100));
    const wanted=[...new Set(queryTokens.map(String))].slice(0,20);
    const relevance=wanted.length?wanted.map(()=>"CASE WHEN instr(lower(content||' '||subject_key||' '||tags_json),?)>0 THEN 1 ELSE 0 END").join("+"):"0.0";
    return this.db.prepare(`SELECT * FROM npc_memories WHERE guild_id=? AND npc_key=?
      AND (?='' OR status=? OR (?='retrievable' AND status IN ('active','challenged')))
      ORDER BY (${relevance}) DESC,importance DESC,created_at DESC LIMIT ?`)
      .all(guildId,String(npcKey||"").toLowerCase(),status,status,status,...wanted.map(token=>token.toLowerCase()),cap)
      .map(r=>({...r,tags:JSON.parse(r.tags_json||"[]")}));
  }

  markNpcMemoriesRecalled(ids=[]){
    const stmt=this.db.prepare("UPDATE npc_memories SET recall_count=recall_count+1,last_recalled_at=CURRENT_TIMESTAMP WHERE id=?");
    for(const id of [...new Set(ids.filter(Boolean))]) stmt.run(id);
  }

  upsertNpcKnowledge(guildId,{npcKey,knowledgeKey,content,beliefState="known",confidence=100,sourceType="observed",sourceRef="",isSecret=false}={}){
    const key=String(npcKey||"").trim().toLowerCase(); const kk=String(knowledgeKey||"").trim().toLowerCase(); const text=String(content||"").trim();
    if(!key||!kk||!text) throw new Error("NPC knowledge requires npcKey, knowledgeKey, and content.");
    if(!this.getNpcProfile(guildId,key)) throw new Error(`NPC profile not found: ${key}.`);
    this.db.prepare(`INSERT INTO npc_knowledge(guild_id,npc_key,knowledge_key,content,belief_state,confidence,source_type,source_ref,is_secret) VALUES(?,?,?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,npc_key,knowledge_key) DO UPDATE SET content=excluded.content,belief_state=excluded.belief_state,confidence=excluded.confidence,source_type=excluded.source_type,source_ref=excluded.source_ref,is_secret=excluded.is_secret,updated_at=CURRENT_TIMESTAMP`)
      .run(guildId,key,kk,text,beliefState,Math.max(0,Math.min(100,Number(confidence)||0)),String(sourceType||"observed"),String(sourceRef||""),isSecret?1:0);
    return this.db.prepare("SELECT * FROM npc_knowledge WHERE guild_id=? AND npc_key=? AND knowledge_key=?").get(guildId,key,kk);
  }

  listNpcKnowledge(guildId,npcKey,{beliefState="",limit=100,queryTokens=[]}={}){
    const cap=Math.max(1,Math.min(500,Number(limit)||100));
    const wanted=[...new Set(queryTokens.map(String))].slice(0,20);
    const relevance=wanted.length?wanted.map(()=>"CASE WHEN instr(lower(content||' '||knowledge_key),?)>0 THEN 1 ELSE 0 END").join("+"):"0.0";
    return this.db.prepare(`SELECT * FROM npc_knowledge WHERE guild_id=? AND npc_key=? AND (?='' OR belief_state=?)
      ORDER BY (${relevance}) DESC,updated_at DESC LIMIT ?`)
      .all(guildId,String(npcKey||"").toLowerCase(),beliefState,beliefState,...wanted.map(token=>token.toLowerCase()),cap);
  }

  getNpcKnowledge(guildId,npcKey,knowledgeKey){
    return this.db.prepare("SELECT * FROM npc_knowledge WHERE guild_id=? AND npc_key=? AND knowledge_key=?")
      .get(guildId,npcKey,String(knowledgeKey||"").trim().toLowerCase());
  }

  getNpcGoal(guildId,npcKey,goalKey){
    const row=this.db.prepare("SELECT * FROM npc_goals WHERE guild_id=? AND npc_key=? AND goal_key=?").get(guildId,npcKey,goalKey);
    const lifecycle=this.getCityRecord(guildId,"goal_state",JSON.stringify(["npc",npcKey,goalKey]));
    return row?{...row,status:lifecycle?.data.status||row.status,dependencies:JSON.parse(row.dependencies_json||"[]"),acceptable_methods:JSON.parse(row.acceptable_methods_json||"[]")}:null;
  }

  upsertNpcGoal(guildId,{npcKey,goalKey,title="",objective,horizon="near",priority=50,progress=0,status="active",dependencies=[],acceptableMethods=[],rationale="",source="gm"}={}){
    const key=String(npcKey||"").trim().toLowerCase(); const gk=String(goalKey||"").trim().toLowerCase(); const text=String(objective||"").trim();
    if(!key||!gk||!text) throw new Error("NPC goal requires npcKey, goalKey, and objective.");
    if(!this.getNpcProfile(guildId,key)) throw new Error(`NPC profile not found: ${key}.`);
    this.db.prepare(`INSERT INTO npc_goals(guild_id,npc_key,goal_key,title,objective,horizon,priority,progress,status,dependencies_json,acceptable_methods_json,rationale,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(guild_id,npc_key,goal_key) DO UPDATE SET title=excluded.title,objective=excluded.objective,horizon=excluded.horizon,priority=excluded.priority,progress=excluded.progress,status=excluded.status,dependencies_json=excluded.dependencies_json,acceptable_methods_json=excluded.acceptable_methods_json,rationale=excluded.rationale,source=excluded.source,updated_at=CURRENT_TIMESTAMP`)
      .run(guildId,key,gk,String(title||""),text,horizon,Math.max(0,Math.min(100,Number(priority)||0)),Math.max(0,Math.min(100,Number(progress)||0)),status,JSON.stringify(dependencies||[]),JSON.stringify(acceptableMethods||[]),String(rationale||""),String(source||"gm"));
    const lifecycle=this.getCityRecord(guildId,"goal_state",JSON.stringify(["npc",key,gk]));
    if(lifecycle) this.saveCityRecord(guildId,{...lifecycle,key:lifecycle.record_key,data:{...lifecycle.data,status}});
    const r=this.db.prepare("SELECT * FROM npc_goals WHERE guild_id=? AND npc_key=? AND goal_key=?").get(guildId,key,gk);
    return {...r,dependencies:JSON.parse(r.dependencies_json||"[]"),acceptable_methods:JSON.parse(r.acceptable_methods_json||"[]")};
  }

  listNpcGoals(guildId,npcKey,{status="",limit=50}={}){
    const cap=Math.max(1,Math.min(200,Number(limit)||50));
    return this.db.prepare(`SELECT g.*,COALESCE(json_extract(s.data_json,'$.status'),g.status) AS status FROM npc_goals g
      LEFT JOIN city_records s ON s.guild_id=g.guild_id AND s.kind='goal_state' AND s.record_key=json_array('npc',g.npc_key,g.goal_key)
      WHERE g.guild_id=? AND g.npc_key=? AND (?='' OR COALESCE(json_extract(s.data_json,'$.status'),g.status)=?)
      ORDER BY g.priority DESC,g.updated_at DESC LIMIT ?`).all(guildId,String(npcKey||"").toLowerCase(),status,status,cap)
      .map(r=>({...r,dependencies:JSON.parse(r.dependencies_json||"[]"),acceptable_methods:JSON.parse(r.acceptable_methods_json||"[]")}));
  }

  getSeedRun(guildId,seedKey){
    const r=this.db.prepare("SELECT * FROM seed_runs WHERE guild_id=? AND seed_key=?").get(guildId,seedKey);
    return r?{...r,summary:JSON.parse(r.summary_json||"{}")} : null;
  }

  recordSeedRun(guildId,seedKey,{actorId=null,summary={}}={}){
    this.db.prepare("INSERT INTO seed_runs(guild_id,seed_key,actor_id,summary_json) VALUES(?,?,?,?)").run(guildId,seedKey,actorId,JSON.stringify(summary||{}));
    return this.getSeedRun(guildId,seedKey);
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

  getSavedRoll(guildId,id){
    const row=this.db.prepare("SELECT * FROM rolls WHERE guild_id=? AND id=?").get(guildId,id);
    return row?{...row,payload:JSON.parse(row.payload_json)}:null;
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

  // Relationship graph persistence.
  relationshipEntityKey(type,labelOrKey){
    const raw=String(labelOrKey||"").trim();
    const slug=raw.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"unknown";
    return `${type}:${slug}`;
  }

  upsertRelationship(guildId,{fromType,fromKey,fromLabel="",toType,toKey,toLabel="",relationshipType="contact",score=0,visibility="party",note="",source="gm",sourceCharacterId=null}={}){
    return this.transaction(()=>{
    const allowedType=new Set(["character","npc","faction","location","entity","obligation"]);
    const allowedRel=new Set(["trust","debt","fear","hostility","affection","respect","authority","obligation","family","ally","rival","contact","important_person","home","suspicion","protective","other"]);
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
    const row=this.getRelationship(id);
    updateRelationshipDimensions(this,guildId,row);
    return row;
    });
  }

  getRelationship(id){ return this.db.prepare("SELECT * FROM relationships WHERE id=?").get(id); }
  listRelationships(guildId,{includeGM=false,characterId=null,userId=null}={}){
    const rows=this.db.prepare("SELECT * FROM relationships WHERE guild_id=? ORDER BY updated_at DESC").all(guildId);
    return rows.filter(r=>includeGM||["public","party"].includes(r.visibility)||(r.visibility==="character"&&characterId&&(r.from_key===characterId||r.to_key===characterId||r.source_character_id===characterId))||(r.visibility==="player"&&userId&&r.note.includes(`player:${userId}`)));
  }
  adjustRelationship(id,delta){
    const r=this.getRelationship(id); if(!r) throw new Error("Relationship not found.");
    const score=Math.max(-5,Math.min(5,Number(r.score||0)+(Number(delta)||0)));
    return this.upsertRelationship(r.guild_id,{fromType:r.from_type,fromKey:r.from_key,fromLabel:r.from_label,
      toType:r.to_type,toKey:r.to_key,toLabel:r.to_label,relationshipType:r.relationship_type,score,
      visibility:r.visibility,note:r.note,source:r.source,sourceCharacterId:r.source_character_id});
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

  // Player-safe character-concept context persistence.
  recentSessions(guildId,{limit=10}={}){
    return this.db.prepare(`SELECT * FROM sessions WHERE guild_id=? AND status='ended' ORDER BY session_number DESC LIMIT ?`).all(guildId,Math.max(1,Math.min(25,Number(limit)||10))).reverse();
  }
  recentPartyMessages(guildId,{limit=40}={}){
    return this.db.prepare(`SELECT * FROM (SELECT * FROM messages WHERE guild_id=? AND visibility IN ('public','party') ORDER BY id DESC LIMIT ?) ORDER BY id ASC`).all(guildId,Math.max(1,Math.min(100,Number(limit)||40)));
  }
  playerSafeThreads(guildId,{limit=120}={}){
    return this.db.prepare(`SELECT * FROM threads WHERE guild_id=? AND visibility IN ('public','party') ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'dormant' THEN 1 ELSE 2 END,updated_at DESC LIMIT ?`).all(guildId,Math.max(1,Math.min(250,Number(limit)||120)));
  }
  playerSafeFacts(guildId,{limit=160}={}){
    return this.db.prepare(`SELECT * FROM facts WHERE guild_id=? AND visibility IN ('public','party') ORDER BY created_at DESC LIMIT ?`).all(guildId,Math.max(1,Math.min(300,Number(limit)||160)));
  }
  playerSafeClocks(guildId){
    return this.db.prepare(`SELECT * FROM clocks WHERE guild_id=? AND visibility IN ('public','party') ORDER BY clock_key`).all(guildId);
  }
  playerSafeDowntime(guildId){
    const cycle=this.db.prepare(`SELECT * FROM downtime_cycles WHERE guild_id=? AND status IN ('open','resolving','resolved') ORDER BY opened_at DESC LIMIT 1`).get(guildId);
    if(!cycle) return {cycle:null,projects:[]};
    const projects=this.db.prepare(`SELECT * FROM downtime_projects WHERE cycle_id=? AND visibility IN ('public','party') ORDER BY created_at`).all(cycle.id);
    return {cycle,projects};
  }

  // Imported GM-only character concept hooks.
  upsertCharacterGmHook(guildId,characterId,hook,{source="external_character_creator"}={}){
    const c=this.getCharacter(characterId); if(!c||c.guild_id!==guildId) throw new Error("Character not found for GM hook import.");
    const key=String(hook?.key||hook?.title||randomUUID()).trim().toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||randomUUID();
    const existing=this.db.prepare(`SELECT * FROM character_gm_hooks WHERE character_id=? AND hook_key=?`).get(characterId,key);
    const id=existing?.id||randomUUID();
    const title=String(hook?.title||key).trim();
    const type=String(hook?.type||"other").trim();
    const premise=String(hook?.premise||"").trim();
    const permission=String(hook?.permission||"open_question").trim();
    const suggestedEntry=String(hook?.suggested_entry||"").trim();
    this.db.prepare(`INSERT INTO character_gm_hooks(id,guild_id,character_id,hook_key,title,hook_type,premise,permission,suggested_entry,payload_json,source)
      VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(character_id,hook_key) DO UPDATE SET title=excluded.title,hook_type=excluded.hook_type,premise=excluded.premise,permission=excluded.permission,suggested_entry=excluded.suggested_entry,payload_json=excluded.payload_json,source=excluded.source,status='active',updated_at=CURRENT_TIMESTAMP`)
      .run(id,guildId,characterId,key,title,type,premise,permission,suggestedEntry,JSON.stringify(hook||{}),source);
    return this.getCharacterGmHook(id);
  }
  getCharacterGmHook(id){ const r=this.db.prepare(`SELECT * FROM character_gm_hooks WHERE id=?`).get(id); return r?{...r,payload:JSON.parse(r.payload_json||"{}")} : null; }
  listCharacterGmHooks(guildId,characterId,{includeResolved=false,includeCanonSuggestions=false}={}){
    const where=[`guild_id=?`,`character_id=?`];
    if(!includeResolved) where.push(`status='active'`);
    if(!includeCanonSuggestions) where.push(`hook_type!='canon_suggestion'`);
    const sql=`SELECT * FROM character_gm_hooks WHERE ${where.join(" AND ")} ORDER BY updated_at DESC`;
    return this.db.prepare(sql).all(guildId,characterId).map(r=>({...r,payload:JSON.parse(r.payload_json||"{}")}));
  }


  upsertCanonProposal(guildId,characterId,hookId,suggestion,{source="external_character_creator",proposedByUserId=null,proposedByCharacterId=null,sessionId=null,channelId=null,messageId=null}={}){
    const c=this.getCharacter(characterId); if(!c||c.guild_id!==guildId) throw new Error("Character not found for canon proposal.");
    const key=String(suggestion?.key||"").trim().toLowerCase();
    const value=String(suggestion?.value||"").trim();
    if(!key||!value) throw new Error("Canon proposal requires key and value.");
    const vis=["public","party","gm"].includes(String(suggestion?.visibility||"").toLowerCase())?String(suggestion.visibility).toLowerCase():"gm";
    const existing=this.db.prepare(`SELECT * FROM canon_proposals WHERE character_id=? AND canon_key=? AND proposed_value=?`).get(characterId,key,value);
    if(existing){
      if(source==="player_private_scene" && (!existing.proposed_by_user_id||!existing.source_message_id)){
        this.db.prepare(`UPDATE canon_proposals SET proposed_by_user_id=COALESCE(proposed_by_user_id,?),proposed_by_character_id=COALESCE(proposed_by_character_id,?),source_session_id=COALESCE(source_session_id,?),source_channel_id=COALESCE(source_channel_id,?),source_message_id=COALESCE(source_message_id,?),updated_at=CURRENT_TIMESTAMP WHERE id=?`)
          .run(proposedByUserId||null,proposedByCharacterId||characterId||null,sessionId||null,channelId||null,messageId||null,existing.id);
      }
      return this.db.prepare(`SELECT * FROM canon_proposals WHERE id=?`).get(existing.id);
    }
    const id=randomUUID();
    this.db.prepare(`INSERT INTO canon_proposals(id,guild_id,character_id,hook_id,canon_key,proposed_value,proposed_visibility,reason,source,proposed_by_user_id,proposed_by_character_id,source_session_id,source_channel_id,source_message_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,guildId,characterId,hookId||null,key,value,vis,String(suggestion?.reason||"").trim(),source,proposedByUserId||null,proposedByCharacterId||characterId||null,sessionId||null,channelId||null,messageId||null);
    return this.db.prepare(`SELECT * FROM canon_proposals WHERE id=?`).get(id);
  }

  backfillLegacyCanonProposals(guildId){
    const hooks=this.db.prepare(`SELECT * FROM character_gm_hooks WHERE guild_id=? AND hook_type='canon_suggestion' ORDER BY created_at`).all(guildId);
    let created=0;
    for(const h of hooks){
      let payload={}; try{payload=JSON.parse(h.payload_json||"{}");}catch{ /* Legacy malformed hook JSON is treated as an empty payload. */ }
      const nested=payload?.canon_suggestion&&typeof payload.canon_suggestion==="object"?payload.canon_suggestion:{};
      const key=String(nested.key||h.hook_key.replace(/^canon\./,"")).trim();
      const value=String(nested.value||h.premise||"").trim();
      if(!key||!value) continue;
      const before=this.db.prepare(`SELECT id FROM canon_proposals WHERE character_id=? AND canon_key=? AND proposed_value=?`).get(h.character_id,key.toLowerCase(),value);
      const row=this.upsertCanonProposal(guildId,h.character_id,h.id,{key,value,visibility:nested.visibility||"gm",reason:nested.reason||payload.notes||""},{source:h.source||"external_character_creator"});
      if(!before&&row){
        const current=this.currentCanon(guildId,key.toLowerCase());
        if(current&&current.value.trim()===value){
          this.db.prepare(`UPDATE canon_proposals SET status='accepted',canon_event_id=?,resolution_value=?,resolution_note='Backfilled from v3.3.1; matching canon already existed.',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(current.id,current.value,row.id);
        }else if(h.status==='discarded'){
          this.db.prepare(`UPDATE canon_proposals SET status='rejected',resolution_note='Backfilled from a discarded v3.3.1 canon-suggestion hook.',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(row.id);
        }
        created++;
      }
    }
    return created;
  }

  listCanonProposals(guildId,{status="actionable",characterId=null,limit=25}={}){
    this.backfillLegacyCanonProposals(guildId);
    const allowed=new Set(["pending","accepted","rejected","conflict","all","actionable"]); if(!allowed.has(status)) status="actionable";
    const where=["cp.guild_id=?"]; const args=[guildId];
    if(status==="actionable") where.push(`cp.status IN ('pending','conflict')`); else if(status!=="all"){where.push("cp.status=?");args.push(status);}
    if(characterId){where.push("cp.character_id=?");args.push(characterId);}
    args.push(Math.max(1,Math.min(100,Number(limit)||25)));
    return this.db.prepare(`SELECT cp.*,c.name character_name,p.display_name proposer_display_name,ce.value current_value FROM canon_proposals cp JOIN characters c ON c.id=cp.character_id LEFT JOIN players p ON p.guild_id=cp.guild_id AND p.discord_user_id=cp.proposed_by_user_id LEFT JOIN canon_events ce ON ce.guild_id=cp.guild_id AND ce.canon_key=cp.canon_key AND ce.status='current' WHERE ${where.join(" AND ")} ORDER BY CASE cp.status WHEN 'conflict' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,cp.created_at DESC LIMIT ?`).all(...args);
  }

  getCanonProposal(guildId,id){
    this.backfillLegacyCanonProposals(guildId);
    return this.db.prepare(`SELECT cp.*,c.name character_name,p.display_name proposer_display_name,ce.value current_value FROM canon_proposals cp JOIN characters c ON c.id=cp.character_id LEFT JOIN players p ON p.guild_id=cp.guild_id AND p.discord_user_id=cp.proposed_by_user_id LEFT JOIN canon_events ce ON ce.guild_id=cp.guild_id AND ce.canon_key=cp.canon_key AND ce.status='current' WHERE cp.guild_id=? AND cp.id=?`).get(guildId,id);
  }

  updateCanonProposalHook(proposal,status,{resolutionValue="",conflictId=null,eventId=null,note="",actorId=null}={}){
    if(!proposal?.hook_id) return;
    const h=this.db.prepare(`SELECT * FROM character_gm_hooks WHERE id=?`).get(proposal.hook_id); if(!h) return;
    let payload={}; try{payload=JSON.parse(h.payload_json||"{}");}catch{ /* Legacy malformed hook JSON is treated as an empty payload. */ }
    const nested=payload?.canon_suggestion&&typeof payload.canon_suggestion==="object"?payload.canon_suggestion:{};
    const sameKey=String(nested.key||h.hook_key.replace(/^canon\./,"")).trim().toLowerCase()===proposal.canon_key;
    const sameValue=String(nested.value||h.premise||"").trim()===proposal.proposed_value;
    if(!sameKey||!sameValue) return;
    payload.proposal_status=status;
    payload.proposal_id=proposal.id;
    payload.canon_conflict_id=conflictId||null;
    payload.canon_event_id=eventId||null;
    payload.resolution_value=resolutionValue||"";
    payload.resolution_note=note||"";
    payload.resolved_by=actorId||null;
    const hookStatus=status==="accepted"?"resolved":status==="rejected"?"discarded":"active";
    this.db.prepare(`UPDATE character_gm_hooks SET status=?,payload_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(hookStatus,JSON.stringify(payload),h.id);
  }

  setCanonProposalState(guildId,proposalId,status,{resolutionValue="",conflictId=null,eventId=null,note="",actorId=null}={}){
    const proposal=this.db.prepare(`SELECT * FROM canon_proposals WHERE guild_id=? AND id=?`).get(guildId,proposalId); if(!proposal) throw new Error("Canon proposal not found.");
    const resolved=status==="accepted"||status==="rejected";
    this.db.prepare(`UPDATE canon_proposals SET status=?,canon_event_id=?,canon_conflict_id=?,resolution_value=?,resolution_note=?,resolved_by=?,resolved_at=${resolved?"CURRENT_TIMESTAMP":"NULL"},updated_at=CURRENT_TIMESTAMP WHERE id=? AND guild_id=?`)
      .run(status,eventId||null,conflictId||null,String(resolutionValue||""),String(note||""),actorId||null,proposalId,guildId);
    const updated=this.getCanonProposal(guildId,proposalId);
    this.updateCanonProposalHook(updated,status,{resolutionValue,conflictId,eventId,note,actorId});
    return updated;
  }

  resolveCanonProposal(guildId,id,{resolution="accept",customValue="",visibility=null,actorId=null,note=""}={}){
    const proposal=this.getCanonProposal(guildId,id); if(!proposal) throw new Error("Canon proposal not found.");
    if(["accepted","rejected"].includes(proposal.status)) throw new Error(`Canon proposal is already ${proposal.status}.`);
    if(!["accept","reject","custom"].includes(resolution)) throw new Error("Invalid canon proposal resolution.");
    if(resolution==="custom"&&!String(customValue||"").trim()) throw new Error("A custom proposal resolution requires a value.");

    // A proposal already linked to a pending canon conflict is resolved through that conflict,
    // keeping proposal and ledger status synchronized even when /vc-canon resolve is used later.
    if(proposal.status==="conflict"&&proposal.canon_conflict_id){
      const conflict=this.db.prepare(`SELECT * FROM canon_conflicts WHERE id=? AND guild_id=? AND status='pending'`).get(proposal.canon_conflict_id,guildId);
      if(!conflict) throw new Error("The proposal's canon conflict is no longer pending; refresh /vc-canon proposals.");
      const vis=["public","party","gm"].includes(String(visibility||"").toLowerCase())?String(visibility).toLowerCase():null;
      if(vis) this.db.prepare(`UPDATE canon_conflicts SET proposed_visibility=? WHERE id=?`).run(vis,conflict.id);
      const mode=resolution==="reject"?"existing":resolution==="custom"?"custom":"proposed";
      const event=this.resolveCanonConflict(guildId,conflict.id,{resolution:mode,customValue:customValue||"",actorId});
      return {status:this.getCanonProposal(guildId,id).status,proposal:this.getCanonProposal(guildId,id),event,conflict:null};
    }

    if(resolution==="reject"){
      const updated=this.setCanonProposalState(guildId,id,"rejected",{resolutionValue:proposal.current_value||"",note,actorId});
      return {status:"rejected",proposal:updated,event:null,conflict:null};
    }
    const value=resolution==="custom"?String(customValue).trim():proposal.proposed_value;
    const vis=["public","party","gm"].includes(String(visibility||"").toLowerCase())?String(visibility).toLowerCase():proposal.proposed_visibility;
    const r=this.proposeCanon(guildId,{key:proposal.canon_key,value,visibility:vis,sessionId:null,sourceType:"canon_proposal",sourceId:proposal.id,provenance:`Canon proposal ${proposal.id} for ${proposal.character_name}${note?`: ${note}`:""}`});
    if(r.status==="conflict"){
      const updated=this.setCanonProposalState(guildId,id,"conflict",{conflictId:r.conflict.id,note,actorId});
      return {status:"conflict",proposal:updated,event:null,conflict:r.conflict,existing:r.existing};
    }
    const updated=this.setCanonProposalState(guildId,id,"accepted",{resolutionValue:r.event?.value||value,eventId:r.event?.id||null,note,actorId});
    return {status:"accepted",proposal:updated,event:r.event,conflict:null,unchanged:r.status==="unchanged"};
  }
  importCharacterGmHooks(guildId,character,packet){
    if(!character||character.guild_id!==guildId) throw new Error("Campaign character not found.");
    if(!packet||typeof packet!=="object") throw new Error("GM hook package must be a JSON object.");
    const hooks=Array.isArray(packet.hooks)?packet.hooks:[];
    const canonSuggestions=Array.isArray(packet.canon_suggestions)?packet.canon_suggestions:[];
    let imported=0,relationships=0;
    for(const h of hooks){
      this.upsertCharacterGmHook(guildId,character.id,h); imported++;
      for(const t of Array.isArray(h.targets)?h.targets:[]){
        const type=String(t.type||"entity");
        let key,label=String(t.label||t.key||"").trim(); if(!label) continue;
        if(type==="character"){
          const other=this.findGuildCharacter(guildId,label,{includeClosed:true}); if(!other) continue; key=other.id; label=other.name;
        }else key=String(t.key||this.relationshipEntityKey(type,label));
        this.upsertRelationship(guildId,{fromType:"character",fromKey:character.id,fromLabel:character.name,toType:type,toKey:key,toLabel:label,relationshipType:t.relationship_type||"contact",score:Number(t.score)||0,visibility:"gm",note:String(t.note||h.premise||"Imported GM-only concept hook."),source:"external_character_creator",sourceCharacterId:character.id});
        relationships++;
      }
    }
    for(const s of canonSuggestions){
      const key=String(s?.key||`canon-suggestion-${randomUUID()}`).trim();
      const hook=this.upsertCharacterGmHook(guildId,character.id,{key:`canon.${key}`,title:`Canon suggestion: ${key}`,type:"canon_suggestion",premise:String(s?.value||""),permission:"gm_review_required",suggested_entry:"",notes:String(s?.reason||""),canon_suggestion:s});
      if(String(s?.value||"").trim()) this.upsertCanonProposal(guildId,character.id,hook.id,{...s,key});
      imported++;
    }
    return {hooks:imported,relationships,canon_suggestions:canonSuggestions.length};
  }

  // Evidence and handout persistence.
  createHandout(guildId,{sessionId=null,title,kind="document",authority="canonical",visibility="party",subjectUserId=null,subjectCharacterId=null,content="",canonicalFacts=[],caseKey="",npcKey="",locationKey="",source="human_gm",metadata={}}={}){
    if(!String(title||"").trim()) throw new Error("Handout title is required.");
    const id=randomUUID();
    this.db.prepare(`INSERT INTO handouts(id,guild_id,session_id,title,kind,authority,visibility,subject_user_id,subject_character_id,content,canonical_facts_json,case_key,npc_key,location_key,source,metadata_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,guildId,sessionId,String(title).trim(),kind,authority,visibility,subjectUserId,subjectCharacterId,String(content||""),JSON.stringify(canonicalFacts||[]),caseKey||"",npcKey||"",locationKey||"",source,JSON.stringify(metadata||{}));
    return this.getHandout(id);
  }
  getHandout(id){ const r=this.db.prepare("SELECT * FROM handouts WHERE id=?").get(id); return r?{...r,canonical_facts:JSON.parse(r.canonical_facts_json||"[]"),metadata:JSON.parse(r.metadata_json||"{}")} : null; }
  findHandout(guildId,query){ const rows=this.db.prepare("SELECT * FROM handouts WHERE guild_id=? AND status='active' ORDER BY created_at DESC").all(guildId); const q=String(query||"").trim().toLowerCase(); const r=rows.find(x=>x.id.toLowerCase().startsWith(q))||rows.find(x=>x.title.toLowerCase()===q)||rows.find(x=>x.title.toLowerCase().includes(q)); return r?this.getHandout(r.id):null; }
  listHandoutsFor(guildId,userId,{characterId=null,includeGM=false,limit=100,query=""}={}){
    return this.db.prepare(`SELECT id FROM handouts WHERE guild_id=? AND status='active'
      AND (?=1 OR visibility IN ('public','party') OR (visibility='player' AND subject_user_id=?) OR (visibility='character' AND subject_character_id=?))
      AND (?='' OR instr(lower(title||' '||content),lower(?))>0) ORDER BY created_at DESC,rowid DESC LIMIT ?`)
      .all(guildId,includeGM?1:0,userId,characterId,query,query,Math.max(1,Math.min(1000,limit))).map(row=>this.getHandout(row.id));
  }
  archiveHandout(id){ this.db.prepare("UPDATE handouts SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id); return this.getHandout(id); }
  setHandoutEvidence(guildId,id,evidence){
    const row=this.getHandout(id);if(row?.guild_id!==guildId) throw new Error("Evidence not available.");
    this.db.prepare("UPDATE handouts SET metadata_json=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND id=?")
      .run(JSON.stringify({...row.metadata,evidence}),guildId,id);return this.getHandout(id);
  }

  // Encounter-aftermath draft persistence.
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
    const directTables=["players","characters","sessions","facts","clocks","threads","reference_entries","published_messages","npc_proxies","encounters","encounter_combatants","character_drafts","levelup_drafts","canon_events","canon_conflicts","downtime_cycles","downtime_projects","rules_rulings","relationships","relationship_hook_imports","character_gm_hooks","canon_proposals","handouts","encounter_aftermath","character_narratives","npc_profiles","npc_memories","npc_knowledge","npc_goals","seed_runs"];
    const state={campaign:this.getCampaign(guildId),tables:{}};
    directTables.push("simulation_entities","simulation_records","simulation_clock","seed_documents","seed_catalog",
      "city_calendar","world_events","city_schedule","city_records","world_event_links","district_locations","city_edges");
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
    const delOrder=["encounter_aftermath","encounter_combatants","npc_proxies","session_characters","session_presence","levelup_drafts","downtime_projects","canon_conflicts","canon_events","relationships","relationship_hook_imports","canon_proposals","character_gm_hooks","character_narratives","npc_memories","npc_knowledge","npc_goals","npc_profiles","seed_runs","handouts","encounters","sessions","character_drafts","characters","players","facts","clocks","threads","reference_entries","published_messages","downtime_cycles","rules_rulings"];
    const insertOrder=["players","characters","sessions","session_presence","session_characters","facts","clocks","threads","reference_entries","published_messages","npc_proxies","encounters","encounter_combatants","character_drafts","levelup_drafts","canon_events","canon_conflicts","downtime_cycles","downtime_projects","rules_rulings","relationships","relationship_hook_imports","character_gm_hooks","canon_proposals","handouts","encounter_aftermath","character_narratives","npc_profiles","npc_memories","npc_knowledge","npc_goals","seed_runs"];
    delOrder.unshift("city_edges","district_locations","world_event_links","city_records","city_schedule","world_events","city_calendar",
      "seed_catalog","seed_documents","simulation_records","simulation_entities","simulation_clock");
    insertOrder.push("simulation_entities","simulation_records","simulation_clock","seed_documents","seed_catalog","city_calendar",
      "world_events","city_schedule","city_records","world_event_links","district_locations","city_edges");
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
    const canonVisibility=String(visibility||"party").toLowerCase();
    if(!["public","party","gm"].includes(canonVisibility)) throw new Error("Canon visibility must be public, party, or gm.");
    visibility=canonVisibility;
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
    const sql=includeGM?"SELECT * FROM canon_events WHERE guild_id=? AND status='current' ORDER BY canon_key LIMIT ?":"SELECT * FROM canon_events WHERE guild_id=? AND status='current' AND visibility IN ('public','party') ORDER BY canon_key LIMIT ?";
    return this.db.prepare(sql).all(guildId,limit);
  }

  listCanonConflicts(guildId){ return this.db.prepare("SELECT cc.*,ce.value existing_value FROM canon_conflicts cc LEFT JOIN canon_events ce ON ce.id=cc.existing_event_id WHERE cc.guild_id=? AND cc.status='pending' ORDER BY cc.created_at").all(guildId); }

  resolveCanonConflict(guildId,id,{resolution="existing",customValue="",actorId=null}={}){
    const c=this.db.prepare("SELECT * FROM canon_conflicts WHERE id=? AND guild_id=? AND status='pending'").get(id,guildId); if(!c) throw new Error("Pending canon conflict not found.");
    const existing=c.existing_event_id?this.db.prepare("SELECT * FROM canon_events WHERE id=?").get(c.existing_event_id):null;
    if(resolution==="existing"){
      this.db.prepare("UPDATE canon_conflicts SET status='resolved_existing',resolved_value=?,resolved_by=?,resolved_at=CURRENT_TIMESTAMP WHERE id=?").run(existing?.value||"",actorId,id);
      if(c.source_type==="canon_proposal"&&c.source_id){
        const p=this.db.prepare(`SELECT id FROM canon_proposals WHERE id=? AND guild_id=?`).get(c.source_id,guildId);
        if(p) this.setCanonProposalState(guildId,p.id,"rejected",{resolutionValue:existing?.value||"",conflictId:id,eventId:existing?.id||null,note:"Existing canon retained during conflict resolution.",actorId});
      }
      return existing;
    }
    const value=resolution==="custom"?String(customValue||"").trim():c.proposed_value;
    if(!value) throw new Error("A custom canon resolution requires a value.");
    if(existing) this.db.prepare("UPDATE canon_events SET status='superseded' WHERE id=?").run(existing.id);
    const eid=randomUUID();
    this.db.prepare(`INSERT INTO canon_events(id,guild_id,canon_key,value,visibility,session_id,source_type,source_id,provenance,supersedes_id) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(eid,guildId,c.canon_key,value,c.proposed_visibility,c.session_id,"human_gm",actorId,`Resolved canon conflict ${id}${c.source_type==="canon_proposal"?` from proposal ${c.source_id}`:""}`,existing?.id||null);
    this.db.prepare("UPDATE canon_conflicts SET status=?,resolved_value=?,resolved_by=?,resolved_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(resolution==="custom"?"resolved_custom":"resolved_proposed",value,actorId,id);
    const event=this.currentCanon(guildId,c.canon_key);
    if(c.source_type==="canon_proposal"&&c.source_id){
      const p=this.db.prepare(`SELECT id FROM canon_proposals WHERE id=? AND guild_id=?`).get(c.source_id,guildId);
      if(p) this.setCanonProposalState(guildId,p.id,"accepted",{resolutionValue:value,conflictId:id,eventId:event?.id||null,note:resolution==="custom"?"Accepted with GM-edited value during conflict resolution.":"Imported proposal accepted during conflict resolution.",actorId});
    }
    return event;
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
  getDowntimeProject(guildId,id){ return this.db.prepare("SELECT * FROM downtime_projects WHERE guild_id=? AND id=?").get(guildId,id)||null; }
  downtimeResultClaimed(guildId,id){
    return !!this.db.prepare(`SELECT 1 FROM city_records,json_each(city_records.data_json,'$.phases') p,json_each(p.value,'$.result_ids') j
      WHERE guild_id=? AND kind='long_project' AND j.type='text' AND j.value=? LIMIT 1`).get(guildId,id);
  }
  queuedActorActions(guildId,entity){
    return this.db.prepare(`SELECT * FROM simulation_records WHERE guild_id=? AND entity_key=? AND kind='action'
      AND status IN ('pending','deferred','scheduled','ready') ORDER BY rowid LIMIT 100`).all(guildId,entity)
      .map(row=>({...row,data:JSON.parse(row.data_json)}));
  }
  getCityIncomeProject(guildId,id){
    return this.db.prepare("SELECT * FROM downtime_projects WHERE guild_id=? AND id=? AND project_type='income'").get(guildId,id)||null;
  }
  cityNpcNameInUse(guildId,name){
    const normalized=normalizeNpcKey(name);
    return this.db.prepare("SELECT npc_key,display_name FROM npc_profiles WHERE guild_id=?").all(guildId)
      .some(row=>row.npc_key===normalized||normalizeNpcKey(row.display_name)===normalized);
  }

  worldDraftNameInUse(guildId,kind,name,key=""){
    if(kind==="npc"&&this.cityNpcNameInUse(guildId,name)) return true;
    const draft=this.db.prepare(`SELECT 1 FROM city_records WHERE guild_id=? AND kind='world_draft' AND status='draft' AND record_key<>?
      AND json_extract(data_json,'$.kind')=? AND lower(json_extract(data_json,'$.data.name'))=lower(?) LIMIT 1`).get(guildId,key,kind,name);
    const entity=this.db.prepare(`SELECT 1 FROM simulation_entities WHERE guild_id=? AND entity_type=?
      AND lower(json_extract(state_json,'$.name'))=lower(?) LIMIT 1`).get(guildId,kind,name);
    const civic=this.db.prepare(`SELECT 1 FROM city_records WHERE guild_id=? AND kind=?
      AND lower(json_extract(data_json,'$.name'))=lower(?) LIMIT 1`).get(guildId,kind,name);
    return !!(draft||entity||civic);
  }
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
  getRulesRuling(guildId,key){return this.db.prepare("SELECT * FROM rules_rulings WHERE guild_id=? AND ruling_key=? AND active=1").get(guildId,key)||null;}

  audit(guildId,sessionId,actorType,actorId,action,payload={}) {
    this.db.prepare(`
      INSERT INTO audit_log(guild_id,session_id,actor_type,actor_id,action,payload_json)
      VALUES(?,?,?,?,?,?)
    `).run(guildId,sessionId,actorType,actorId,action,JSON.stringify(payload));
  }
}
