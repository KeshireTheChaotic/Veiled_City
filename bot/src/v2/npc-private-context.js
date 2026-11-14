import {createRecallPlanner} from './recall-planner.js';
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
 function eligible(row,source,actorId){return row&&id(row.id)&&id(row.revision)&&row.campaignId===source.campaign&&row.status==='active'&&['testimony','belief','observation','identity','fact','canon','goal','plan','relationship'].includes(row.kind)&&(row.scope==='campaign'||row.scope==='scene'&&row.sceneId===source.scene)&&ids(row.sourceRefs)&&ids(row.knownBy)&&row.knownBy.includes(actorId)&&ids(row.recipientIds)&&typeof row.contentHash==='string'&&/^[a-f0-9]{64}$/.test(row.contentHash)&&(!Object.hasOwn(row,'origin')||records.validateNpcOrigin?.(row,actorId)===true)&&(row.visibility==='gm'&&row.disclosure==='private'&&row.recipientIds.length===0||row.visibility==='public'&&row.disclosure==='public'||row.visibility==='recipients'&&['observed','acknowledged'].includes(row.disclosure)&&row.recipientIds.length>0);}
 function valid(state){if(!sourceAuthority.revalidate(state.source)||actor(state.source,state.actorId)!==state.actorHash)fail();for(const [ref,fingerprint] of state.dependencies){const row=records.metadata(state.source.campaign,ref);if(!eligible(row,state.source,state.actorId)||hash(row)!==fingerprint)fail();}}
 function closure(ref,source,actorId,rows,path=new Set()){
  if(!id(ref)||path.has(ref)||path.size>=64||rows.size>=256)return false;
  let row=rows.get(ref);if(!row){row=records.metadata(source.campaign,ref);if(row)rows.set(ref,structuredClone(row));}
  return row?.id===ref&&eligible(row,source,actorId)&&row.sourceRefs.every(parent=>closure(parent,source,actorId,rows,new Set([...path,ref])));
 }
 function entitled(source,ref,{actorId}={}){
  if(!sourceAuthority.revalidate(source)||!id(actorId))fail();const actorHash=actor(source,actorId),rows=new Map(),allowed=closure(ref,source,actorId,rows);
  if(!sourceAuthority.revalidate(source)||actor(source,actorId)!==actorHash)fail();for(const [key,row]of rows)if(hash(records.metadata(source.campaign,key))!==hash(row))fail();return allowed;
 }
 function select(source,references,{actorId,limit=64,causes=[],pins=[],tick=0,focus=[]}={}){
  if(!sourceAuthority.revalidate(source)||!id(actorId))fail();actor(source,actorId);
  if(!Array.isArray(references)||references.length>16384||references.some(r=>!id(r))||new Set(references).size!==references.length||!ids(focus))fail();
  const order=new Map(references.map((r,i)=>[r,i])),core=references.filter(ref=>{const row=records.metadata(source.campaign,ref);return ['goal','identity'].includes(row?.kind)&&entitled(source,ref,{actorId});});
  const wanted=[...new Set([...focus,...core])].slice(0,256);
  return createRecallPlanner({contextAuthority:{entitled},readCandidates:()=>references,readCauses:()=>causes,readPins:()=>pins,readClock:()=>tick,compareCandidates:(a,b)=>(order.get(a)??16384)-(order.get(b)??16384)||a.localeCompare(b)}).select(source,{actorId,limit,focus:wanted});
 }
 function issue(source,references,{actorId}={}){
  if(!sourceAuthority.revalidate(source)||!id(actorId)||!ids(references)||references.length>64||!ids(source.actors??[]))fail();
  const nativeSource=structuredClone(source),actorHash=actor(nativeSource,actorId),dependencies=new Map(),selected=[];

  for(const ref of references){const rows=new Map();if(!closure(ref,nativeSource,actorId,rows))continue;const row=rows.get(ref),body=records.readText(nativeSource.campaign,ref,row.revision);if(body?.revision!==row.revision||typeof body.text!=='string'||body.text.length>16000||bodyHash(body.text)!==row.contentHash)fail();for(const [key,r] of rows){const fingerprint=hash(r);if(dependencies.has(key)&&dependencies.get(key)!==fingerprint)fail();dependencies.set(key,fingerprint);}selected.push({ref,revision:row.revision,kind:row.kind,text:body.text,...(row.origin?{authorship:records.describeNpcOrigin?.(row,actorId)??{kind:'npc_statement',speaker_ref:actorId}}:{})});}
  const packet=freeze({visibility:'npc_private',source_ref:nativeSource.id,scene:nativeSource.scene,utterance:'',actor_ref:actorId,human_controlled_actor_refs:[...(nativeSource.actors??[])],portrayal:{kind:'independent_npc',actor_ref:actorId},records:selected,trace_id:nativeSource.traceId??nativeSource.id}),state={source:nativeSource,actorId,actorHash,dependencies,packet};valid(state);const grant=Object.freeze(Object.create(null));grants.set(grant,state);return grant;
 }
 function inspect(grant){const state=grant&&grants.get(grant);if(!state)fail();valid(state);return state.packet;}
 function dependencyManifest(grant){inspect(grant);const s=grants.get(grant);return freeze({version:1,visibility:'npc_private',campaignId:s.source.campaign,sceneId:s.source.scene,sourceRef:s.source.id,sourceRevision:s.source.revision,actorId:s.actorId,actorRevision:s.actorHash,records:[...s.dependencies].map(([ref,metadataHash])=>({ref,metadataHash}))});}
 return Object.freeze({issue,inspect,dependencyManifest,entitled,select});
}
