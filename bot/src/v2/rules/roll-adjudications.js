import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const keys='actorId,campaignId,difficulty,id,modifierRefs,revision,sceneId,sourceRef,sourceRevision,stakes,status,trait';
/** Native adjudicator storage only. Does not approve decisions, roll dice or authorize effects. */
export function openRollAdjudications(filename=':memory:'){
 const db=new DatabaseSync(filename);
 try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(t=>t.name!=='vk3_roll_adjudications'))throw new Error('Dedicated roll adjudication store required');db.exec('CREATE TABLE IF NOT EXISTS vk3_roll_adjudications(campaign TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(campaign,id))');}catch(e){db.close();throw e;}
 function read(campaign,ref){const r=db.prepare('SELECT data FROM vk3_roll_adjudications WHERE campaign=? AND id=?').get(campaign,ref);return r?JSON.parse(r.data):null;}
 function save(source,decision,{check}={}){
  const a=structuredClone(decision);
  if(typeof check!=='function'||!source||!a||Object.keys(a).sort().join(',')!==keys||!['id','revision','campaignId','sceneId','actorId','sourceRef','sourceRevision'].every(k=>id(a[k]))||a.status!=='accepted'||a.campaignId!==source.campaign||a.sceneId!==source.scene||a.sourceRef!==source.id||a.sourceRevision!==source.revision||!Array.isArray(source.actors)||!source.actors.includes(a.actorId)||!Number.isSafeInteger(a.difficulty)||a.difficulty<0||typeof a.stakes!=='string'||!a.stakes.trim()||a.stakes.length>16000||typeof a.trait!=='string'||!['agility','strength','finesse','instinct','presence','knowledge'].includes(a.trait.toLowerCase())||!Array.isArray(a.modifierRefs)||a.modifierRefs.length>64||a.modifierRefs.some(r=>!id(r))||new Set(a.modifierRefs).size!==a.modifierRefs.length)throw new Error('Exact native source-bound roll adjudication required');
  const fingerprint=hash([source,a]);
  const current=()=>{check();if(hash([source,decision])!==fingerprint)throw new Error('Native adjudication changed during persistence');};
  db.exec('BEGIN IMMEDIATE');try{current();const prior=read(a.campaignId,a.id);if(prior&&hash(prior)!==hash(a))throw new Error('Immutable native adjudication conflict');if(!prior)db.prepare('INSERT INTO vk3_roll_adjudications VALUES(?,?,?)').run(a.campaignId,a.id,JSON.stringify(a));current();db.exec('COMMIT');return read(a.campaignId,a.id);}catch(e){db.exec('ROLLBACK');throw e;}
 }
 return Object.freeze({read,save,close:()=>db.close()});
}
