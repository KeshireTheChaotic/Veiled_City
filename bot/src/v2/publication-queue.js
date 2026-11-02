import {createHash} from 'node:crypto';

/** R1 no-send outbox. Queued prose remains unreviewed and cannot update recipient knowledge. */
export function createOfflinePublicationQueue({gateway,contextAuthority}){
  if(typeof gateway?.inspect!=='function'||typeof contextAuthority?.audience!=='function')throw new TypeError('Draft and audience authorities required');
  const rows=new Map();
  function queue(draft){
    const value=gateway.inspect(draft),audience=contextAuthority.audience(value.grant);
    const fingerprint=JSON.stringify([audience,value.text]);
    const id=`publication:${createHash('sha256').update(fingerprint).digest('hex')}`;
    if(!rows.has(id))rows.set(id,{draft,audience,text:value.text,traceId:value.traceId});
    return Object.freeze({id,status:'awaiting_review',sent:false,knowledgeAcknowledged:false});
  }
  function inspect(id){
    const row=rows.get(id);if(!row)throw new Error('Publication not available');
    const current=gateway.inspect(row.draft);contextAuthority.audience(current.grant);
    return Object.freeze({id,status:'awaiting_review',sent:false,knowledgeAcknowledged:false,
      text:row.text,audience:row.audience,traceId:row.traceId});
  }
  return Object.freeze({queue,inspect});
}
