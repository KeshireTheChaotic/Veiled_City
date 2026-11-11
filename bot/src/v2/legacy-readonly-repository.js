import {DatabaseSync} from 'node:sqlite';
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
  return Object.freeze({
    getCharacter:id=>parse(character.get(id)),
    getCampaign:guildId=>campaign.get(guildId)??null,
    listCharacters(guildId,ownerUserId,{includeClosed=true}={}){
      const sql=`SELECT * FROM characters WHERE guild_id=? AND owner_user_id=?${includeClosed?'':" AND status IN ('active','reserve','guest')"} ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'reserve' THEN 1 WHEN 'guest' THEN 2 ELSE 3 END,name`;
      return db.prepare(sql).all(guildId,ownerUserId).map(parse);
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
