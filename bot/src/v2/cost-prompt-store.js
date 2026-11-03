import {DatabaseSync} from 'node:sqlite';
import {randomUUID,randomBytes} from 'node:crypto';
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
/** Native-only prompt tokens. Issuance is not delivery or owner consent. */
export function openCostPromptStore(filename=':memory:',{clock=()=>Date.now()}={}){
  const db=new DatabaseSync(filename);
  try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>r.name!=='vk3_cost_prompts'))throw new Error('Dedicated cost prompt database required');
    db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk3_cost_prompts(id TEXT PRIMARY KEY,accept_token TEXT UNIQUE,reject_token TEXT UNIQUE,data TEXT NOT NULL)');
  }catch(e){db.close();throw e;}
  const get=id=>{const r=db.prepare('SELECT data FROM vk3_cost_prompts WHERE id=?').get(id);return r?JSON.parse(r.data):null;};
  function tx(check,fn){if(typeof check!=='function')throw new Error('Native prompt authority required');db.exec('BEGIN IMMEDIATE');try{check();const r=fn();check();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
  function issue(input,{check}){
    if(!['campaignId','sceneId','channelId','ownerUserId','actorId','actionRef','termsRevision','costSlot'].every(k=>id(input[k]))||!Number.isSafeInteger(input.amount)||input.amount<1||!Number.isSafeInteger(input.expiresAt)||input.expiresAt<=clock()||input.expiresAt>clock()+900000)throw new Error('Bounded native cost prompt terms required');
    return tx(check,()=>{const row={...input,id:randomUUID(),acceptToken:`vk2cost:${randomBytes(24).toString('hex')}`,rejectToken:`vk2cost:${randomBytes(24).toString('hex')}`,status:'awaiting_delivery',messageId:null};db.prepare('INSERT INTO vk3_cost_prompts VALUES(?,?,?,?)').run(row.id,row.acceptToken,row.rejectToken,JSON.stringify(row));return row;});
  }
  function acknowledge(ref,messageId,{check}){return tx(check,()=>{const row=get(ref);if(!row||!['awaiting_delivery','active'].includes(row.status)||!id(messageId)||row.expiresAt<=clock())throw new Error('Live native delivered prompt required');if(row.messageId&&row.messageId!==messageId)throw new Error('Prompt delivery identity conflict');const after={...row,status:'active',messageId};db.prepare('UPDATE vk3_cost_prompts SET data=? WHERE id=?').run(JSON.stringify(after),ref);return after;});}
  function revoke(ref,{check}){return tx(check,()=>{const row=get(ref);if(!row)throw new Error('Native prompt required');const after={...row,status:'revoked'};db.prepare('UPDATE vk3_cost_prompts SET data=? WHERE id=?').run(JSON.stringify(after),ref);return after;});}
  function readPrompt(token){const r=db.prepare('SELECT data FROM vk3_cost_prompts WHERE accept_token=? OR reject_token=?').get(token,token);if(!r)return null;const row=JSON.parse(r.data);return {...row,customId:token,decision:token===row.acceptToken?'accept':'reject',status:row.expiresAt<=clock()?'expired':row.status};}
  return Object.freeze({issue,acknowledge,revoke,readPrompt,close:()=>db.close()});
}
