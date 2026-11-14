import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
/** Native-only durable claims. An interrupted claim is uncertain, never an
 * automatic permission to repeat inference or publish a saved draft.
 */
export function openTurnStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{
    if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>r.name!=='vk2_turns'))throw new Error('Dedicated turn database required');
    db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk2_turns(campaign TEXT,source TEXT,revision TEXT,token TEXT,status TEXT,data TEXT,PRIMARY KEY(campaign,source))');
  }catch(e){db.close();throw e;}
  function read(campaign,source){const r=db.prepare('SELECT * FROM vk2_turns WHERE campaign=? AND source=?').get(campaign,source);return r?{...r,data:r.data?JSON.parse(r.data):null}:null;}
  function claim({campaignId,sourceRef,sourceRevision}){
    if(![campaignId,sourceRef,sourceRevision].every(id))throw new Error('Native turn source required');
    const token=randomUUID();
    const result=db.prepare("INSERT OR IGNORE INTO vk2_turns VALUES(?,?,?,?,'in_progress',NULL)").run(campaignId,sourceRef,sourceRevision,token);
    const row=read(campaignId,sourceRef);if(row.revision!==sourceRevision)throw new Error('Turn source revision conflict');
    return Object.freeze(result.changes?{status:'claimed',campaignId,sourceRef,sourceRevision,token}:{status:row.status==='in_progress'?'requires_reconciliation':'awaiting_revalidation',campaignId,sourceRef,sourceRevision});
  }
  function saveDraft(claim,draft,{check}){
    if(claim?.status!=='claimed'||typeof check!=='function'||typeof draft?.text!=='string'||!draft.text.trim()||draft.text.length>20000
      ||draft.sent!==false||draft.knowledgeAcknowledged!==false||draft.status!=='awaiting_review')throw new Error('Native unreviewed draft required');
    const value=JSON.parse(JSON.stringify(draft)),fingerprint=hash(value);
    db.exec('BEGIN IMMEDIATE');try{
      check();const row=read(claim.campaignId,claim.sourceRef);
      if(!row||row.token!==claim.token||row.revision!==claim.sourceRevision)throw new Error('Native turn claim mismatch');
      if(row.status==='draft_saved'){
        if(row.data.fingerprint!==fingerprint)throw new Error('Immutable turn draft conflict');
      }else if(row.status==='in_progress')db.prepare("UPDATE vk2_turns SET status='draft_saved',data=? WHERE campaign=? AND source=?").run(JSON.stringify({fingerprint,draft:value}),claim.campaignId,claim.sourceRef);
      else throw new Error('Turn requires reconciliation');
      check();db.exec('COMMIT');return {status:'awaiting_revalidation',sent:false,knowledgeAcknowledged:false};
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  function reviewValue(review){
    const keys=['id','status','sent','knowledgeAcknowledged','candidateText','segments','heldCount','retiredCount'];
    if(!review||Object.keys(review).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(review,k))||review.status!=='requires_semantic_review'||review.sent!==false||review.knowledgeAcknowledged!==false||typeof review.candidateText!=='string'||review.candidateText.length>20000||!Array.isArray(review.segments)||review.segments.length<1||review.segments.length>256||!Number.isSafeInteger(review.retiredCount)||review.retiredCount<0)throw new Error('Bounded unapproved native segment review required');
    return JSON.parse(JSON.stringify(review));
  }
  function validateReview(value,draft){
    if(value.id!==draft.id)throw new Error('Current source-bound saved draft required');
    for(const [index,segment] of value.segments.entries()){
      if(Object.keys(segment).sort().join(',')!=='id,index,issues,status,text'||segment.index!==index||typeof segment.text!=='string'||!segment.text.trim()||segment.text.length>20000||!['screened','withheld'].includes(segment.status)||!Array.isArray(segment.issues)||segment.id!==`segment:${hash([draft.audience,segment.text,index])}`)throw new Error('Source-bound native review segment required');
      if((segment.status==='withheld')!==(segment.issues.length>0)||segment.issues.some(issue=>Object.keys(issue).sort().join(',')!=='excerpt,kind,offset'||!['pc_agency','pc_inner_state','mechanical_result'].includes(issue.kind)||typeof issue.excerpt!=='string'||!issue.excerpt||!Number.isSafeInteger(issue.offset)||issue.offset<0||segment.text.slice(issue.offset,issue.offset+issue.excerpt.length)!==issue.excerpt))throw new Error('Native material review issue required');
    }
    if(value.segments.map(s=>s.text).join('\n\n').length>20000||value.heldCount!==value.segments.filter(s=>s.status==='withheld').length||value.candidateText!==value.segments.filter(s=>s.status==='screened').map(s=>s.text).join('\n\n'))throw new Error('Native segment review disposition mismatch');
  }
  const reviewTexts=value=>value.segments.map(s=>s.text);
  function unchangedReviewText(value,prior,draft){
    const expected=prior?reviewTexts(prior):draft.text.split(/\n[\t ]*\n+/).filter(t=>t.trim());
    if(JSON.stringify(reviewTexts(value))!==JSON.stringify(expected)||value.retiredCount!==(prior?.retiredCount??0))throw new Error('Local repair provenance required');
  }
  /** Private diagnostic snapshots. repairFrom binds a replacement to one previously held paragraph. */
  function saveReview(claim,review,{check,expectedSequence=0,repairFrom=null}){
    if(claim?.status!=='claimed'||typeof check!=='function'||!Number.isSafeInteger(expectedSequence)||expectedSequence<0)throw new Error('Native review claim and sequence required');
    const value=reviewValue(review),before=repairFrom?reviewValue(repairFrom):null,fingerprint=hash(value);
    db.exec('BEGIN IMMEDIATE');try{
      check();const row=read(claim.campaignId,claim.sourceRef);
      if(row?.status!=='draft_saved'||row.token!==claim.token||row.revision!==claim.sourceRevision)throw new Error('Current source-bound saved draft required');
      validateReview(value,row.data.draft);if(before)validateReview(before,row.data.draft);
      const prior=row.data.review;
      if(prior?.fingerprint===fingerprint){
        if(before&&prior.repair?.fromFingerprint!==hash(before))throw new Error('Local repair replay conflict');
        check();db.exec('COMMIT');return {sequence:prior.sequence,fingerprint,created:false};
      }
      if((prior?.sequence??0)!==expectedSequence)throw new Error('Native review sequence conflict');
      let repair=null;
      if(before){
        if(prior&&prior.fingerprint!==hash(before))throw new Error('Local repair base changed');
        if(!prior)unchangedReviewText(before,null,row.data.draft);
        const changed=value.segments.filter((s,i)=>JSON.stringify(s)!==JSON.stringify(before.segments[i]));
        if(value.segments.length!==before.segments.length||changed.length!==1||before.segments[changed[0]?.index]?.status!=='withheld'||changed[0].text===before.segments[changed[0].index].text||value.retiredCount!==before.retiredCount+1)throw new Error('One withheld local repair required');
        repair={fromFingerprint:hash(before),fromSegmentId:before.segments[changed[0].index].id,toSegmentId:changed[0].id};
      }else unchangedReviewText(value,prior?.value,row.data.draft);
      const sequence=expectedSequence+1,baseline=prior??(before?{sequence:0,fingerprint:hash(before),value:before}:null),history=[...(row.data.reviewHistory??[]),...(baseline?[baseline]:[])];
      db.prepare('UPDATE vk2_turns SET data=? WHERE campaign=? AND source=?').run(JSON.stringify({...row.data,review:{sequence,fingerprint,value,...(repair?{repair}:{})},reviewHistory:history}),claim.campaignId,claim.sourceRef);
      check();db.exec('COMMIT');return {sequence,fingerprint,created:true};
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  /** Native journal inspection/recovery only; no Human-GM narrative approval. */
  const recentDrafts=(campaignId,limit=5)=>{if(!id(campaignId)||!Number.isSafeInteger(limit)||limit<1||limit>20)throw new Error('Campaign and bounded draft count required');return db.prepare("SELECT source,revision,data FROM vk2_turns WHERE campaign=? AND status='draft_saved' ORDER BY rowid DESC LIMIT ?").all(campaignId,limit).map(r=>{const d=JSON.parse(r.data);return {source:r.source,revision:r.revision,fingerprint:d.fingerprint,draft:d.draft};});};
  /** Exactly-once publication states. A started publication is never retried: an interrupted or
   * failed send becomes publication_uncertain and needs native review.
   */
  const draftRow=(campaignId,source)=>{const row=read(campaignId,source);return row?.status==='draft_saved'?row:null;};
  function beginPublication(campaignId,source,{expectedFingerprint,authorization,check}){
    if(![campaignId,source,expectedFingerprint].every(id)||typeof check!=='function'||authorization?.authority!=='native_ai_gm'||Object.keys(authorization).sort().join(',')!=='authority,kind,parts,reviewHash,sourceRef,sourceRevision,textHash,traceId'||!['narrative','system_notice'].includes(authorization.kind)||authorization.sourceRef!==source||![authorization.sourceRevision,authorization.traceId].every(id)||!['reviewHash','textHash'].every(k=>/^[a-f0-9]{64}$/.test(authorization[k]))||!Array.isArray(authorization.parts)||!authorization.parts.length||authorization.parts.length>32||authorization.parts.some(p=>typeof p!=='string'||!p.length||p.length>1900)||hash(authorization.parts.join(''))!==authorization.textHash)throw new Error('Exact autonomous native publication required');
    db.exec('BEGIN IMMEDIATE');try{
      check();const row=draftRow(campaignId,source);if(!row||row.data.fingerprint!==expectedFingerprint||row.revision!==authorization.sourceRevision||row.data.review?.fingerprint!==authorization.reviewHash||hash(row.data.review.value)!==authorization.reviewHash||authorization.kind==='narrative'&&(row.data.review.value.heldCount!==0||row.data.review.value.candidateText!==authorization.parts.join('')))throw new Error('Publication is not the current saved draft');
      db.prepare("UPDATE vk2_turns SET status='publishing',data=? WHERE campaign=? AND source=?").run(JSON.stringify({...row.data,authorization:structuredClone(authorization),deliveredParts:[]}),campaignId,source);
      check();db.exec('COMMIT');return row.data.draft;
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  const settle=(campaignId,source,status,extra)=>{db.exec('BEGIN IMMEDIATE');try{const row=read(campaignId,source);if(row?.status!=='publishing')throw new Error('A started publication is required');db.prepare('UPDATE vk2_turns SET status=?,data=? WHERE campaign=? AND source=?').run(status,JSON.stringify({...row.data,...extra}),campaignId,source);db.exec('COMMIT');return status;}catch(e){db.exec('ROLLBACK');throw e;}};
  function recordPublicationPart(campaignId,source,{index,messageId},{check}){
    if(typeof check!=='function'||!Number.isSafeInteger(index)||index<0||!id(messageId))throw new Error('Exact native publication part required');
    db.exec('BEGIN IMMEDIATE');try{check();const row=read(campaignId,source),parts=row?.data?.authorization?.parts,delivered=row?.data?.deliveredParts;if(row?.status!=='publishing'||!Array.isArray(parts)||!Array.isArray(delivered)||index!==delivered.length||index>=parts.length)throw new Error('Current undelivered publication part required');
      const next=[...delivered,{index,messageId,textHash:hash(parts[index])}];db.prepare('UPDATE vk2_turns SET data=? WHERE campaign=? AND source=?').run(JSON.stringify({...row.data,deliveredParts:next}),campaignId,source);check();db.exec('COMMIT');return next[index];
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  function finishPublication(campaignId,source,{check}){
    if(typeof check!=='function')throw new Error('Current native publication authority required');db.exec('BEGIN IMMEDIATE');try{check();const row=read(campaignId,source),parts=row?.data?.authorization?.parts,delivered=row?.data?.deliveredParts;
      if(row?.status!=='publishing'||!Array.isArray(parts)||!Array.isArray(delivered)||!parts.length||parts.length!==delivered.length||delivered.some((p,i)=>p.index!==i||!id(p.messageId)||p.textHash!==hash(parts[i])))throw new Error('All exact publication parts must be delivered');
      db.prepare("UPDATE vk2_turns SET status='published',data=? WHERE campaign=? AND source=?").run(JSON.stringify({...row.data,published:{messageId:delivered[0].messageId,messageIds:delivered.map(p=>p.messageId)}}),campaignId,source);check();db.exec('COMMIT');return 'published';
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  const markPublicationUncertain=(campaignId,source,reason,observedParts=[])=>{if(!Array.isArray(observedParts)||observedParts.length>32||observedParts.some(p=>!Number.isSafeInteger(p.index)||p.index<0||!id(p.messageId)))throw new Error('Bounded observed publication receipts required');return settle(campaignId,source,'publication_uncertain',{uncertain:{reason:String(reason).slice(0,200),observedParts:structuredClone(observedParts)}});};
  return Object.freeze({claim,saveDraft,saveReview,recentDrafts,beginPublication,recordPublicationPart,finishPublication,markPublicationUncertain,inspectNative:read,close:()=>db.close()});
}
