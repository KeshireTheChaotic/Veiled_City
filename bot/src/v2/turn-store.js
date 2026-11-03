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
  /** Newest saved drafts for GM review only; drafts are unreviewed and never player-visible. */
  const recentDrafts=(campaignId,limit=5)=>{if(!id(campaignId)||!Number.isSafeInteger(limit)||limit<1||limit>20)throw new Error('Campaign and bounded draft count required');return db.prepare("SELECT source,revision,data FROM vk2_turns WHERE campaign=? AND status='draft_saved' ORDER BY rowid DESC LIMIT ?").all(campaignId,limit).map(r=>({source:r.source,revision:r.revision,draft:JSON.parse(r.data).draft}));};
  return Object.freeze({claim,saveDraft,recentDrafts,inspectNative:read,close:()=>db.close()});
}
