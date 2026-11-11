import {createHash} from 'node:crypto';
import {createProseMaterialReview} from './prose-material-review.js';

/** R1 no-send outbox. Queued prose remains unreviewed and cannot update recipient knowledge. */
export function createOfflinePublicationQueue({gateway,contextAuthority,materialReview=createProseMaterialReview()}){
  if(typeof gateway?.inspect!=='function'||typeof contextAuthority?.audience!=='function'||typeof contextAuthority?.dependencyManifest!=='function'||typeof materialReview?.review!=='function')throw new TypeError('Draft and audience authorities required');
  const rows=new Map();
  function queue(draft,{additionalGrants=[]}={}){
    if(!Array.isArray(additionalGrants)||additionalGrants.length>16)throw new Error('Bounded native context grants required');
    const value=gateway.inspect(draft),audience=contextAuthority.audience(value.grant);
    const contextDependencies=Object.freeze([value.grant,...additionalGrants].map(grant=>contextAuthority.dependencyManifest(grant)));
    const fingerprint=JSON.stringify([audience,value.text,contextDependencies]);
    const id=`publication:${createHash('sha256').update(fingerprint).digest('hex')}`;
    if(!rows.has(id))rows.set(id,{draft,audience,text:value.text,traceId:value.traceId,contextDependencies,fragments:value.text.split(/\n[\t ]*\n+/).filter(t=>t.trim()),retired:[]});
    return Object.freeze({id,status:'awaiting_review',sent:false,knowledgeAcknowledged:false});
  }
  function inspect(id){
    const row=rows.get(id);if(!row)throw new Error('Publication not available');
    const current=gateway.inspect(row.draft);contextAuthority.audience(current.grant);
    return Object.freeze({id,status:'awaiting_review',sent:false,knowledgeAcknowledged:false,
      text:row.text,audience:row.audience,traceId:row.traceId,contextDependencies:row.contextDependencies});
  }
  // Native diagnostic/review surface only. "screened" is not a publication grant.
  function evaluate(id,fragments,retiredCount){
    inspect(id);const row=rows.get(id),segments=materialReview.review(fragments.join('\n\n'),row.audience);
    inspect(id);
    return Object.freeze({id,status:'requires_semantic_review',sent:false,knowledgeAcknowledged:false,
      candidateText:segments.filter(s=>s.status==='screened').map(s=>s.text).join('\n\n'),
      segments,heldCount:segments.filter(s=>s.status==='withheld').length,retiredCount});
  }
  function review(id){
    inspect(id);const row=rows.get(id);return evaluate(id,row.fragments,row.retired.length);
  }
  function repair(id,segmentId,replacement,{commit=()=>{}}={}){
    if(typeof commit!=='function'||['AsyncFunction','AsyncGeneratorFunction','GeneratorFunction'].includes(commit.constructor.name))throw new Error('Synchronous native repair commit required');
    const current=review(id),segment=current.segments.find(s=>s.id===segmentId);
    if(!segment||segment.status!=='withheld'||replacement===segment.text||typeof replacement!=='string'||!replacement.trim()||replacement.length>20000||/\n[\t ]*\n/.test(replacement))throw new Error('One current withheld segment and bounded local replacement required');
    const row=rows.get(id),next=[...row.fragments];next[segment.index]=replacement;
    if(next.join('\n\n').length>20000)throw new Error('Repaired prose exceeds draft bound');
    // Review first; a failed or revoked repair leaves the original segment untouched.
    const result=evaluate(id,next,row.retired.length+1);
    const check=()=>{if(JSON.stringify(evaluate(id,next,row.retired.length+1))!==JSON.stringify(result))throw new Error('Prepared local repair changed');};
    const saved=commit(result,{check});
    if(saved&&typeof saved.then==='function'){Promise.resolve(saved).catch(()=>{});throw new Error('Synchronous native repair commit required');}
    row.retired.push(segment);row.fragments=next;return result;
  }
  return Object.freeze({queue,inspect,review,repair});
}
