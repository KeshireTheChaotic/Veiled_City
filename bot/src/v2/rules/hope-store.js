import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {pcEffectResource} from './pc-resources.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const decode=r=>r?JSON.parse(r.data):null;
/** One native rule transaction; deliberately no arbitrary state-patch method. */
export function openHopeStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>!['vk3_hope','vk3_hope_receipts'].includes(r.name)))throw new Error('Dedicated Hope database required');
    db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk3_hope(campaign TEXT,actor TEXT,data TEXT,PRIMARY KEY(campaign,actor)); CREATE TABLE IF NOT EXISTS vk3_hope_receipts(campaign TEXT,evidence TEXT,data TEXT,PRIMARY KEY(campaign,evidence));');
    // The canonical cost key is an action plus cost slot, never an evidence alias.
    if(db.prepare("SELECT 1 FROM vk3_hope_receipts WHERE json_extract(data,'$.actionRef') IS NULL OR json_extract(data,'$.costSlot') IS NULL LIMIT 1").get())throw new Error('Historical Hope receipts require action-cost reconciliation');
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS vk3_hope_action_cost ON vk3_hope_receipts(campaign,json_extract(data,'$.actionRef'),json_extract(data,'$.costSlot')) WHERE json_extract(data,'$.actionRef') IS NOT NULL");
  }catch(e){db.close();throw e;}
  const read=(c,a)=>decode(db.prepare('SELECT data FROM vk3_hope WHERE campaign=? AND actor=?').get(c,a));
  function transaction(check,fn){if(typeof check!=='function')throw new Error('Native Hope authority required');db.exec('BEGIN IMMEDIATE');try{check();const r=fn();check();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
  function initialize(input,{check}){
    if(![input.campaignId,input.actorId,input.ownerUserId].every(id)||!Number.isSafeInteger(input.hope)||!Number.isSafeInteger(input.cap)||input.cap<0||input.cap>6||input.hope<0||input.hope>input.cap)throw new Error('Native Hope bootstrap required');
    return transaction(check,()=>{const row={campaignId:input.campaignId,actorId:input.actorId,ownerUserId:input.ownerUserId,hope:input.hope,cap:input.cap,revision:1};const old=read(input.campaignId,input.actorId);if(old){if(JSON.stringify(old)!==JSON.stringify(row))throw new Error('Hope already initialized');return old;}
      db.prepare('INSERT INTO vk3_hope VALUES(?,?,?)').run(input.campaignId,input.actorId,JSON.stringify(row));return row;});
  }
  function spend({campaignId,actorId,expectedRevision,evidenceRef},{readEvidence,check}){
    if(![campaignId,actorId,evidenceRef].every(id)||!Number.isSafeInteger(expectedRevision)||expectedRevision<1||typeof readEvidence!=='function')throw new Error('Native cost reference required');
    return transaction(check,()=>{
      const e=structuredClone(readEvidence(campaignId,evidenceRef)),state=read(campaignId,actorId);
      if(!e||e.id!==evidenceRef||e.campaignId!==campaignId||e.actorId!==actorId||e.ownerUserId!==state?.ownerUserId||e.status!=='accepted'||e.operation!=='spend_hope'||e.ownerConfirmed!==true
        ||!id(e.sourceRef)||!id(e.revision)||!id(e.actionRef)||!id(e.costSlot)||!Number.isSafeInteger(e.amount)||e.amount<1)throw new Error('Authenticated owner Hope cost required');
      const fingerprint=hash([actorId,expectedRevision,e]),old=decode(db.prepare('SELECT data FROM vk3_hope_receipts WHERE campaign=? AND evidence=?').get(campaignId,evidenceRef));
      if(old){if(old.fingerprint!==fingerprint)throw new Error('Hope cost replay conflict');return old;}
      if(db.prepare("SELECT 1 FROM vk3_hope_receipts WHERE campaign=? AND json_extract(data,'$.actionRef')=? AND json_extract(data,'$.costSlot')=?").get(campaignId,e.actionRef,e.costSlot))throw new Error('Action Hope cost already committed');
      if(state.revision!==expectedRevision)throw new Error('Hope revision conflict');
      const change=pcEffectResource({resources:{hope:state.hope,hope_max:state.cap}},'hope',-e.amount),after={...state,hope:change.after,revision:state.revision+1};
      const receipt={id:`hope-cost:${hash([campaignId,evidenceRef])}`,fingerprint,campaignId,actorId,evidenceRef,sourceRef:e.sourceRef,actionRef:e.actionRef,costSlot:e.costSlot,choiceSourceRef:e.choiceSourceRef??null,choiceSourceRevision:e.choiceSourceRevision??null,before:state,after,effects_committed:true};
      db.prepare('UPDATE vk3_hope SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(after),campaignId,actorId);
      db.prepare('INSERT INTO vk3_hope_receipts VALUES(?,?,?)').run(campaignId,evidenceRef,JSON.stringify(receipt));
      if(JSON.stringify(readEvidence(campaignId,evidenceRef))!==JSON.stringify(e))throw new Error('Hope cost evidence changed');return receipt;
    });
  }
  return Object.freeze({initialize,spend,read,receipt:(c,e)=>decode(db.prepare('SELECT data FROM vk3_hope_receipts WHERE campaign=? AND evidence=?').get(c,e)),close:()=>db.close()});
}
