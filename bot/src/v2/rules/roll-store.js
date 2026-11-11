import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {dualityRoll,d} from './dice.js';
const decode=r=>r?JSON.parse(r.data):null;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
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
      ||!Number.isSafeInteger(r.difficulty)||r.difficulty<0||r.stakes.length>2000||!['modifier','experience','advantage','disadvantage'].every(k=>Number.isSafeInteger(r[k]))||r.experience<0||r.advantage<0||r.disadvantage<0||!r.termProof&&['modifier','experience','advantage','disadvantage'].some(k=>r[k]!==0))throw new Error('Ordinary native roll terms required');
    if(r.termProof){const {hash,...material}=r.termProof;if(material.version!==1||material.actorId!==r.actorId||material.ownerUserId!==r.ownerUserId||material.controlRevision!==r.controlRevision||hash!==createHash('sha256').update(JSON.stringify(material)).digest('hex'))throw new Error('Immutable native roll terms required');}
    r.status='awaiting_notice';return transact(check,()=>{const old=request(r.campaignId,r.id);if(old){if(JSON.stringify(old)!==JSON.stringify(r))throw new Error('Immutable roll request conflict');return old;}
      db.prepare('INSERT INTO vk3_requests VALUES(?,?,?)').run(r.campaignId,r.id,JSON.stringify(r));return r;});
  }
  const publication=(c,q)=>event(c,q,'notice_publication');
  function savePublication(c,q,row){const {sequence,...data}=row;db.prepare("UPDATE vk3_roll_events SET data=? WHERE campaign=? AND request=? AND kind='notice_publication'").run(JSON.stringify(data),c,q);return publication(c,q);}
  function claimNotice(c,q,input,{check}){return transact(check,()=>{
    const r=request(c,q);
    if(!r||!id(r.sourceRef)||!id(r.sourceRevision)||event(c,q,'notice')||publication(c,q)||!input||Object.keys(input).sort().join(',')!=='audienceFingerprint,channelId,payloadHash,recipientIds'||!id(input.channelId)||!Array.isArray(input.recipientIds)||!input.recipientIds.includes(r.ownerUserId)||input.recipientIds.length>256||input.recipientIds.some(v=>!id(v))||new Set(input.recipientIds).size!==input.recipientIds.length||![input.payloadHash,input.audienceFingerprint].every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)))throw new Error('Unclaimed current native roll notice required');
    const attempt=`roll-notice:${hash([c,q])}`;
    return insert(c,q,'notice_publication',attempt,{id:attempt,campaignId:c,requestRef:q,requestHash:hash(r),status:'delivering',channelId:input.channelId,recipientIds:[...input.recipientIds].sort(),payloadHash:input.payloadHash,audienceFingerprint:input.audienceFingerprint,response:null});
  });}
  function recordNoticeResponse(c,q,attempt,response,{check}){return transact(check,()=>{
    const row=publication(c,q);
    if(!row||row.id!==attempt||!response||Object.keys(response).sort().join(',')!=='attemptId,campaignId,channelId,messageId,requestRef'||response.attemptId!==attempt||response.campaignId!==c||response.requestRef!==q||response.channelId!==row.channelId||!id(response.messageId)||row.response&&hash(row.response)!==hash(response))throw new Error('Exact native roll send response required');
    return row.response?row:savePublication(c,q,{...row,response:structuredClone(response)});
  });}
  function markNoticeUncertain(c,q,attempt,{check}){return transact(check,()=>{
    const row=publication(c,q);if(!row||row.id!==attempt)throw new Error('Native roll notice attempt required');
    return row.status==='delivered'?row:savePublication(c,q,{...row,status:'uncertain'});
  });}
  function acknowledgeDelivery(c,q,input,{check}){return transact(check,()=>{
    const r=request(c,q);if(!r||typeof input.messageId!=='string'||!input.messageId||!Array.isArray(input.recipientIds)||!input.recipientIds.includes(r.ownerUserId)||input.recipientIds.some(x=>typeof x!=='string'||!x)||new Set(input.recipientIds).size!==input.recipientIds.length)throw new Error('Exact native delivered notice required');
    const odds={modifier:r.modifier,experience:r.experience,advantage:r.advantage,disadvantage:r.disadvantage};if(r.termProof&&(input.termHash!==r.termProof.hash||JSON.stringify(input.odds)!==JSON.stringify(odds)))throw new Error('Exact delivered native roll odds required');
    const p=publication(c,q);
    if(p&&(p.response?.messageId!==input.messageId||input.publicationRef!==p.id||p.requestHash!==hash(r)||hash(p.recipientIds)!==hash([...input.recipientIds].sort())))throw new Error('Exact native roll publication response required');
    const notice=insert(c,q,'notice',r.noticeRef,{id:r.noticeRef,status:'delivered',requestRef:q,messageId:input.messageId,recipientIds:[...input.recipientIds].sort(),difficulty:r.difficulty,stakes:r.stakes,...(r.termProof?{termHash:r.termProof.hash,odds}:{}),...(p?{publicationRef:p.id,channelId:p.channelId,payloadHash:p.payloadHash,audienceFingerprint:p.audienceFingerprint}:{})});
    if(p)savePublication(c,q,{...p,status:'delivered'});return notice;
  });}
  function recordOwnerRoll(c,q,input,{check,readContinuation}){
    if(typeof check!=='function')throw new Error('Native roll authorization required');let continuation=null;
    const current=()=>{check();if(continuation&&JSON.stringify(readContinuation(c,q))!==JSON.stringify(continuation))throw new Error('Original action continuation changed');};
    return transact(current,()=>{
    const r=request(c,q);if(!r||!event(c,q,'notice')||input.ownerUserId!==r.ownerUserId||typeof input.id!=='string'||!input.id||![input.hope,input.fear].every(v=>Number.isInteger(v)&&v>=1&&v<=12))throw new Error('Delivered request and authenticated owner dice required');
    if(fearHold(c,q)?.status==='held'&&!event(c,q,'roll'))throw new Error('Native Fear interruption holds this owner roll');
    const hold=fearHold(c,q);if(hold?.status==='completed'&&!event(c,q,'roll')){
      if(typeof readContinuation!=='function')throw new Error('Current native original-action continuation required');continuation=hold.continuation;
      if(JSON.stringify(readContinuation(c,q))!==JSON.stringify(continuation))throw new Error('Original action continuation changed');
    }
    const advDice=input.advDice??[];if(!Array.isArray(advDice)||advDice.length!==(r.advantage===r.disadvantage?0:1)||advDice.some(v=>!Number.isSafeInteger(v)||v<1||v>6))throw new Error('Actual native contextual d6 required');
    return insert(c,q,'roll',input.id,{id:input.id,campaignId:c,sceneId:r.sceneId,requestRef:q,actorId:r.actorId,ownerUserId:r.ownerUserId,authenticated:true,origin:'owner_roll',hope:input.hope,fear:input.fear,...(r.termProof?{advDice:[...advDice],termHash:r.termProof.hash}:{})});
  });}
  /** Native RNG is evaluated after persisted notice/Fear gates. The caller's check must
   * prove full mechanical readiness; a recorded owner choice or card identity alone cannot do so. */
  function generateOwnerRoll(c,q,input,{check,rng=d,readContinuation}={}){
    if(!input||Object.keys(input).sort().join(',')!=='bindingHash,interactionId,ownerUserId'||!id(input.interactionId)||input.interactionId.length>200||!id(input.ownerUserId)||typeof input.bindingHash!=='string'||!/^[a-f0-9]{64}$/.test(input.bindingHash)||typeof check!=='function'||typeof rng!=='function')throw new Error('Native owner interaction binding required');
    let continuation=null;
    const current=()=>{check();if(continuation&&JSON.stringify(readContinuation(c,q))!==JSON.stringify(continuation))throw new Error('Original action continuation changed');};
    return transact(current,()=>{
      const r=request(c,q),notice=event(c,q,'notice'),p=publication(c,q),prior=event(c,q,'roll');
      if(!r||r.ownerUserId!==input.ownerUserId||!r.termProof||!notice||p?.status!=='delivered'||p.id!==notice.publicationRef||p.response?.messageId!==notice.messageId||notice.termHash!==r.termProof.hash||p.requestHash!==hash(r))throw new Error('Exact published qualified owner request required');
      if(prior){if(!prior.interactionId||!prior.interactionBindingHash||prior.requestHash!==hash(r)||prior.deliveryHash!==hash(notice))throw new Error('Saved owner dice need reconciliation; no reroll');return prior;}
      const hold=fearHold(c,q);
      if(hold&&(hold.campaignId!==c||hold.requestRef!==q||!id(hold.decisionRef)||!['held','cancelled','completed'].includes(hold.status)))throw new Error('Native Fear state requires reconciliation');
      if(hold?.status==='held')throw new Error('Native Fear interruption holds this owner roll');
      if(hold?.status==='completed'){
        if(typeof readContinuation!=='function')throw new Error('Current native original-action continuation required');continuation=hold.continuation;
        if(!continuation||JSON.stringify(readContinuation(c,q))!==JSON.stringify(continuation))throw new Error('Original action continuation changed');
      }
      const result=dualityRoll({modifier:r.modifier,experience:r.experience,advantage:r.advantage,disadvantage:r.disadvantage},rng);
      return insert(c,q,'roll',`owner-roll:${input.interactionId}`,{id:`owner-roll:${input.interactionId}`,campaignId:c,sceneId:r.sceneId,requestRef:q,actorId:r.actorId,ownerUserId:r.ownerUserId,authenticated:true,origin:'owner_roll',hope:result.hope,fear:result.fear,advDice:result.adv_dice,termHash:r.termProof.hash,interactionId:input.interactionId,interactionBindingHash:input.bindingHash,requestHash:hash(r),deliveryHash:hash(notice),sourceRef:r.sourceRef,sourceRevision:r.sourceRevision});
    });
  }
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
  function releaseCompletedFear(c,q,{check,readCompletion,readContinuation}){return transact(check,()=>{
    const row=fearHold(c,q),r=request(c,q);if(!row||!r||typeof readCompletion!=='function'||typeof readContinuation!=='function')throw new Error('Native completed-interruption continuation required');
    const completion=structuredClone(readCompletion(c,q)),continuation=structuredClone(readContinuation(c,q));
    if(completion?.campaignId!==c||completion.requestRef!==q||completion.decisionRef!==row.decisionRef||continuation?.campaignId!==c||continuation.requestRef!==q||continuation.decisionRef!==row.decisionRef||continuation.status!=='ready'||continuation.actorId!==r.actorId||continuation.ownerUserId!==r.ownerUserId||continuation.controlRevision!==r.controlRevision||continuation.sceneId!==r.sceneId||continuation.sourceRef!==r.sourceRef||continuation.sourceRevision!==r.sourceRevision)throw new Error('Exact current owner/action continuation required');
    if(row.status==='completed'){if(JSON.stringify(row.continuation)!==JSON.stringify(continuation))throw new Error('Immutable original continuation conflict');return row;}
    if(row.status!=='held'||event(c,q,'roll'))throw new Error('Unrolled held original request required');
    if(JSON.stringify(readCompletion(c,q))!==JSON.stringify(completion)||JSON.stringify(readContinuation(c,q))!==JSON.stringify(continuation))throw new Error('Original action continuation changed');
    const after={...row,status:'completed',completion,continuation};db.prepare('UPDATE vk3_roll_fear_holds SET data=? WHERE campaign=? AND request=?').run(JSON.stringify(after),c,q);return after;
  });}
  return Object.freeze({createRequest,claimNotice,recordNoticeResponse,markNoticeUncertain,readNoticePublication:publication,acknowledgeDelivery,recordOwnerRoll,generateOwnerRoll,holdForFear,releaseCancelledFear,releaseCompletedFear,readFearHold:fearHold,
    readResultForRequest:(c,q)=>event(c,q,'roll'),
    readRequest(c,q){const r=request(c,q);return r?{...r,status:event(c,q,'notice')?'awaiting_player_roll':'awaiting_notice'}:null;},
    readDelivery(c,id){const r=db.prepare("SELECT request FROM vk3_roll_events WHERE campaign=? AND id=? AND kind='notice'").get(c,id);return r?event(c,r.request,'notice'):null;},
    readRoll(c,id){const r=db.prepare("SELECT request FROM vk3_roll_events WHERE campaign=? AND id=? AND kind='roll'").get(c,id);return r?event(c,r.request,'roll'):null;},close:()=>db.close()});
}
