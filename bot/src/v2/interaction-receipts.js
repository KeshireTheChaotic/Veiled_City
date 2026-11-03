import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
/** Native transport receipts only. These operations grant no gameplay effects. */
export function openInteractionReceipts(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{db.exec('PRAGMA busy_timeout=5000');if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(row=>row.name!=='vk3_native_interactions'))throw new Error('Dedicated native interaction database required');db.exec('CREATE TABLE IF NOT EXISTS vk3_native_interactions(id TEXT PRIMARY KEY,data TEXT NOT NULL)');}catch(error){db.close();throw error;}
  const read=ref=>{const row=db.prepare('SELECT data FROM vk3_native_interactions WHERE id=?').get(ref);return row?JSON.parse(row.data):null;};
  const save=row=>{db.prepare('UPDATE vk3_native_interactions SET data=? WHERE id=?').run(JSON.stringify(row),row.binding.id);return row;};
  function tx(check,operation){if(typeof check!=='function')throw new Error('Native interaction authority required');db.exec('BEGIN IMMEDIATE');try{check();const result=operation();check();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
  function required(ref){const row=read(ref);if(!row)throw new Error('Saved native interaction required');return row;}
  function claim(binding,{check}){
    if(!binding||Object.keys(binding).sort().join(',')!=='actorId,campaignId,channelId,id,messageId,principal,promptRef,sceneId,tokenHash'||!Object.values(binding).every(id)||!/^[a-f0-9]{64}$/.test(binding.tokenHash))throw new Error('Closed native interaction binding required');
    return tx(check,()=>{const old=read(binding.id);if(old){if(old.bindingHash!==hash(binding))throw new Error('Native interaction identity conflict');return {created:false,row:old};}const row={binding:structuredClone(binding),bindingHash:hash(binding),ack:'claimed',processing:'pending',receipt:null,hold:null,reply:'not_started'};db.prepare('INSERT INTO vk3_native_interactions VALUES(?,?)').run(binding.id,JSON.stringify(row));return {created:true,row};});
  }
  function acknowledge(ref,status,{check}){return tx(check,()=>{const row=required(ref);if(!['deferred','uncertain'].includes(status)||row.ack!=='claimed')throw new Error('One native defer acknowledgement required');return save({...row,ack:status});});}
  function complete(ref,receipt,{check}){return tx(check,()=>{const row=required(ref);if(!receipt||Object.keys(receipt).sort().join(',')!=='hash,id'||!id(receipt.id)||typeof receipt.hash!=='string'||!/^[a-f0-9]{64}$/.test(receipt.hash)||row.ack!=='deferred'||row.processing!=='pending')throw new Error('Exact native committed interaction receipt required');return save({...row,processing:'committed',receipt:structuredClone(receipt)});});}
  function hold(ref,stage,{check}){return tx(check,()=>{const row=required(ref);if(!['defer','decision','source','effects','receipt','progression','closed'].includes(stage))throw new Error('Native interaction hold stage required');return save({...row,processing:row.processing==='committed'?'committed':'held',hold:stage});});}
  function claimReply(ref,{check}){return tx(check,()=>{const row=required(ref);if(row.ack!=='deferred'||!['committed','held'].includes(row.processing)||row.reply!=='not_started')throw new Error('One private interaction reply attempt required');return save({...row,reply:'attempted'});});}
  function finishReply(ref,status,{check}){return tx(check,()=>{const row=required(ref);if(row.reply!=='attempted'||!['delivered','uncertain'].includes(status))throw new Error('Saved private reply attempt required');return save({...row,reply:status});});}
  return Object.freeze({read,claim,acknowledge,complete,hold,claimReply,finishReply,close:()=>db.close()});
}
