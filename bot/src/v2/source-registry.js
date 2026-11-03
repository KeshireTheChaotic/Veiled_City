import {DatabaseSync} from 'node:sqlite';
/** Native-only immutable lookup identities/fingerprints, not disclosure grants. */
export function openSourceRegistry(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>r.name!=='vk2_source_registry'))throw new Error('Dedicated source registry required');
    db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk2_source_registry(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
  }catch(e){db.close();throw e;}
  function get(id){const row=db.prepare('SELECT data FROM vk2_source_registry WHERE id=?').get(id);return row?JSON.parse(row.data):null;}
  function put(id,entry){const serialized=JSON.stringify(entry);db.prepare('INSERT OR IGNORE INTO vk2_source_registry VALUES(?,?)').run(id,serialized);const prior=get(id);if(JSON.stringify(prior)!==serialized)throw new Error('Immutable native source registry conflict');return prior;}
  return Object.freeze({get,put,close:()=>db.close()});
}
