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
  /** Private diagnostic snapshots, never publication grants or game-state patches. */
  function saveReview(claim,review,{check,expectedSequence=0}){
    if(claim?.status!=='claimed'||typeof check!=='function'||!Number.isSafeInteger(expectedSequence)||expectedSequence<0)throw new Error('Native review claim and sequence required');
    const keys=['id','status','sent','knowledgeAcknowledged','candidateText','segments','heldCount','retiredCount'];
    if(!review||Object.keys(review).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(review,k))||review.status!=='requires_semantic_review'||review.sent!==false||review.knowledgeAcknowledged!==false||typeof review.candidateText!=='string'||review.candidateText.length>20000||!Array.isArray(review.segments)||review.segments.length<1||review.segments.length>256||!Number.isSafeInteger(review.retiredCount)||review.retiredCount<0)throw new Error('Bounded unapproved native segment review required');
    const value=JSON.parse(JSON.stringify(review)),fingerprint=hash(value);
    db.exec('BEGIN IMMEDIATE');try{
      check();const row=read(claim.campaignId,claim.sourceRef);
      if(row?.status!=='draft_saved'||row.token!==claim.token||row.revision!==claim.sourceRevision||value.id!==row.data.draft.id)throw new Error('Current source-bound saved draft required');
      for(const [index,segment] of value.segments.entries()){
        if(Object.keys(segment).sort().join(',')!=='id,index,issues,status,text'||segment.index!==index||typeof segment.text!=='string'||!segment.text.trim()||segment.text.length>20000||!['screened','withheld'].includes(segment.status)||!Array.isArray(segment.issues)||segment.id!==`segment:${hash([row.data.draft.audience,segment.text,index])}`)throw new Error('Source-bound native review segment required');
        if((segment.status==='withheld')!==(segment.issues.length>0)||segment.issues.some(issue=>Object.keys(issue).sort().join(',')!=='excerpt,kind,offset'||!['pc_agency','pc_inner_state','mechanical_result'].includes(issue.kind)||typeof issue.excerpt!=='string'||!issue.excerpt||!Number.isSafeInteger(issue.offset)||issue.offset<0||segment.text.slice(issue.offset,issue.offset+issue.excerpt.length)!==issue.excerpt))throw new Error('Native material review issue required');
      }
      if(value.heldCount!==value.segments.filter(s=>s.status==='withheld').length||value.candidateText!==value.segments.filter(s=>s.status==='screened').map(s=>s.text).join('\n\n'))throw new Error('Native segment review disposition mismatch');
      const prior=row.data.review;
      if(prior?.fingerprint===fingerprint){check();db.exec('COMMIT');return {sequence:prior.sequence,fingerprint,created:false};}
      if((prior?.sequence??0)!==expectedSequence)throw new Error('Native review sequence conflict');
      const sequence=expectedSequence+1,history=[...(row.data.reviewHistory??[]),...(prior?[prior]:[])];
      db.prepare('UPDATE vk2_turns SET data=? WHERE campaign=? AND source=?').run(JSON.stringify({...row.data,review:{sequence,fingerprint,value},reviewHistory:history}),claim.campaignId,claim.sourceRef);
      check();db.exec('COMMIT');return {sequence,fingerprint,created:true};
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  /** Newest saved drafts for GM review only; drafts are unreviewed and never player-visible. */
  const recentDrafts=(campaignId,limit=5)=>{if(!id(campaignId)||!Number.isSafeInteger(limit)||limit<1||limit>20)throw new Error('Campaign and bounded draft count required');return db.prepare("SELECT source,revision,data FROM vk2_turns WHERE campaign=? AND status='draft_saved' ORDER BY rowid DESC LIMIT ?").all(campaignId,limit).map(r=>{const d=JSON.parse(r.data);return {source:r.source,revision:r.revision,fingerprint:d.fingerprint,draft:d.draft};});};
  /** Exactly-once publication states. A started publication is never retried: an interrupted or
   * failed send becomes publication_uncertain and needs native review.
   */
  const draftRow=(campaignId,source)=>{const row=read(campaignId,source);return row?.status==='draft_saved'?row:null;};
  function beginPublication(campaignId,source,{approvedFingerprint,approval,check}){
    if(![campaignId,source,approvedFingerprint].every(id)||typeof check!=='function'||!approval||typeof approval!=='object')throw new Error('Exact approved native draft required');
    db.exec('BEGIN IMMEDIATE');try{
      check();const row=draftRow(campaignId,source);if(!row||row.data.fingerprint!==approvedFingerprint)throw new Error('Approved draft is not the current saved draft');
      db.prepare("UPDATE vk2_turns SET status='publishing',data=? WHERE campaign=? AND source=?").run(JSON.stringify({...row.data,approval:JSON.parse(JSON.stringify(approval))}),campaignId,source);
      check();db.exec('COMMIT');return row.data.draft;
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  const settle=(campaignId,source,status,extra)=>{db.exec('BEGIN IMMEDIATE');try{const row=read(campaignId,source);if(row?.status!=='publishing')throw new Error('A started publication is required');db.prepare('UPDATE vk2_turns SET status=?,data=? WHERE campaign=? AND source=?').run(status,JSON.stringify({...row.data,...extra}),campaignId,source);db.exec('COMMIT');return status;}catch(e){db.exec('ROLLBACK');throw e;}};
  const finishPublication=(campaignId,source,messageId)=>{if(!id(messageId))throw new Error('Sent message id required');return settle(campaignId,source,'published',{published:{messageId}});};
  const markPublicationUncertain=(campaignId,source,reason)=>settle(campaignId,source,'publication_uncertain',{uncertain:{reason:String(reason).slice(0,200)}});
  return Object.freeze({claim,saveDraft,saveReview,recentDrafts,beginPublication,finishPublication,markPublicationUncertain,inspectNative:read,close:()=>db.close()});
}
