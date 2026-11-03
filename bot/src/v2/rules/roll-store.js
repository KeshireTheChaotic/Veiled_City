import {DatabaseSync} from 'node:sqlite';
const decode=r=>r?JSON.parse(r.data):null;
/** Native-only ordinary roll evidence. No RNG, AI mutation tool or effects. */
export function openRollStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{
    if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>!['vk3_requests','vk3_roll_events','vk3_roll_fear_holds'].includes(r.name)))throw new Error('Dedicated roll database required');
    db.exec(`PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk3_requests(campaign TEXT,id TEXT,data TEXT,PRIMARY KEY(campaign,id));
      CREATE TABLE IF NOT EXISTS vk3_roll_events(sequence INTEGER PRIMARY KEY,campaign TEXT,request TEXT,kind TEXT,id TEXT,data TEXT,UNIQUE(campaign,request,kind),UNIQUE(campaign,id));
      CREATE TABLE IF NOT EXISTS vk3_roll_fear_holds(campaign TEXT,request TEXT,data TEXT,PRIMARY KEY(campaign,request));`);
  }catch(e){db.close();throw e;}
  const request=(c,id)=>decode(db.prepare('SELECT data FROM vk3_requests WHERE campaign=? AND id=?').get(c,id));
  const fearHold=(c,q)=>decode(db.prepare('SELECT data FROM vk3_roll_fear_holds WHERE campaign=? AND request=?').get(c,q));
  function event(c,q,kind){const r=db.prepare('SELECT sequence,data FROM vk3_roll_events WHERE campaign=? AND request=? AND kind=?').get(c,q,kind);return r?{...decode(r),sequence:r.sequence}:null;}
  function transact(check,fn){if(typeof check!=='function')throw new Error('Native roll authorization required');db.exec('BEGIN IMMEDIATE');try{check();const result=fn();check();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
  function insert(c,q,kind,id,data){
    const old=event(c,q,kind);if(old){const {sequence,...prior}=old;if(JSON.stringify(prior)!==JSON.stringify(data))throw new Error('Immutable roll evidence conflict');return old;}
    db.prepare('INSERT INTO vk3_roll_events(campaign,request,kind,id,data) VALUES(?,?,?,?,?)').run(c,q,kind,id,JSON.stringify(data));return event(c,q,kind);
  }
  function createRequest(input,{check}){
    const r=JSON.parse(JSON.stringify(input));
    if(!['id','campaignId','sceneId','actorId','ownerUserId','controlRevision','noticeRef','stakes'].every(k=>typeof r[k]==='string'&&r[k].trim())
      ||!Number.isSafeInteger(r.difficulty)||r.difficulty<0||r.stakes.length>2000||['modifier','experience','advantage','disadvantage'].some(k=>r[k]!==0))throw new Error('Ordinary native roll terms required');
    r.status='awaiting_notice';return transact(check,()=>{const old=request(r.campaignId,r.id);if(old){if(JSON.stringify(old)!==JSON.stringify(r))throw new Error('Immutable roll request conflict');return old;}
      db.prepare('INSERT INTO vk3_requests VALUES(?,?,?)').run(r.campaignId,r.id,JSON.stringify(r));return r;});
  }
  function acknowledgeDelivery(c,q,input,{check}){return transact(check,()=>{
    const r=request(c,q);if(!r||typeof input.messageId!=='string'||!input.messageId||!Array.isArray(input.recipientIds)||!input.recipientIds.includes(r.ownerUserId)||input.recipientIds.some(x=>typeof x!=='string'||!x)||new Set(input.recipientIds).size!==input.recipientIds.length)throw new Error('Exact native delivered notice required');
    return insert(c,q,'notice',r.noticeRef,{id:r.noticeRef,status:'delivered',requestRef:q,messageId:input.messageId,recipientIds:[...input.recipientIds].sort(),difficulty:r.difficulty,stakes:r.stakes});
  });}
  function recordOwnerRoll(c,q,input,{check}){return transact(check,()=>{
    const r=request(c,q);if(!r||!event(c,q,'notice')||input.ownerUserId!==r.ownerUserId||typeof input.id!=='string'||!input.id||![input.hope,input.fear].every(v=>Number.isInteger(v)&&v>=1&&v<=12))throw new Error('Delivered request and authenticated owner dice required');
    if(fearHold(c,q)?.status==='held'&&!event(c,q,'roll'))throw new Error('Native Fear interruption holds this owner roll');
    return insert(c,q,'roll',input.id,{id:input.id,campaignId:c,sceneId:r.sceneId,requestRef:q,actorId:r.actorId,ownerUserId:r.ownerUserId,authenticated:true,origin:'owner_roll',hope:input.hope,fear:input.fear});
  });}
  function holdForFear(c,q,decisionRef,{check}){return transact(check,()=>{
    if(typeof decisionRef!=='string'||!decisionRef||!request(c,q)||!event(c,q,'notice')||event(c,q,'roll'))throw new Error('Unrolled delivered native request required for Fear hold');
    const old=fearHold(c,q);if(old){if(old.decisionRef!==decisionRef)throw new Error('Immutable Fear hold conflict');return old;}
    const row={campaignId:c,requestRef:q,decisionRef,status:'held'};db.prepare('INSERT INTO vk3_roll_fear_holds VALUES(?,?,?)').run(c,q,JSON.stringify(row));return row;
  });}
  function releaseCancelledFear(c,q,{readCancellation,check}){return transact(check,()=>{
    const row=fearHold(c,q);if(!row)throw new Error('Native Fear hold required');if(row.status==='cancelled')return row;
    if(typeof readCancellation!=='function')throw new Error('Native Fear cancellation proof required');
    const proof=structuredClone(readCancellation(c,q));
    if(proof?.status!=='cancelled'||proof.terms?.campaignId!==c||proof.terms.requestRef!==q||proof.terms.decisionRef!==row.decisionRef)throw new Error('Exact cancelled Fear reservation required');
    const after={...row,status:'cancelled'};if(JSON.stringify(readCancellation(c,q))!==JSON.stringify(proof))throw new Error('Fear cancellation changed');
    db.prepare('UPDATE vk3_roll_fear_holds SET data=? WHERE campaign=? AND request=?').run(JSON.stringify(after),c,q);return after;
  });}
  return Object.freeze({createRequest,acknowledgeDelivery,recordOwnerRoll,holdForFear,releaseCancelledFear,readFearHold:fearHold,
    readResultForRequest:(c,q)=>event(c,q,'roll'),
    readRequest(c,q){const r=request(c,q);return r?{...r,status:event(c,q,'notice')?'awaiting_player_roll':'awaiting_notice'}:null;},
    readDelivery(c,id){const r=db.prepare("SELECT request FROM vk3_roll_events WHERE campaign=? AND id=? AND kind='notice'").get(c,id);return r?event(c,r.request,'notice'):null;},
    readRoll(c,id){const r=db.prepare("SELECT request FROM vk3_roll_events WHERE campaign=? AND id=? AND kind='roll'").get(c,id);return r?event(c,r.request,'roll'):null;},close:()=>db.close()});
}
