import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),bodyHash=v=>createHash('sha256').update(v).digest('hex');
/** Shared native delivery evidence. Not a grant to disclose or execute anything. */
export function readDeliveredNarrative(turnStore,campaign,source){
 const r=turnStore.inspectNative(campaign,source),d=r?.data,a=d?.authorization,p=d?.deliveredParts;
 if(r?.status!=='published'||hash(d?.draft)!==d?.fingerprint||d?.review?.fingerprint!==a?.reviewHash||hash(d?.review?.value)!==a?.reviewHash||d?.review?.value?.heldCount!==0||d?.review?.value?.candidateText!==a?.parts?.join('')||a?.authority!=='native_ai_gm'||a.kind!=='narrative'||!Array.isArray(a.parts)||!Array.isArray(p)||a.parts.length!==p.length||!p.length||p.some((v,i)=>v.index!==i||typeof v.messageId!=='string'||v.textHash!==hash(a.parts[i]))||a.textHash!==hash(a.parts.join(''))||a.sourceRef!==source||a.sourceRevision!==r.revision||d.published?.messageIds?.join(',')!==p.map(v=>v.messageId).join(','))throw new Error('Complete native delivered narrative required');
 return {text:a.parts.join(''),audience:d.draft.audience,delivery:d.draft.delivery,revision:r.revision,receiptHash:hash([a,p,d.published])};
}
/** Conversation remembers publication, not newly established world truth or NPC hearing. */
export function createPublicationMemory({turnStore,store,sourceRegistry}){
 function capture(campaign,source){
  const proof=readDeliveredNarrative(turnStore,campaign,source),event=sourceRegistry.get(source)?.event;if(!event||event.campaignId!==campaign)throw new Error('Published conversation source required');const refs=[];
  for(let offset=0;offset<proof.text.length;){let end=Math.min(offset+14000,proof.text.length);if(end<proof.text.length&&/[\uD800-\uDBFF]/.test(proof.text[end-1]))end--;const text=proof.text.slice(offset,end),id='gm-statement:'+hash([campaign,source,proof.revision,proof.receiptHash,offset]),origin={kind:'native_gm_statement',sourceRef:source,sourceRevision:proof.revision,receiptHash:proof.receiptHash,offset,end},metadata={status:'active',kind:'testimony',scope:'campaign',visibility:'recipients',disclosure:'observed',recipientIds:[...proof.audience.recipients],knownBy:[],sourceRefs:[],...(proof.delivery.mode==='private'?{viewActorIds:[event.actorId]}:{}),origin};
   store.append({campaignId:campaign,id,expectedRevision:null,evidenceRef:id,metadata,body:text},{check(){if(hash(readDeliveredNarrative(turnStore,campaign,source))!==hash(proof))throw new Error('Delivered conversation changed');}});refs.push(id);offset=end;
  }return refs;
 }
 function validate(row){try{const o=row.origin,proof=o&&readDeliveredNarrative(turnStore,row.campaignId,o.sourceRef),event=o&&sourceRegistry.get(o.sourceRef)?.event;return o?.kind==='native_gm_statement'&&row.id==='gm-statement:'+hash([row.campaignId,o.sourceRef,o.sourceRevision,o.receiptHash,o.offset])&&Object.keys(o).sort().join(',')==='end,kind,offset,receiptHash,sourceRef,sourceRevision'&&proof.revision===o.sourceRevision&&proof.receiptHash===o.receiptHash&&event?.campaignId===row.campaignId&&Number.isSafeInteger(o.offset)&&Number.isSafeInteger(o.end)&&o.offset>=0&&o.end>o.offset&&o.end-o.offset<=14000&&o.end<=proof.text.length&&row.kind==='testimony'&&row.scope==='campaign'&&row.visibility==='recipients'&&row.disclosure==='observed'&&JSON.stringify(row.recipientIds)===JSON.stringify(proof.audience.recipients)&&row.knownBy.length===0&&row.sourceRefs.length===0&&JSON.stringify(row.viewActorIds??null)===JSON.stringify(proof.delivery.mode==='private'?[event.actorId]:null)&&row.contentHash===bodyHash(proof.text.slice(o.offset,o.end));}catch{return false;}}
 function entitled(row,source){return validate(row)&&row.campaignId===source.campaign&&source.recipients.every(id=>row.recipientIds.includes(id))&&(!row.viewActorIds||source.actors.some(id=>row.viewActorIds.includes(id)));}
 function describe(row,source){if(!entitled(row,source))throw new Error('Entitled published conversation required');return {kind:'gm_statement'};}
 return Object.freeze({capture,validate,entitled,describe});
}
