import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const decode=row=>row?JSON.parse(row.data):null;
const key=(h,i)=>String(h.key||h.title||`imported-${i}`).trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||`imported-${i}`;

/** Dedicated GM-private storage. Native code only; no audience or canon grant. */
export function openPrivateHookStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{
    const allowed=['vk2_hook_imports','vk2_hook_history','vk2_hook_heads','vk2_hook_canon'];
    if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>!allowed.includes(r.name)))throw new Error('Dedicated private hook database required');
    db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS vk2_hook_imports(campaign TEXT,source TEXT,data TEXT NOT NULL,PRIMARY KEY(campaign,source));
      CREATE TABLE IF NOT EXISTS vk2_hook_history(campaign TEXT,character TEXT,key TEXT,revision INTEGER,data TEXT NOT NULL,PRIMARY KEY(campaign,character,key,revision));
      CREATE TABLE IF NOT EXISTS vk2_hook_heads(campaign TEXT,character TEXT,key TEXT,revision INTEGER,PRIMARY KEY(campaign,character,key));
      CREATE TABLE IF NOT EXISTS vk2_hook_canon(campaign TEXT,character TEXT,id TEXT,data TEXT NOT NULL,PRIMARY KEY(campaign,character,id));`);
  }catch(error){db.close();throw error;}
  function commitImport(prepared,{check}){
    if(typeof check!=='function'||prepared.scope!=='hooks'||prepared.visibility!=='gm'||prepared.status!=='awaiting_native_validation'
      ||prepared.executionAuthority!==false||prepared.publicationAuthority!==false||prepared.canonAuthority!==false)throw new Error('Native private import preparation required');
    const input=JSON.parse(JSON.stringify(prepared)),fingerprint=hash(input),{campaignId:campaign,characterId:character,sourceRef:source}=input;
    if(![campaign,character,source,input.importedBy,input.sourceRevision].every(v=>typeof v==='string'&&v.length>0))throw new Error('Native import provenance required');
    db.exec('BEGIN IMMEDIATE');
    try{
      check();
      const prior=decode(db.prepare('SELECT data FROM vk2_hook_imports WHERE campaign=? AND source=?').get(campaign,source));
      if(prior){if(prior.fingerprint!==fingerprint)throw new Error('Import source replay conflict');check();db.exec('COMMIT');return prior;}
      const hooks=input.content.hooks,canon=input.content.canon_suggestions;
      if(!Array.isArray(hooks)||hooks.length>1000||!Array.isArray(canon)||canon.length>1000)throw new Error('Bounded normalized hook package required');
      const used=new Set();let proposals=0;
      for(const [i,h] of hooks.entries()){
        const hookKey=key(h,i);if(used.has(hookKey))throw new Error('Colliding normalized hook keys');used.add(hookKey);
        const previous=db.prepare('SELECT revision FROM vk2_hook_heads WHERE campaign=? AND character=? AND key=?').get(campaign,character,hookKey);
        const revision=(previous?.revision??0)+1;
        const row={id:`hook:${hash([campaign,character,hookKey])}`,guild_id:campaign,character_id:character,hook_key:hookKey,
          title:String(h.title||hookKey),hook_type:String(h.type||'other'),premise:String(h.premise||''),permission:String(h.permission||'open_question'),
          suggested_entry:String(h.suggested_entry||''),status:h.status||'active',visibility:'gm',payload:h,source:'external_character_creator',
          source_ref:source,source_revision:input.sourceRevision,imported_by:input.importedBy,revision,execution_authority:false,publication_authority:false};
        db.prepare('INSERT INTO vk2_hook_history VALUES(?,?,?,?,?)').run(campaign,character,hookKey,revision,JSON.stringify(row));
        db.prepare('INSERT INTO vk2_hook_heads VALUES(?,?,?,?) ON CONFLICT(campaign,character,key) DO UPDATE SET revision=excluded.revision').run(campaign,character,hookKey,revision);
      }
      for(const suggestion of canon){
        if(!suggestion||typeof suggestion.key!=='string'||!suggestion.key.trim()||typeof suggestion.value!=='string'||!suggestion.value.trim())throw new Error('Canon suggestion requires key and value');
        const proposalId=`import-canon:${hash([campaign,character,suggestion.key.trim().toLowerCase(),suggestion.value.trim()])}`;
        const row={id:proposalId,character_id:character,canon_key:suggestion.key.trim().toLowerCase(),proposed_value:suggestion.value.trim(),
          proposed_visibility:['public','party','gm'].includes(suggestion.visibility)?suggestion.visibility:'gm',visibility:'gm',status:'pending',
          reason:String(suggestion.reason||''),source_ref:source,imported_by:input.importedBy,payload:suggestion,canon_authority:false};
        db.prepare('INSERT OR IGNORE INTO vk2_hook_canon VALUES(?,?,?,?)').run(campaign,character,proposalId,JSON.stringify(row));proposals++;
      }
      const receipt={id:input.id,campaignId:campaign,characterId:character,sourceRef:source,fingerprint,status:'imported_private',hooks:hooks.length,canonSuggestions:proposals,
        relationshipsApplied:0,executionAuthority:false,publicationAuthority:false,canonAuthority:false,prepared:input};
      db.prepare('INSERT INTO vk2_hook_imports VALUES(?,?,?)').run(campaign,source,JSON.stringify(receipt));
      check();db.exec('COMMIT');return receipt;
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  function listCharacterGmHooks(campaign,character,{includeResolved=false,includeCanonSuggestions=false}={}){
    return db.prepare('SELECT r.data FROM vk2_hook_history r JOIN vk2_hook_heads h USING(campaign,character,key,revision) WHERE r.campaign=? AND r.character=? ORDER BY r.key').all(campaign,character).map(decode)
      .filter(r=>(includeResolved||r.status==='active')&&(includeCanonSuggestions||r.hook_type!=='canon_suggestion'));
  }
  return Object.freeze({commitImport,listCharacterGmHooks,
    history:(campaign,character,key)=>db.prepare('SELECT data FROM vk2_hook_history WHERE campaign=? AND character=? AND key=? ORDER BY revision').all(campaign,character,key).map(decode),
    proposals:(campaign,character)=>db.prepare('SELECT data FROM vk2_hook_canon WHERE campaign=? AND character=? ORDER BY id').all(campaign,character).map(decode),
    receipt:(campaign,source)=>decode(db.prepare('SELECT data FROM vk2_hook_imports WHERE campaign=? AND source=?').get(campaign,source)),
    close:()=>db.close()});
}
