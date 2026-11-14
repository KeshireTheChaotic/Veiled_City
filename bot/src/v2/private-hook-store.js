import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const decode=row=>row?JSON.parse(row.data):null;
const key=(h,i)=>String(h.key||h.title||`imported-${i}`).trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||`imported-${i}`;

/** Dedicated private imports and human-reviewed canon. Native code only; no publication grant. */
export function openPrivateHookStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{
    const allowed=['vk2_hook_imports','vk2_hook_history','vk2_hook_heads','vk2_hook_canon','vk2_canon_history','vk2_canon_heads','vk2_canon_reviews','vk2_relationship_history','vk2_relationship_heads','vk2_private_narratives'],tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    if(tables.some(r=>!allowed.includes(r.name)))throw new Error('Dedicated private hook database required');
    if(tables.length&&allowed.some(name=>!tables.some(t=>t.name===name)))throw new Error('Private hook schema requires reviewed migration; existing data was not changed');
    db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS vk2_hook_imports(campaign TEXT,source TEXT,data TEXT NOT NULL,PRIMARY KEY(campaign,source));
      CREATE TABLE IF NOT EXISTS vk2_hook_history(campaign TEXT,character TEXT,key TEXT,revision INTEGER,data TEXT NOT NULL,PRIMARY KEY(campaign,character,key,revision));
      CREATE TABLE IF NOT EXISTS vk2_hook_heads(campaign TEXT,character TEXT,key TEXT,revision INTEGER,PRIMARY KEY(campaign,character,key));
      CREATE TABLE IF NOT EXISTS vk2_hook_canon(campaign TEXT,character TEXT,id TEXT,data TEXT NOT NULL,PRIMARY KEY(campaign,character,id));
      CREATE TABLE IF NOT EXISTS vk2_canon_history(campaign TEXT,key TEXT,revision INTEGER,data TEXT NOT NULL,PRIMARY KEY(campaign,key,revision));
      CREATE TABLE IF NOT EXISTS vk2_canon_heads(campaign TEXT,key TEXT,revision INTEGER,PRIMARY KEY(campaign,key));
      CREATE TABLE IF NOT EXISTS vk2_canon_reviews(campaign TEXT,source TEXT,data TEXT NOT NULL,PRIMARY KEY(campaign,source));
      CREATE TABLE IF NOT EXISTS vk2_relationship_history(campaign TEXT,id TEXT,revision INTEGER,data TEXT NOT NULL,PRIMARY KEY(campaign,id,revision));
      CREATE TABLE IF NOT EXISTS vk2_relationship_heads(campaign TEXT,id TEXT,revision INTEGER,PRIMARY KEY(campaign,id));
      CREATE TABLE IF NOT EXISTS vk2_private_narratives(campaign TEXT,character TEXT,revision INTEGER,data TEXT NOT NULL,PRIMARY KEY(campaign,character,revision));`);
  }catch(error){db.close();throw error;}
  function commitImport(prepared,{check,relationships=[],relationshipHolds=[],narrative=null}){
    if(typeof check!=='function'||prepared.scope!=='hooks'||prepared.visibility!=='gm'||prepared.status!=='awaiting_native_validation'
      ||prepared.executionAuthority!==false||prepared.publicationAuthority!==false||prepared.canonAuthority!==false)throw new Error('Native private import preparation required');
    if(narrative!==null&&(!narrative||Object.keys(narrative).sort().join(',')!=='attachmentId,sha256,sourceFilename,text'||typeof narrative.text!=='string'||!narrative.text.trim()||Buffer.byteLength(narrative.text,'utf8')>128*1024||typeof narrative.sourceFilename!=='string'||!narrative.sourceFilename.toLowerCase().endsWith('.md')||narrative.sourceFilename.length>256||typeof narrative.attachmentId!=='string'||!narrative.attachmentId||typeof narrative.sha256!=='string'||!/^[a-f0-9]{64}$/.test(narrative.sha256)))throw new Error('Bounded source-bound GM private narrative required');
    const input=JSON.parse(JSON.stringify(prepared)),edges=JSON.parse(JSON.stringify(relationships)),holds=JSON.parse(JSON.stringify(relationshipHolds)),document=narrative===null?null:structuredClone(narrative),fingerprint=hash(document===null?input:{prepared:input,narrative:document}),{campaignId:campaign,characterId:character,sourceRef:source}=input;
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
      const distinct=new Map();
      for(const edge of edges){
        if(edge.from_type!=='character'||edge.from_key!==character||edge.visibility!=='gm'||edge.authority!=='gm_private_connection'
          ||edge.consent_authority!==false||edge.pc_choice_authority!==false||edge.publication_authority!==false)throw new Error('Native private relationship required');
        const edgeId=`relationship:${hash([campaign,edge.from_type,edge.from_key,edge.to_type,edge.to_key,edge.relationship_type])}`;distinct.set(edgeId,edge);
      }
      for(const [edgeId,edge] of distinct){
        const old=db.prepare('SELECT revision FROM vk2_relationship_heads WHERE campaign=? AND id=?').get(campaign,edgeId),revision=(old?.revision??0)+1;
        db.prepare('INSERT INTO vk2_relationship_history VALUES(?,?,?,?)').run(campaign,edgeId,revision,JSON.stringify({...edge,id:edgeId,guild_id:campaign,revision}));
        db.prepare('INSERT INTO vk2_relationship_heads VALUES(?,?,?) ON CONFLICT(campaign,id) DO UPDATE SET revision=excluded.revision').run(campaign,edgeId,revision);
      }
      let narrativeRevision=null;
      if(document){const previous=readNarrative(campaign,character);narrativeRevision=(previous?.revision??0)+1;const row={...document,campaignId:campaign,characterId:character,revision:narrativeRevision,visibility:'gm',sourceRef:source,sourceRevision:input.sourceRevision,importedBy:input.importedBy,executionAuthority:false,publicationAuthority:false,canonAuthority:false};db.prepare('INSERT INTO vk2_private_narratives VALUES(?,?,?,?)').run(campaign,character,narrativeRevision,JSON.stringify(row));}
      const receipt={id:input.id,campaignId:campaign,characterId:character,sourceRef:source,fingerprint,status:'imported_private',hooks:hooks.length,canonSuggestions:proposals,narrativeRevision,
        relationshipsApplied:distinct.size,relationshipHolds:holds,executionAuthority:false,publicationAuthority:false,canonAuthority:false,prepared:input};
      db.prepare('INSERT INTO vk2_hook_imports VALUES(?,?,?)').run(campaign,source,JSON.stringify(receipt));
      check();db.exec('COMMIT');return receipt;
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  function listCharacterGmHooks(campaign,character,{includeResolved=false,includeCanonSuggestions=false}={}){
    return db.prepare('SELECT r.data FROM vk2_hook_history r JOIN vk2_hook_heads h USING(campaign,character,key,revision) WHERE r.campaign=? AND r.character=? ORDER BY r.key').all(campaign,character).map(decode)
      .filter(r=>(includeResolved||r.status==='active')&&(includeCanonSuggestions||r.hook_type!=='canon_suggestion'));
  }
  function readNarrative(campaign,character){return decode(db.prepare('SELECT data FROM vk2_private_narratives WHERE campaign=? AND character=? ORDER BY revision DESC LIMIT 1').get(campaign,character));}
  function currentCanon(campaign,key){return decode(db.prepare('SELECT r.data FROM vk2_canon_history r JOIN vk2_canon_heads h USING(campaign,key,revision) WHERE r.campaign=? AND r.key=?').get(campaign,key));}
  function reviewCanon(request,{check}){
    const r=JSON.parse(JSON.stringify(request)),fingerprint=hash(r);
    if(typeof check!=='function'||!['accept','reject','custom'].includes(r.resolution)||!['public','party','gm'].includes(r.visibility)
      ||![r.campaignId,r.characterId,r.proposalId,r.sourceRef,r.sourceRevision,r.principal].every(v=>typeof v==='string'&&v.length>0)
      ||r.expectedRevision!==null&&(!Number.isSafeInteger(r.expectedRevision)||r.expectedRevision<1)
      ||typeof r.replaceExisting!=='boolean'||typeof r.note!=='string'||r.note.length>4000
      ||typeof r.customValue!=='string'||r.customValue.length>16000||r.resolution==='custom'&&!r.customValue.trim())throw new Error('Explicit native canon review required');
    db.exec('BEGIN IMMEDIATE');
    try{
      check();
      const replay=decode(db.prepare('SELECT data FROM vk2_canon_reviews WHERE campaign=? AND source=?').get(r.campaignId,r.sourceRef));
      if(replay){if(replay.fingerprint!==fingerprint)throw new Error('Canon review replay conflict');check();db.exec('COMMIT');return replay;}
      if(db.prepare('SELECT 1 FROM vk2_hook_imports WHERE campaign=? AND source=?').get(r.campaignId,r.sourceRef))throw new Error('Separate human review source required');
      const proposal=decode(db.prepare('SELECT data FROM vk2_hook_canon WHERE campaign=? AND character=? AND id=?').get(r.campaignId,r.characterId,r.proposalId));
      if(!proposal||!['pending','conflict'].includes(proposal.status))throw new Error('Pending character canon proposal required');
      const current=currentCanon(r.campaignId,proposal.canon_key);
      if((current?.revision??null)!==r.expectedRevision)throw new Error('Canon revision conflict');
      const value=r.resolution==='custom'?r.customValue.trim():proposal.proposed_value;
      let status=r.resolution==='reject'?'rejected':'accepted',entry=current;
      if(status==='accepted'&&current&&(current.value!==value||current.visibility!==r.visibility)&&!r.replaceExisting)status='conflict';
      if(status==='accepted'&&(!current||current.value!==value||current.visibility!==r.visibility)){
        const revision=(current?.revision??0)+1;
        entry={id:`canon:${hash([r.campaignId,proposal.canon_key,revision])}`,canon_key:proposal.canon_key,value,visibility:r.visibility,status:'current',revision,
          source_type:'human_gm',source_id:r.principal,proposal_id:r.proposalId,character_id:r.characterId,source_ref:r.sourceRef,source_revision:r.sourceRevision,
          provenance:{import_source:proposal.source_ref,review_source:r.sourceRef,reviewed_by:r.principal,note:r.note},supersedes_id:current?.id??null};
        db.prepare('INSERT INTO vk2_canon_history VALUES(?,?,?,?)').run(r.campaignId,proposal.canon_key,revision,JSON.stringify(entry));
        db.prepare('INSERT INTO vk2_canon_heads VALUES(?,?,?) ON CONFLICT(campaign,key) DO UPDATE SET revision=excluded.revision').run(r.campaignId,proposal.canon_key,revision);
      }
      const receipt={id:`canon-review:${hash([r.campaignId,r.sourceRef])}`,fingerprint,status,request:r,proposalId:r.proposalId,
        existing:current,entry:status==='accepted'?entry:null,publicationAuthority:false,knowledgeAcknowledged:false};
      const updated={...proposal,status,current_value:entry?.value??null,canon_event_id:status==='accepted'?entry.id:null,
        resolution_value:status==='accepted'?entry.value:status==='rejected'?current?.value??'':'',resolution_note:r.note,review_ref:receipt.id};
      db.prepare('UPDATE vk2_hook_canon SET data=? WHERE campaign=? AND character=? AND id=?').run(JSON.stringify(updated),r.campaignId,r.characterId,r.proposalId);
      db.prepare('INSERT INTO vk2_canon_reviews VALUES(?,?,?)').run(r.campaignId,r.sourceRef,JSON.stringify(receipt));
      check();db.exec('COMMIT');return receipt;
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  return Object.freeze({commitImport,listCharacterGmHooks,reviewCanon,currentCanon,readNarrative,narrativeHistory:(campaign,character)=>db.prepare('SELECT data FROM vk2_private_narratives WHERE campaign=? AND character=? ORDER BY revision').all(campaign,character).map(decode),
    readPlanningRecord(campaign,ref){
      // Only current committed rows. Proposals and historical versions are excluded.
      const hook=decode(db.prepare("SELECT r.data FROM vk2_hook_history r JOIN vk2_hook_heads h USING(campaign,character,key,revision) WHERE r.campaign=? AND json_extract(r.data,'$.id')=?").get(campaign,ref));
      if(hook){
        if(hook.status!=='active'||hook.hook_type==='canon_suggestion')return null;
        return {kind:'hook',revision:hook.revision,value:{title:hook.title,premise:hook.premise,permission:hook.permission,suggested_entry:hook.suggested_entry,
          character_id:hook.character_id,source_ref:hook.source_ref,authority:'optional_private_seed',execution_authority:false,publication_authority:false}};
      }
      const canon=decode(db.prepare("SELECT r.data FROM vk2_canon_history r JOIN vk2_canon_heads h USING(campaign,key,revision) WHERE r.campaign=? AND json_extract(r.data,'$.id')=?").get(campaign,ref));
      if(canon)return {kind:'canon',revision:canon.revision,value:{key:canon.canon_key,value:canon.value,provenance:canon.provenance,authority:'human_reviewed_canon',publication_authority:false}};
      const relationship=decode(db.prepare('SELECT r.data FROM vk2_relationship_history r JOIN vk2_relationship_heads h USING(campaign,id,revision) WHERE r.campaign=? AND r.id=?').get(campaign,ref));
      return relationship?{kind:'relationship',revision:relationship.revision,value:relationship}:null;
    },
    listRelationships(campaign,{includeGM=false,characterId=null}={}){
      if(!includeGM)return [];
      return db.prepare('SELECT r.data FROM vk2_relationship_history r JOIN vk2_relationship_heads h USING(campaign,id,revision) WHERE r.campaign=?').all(campaign).map(decode)
        .filter(r=>!characterId||r.from_key===characterId||r.to_key===characterId||r.source_character_id===characterId);
    },
    relationshipHistory:(campaign,id)=>db.prepare('SELECT data FROM vk2_relationship_history WHERE campaign=? AND id=? ORDER BY revision').all(campaign,id).map(decode),
    canonHistory:(campaign,key)=>db.prepare('SELECT data FROM vk2_canon_history WHERE campaign=? AND key=? ORDER BY revision').all(campaign,key).map(decode),
    canonReview:(campaign,source)=>decode(db.prepare('SELECT data FROM vk2_canon_reviews WHERE campaign=? AND source=?').get(campaign,source)),
    history:(campaign,character,key)=>db.prepare('SELECT data FROM vk2_hook_history WHERE campaign=? AND character=? AND key=? ORDER BY revision').all(campaign,character,key).map(decode),
    proposals:(campaign,character)=>db.prepare('SELECT data FROM vk2_hook_canon WHERE campaign=? AND character=? ORDER BY id').all(campaign,character).map(decode),
    receipt:(campaign,source)=>decode(db.prepare('SELECT data FROM vk2_hook_imports WHERE campaign=? AND source=?').get(campaign,source)),
    close:()=>db.close()});
}
