import {DatabaseSync} from 'node:sqlite';
import {createLegacyGmExportReader} from './legacy-gm-export-readers.js';
/** Existing legacy rows for native identity and condition-ancestry validation.
 * Opens read-only, never creating/migrating tables or granting inference access.
 * Raw condition/event/ruling bodies are native validation input only.
 */
export function openLegacyReadOnlyRepository(filename){
  if(typeof filename!=='string'||!filename||filename===':memory:')throw new TypeError('Existing legacy database file required');
  const db=new DatabaseSync(filename,{readOnly:true});
  const character=db.prepare('SELECT * FROM characters WHERE id=?'),campaign=db.prepare('SELECT * FROM campaigns WHERE guild_id=?');
  const parse=row=>row?{...row,data:JSON.parse(row.character_json)}:null;
  let inSnapshot=false;
  const required=(...values)=>{if(values.some(v=>typeof v!=='string'||!v))throw new TypeError('Native legacy source identity required');};
  function encounter(row){
    if(!row)return null;
    if(!db.prepare('SELECT 1 FROM sessions WHERE guild_id=? AND id=?').get(row.guild_id,row.session_id))throw new Error('Legacy encounter session scope requires reconciliation');
    const value={...row,composition:JSON.parse(row.composition_json),adjustments:JSON.parse(row.adjustment_json),combat_state:JSON.parse(row.combat_state_json),pc_start_state:JSON.parse(row.pc_start_state_json)};
    if(![value.composition,value.adjustments,value.pc_start_state].every(Array.isArray)||!value.combat_state||typeof value.combat_state!=='object'||Array.isArray(value.combat_state))throw new Error('Explicit legacy encounter JSON requires reconciliation');
    return value;
  }
  return Object.freeze({
    readGmCharacterExportFacets:createLegacyGmExportReader(db),
    findExportCharacter(guildId,query){
      required(guildId,query);const rows=db.prepare('SELECT * FROM characters WHERE guild_id=? AND (id=? OR name=?) LIMIT 2').all(guildId,query,query);
      if(rows.length>1)throw new Error('One exact campaign character export selection required');return parse(rows[0]);
    },
    getCharacter:id=>parse(character.get(id)),
    getCampaign:guildId=>campaign.get(guildId)??null,
    getSession(guildId,sessionId){
      required(guildId,sessionId);return db.prepare('SELECT * FROM sessions WHERE guild_id=? AND id=?').get(guildId,sessionId)??null;
    },
    getActiveSession(guildId){
      required(guildId);return db.prepare("SELECT s.* FROM sessions s JOIN campaigns c ON c.active_session_id=s.id WHERE c.guild_id=? AND s.guild_id=? AND s.status='active'").get(guildId,guildId)??null;
    },
    getEncounter(guildId,encounterId){
      required(guildId,encounterId);return encounter(db.prepare('SELECT * FROM encounters WHERE guild_id=? AND id=?').get(guildId,encounterId));
    },
    getCurrentEncounter(guildId,sessionId){
      required(guildId,sessionId);
      const rows=db.prepare("SELECT * FROM encounters WHERE guild_id=? AND session_id=? AND status IN ('active','planned') ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END,encounter_number DESC LIMIT 2").all(guildId,sessionId);
      if(rows.length===2&&(rows.every(row=>row.status==='active')||rows.every(row=>row.status==='planned')&&rows[0].encounter_number===rows[1].encounter_number))throw new Error('Ambiguous active/planned legacy encounters require reconciliation');
      return encounter(rows[0]);
    },
    listCombatants(guildId,encounterId,{includeRemoved=false}={}){
      required(guildId,encounterId);if(typeof includeRemoved!=='boolean')throw new TypeError('Explicit native combatant status filter required');
      const owner=db.prepare('SELECT session_id FROM encounters WHERE guild_id=? AND id=?').get(guildId,encounterId);if(!owner)return [];
      if(!db.prepare('SELECT 1 FROM sessions WHERE guild_id=? AND id=?').get(guildId,owner.session_id)||db.prepare('SELECT 1 FROM encounter_combatants WHERE encounter_id=? AND guild_id<>? LIMIT 1').get(encounterId,guildId))throw new Error('Legacy combatant campaign/session scope requires reconciliation');
      const rows=db.prepare(`SELECT * FROM encounter_combatants WHERE guild_id=? AND encounter_id=?${includeRemoved?'':" AND status!='removed'"} ORDER BY base_name,instance_index,id LIMIT 257`).all(guildId,encounterId);
      if(rows.length>256||rows.some(row=>row.session_id!==owner.session_id))throw new Error('Complete legacy combatant window requires reconciliation');
      return rows.map(row=>{const conditions=JSON.parse(row.conditions_json);if(!Array.isArray(conditions))throw new Error('Explicit legacy combatant conditions required');return {...row,conditions};});
    },
    listCharacters(guildId,ownerUserId,{includeClosed=true}={}){
      const sql=`SELECT * FROM characters WHERE guild_id=? AND owner_user_id=?${includeClosed?'':" AND status IN ('active','reserve','guest')"} ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'reserve' THEN 1 WHEN 'guest' THEN 2 ELSE 3 END,name`;
      return db.prepare(sql).all(guildId,ownerUserId).map(parse);
    },
    playerFactsFor(guildId,ownerUserId,{characterId,limit=200}={}){
      required(guildId,ownerUserId,characterId);
      if(!Number.isSafeInteger(limit)||limit<1||limit>200||!db.prepare('SELECT 1 FROM characters WHERE guild_id=? AND owner_user_id=? AND id=?').get(guildId,ownerUserId,characterId))throw new Error('Owned character fact export scope required');
      return db.prepare("SELECT * FROM facts WHERE guild_id=? AND archived=0 AND (visibility IN ('public','party') OR visibility='player' AND subject_user_id=? OR visibility='character' AND subject_character_id=?) ORDER BY created_at DESC LIMIT ?").all(guildId,ownerUserId,characterId,limit);
    },
    playerExportRelationships(guildId,ownerUserId,characterId){
      required(guildId,ownerUserId,characterId);
      if(!db.prepare('SELECT 1 FROM characters WHERE guild_id=? AND owner_user_id=? AND id=?').get(guildId,ownerUserId,characterId))throw new Error('Owned character relationship export scope required');
      const rows=db.prepare("SELECT * FROM relationships WHERE guild_id=? AND (from_key=? OR to_key=? OR source_character_id=?) AND (visibility IN ('public','party','character') OR visibility='player' AND instr(note,?)>0) ORDER BY updated_at DESC,id LIMIT 10001").all(guildId,characterId,characterId,characterId,`player:${ownerUserId}`);
      if(rows.length>10000)throw new Error('Complete relationship export requires reconciliation');
      // Legacy player tags must match the whole account id, not a prefix of another id.
      return rows.filter(row=>{
        if(row.visibility==='player')return [...String(row.note).matchAll(/(?:^|[^A-Za-z0-9_])player:([A-Za-z0-9_-]+)/g)].some(match=>match[1]===ownerUserId);
        if(row.visibility!=='character')return true;
        if(row.source_character_id)return row.source_character_id===characterId;
        if(row.from_type==='character'&&row.from_key===characterId)return true;
        throw new Error('Private relationship recipient requires reconciliation');
      });
    },
    withValidationSnapshot(inspect){
      if(typeof inspect!=='function'||/Async|Generator/.test(inspect.constructor?.name??''))throw new TypeError('Synchronous materialized native validation required');
      if(inSnapshot)throw new Error('Nested legacy validation snapshot unsupported');
      inSnapshot=true;
      try{db.exec('BEGIN');const result=inspect();if(result&&typeof result.then==='function'){Promise.resolve(result).catch(()=>{});throw new TypeError('Synchronous materialized native validation required');}const saved=structuredClone(result);db.exec('COMMIT');return saved;}catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}finally{inSnapshot=false;}
    },
    getCityRecord(guildId,kind,key){
      required(guildId,kind,key);const row=db.prepare('SELECT * FROM city_records WHERE guild_id=? AND kind=? AND record_key=?').get(guildId,kind,key);
      return row?{...row,data:JSON.parse(row.data_json)}:null;
    },
    getWorldEvent(guildId,key){
      required(guildId,key);const row=db.prepare('SELECT * FROM world_events WHERE guild_id=? AND event_key=?').get(guildId,key);
      return row?{...row,details:JSON.parse(row.details_json)}:null;
    },
    getRulesRuling(guildId,key){
      required(guildId,key);return db.prepare('SELECT * FROM rules_rulings WHERE guild_id=? AND ruling_key=? AND active=1').get(guildId,key)??null;
    },
    getMutation(guildId,key){
      required(guildId);if(!(typeof key==='string'&&key||Number.isSafeInteger(key)))throw new TypeError('Native mutation identity required');
      return db.prepare('SELECT * FROM mutation_ledger WHERE guild_id=? AND id=?').get(guildId,key)??null;
    },
    ownerAuthoredSource(guildId,key,user){
      required(guildId,key,user);return !!db.prepare("SELECT 1 FROM mutation_ledger WHERE guild_id=? AND source_layer='city' AND mutation_type='world_event_index' AND entity_key=? AND actor_id=? LIMIT 1").get(guildId,key,user);
    },
    getSavedRoll(guildId,key){
      required(guildId);if(!(typeof key==='string'&&key||Number.isSafeInteger(key)))throw new TypeError('Native saved roll identity required');
      const row=db.prepare('SELECT * FROM rolls WHERE guild_id=? AND id=?').get(guildId,key);
      return row?{...row,payload:JSON.parse(row.payload_json)}:null;
    },
    readPcConditionRefs(guildId,actorId){
      required(guildId,actorId);
      // Include every status: an unproven clear/expiry must not hide a condition.
      // Missing tables, misindexed records and overflow are holds, never healthy defaults.
      const rows=db.prepare("SELECT record_key,actor_key,subject_key FROM city_records WHERE guild_id=? AND kind='pc_native_condition' AND (actor_key=? OR subject_key=?) ORDER BY record_key LIMIT 257").all(guildId,actorId,actorId);
      if(rows.length>256||rows.some(r=>r.actor_key!==actorId||r.subject_key!==actorId||typeof r.record_key!=='string'||!r.record_key||r.record_key.length>256)||new Set(rows.map(r=>r.record_key)).size!==rows.length)throw new Error('Complete native condition addressing/window requires reconciliation');
      return {complete:true,refs:rows.map(r=>r.record_key)};
    },
    close:()=>db.close()
  });
}
