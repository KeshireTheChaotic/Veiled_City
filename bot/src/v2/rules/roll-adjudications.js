import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {featureRollSource} from './feature-roll-source.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const keys='actorId,campaignId,difficulty,id,modifierRefs,revision,sceneId,sourceRef,sourceRevision,stakes,status,trait';
/** Native adjudicator storage only. Does not approve decisions, roll dice or authorize effects. */
export function openRollAdjudications(filename=':memory:',{catalog=null,readActorSnapshot=null}={}){
 if((catalog!==null||readActorSnapshot!==null)&&(typeof catalog?.findDomainCard!=='function'||typeof readActorSnapshot!=='function'))throw new TypeError('Complete native Spellcast identity sources required');
 const db=new DatabaseSync(filename);
 let identityColumn;
 try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(t=>t.name!=='vk3_roll_adjudications'))throw new Error('Dedicated roll adjudication store required');db.exec('CREATE TABLE IF NOT EXISTS vk3_roll_adjudications(campaign TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(campaign,id))');identityColumn=db.prepare('PRAGMA table_info(vk3_roll_adjudications)').all().some(c=>c.name==='roll_identity');if(catalog&&!identityColumn){db.exec('ALTER TABLE vk3_roll_adjudications ADD COLUMN roll_identity TEXT');identityColumn=true;}}catch(e){db.close();throw e;}
 function read(campaign,ref){const r=db.prepare('SELECT data FROM vk3_roll_adjudications WHERE campaign=? AND id=?').get(campaign,ref);return r?JSON.parse(r.data):null;}
 function identityEntry(a,owner,locator){
  if(!catalog||!readActorSnapshot)throw new Error('Native Spellcast identity sources required');
  const actor=readActorSnapshot(a.campaignId,a.actorId);
  if(!id(owner)||actor?.actorId!==a.actorId||actor.ownerUserId!==owner||actor.status!=='active'||!id(actor.controlRevision))throw new Error('Current native Spellcast owner required');
  const identity=featureRollSource(catalog,{id:actor.actorId,data:actor.data},locator);
  if(identity.trait.toLowerCase()!==a.trait.toLowerCase())throw new Error('Native Spellcast subclass trait required');
  return {entry:{version:1,classification:'spellcast',actorId:a.actorId,ownerUserId:owner,controlRevision:actor.controlRevision,identityHash:identity.identity_hash,binding:{adjudicationHash:hash(a),...structuredClone(locator)}},actorHash:hash(actor)};
 }
 function savedIdentity(campaign,ref){if(!identityColumn)return null;const row=db.prepare('SELECT roll_identity FROM vk3_roll_adjudications WHERE campaign=? AND id=?').get(campaign,ref);return row?.roll_identity==null?null:JSON.parse(row.roll_identity);}
 function readRollIdentity(campaign,ref){
  const row=savedIdentity(campaign,ref);if(!row)return null;
  const a=read(campaign,ref);
  if(!a||Object.keys(row).sort().join(',')!=='actorId,binding,classification,controlRevision,identityHash,ownerUserId,version'||Object.keys(row.binding??{}).sort().join(',')!=='adjudicationHash,feature,slot,source_hash')throw new Error('Saved native roll identity malformed');
  const {adjudicationHash,...locator}=row.binding,first=identityEntry(a,row.ownerUserId,locator);
  if(hash(first.entry)!==hash(row)||hash(identityEntry(a,row.ownerUserId,locator))!==hash(first))throw new Error('Native reviewed roll identity changed');
  return structuredClone(row.binding);
 }
 function save(source,decision,{check,spellcast=null}={}){
  const a=structuredClone(decision);
  if(typeof check!=='function'||!source||!a||Object.keys(a).sort().join(',')!==keys||!['id','revision','campaignId','sceneId','actorId','sourceRef','sourceRevision'].every(k=>id(a[k]))||a.status!=='accepted'||a.campaignId!==source.campaign||a.sceneId!==source.scene||a.sourceRef!==source.id||a.sourceRevision!==source.revision||!Array.isArray(source.actors)||!source.actors.includes(a.actorId)||!Number.isSafeInteger(a.difficulty)||a.difficulty<0||typeof a.stakes!=='string'||!a.stakes.trim()||a.stakes.length>16000||typeof a.trait!=='string'||!['agility','strength','finesse','instinct','presence','knowledge'].includes(a.trait.toLowerCase())||!Array.isArray(a.modifierRefs)||a.modifierRefs.length>64||a.modifierRefs.some(r=>!id(r))||new Set(a.modifierRefs).size!==a.modifierRefs.length)throw new Error('Exact native source-bound roll adjudication required');
  const fingerprint=hash([source,a,spellcast]),identity=spellcast===null?null:identityEntry(a,source.principal,spellcast);
  const current=()=>{check();if(hash([source,decision,spellcast])!==fingerprint||identity&&hash(identityEntry(a,source.principal,spellcast))!==hash(identity))throw new Error('Native adjudication or roll identity changed during persistence');};
  db.exec('BEGIN IMMEDIATE');try{current();const prior=read(a.campaignId,a.id);if(prior&&(hash(prior)!==hash(a)||hash(savedIdentity(a.campaignId,a.id))!==hash(identity?.entry??null)))throw new Error('Immutable native adjudication conflict');if(!prior){if(identity)db.prepare('INSERT INTO vk3_roll_adjudications(campaign,id,data,roll_identity) VALUES(?,?,?,?)').run(a.campaignId,a.id,JSON.stringify(a),JSON.stringify(identity.entry));else db.prepare('INSERT INTO vk3_roll_adjudications(campaign,id,data) VALUES(?,?,?)').run(a.campaignId,a.id,JSON.stringify(a));}current();db.exec('COMMIT');return read(a.campaignId,a.id);}catch(e){db.exec('ROLLBACK');throw e;}
 }
 return Object.freeze({read,readRollIdentity,save,close:()=>db.close()});
}
