import {createHash} from 'node:crypto';import {gmHookImportInput} from './gm-hook-import-input.js';import {normalizeGmHookImport} from './gm-hook-package.js';
const hash=v=>createHash('sha256').update(v).digest('hex'),freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
// Same normalization and 128KiB bound as the original narrative-text helper.
export function normalizeGmNarrative(text){const out=String(text??'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trimEnd()+'\n';if(!out.trim())throw new Error('Narrative Markdown cannot be empty.');if(Buffer.byteLength(out,'utf8')>128*1024)throw new Error('Narrative Markdown is too large; maximum is 128 KiB.');return out;}
/** Read/preparation only. Caller must privately defer its observed interaction
 * before network work and separately commit via native import validation.
 */
export function createGmHookAttachmentReader({gmAuthority,fetchImpl=fetch,timeoutMs=10000}){
 if(['authorize','check','refresh','readDeclaration'].some(k=>typeof gmAuthority?.[k]!=='function')||typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>15000)throw new TypeError('Native GM import reader dependencies required');
 async function read(e,{signal}={}){
  const input=gmHookImportInput(e);if(!input)throw new Error('Existing GM hook import command required');let proof=await gmAuthority.authorize(e,{signal});
  const check=()=>{signal?.throwIfAborted();gmAuthority.check(proof);if(proof.operation!=='gm_hook_import'||JSON.stringify(gmAuthority.readDeclaration(proof).payload)!==JSON.stringify(input))throw new Error('Exact current GM import authority required');};
  async function bytes(attachment){
   check();const bounded=signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs);let response;
   try{response=await fetchImpl(attachment.url,{method:'GET',redirect:'error',signal:bounded});}catch{throw new Error('GM hook attachment download failed');}
   check();if(!response.ok||response.redirected||typeof response.body?.getReader!=='function')throw new Error('Readable exact GM attachment response required');
   const reader=response.body.getReader(),chunks=[];let total=0;try{for(;;){bounded.throwIfAborted();const {done,value}=await reader.read();if(done)break;if(!(value instanceof Uint8Array))throw new Error('GM import attachment bytes required');total+=value.byteLength;if(total>attachment.size)throw new Error('GM import attachment exceeds declared size');chunks.push(Buffer.from(value));}bounded.throwIfAborted();if(total!==attachment.size)throw new Error('GM import attachment size changed');return Buffer.concat(chunks,total);}finally{try{await reader.cancel();}catch{}reader.releaseLock();}
  }
  check();const json=await bytes(input.file);proof=await gmAuthority.refresh(proof,{signal});check();
  const packet=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(json)),normalized=normalizeGmHookImport(packet),character=input.character||normalized.character_name;
  if(typeof character!=='string'||!character.trim()||character.length>256)throw new Error('GM import character name or explicit selection required');let narrative=null,narrativeBytes=null;
  if(input.narrative){narrativeBytes=await bytes(input.narrative);proof=await gmAuthority.refresh(proof,{signal});check();narrative=normalizeGmNarrative(new TextDecoder('utf-8',{fatal:true}).decode(narrativeBytes));}
  const attachments=[{id:input.file.id,name:input.file.name,bytes:json.length,sha256:hash(json)},...(input.narrative?[{id:input.narrative.id,name:input.narrative.name,bytes:narrativeBytes.length,sha256:hash(narrativeBytes)}]:[])];check();
  // Return validated raw JSON: normalizing again during native commit must not
  // duplicate legacy unkeyed imported_gm_hooks entries.
  return Object.freeze({status:'prepared_private_import',visibility:'gm_private',campaignId:proof.campaignId,principal:proof.principal,sourceRef:proof.sourceRef,sourceRevision:proof.sourceRevision,character,packet:freeze(packet),narrative,attachments:freeze(attachments),executionAuthority:false,publicationAuthority:false,canonAuthority:false,check});
 }
 return Object.freeze({read});
}
