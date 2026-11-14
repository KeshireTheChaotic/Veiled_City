import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';

export const knowledgeHash=text=>createHash('sha256').update(text).digest('hex');
const json=value=>JSON.stringify(value);
const decode=row=>row?JSON.parse(row.data):null;

/** Dedicated v2 knowledge database. Never initializes or migrates a legacy campaign DB. */
export function openKnowledgeStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    if(tables.some(t=>!['vk2_knowledge_heads','vk2_knowledge_history','vk2_knowledge_proposals'].includes(t.name)))throw new Error('Dedicated v2 knowledge database required');
    db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS vk2_knowledge_heads(campaign TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(campaign,id));
      CREATE TABLE IF NOT EXISTS vk2_knowledge_history(campaign TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,evidence_ref TEXT NOT NULL,data TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(campaign,id,revision),UNIQUE(campaign,evidence_ref));
      CREATE TABLE IF NOT EXISTS vk2_knowledge_proposals(campaign TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(campaign,id));`);
  }catch(error){db.close();throw error;}
  function metadata(campaign,id){
    return decode(db.prepare('SELECT r.data FROM vk2_knowledge_history r JOIN vk2_knowledge_heads h USING(campaign,id,revision) WHERE r.campaign=? AND r.id=?').get(campaign,id));
  }
  function transaction(fn,check=()=>{}){db.exec('BEGIN IMMEDIATE');try{check();const value=fn();check();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}}
  function append({campaignId,id,expectedRevision,evidenceRef,metadata:input,body},{check}={}){
    if(check!==undefined&&typeof check!=='function')throw new TypeError('Native knowledge append check required');
    return transaction(()=>{
      const replay=db.prepare('SELECT data,body FROM vk2_knowledge_history WHERE campaign=? AND evidence_ref=?').get(campaignId,evidenceRef);
      const payloadHash=knowledgeHash(json([id,expectedRevision,input,body]));
      if(replay){const prior=decode(replay);if(prior.payloadHash!==payloadHash)throw new Error('Immutable evidence conflict');return prior;}
      const current=metadata(campaignId,id);
      if((current?.revision??null)!==expectedRevision)throw new Error('Knowledge revision conflict');
      const revision=String(Number(current?.revision??0)+1);
      const row={...input,id,campaignId,revision,evidenceRef,previousRevision:current?.revision??null,contentHash:knowledgeHash(body),payloadHash};
      db.prepare('INSERT INTO vk2_knowledge_history VALUES(?,?,?,?,?,?)').run(campaignId,id,Number(revision),evidenceRef,json(row),body);
      db.prepare('INSERT INTO vk2_knowledge_heads VALUES(?,?,?) ON CONFLICT(campaign,id) DO UPDATE SET revision=excluded.revision').run(campaignId,id,Number(revision));
      return row;
    },check);
  }
  return Object.freeze({metadata,append,
    npcPlanRefs(campaign,scene,actor){
      if([campaign,scene,actor].some(v=>typeof v!=='string'||!v||v.length>256))throw new Error('Exact native NPC plan scope required');
      const rows=db.prepare("SELECT r.id FROM vk2_knowledge_history r JOIN vk2_knowledge_heads h USING(campaign,id,revision) WHERE r.campaign=? AND json_extract(r.data,'$.status')='active' AND json_extract(r.data,'$.kind')='plan' AND json_extract(r.data,'$.authorship')='native_npc_proposal' AND json_extract(r.data,'$.disposition')='unexecuted' AND json_extract(r.data,'$.visibility')='gm' AND json_extract(r.data,'$.disclosure')='private' AND json_extract(r.data,'$.scope')='scene' AND json_extract(r.data,'$.sceneId')=? AND json_extract(r.data,'$.decisionManifest.actorId')=? AND EXISTS(SELECT 1 FROM json_each(r.data,'$.knownBy') k WHERE k.value=?) ORDER BY r.id LIMIT 257").all(campaign,scene,actor,actor);
      if(rows.length>256)throw new Error('NPC private plan history requires curation');return rows.map(r=>r.id);
    },
    candidateRefs(campaign,scene){
      if(typeof campaign!=='string'||!campaign||typeof scene!=='string'||!scene)throw new Error('Native knowledge candidate scope required');
      // Metadata references only. Entitlement/complete ancestry must still precede every body read.
      return db.prepare("SELECT r.id FROM vk2_knowledge_history r JOIN vk2_knowledge_heads h USING(campaign,id,revision) WHERE r.campaign=? AND json_extract(r.data,'$.status')='active' AND json_extract(r.data,'$.visibility') IN ('public','recipients') AND (json_extract(r.data,'$.scope')='campaign' OR json_extract(r.data,'$.scope')='scene' AND json_extract(r.data,'$.sceneId')=?) ORDER BY r.id LIMIT 256").all(campaign,scene).map(row=>row.id);
    },
    evidence(campaign,ref){return decode(db.prepare('SELECT data FROM vk2_knowledge_history WHERE campaign=? AND evidence_ref=?').get(campaign,ref));},
    readText(campaign,id,revision){
      const row=db.prepare('SELECT r.body FROM vk2_knowledge_history r JOIN vk2_knowledge_heads h USING(campaign,id,revision) WHERE r.campaign=? AND r.id=? AND r.revision=?').get(campaign,id,Number(revision));
      return row?{revision:String(revision),text:row.body}:null;
    },
    history(campaign,id){return db.prepare('SELECT data,body FROM vk2_knowledge_history WHERE campaign=? AND id=? ORDER BY revision').all(campaign,id).map(row=>({...decode(row),body:row.body}));},
    propose(proposal){
      const old=decode(db.prepare('SELECT data FROM vk2_knowledge_proposals WHERE campaign=? AND id=?').get(proposal.campaignId,proposal.id));
      if(old&&json(old)!==json(proposal))throw new Error('Immutable proposal conflict');
      if(!old)db.prepare('INSERT INTO vk2_knowledge_proposals VALUES(?,?,?)').run(proposal.campaignId,proposal.id,json(proposal));
      return old??structuredClone(proposal);
    },
    proposal(campaign,id){return decode(db.prepare('SELECT data FROM vk2_knowledge_proposals WHERE campaign=? AND id=?').get(campaign,id));},
    close:()=>db.close()
  });
}
