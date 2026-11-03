import {DatabaseSync} from 'node:sqlite';
/** Native-only observed interaction envelopes; never expose token lookup to AI. */
export function openComponentDecisionStore(filename=':memory:'){
  const db=new DatabaseSync(filename);try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>r.name!=='vk3_component_decisions'))throw new Error('Dedicated component decision database required');db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk3_component_decisions(id TEXT PRIMARY KEY,data TEXT NOT NULL)');}catch(e){db.close();throw e;}
  const get=id=>{const row=db.prepare('SELECT data FROM vk3_component_decisions WHERE id=?').get(id);return row?JSON.parse(row.data):null;};
  function put(envelope){const id=envelope?.record?.interactionId;if(typeof id!=='string'||!id||typeof envelope.customId!=='string'||!envelope.customId)throw new Error('Native observed decision envelope required');const data=JSON.stringify(envelope);db.prepare('INSERT OR IGNORE INTO vk3_component_decisions VALUES(?,?)').run(id,data);if(JSON.stringify(get(id))!==data)throw new Error('Immutable observed decision conflict');return get(id);}
  return Object.freeze({get,put,sequenceFor(id){const row=db.prepare('SELECT rowid AS sequence FROM vk3_component_decisions WHERE id=?').get(id);return row?.sequence??null;},close:()=>db.close()});
}
