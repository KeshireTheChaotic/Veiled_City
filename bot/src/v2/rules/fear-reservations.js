import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {preRollFearTerms} from './pre-roll-fear.js';
import {diceSpec,d,gmD20Roll,gmAttackDamage} from './dice.js';
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
    const terms=preRollFearTerms({...opportunity,fear:pool.amount,reservedFear:reserved(campaign)}),row={terms,bindingHash:hash(terms),fingerprint,status:'awaiting_announcement',publication:{campaignId:campaign,requestRef,bindingHash:hash(terms),status:'not_started',attemptCount:0},history:[{status:'awaiting_announcement'}]};
    if(hash(readOpportunity(campaign,requestRef))!==fingerprint)throw new Error('Fear opportunity changed');db.prepare('INSERT INTO vk3_fear_reservations VALUES(?,?,?)').run(campaign,requestRef,JSON.stringify(row));return row;
  });}
  function claimAnnouncement(c,q,{check,readOpportunity}){return tx(check,()=>{
    const row=read(c,q);if(!row||row.status!=='awaiting_announcement'||row.publication?.status!=='not_started'||row.publication.attemptCount!==0)throw new Error('Fear publication already attempted or unavailable');
    if(typeof readOpportunity!=='function'||hash(readOpportunity(c,q))!==row.fingerprint)throw new Error('Pending pre-roll opportunity changed');
    const publication={...row.publication,status:'delivering',attemptCount:1,attemptId:randomUUID()},after={...row,publication};
    if(hash(readOpportunity(c,q))!==row.fingerprint)throw new Error('Fear opportunity changed before publication');
    db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify(after),c,q);return publication;
  });}
  function markAnnouncementUncertain(c,q,attemptId,{check}){return tx(check,()=>{
    const row=read(c,q);if(!row||row.status!=='awaiting_announcement'||!['delivering','uncertain'].includes(row.publication?.status)||row.publication.attemptId!==attemptId)throw new Error('Exact pending Fear publication attempt required');
    const publication={...row.publication,status:'uncertain'};db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify({...row,publication}),c,q);return publication;
  });}
  function recordAnnouncementResponse(c,q,attemptId,{check,readResponse}){return tx(check,()=>{
    const row=read(c,q);if(!row||!['delivering','uncertain','delivered'].includes(row.publication?.status)||row.publication.attemptId!==attemptId||typeof readResponse!=='function')throw new Error('Exact saved Fear publication attempt required');
    const response=structuredClone(readResponse(c,q));
    if(response?.campaignId!==c||response.requestRef!==q||response.attemptId!==attemptId||typeof response.channelId!=='string'||!response.channelId||typeof response.messageId!=='string'||!response.messageId||typeof response.audienceFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(response.audienceFingerprint))throw new Error('Exact native Fear send response required');
    if(row.publication.response){if(JSON.stringify(row.publication.response)!==JSON.stringify(response))throw new Error('Immutable Fear send response conflict');return row.publication;}
    if(JSON.stringify(readResponse(c,q))!==JSON.stringify(response))throw new Error('Fear send response changed');
    const publication={...row.publication,response};db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify({...row,publication}),c,q);return publication;
  });}
  function acknowledge(campaign,requestRef,{readNotice,readOpportunity,check}){return tx(check,()=>{
    const row=read(campaign,requestRef),notice=structuredClone(readNotice(campaign,requestRef));
    if(typeof readOpportunity!=='function'||!row||hash(readOpportunity(campaign,requestRef))!==row.fingerprint)throw new Error('Pending pre-roll opportunity changed');
    if(!['delivering','uncertain','delivered'].includes(row.publication?.status)||notice?.attemptId!==row.publication.attemptId)throw new Error('Exact saved Fear publication attempt required');
    if(row.publication.response&&notice?.messageId!==row.publication.response.messageId)throw new Error('Fear notice must match saved native send response');
    if(!row||!['awaiting_announcement','announced'].includes(row.status)||notice?.status!=='delivered'||notice.kind!=='pre_roll_fear'||notice.requestRef!==requestRef||notice.bindingHash!==row.bindingHash
      ||notice.baseCost!==1||notice.printedFearCost!==0||notice.npcId!==row.terms.npcId||notice.actorId!==row.terms.actorId||!Array.isArray(notice.recipientIds)||notice.recipientIds.length!==1||notice.recipientIds[0]!==row.terms.ownerUserId||typeof notice.messageId!=='string'||!notice.messageId)throw new Error('Exact delivered owner Fear announcement required');
    if(row.notice){if(JSON.stringify(row.notice)!==JSON.stringify(notice))throw new Error('Fear notice replay conflict');return row;}
    const after={...row,status:'announced',notice,publication:{...row.publication,status:'delivered',messageId:notice.messageId},history:[...row.history,{status:'announced',messageId:notice.messageId}]};if(JSON.stringify(readNotice(campaign,requestRef))!==JSON.stringify(notice)||hash(readOpportunity(campaign,requestRef))!==row.fingerprint)throw new Error('Fear notice or opportunity changed');db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify(after),campaign,requestRef);return after;
  });}
  function cancel(c,q,{check,readPublication}){return tx(check,()=>{
    const row=read(c,q);if(!row)throw new Error('Native Fear reservation required');if(row.status==='cancelled')return row;
    if(row.status!=='awaiting_announcement'||row.notice)throw new Error('Acknowledged Fear interruption requires reviewed recovery');
    if(row.publication?.status!=='not_started'||row.publication.attemptCount!==0)throw new Error('Attempted or uncertain Fear publication requires reviewed recovery');
    if(typeof readPublication!=='function')throw new Error('Native unattempted Fear publication proof required');
    const publication=structuredClone(readPublication(c,q));
    if(publication?.campaignId!==c||publication.requestRef!==q||publication.bindingHash!==row.bindingHash||publication.status!=='not_started'||publication.attemptCount!==0)throw new Error('Attempted or uncertain Fear publication requires reviewed recovery');
    const after={...row,status:'cancelled',history:[...row.history,{status:'cancelled'}]};
    if(JSON.stringify(readPublication(c,q))!==JSON.stringify(publication))throw new Error('Fear publication changed during cancellation');
    db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify(after),c,q);return after;
  });}
  function recoverUnreserved(c,q,{check,readHold,readReview,readPublication}){return tx(check,()=>{
    if([readHold,readReview,readPublication].some(f=>typeof f!=='function'))throw new Error('Native orphan hold recovery evidence required');
    const hold=structuredClone(readHold(c,q)),review=structuredClone(readReview(c,q)),publication=structuredClone(readPublication(c,q));
    if(hold?.campaignId!==c||hold.requestRef!==q||!['held','cancelled'].includes(hold.status)||typeof hold.decisionRef!=='string'||!hold.decisionRef)throw new Error('Exact native orphan hold required');
    if(review?.campaignId!==c||review.requestRef!==q||review.decisionRef!==hold.decisionRef||review.status!=='approved'||review.operation!=='cancel_unreserved_fear_hold'||typeof review.id!=='string'||!review.id||typeof review.reviewerUserId!=='string'||!review.reviewerUserId)throw new Error('Inspected approved native recovery review required');
    const old=read(c,q);if(old){if(old.recoveryKind!=='unreserved_hold'||JSON.stringify(old.review)!==JSON.stringify(review))throw new Error('Existing Fear reservation cannot use orphan recovery');return old;}
    if(hold.status!=='held'||publication?.campaignId!==c||publication.requestRef!==q||publication.decisionRef!==hold.decisionRef||publication.status!=='not_started'||publication.attemptCount!==0)throw new Error('Unattempted orphan Fear publication required');
    const terms={campaignId:c,requestRef:q,decisionRef:hold.decisionRef},row={terms,bindingHash:hash(terms),fingerprint:null,status:'cancelled',recoveryKind:'unreserved_hold',review,publication,history:[{status:'cancelled',reviewRef:review.id}]};
    if(JSON.stringify(readHold(c,q))!==JSON.stringify(hold)||JSON.stringify(readReview(c,q))!==JSON.stringify(review)||JSON.stringify(readPublication(c,q))!==JSON.stringify(publication))throw new Error('Orphan recovery evidence changed');
    db.prepare('INSERT INTO vk3_fear_reservations VALUES(?,?,?)').run(c,q,JSON.stringify(row));return row;
  });}
  function prepareIncoming(c,q,{check,readCandidate}){return tx(check,()=>{
    const row=read(c,q);if(row?.status!=='announced'||row.publication?.status!=='delivered'||typeof readCandidate!=='function')throw new Error('Acknowledged native Fear announcement required before incoming offer');
    const candidate=structuredClone(readCandidate(c,q)),t=row.terms;
    const strings=['id','campaignId','sceneId','requestRef','decisionRef','actorId','ownerUserId','controlRevision','npcId','sourceRef','sourceRevision','targetRevision','encounterRevision','statblockRevision','ruleFingerprint','damageExpression','damageType'];
    if(!candidate||Object.keys(candidate).length!==strings.length+7||strings.some(k=>typeof candidate[k]!=='string'||!candidate[k]||candidate[k].length>256)
      ||candidate.campaignId!==c||candidate.sceneId!==t.sceneId||candidate.requestRef!==q||candidate.decisionRef!==t.decisionRef||candidate.actorId!==t.actorId||candidate.ownerUserId!==t.ownerUserId||candidate.controlRevision!==t.controlRevision||candidate.npcId!==t.npcId
      ||!/^[a-f0-9]{64}$/.test(candidate.ruleFingerprint)||!['physical','magic'].includes(candidate.damageType)||![candidate.attackBonus,candidate.evasion,candidate.major,candidate.severe].every(Number.isSafeInteger)||candidate.evasion<1||candidate.major<1||candidate.severe<candidate.major
      ||typeof candidate.advantage!=='boolean'||typeof candidate.disadvantage!=='boolean'||candidate.advantage&&candidate.disadvantage
      ||!candidate.defenses||Object.keys(candidate.defenses).sort().join(',')!=='armorAllowed,armorReduction,resistance,sourceRef'||!['none','half','immune'].includes(candidate.defenses.resistance)||![1,2].includes(candidate.defenses.armorReduction)||typeof candidate.defenses.armorAllowed!=='boolean'||typeof candidate.defenses.sourceRef!=='string'||!candidate.defenses.sourceRef)throw new Error('Exact inspected native incoming attack candidate required');
    diceSpec(candidate.damageExpression);
    const fingerprint=hash(candidate);if(row.incoming){if(row.incoming.termsHash!==fingerprint)throw new Error('Immutable incoming offer conflict');return row.incoming;}
    const incoming={terms:candidate,termsHash:fingerprint,status:'awaiting_defense',effectsCommitted:false};
    if(hash(readCandidate(c,q))!==fingerprint)throw new Error('Incoming candidate changed');
    db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify({...row,incoming}),c,q);return incoming;
  });}
  function incomingDefense(c,q,mode,{check,readCandidate,readEvidence}){return tx(check,()=>{
    const row=read(c,q),incoming=row?.incoming;
    if(row?.status!=='announced'||!incoming||!['awaiting_defense','hold_for_owner','ready'].includes(incoming.status)||typeof readCandidate!=='function'||typeof readEvidence!=='function'||hash(readCandidate(c,q))!==incoming.termsHash)throw new Error('Current native incoming offer required');
    const evidence=structuredClone(readEvidence(c,q)),t=incoming.terms;
    if(evidence?.campaignId!==c||evidence.sceneId!==t.sceneId||evidence.attackRef!==t.id||evidence.termsHash!==incoming.termsHash||evidence.ownerUserId!==t.ownerUserId||evidence.actorId!==t.actorId||evidence.controlRevision!==t.controlRevision
      ||!['id','sourceRef','sourceRevision'].every(k=>typeof evidence[k]==='string'&&evidence[k])||!Number.isSafeInteger(evidence.sequence)||evidence.sequence<1)throw new Error('Exact affected owner defense evidence required');
    let after;
    if(mode==='review'){
      if(evidence.kind!=='incoming_defense_review')throw new Error('Native owner defense review required');
      if(incoming.review){if(JSON.stringify(incoming.review)!==JSON.stringify(evidence))throw new Error('Immutable owner review conflict');return incoming;}
      after={...incoming,review:evidence,choices:[]};
    }else{
      if(evidence.kind!=='incoming_defense_choice'||!incoming.review||evidence.reviewRef!==incoming.review.id||evidence.sequence<=incoming.review.sequence||!['confirm_base_defenses','withhold_defense'].includes(evidence.decision))throw new Error('Ordered reviewed explicit owner defense choice required');
      if(evidence.decision==='confirm_base_defenses'&&(t.defenses.sourceRef!=='base'||t.defenses.resistance!=='none'||t.defenses.armorReduction!==1||!t.defenses.armorAllowed))throw new Error('Feature defenses require their separate native reviewed route');
      const prior=incoming.choices.find(e=>e.id===evidence.id);if(prior){if(JSON.stringify(prior)!==JSON.stringify(evidence))throw new Error('Owner defense choice replay conflict');return incoming;}
      if(incoming.status==='ready')throw new Error('Owner defense already confirmed');
      const last=incoming.choices.at(-1);if(last&&evidence.sequence<=last.sequence)throw new Error('Owner defense choice sequence changed');
      after={...incoming,status:evidence.decision==='confirm_base_defenses'?'ready':'hold_for_owner',choices:[...incoming.choices,evidence]};
    }
    if(hash(readCandidate(c,q))!==incoming.termsHash||JSON.stringify(readEvidence(c,q))!==JSON.stringify(evidence))throw new Error('Incoming defense authority changed');
    db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify({...row,incoming:after}),c,q);return after;
  });}
  function rollIncoming(c,q,{check,readCandidate,readDefense,rng=d}){return tx(check,()=>{
    const row=read(c,q),incoming=row?.incoming;
    if(!incoming||typeof readDefense!=='function'||typeof rng!=='function')throw new Error('Native reviewed incoming attack required');
    const defense=structuredClone(readDefense(c,q)),choice=incoming.choices?.at(-1);
    if(!incoming.review||choice?.decision!=='confirm_base_defenses'||JSON.stringify(defense)!==JSON.stringify({review:incoming.review,choice}))throw new Error('Current exact native owner defense proofs required');
    if(incoming.result)return incoming.result;
    if(row.status!=='announced'||row.publication?.status!=='delivered'||incoming.status!=='ready'||typeof readCandidate!=='function'||hash(readCandidate(c,q))!==incoming.termsHash)throw new Error('Current ready native incoming attack required');
    const pool=db.prepare('SELECT amount FROM vk3_fear_pool WHERE campaign=?').get(c);
    if(!pool||!Number.isSafeInteger(pool.amount)||pool.amount<reserved(c)||pool.amount<1||pool.amount>12||row.terms.baseCost!==1||row.terms.printedFearCost!==0)throw new Error('Exact reserved campaign Fear required');
    db.prepare('UPDATE vk3_fear_pool SET amount=? WHERE campaign=?').run(pool.amount-1,c);
    const t=incoming.terms,roll=gmD20Roll({kind:'attack',modifier:t.attackBonus,difficulty:t.evasion,advantage:t.advantage,disadvantage:t.disadvantage},rng),damage=gmAttackDamage(roll,t.damageExpression,rng);
    const result={id:`${t.id}:roll`,campaignId:c,requestRef:q,attackRef:t.id,decisionRef:t.decisionRef,termsHash:incoming.termsHash,reviewRef:incoming.review.id,choiceRef:choice.id,fear:{before:pool.amount,after:pool.amount-1,amount:1},roll,damage,damageType:t.damageType,fearCommitted:true,hpEffectsCommitted:false};
    if(hash(readCandidate(c,q))!==incoming.termsHash||JSON.stringify(readDefense(c,q))!==JSON.stringify(defense))throw new Error('Incoming execution authority changed');
    db.prepare('UPDATE vk3_fear_reservations SET data=? WHERE campaign=? AND request=?').run(JSON.stringify({...row,status:'executing',incoming:{...incoming,status:roll.success?'awaiting_armor':'missed',result},history:[...row.history,{status:'executing',resultRef:result.id}]}),c,q);return result;
  });}
  return Object.freeze({initialize,reserve,claimAnnouncement,markAnnouncementUncertain,recordAnnouncementResponse,acknowledge,cancel,recoverUnreserved,prepareIncoming,rollIncoming,
    reviewIncoming:(c,q,options)=>incomingDefense(c,q,'review',options),recordIncomingDefense:(c,q,options)=>incomingDefense(c,q,'choice',options),
    read,readPublication:(c,q)=>read(c,q)?.publication??null,reserved,close:()=>db.close()});
}
