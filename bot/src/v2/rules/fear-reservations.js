import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {preRollFearTerms} from './pre-roll-fear.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const decode=r=>r?JSON.parse(r.data):null;
/** Native reservation/notice state only. Funds remain unspent until an eventual
 * atomic validated attack transaction; no RNG or execution API is present.
 */
export function openFearReservations(filename=':memory:'){
  const db=new DatabaseSync(filename);try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>!['vk3_fear_pool','vk3_fear_reservations'].includes(r.name)))throw new Error('Dedicated Fear reservation database required');db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk3_fear_pool(campaign TEXT PRIMARY KEY,amount INTEGER); CREATE TABLE IF NOT EXISTS vk3_fear_reservations(campaign TEXT,request TEXT,data TEXT,PRIMARY KEY(campaign,request));');}catch(e){db.close();throw e;}
  const read=(c,q)=>decode(db.prepare('SELECT data FROM vk3_fear_reservations WHERE campaign=? AND request=?').get(c,q));
  function tx(check,fn){if(typeof check!=='function')throw new Error('Native Fear authority required');db.exec('BEGIN IMMEDIATE');try{check();const r=fn();check();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
  const reserved=c=>db.prepare('SELECT data FROM vk3_fear_reservations WHERE campaign=?').all(c).map(decode).filter(r=>['awaiting_announcement','announced'].includes(r.status)).reduce((n,r)=>n+r.terms.baseCost,0);
  function initialize(campaign,amount,{check}){if(typeof campaign!=='string'||!campaign||!Number.isSafeInteger(amount)||amount<0||amount>12)throw new Error('Native Fear pool required');return tx(check,()=>{const old=db.prepare('SELECT amount FROM vk3_fear_pool WHERE campaign=?').get(campaign);if(old&&old.amount!==amount)throw new Error('Fear already initialized');if(!old)db.prepare('INSERT INTO vk3_fear_pool VALUES(?,?)').run(campaign,amount);return amount;});}
  function reserve(campaign,requestRef,{readOpportunity,check}){return tx(check,()=>{
    const opportunity=structuredClone(readOpportunity(campaign,requestRef));if(opportunity?.campaignId!==campaign||opportunity.request?.id!==requestRef)throw new Error('Exact native Fear opportunity required');
    const old=read(campaign,requestRef),fingerprint=hash(opportunity);if(old){if(old.fingerprint!==fingerprint)throw new Error('Immutable Fear reservation conflict');return old;}
    const pool=db.prepare('SELECT amount FROM vk3_fear_pool WHERE campaign=?').get(campaign);if(!pool)throw new Error('Campaign Fear unavailable');
    const terms=preRollFearTerms({...opportunity,fear:pool.amount,reservedFear:reserved(campaign)}),row={terms,bindingHash:hash(terms),fingerprint,status:'awaiting_announcement',history:[{status:'awaiting_announcement'}]};
    if(hash(readOpportunity(campaign,requestRef))!==fingerprint)throw new Error('Fear opportunity changed');db.prepare('INSERT INTO vk3_fear_reservations VALUES(?,?,?)').run(campaign,requestRef,JSON.stringify(row));return row;
  });}
  function acknowledge(campaign,requestRef,{readNotice,readOpportunity,check}){return tx(check,()=>{
    const row=read(campaign,requestRef),notice=structuredClone(readNotice(campaign,requestRef));
    if(typeof readOpportunity!=='function'||!row||hash(readOpportunity(campaign,requestRef))!==row.fingerprint)throw new Error('Pending pre-roll opportunity changed');
    if(!row||!['awaiting_announcement','announced'].includes(row.status)||notice?.status!=='delivered'||notice.kind!=='pre_roll_fear'||notice.requestRef!==requestRef||notice.bindingHash!==row.bindingHash
      ||notice.baseCost!==1||notice.printedFearCost!==0||notice.npcId!==row.terms.npcId||notice.actorId!==row.terms.actorId||!Array.isArray(notice.recipientIds)||notice.recipientIds.length!==1||notice.recipientIds[0]!==row.terms.ownerUserId||typeof notice.messageId!=='string'||!notice.messageId)throw new Error('Exact delivered owner Fear announcement required');
    if(row.notice){if(JSON.stringify(row.notice)!==JSON.stringify(notice))throw new Error('Fear notice replay conflict');return row;}
    const after={...row,status:'announced',notice,history:[...row.history,{status:'announced',messageId:notice.messageId}]};if(JSON.stringify(readNotice(campaign,requestRef))!==JSON.stringify(notice)||hash(readOpportunity(campaign,requestRef))!==row.fingerprint)throw new Error('Fear notice or opportunity changed');db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify(after),campaign,requestRef);return after;
  });}
  function cancel(c,q,{check,readPublication}){return tx(check,()=>{
    const row=read(c,q);if(!row)throw new Error('Native Fear reservation required');if(row.status==='cancelled')return row;
    if(row.status!=='awaiting_announcement'||row.notice)throw new Error('Acknowledged Fear interruption requires reviewed recovery');
    if(typeof readPublication!=='function')throw new Error('Native unattempted Fear publication proof required');
    const publication=structuredClone(readPublication(c,q));
    if(publication?.campaignId!==c||publication.requestRef!==q||publication.bindingHash!==row.bindingHash||publication.status!=='not_started'||publication.attemptCount!==0)throw new Error('Attempted or uncertain Fear publication requires reviewed recovery');
    const after={...row,status:'cancelled',history:[...row.history,{status:'cancelled'}]};
    if(JSON.stringify(readPublication(c,q))!==JSON.stringify(publication))throw new Error('Fear publication changed during cancellation');
    db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify(after),c,q);return after;
  });}
  return Object.freeze({initialize,reserve,acknowledge,cancel,read,reserved,close:()=>db.close()});
}
