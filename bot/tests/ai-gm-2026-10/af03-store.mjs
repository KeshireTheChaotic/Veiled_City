// Fresh feature-local SQLite fake. No campaign files, Discord, providers or inherited fixtures.
import {DatabaseSync} from 'node:sqlite';
export function nativeStore(){
  const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key));CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT);CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT);CREATE TABLE campaign(fear INTEGER);INSERT INTO campaign VALUES(6)');
  let depth=0;
  const db={sql,
    transaction(fn){const d=++depth;sql.exec(d===1?'BEGIN IMMEDIATE':`SAVEPOINT t${d}`);try{const v=fn();sql.exec(d===1?'COMMIT':`RELEASE t${d}`);return v;}
      catch(e){sql.exec(d===1?'ROLLBACK':`ROLLBACK TO t${d}`);throw e;}finally{depth--;}}
    ,getCityRecord(g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key);return r?JSON.parse(r.body):null;},
    saveCityRecord(g,input){const {key,...rest}=input,row={...rest,record_key:key};sql.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,key) DO UPDATE SET body=excluded.body').run(input.kind,key,JSON.stringify(row));return row;},
    listCityRecords(g,{kind,status,offset=0,limit=100}){return sql.prepare('SELECT body FROM records WHERE kind=? ORDER BY key').all(kind).map(r=>JSON.parse(r.body)).filter(r=>!status||r.status===status).slice(offset,offset+limit);},
    getWorldEvent(g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key);return r?JSON.parse(r.body):null;},
    getMutation(g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?JSON.parse(r.body):null;},
    recordMutation(g,input){const id=Number(sql.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM mutations').get().n),row={id,actor_type:input.actorType,actor_id:input.actorId,
      source_layer:input.sourceLayer,mutation_type:input.mutationType,entity_key:input.entityKey,session_id:input.sessionId,visibility:input.visibility,
      before_json:JSON.stringify(input.before??null),after_json:JSON.stringify(input.after??null)};sql.prepare('INSERT INTO mutations VALUES(?,?)').run(id,JSON.stringify(row));return row;},
    getCampaign(){return sql.prepare('SELECT * FROM campaign').get();},
    changeFear(g,delta){sql.prepare('UPDATE campaign SET fear=fear+?').run(delta);return this.getCampaign(g).fear;},
    getCityCalendar(){return {flags:{gm_discretion:true,narrative_authority:true,playable_narration:true}};},
    getSimulationEntity(g,kind,key){return {state:{removed:false},entity_key:key};}
  };
  const indexWorldEvent=(db,g,input)=>{const {key,...rest}=input,row={...rest,event_key:key,status:'active'};
    sql.prepare('INSERT INTO events VALUES(?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body').run(key,JSON.stringify(row));return row;};
  return {db,indexWorldEvent,close:()=>sql.close()};
}
