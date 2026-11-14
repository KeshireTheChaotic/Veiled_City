import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),bodyHash=v=>createHash('sha256').update(v).digest('hex');
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256,ids=v=>Array.isArray(v)&&v.length<=256&&v.every(id)&&new Set(v).size===v.length;
const fail=()=>{throw new Error('Private NPC cognition authority unavailable or stale');};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
/** Native-only cognition grants. Private actor knowledge never becomes an
 * audience grant, disclosure permission, objective fact or action authority.
 * Current player text and unproven human-statement origins are always absent.
 */
export function createNpcPrivateContext({sourceAuthority,records,readActor}){
 if(typeof sourceAuthority?.revalidate!=='function'||typeof records?.metadata!=='function'||typeof records?.readText!=='function'||typeof readActor!=='function')throw new TypeError('Complete native private NPC readers required');
 const grants=new WeakMap();
 function actor(source,actorId){const a=readActor(source.campaign,actorId);if(a?.id!==actorId||a.campaignId!==source.campaign||a.sceneId!==source.scene||a.kind!=='npc'||a.status!=='active'||a.controllerUserId!==null||a.controlRole!=null||a.delegationRef!=null||a.proxyAuthorized===true||!id(a.controlRevision))fail();return hash(a);}
 function eligible(row,source,actorId){return row&&id(row.id)&&id(row.revision)&&row.campaignId===source.campaign&&row.status==='active'&&['testimony','belief','observation','identity','fact','canon','goal','plan','relationship'].includes(row.kind)&&(row.scope==='campaign'||row.scope==='scene'&&row.sceneId===source.scene)&&ids(row.sourceRefs)&&ids(row.knownBy)&&row.knownBy.includes(actorId)&&ids(row.recipientIds)&&typeof row.contentHash==='string'&&/^[a-f0-9]{64}$/.test(row.contentHash)&&!Object.hasOwn(row,'origin')&&(row.visibility==='gm'&&row.disclosure==='private'&&row.recipientIds.length===0||row.visibility==='public'&&row.disclosure==='public'||row.visibility==='recipients'&&['observed','acknowledged'].includes(row.disclosure)&&row.recipientIds.length>0);}
 function valid(state){if(!sourceAuthority.revalidate(state.source)||actor(state.source,state.actorId)!==state.actorHash)fail();for(const [ref,fingerprint] of state.dependencies){const row=records.metadata(state.source.campaign,ref);if(!eligible(row,state.source,state.actorId)||hash(row)!==fingerprint)fail();}}
 function issue(source,references,{actorId}={}){
  if(!sourceAuthority.revalidate(source)||!id(actorId)||!ids(references)||references.length>64||!ids(source.actors??[]))fail();
  const nativeSource=structuredClone(source),actorHash=actor(nativeSource,actorId),dependencies=new Map(),selected=[];
  function closure(ref,rows,path=new Set()){
   if(path.has(ref)||path.size>=64||rows.size>=256)return false;
   let row=rows.get(ref);if(!row){row=records.metadata(nativeSource.campaign,ref);if(row)rows.set(ref,structuredClone(row));}
   return row?.id===ref&&eligible(row,nativeSource,actorId)&&row.sourceRefs.every(parent=>closure(parent,rows,new Set([...path,ref])));
  }
  for(const ref of references){const rows=new Map();if(!closure(ref,rows))continue;const row=rows.get(ref),body=records.readText(nativeSource.campaign,ref,row.revision);if(body?.revision!==row.revision||typeof body.text!=='string'||body.text.length>16000||bodyHash(body.text)!==row.contentHash)fail();for(const [key,r] of rows)dependencies.set(key,hash(r));selected.push({ref,revision:row.revision,kind:row.kind,text:body.text});}
  const packet=freeze({visibility:'npc_private',source_ref:nativeSource.id,scene:nativeSource.scene,utterance:'',actor_ref:actorId,human_controlled_actor_refs:[...(nativeSource.actors??[])],portrayal:{kind:'independent_npc',actor_ref:actorId},records:selected,trace_id:nativeSource.traceId??nativeSource.id}),state={source:nativeSource,actorId,actorHash,dependencies,packet};valid(state);const grant=Object.freeze(Object.create(null));grants.set(grant,state);return grant;
 }
 function inspect(grant){const state=grant&&grants.get(grant);if(!state)fail();valid(state);return state.packet;}
 function dependencyManifest(grant){inspect(grant);const s=grants.get(grant);return freeze({version:1,visibility:'npc_private',campaignId:s.source.campaign,sceneId:s.source.scene,sourceRef:s.source.id,sourceRevision:s.source.revision,actorId:s.actorId,actorRevision:s.actorHash,records:[...s.dependencies].map(([ref,metadataHash])=>({ref,metadataHash}))});}
 return Object.freeze({issue,inspect,dependencyManifest});
}
