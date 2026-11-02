import {createHash} from 'node:crypto';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const textHash=value=>createHash('sha256').update(value).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const list=value=>Array.isArray(value)&&value.every(id)&&new Set(value).size===value.length;
const fail=()=>{throw new Error('Context authority unavailable or stale');};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

/** Metadata is read before bodies. The repository must not return text in metadata. */
export function createContextAuthority({sourceAuthority,records,readActor}){
  if(typeof sourceAuthority?.revalidate!=='function'||typeof records?.metadata!=='function'||typeof records?.readText!=='function'||typeof readActor!=='function')throw new TypeError('Native context readers required');
  const grants=new WeakMap();
  function actorProof(source,actorId){
    if(actorId===null)return null;
    const actor=readActor(source.campaign,actorId);
    if(!actor||actor.id!==actorId||actor.campaignId!==source.campaign||actor.sceneId!==source.scene
      ||actor.kind!=='npc'||actor.status!=='active'||actor.controllerUserId!==null||actor.proxyAuthorized===true||!id(actor.controlRevision))fail();
    return hash(actor);
  }
  function eligible(row,source,actorId){
    return row&&id(row.id)&&id(row.revision)&&/^[a-f0-9]{64}$/.test(row.contentHash)&&row.campaignId===source.campaign&&row.status==='active'
      &&['testimony','belief','observation','identity','fact','canon'].includes(row.kind)
      &&(row.scope==='campaign'||row.scope==='scene'&&row.sceneId===source.scene)
      &&list(row.sourceRefs)&&list(row.recipientIds)&&list(row.knownBy)
      &&(row.visibility==='public'&&row.disclosure==='public'
        ||row.visibility==='recipients'&&['observed','acknowledged'].includes(row.disclosure)&&source.recipients.every(r=>row.recipientIds.includes(r)))
      &&(actorId===null||row.knownBy.includes(actorId));
  }
  function closure(ref,source,actorId,metadata,visiting=new Set()){
    if(!id(ref)||visiting.has(ref)||visiting.size>=64||metadata.size>=256)return false;
    let row=metadata.get(ref);
    if(!row){row=records.metadata(source.campaign,ref);if(row)metadata.set(ref,structuredClone(row));}
    if(row?.id!==ref||!eligible(row,source,actorId))return false;
    const next=new Set([...visiting,ref]);
    return row.sourceRefs.every(parent=>closure(parent,source,actorId,metadata,next));
  }
  function issue(source,references,{actorId=null}={}){
    if(!sourceAuthority.revalidate(source)||!list(references)||references.length>64||actorId!==null&&!id(actorId))fail();
    const nativeSource=structuredClone(source),actorRevision=actorProof(nativeSource,actorId);
    const dependencies=new Map(),selected=[];
    for(const ref of references){
      const metadata=new Map();
      if(!closure(ref,nativeSource,actorId,metadata))continue;
      const row=metadata.get(ref),body=records.readText(nativeSource.campaign,ref,row.revision);
      if(!body||body.revision!==row.revision||typeof body.text!=='string'||body.text.length>16000||textHash(body.text)!==row.contentHash)fail();
      for(const [key,value] of metadata)dependencies.set(key,hash(value));
      selected.push({ref,revision:row.revision,kind:row.kind,text:body.text});
    }
    const packet=freeze({source_ref:nativeSource.id,scene:nativeSource.scene,utterance:nativeSource.text,
      actor_ref:actorId,records:selected,trace_id:nativeSource.traceId??nativeSource.id});
    const grant=Object.freeze(Object.create(null));
    grants.set(grant,{source:nativeSource,actorId,actorRevision,dependencies,packet});
    inspect(grant);return grant;
  }
  function inspect(grant){
    const state=grant&&grants.get(grant);if(!state||!sourceAuthority.revalidate(state.source))fail();
    if(actorProof(state.source,state.actorId)!==state.actorRevision)fail();
    for(const [ref,revision] of state.dependencies){
      const current=records.metadata(state.source.campaign,ref);
      if(!current||hash(current)!==revision)fail();
    }
    return state.packet;
  }
  function audience(grant){
    inspect(grant);const {source}=grants.get(grant);
    return freeze({campaign:source.campaign,scene:source.scene,source_ref:source.id,recipients:[...source.recipients],revision:source.revision});
  }
  return Object.freeze({issue,inspect,audience});
}
