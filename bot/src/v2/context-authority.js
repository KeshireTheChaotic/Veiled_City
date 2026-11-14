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
      &&(!Object.hasOwn(row,'viewActorIds')||list(row.viewActorIds)&&row.viewActorIds.length>0&&row.viewActorIds.length<=256&&Array.isArray(source.actors)&&source.actors.some(actor=>row.viewActorIds.includes(actor)))
      &&(actorId===null||row.knownBy.includes(actorId))&&originEntitled(row,source);
  }
  function originEntitled(row,source){
    if(!Object.hasOwn(row,'origin'))return true;
    try{return typeof records.entitledOrigin==='function'&&records.entitledOrigin(row,source)===true;}catch{return false;}
  }
  function authorship(row,source){
    if(!Object.hasOwn(row,'origin'))return null;
    const value=typeof records.describeOrigin==='function'?records.describeOrigin(row,source):null;
    if(!value||Object.keys(value).sort().join(',')!=='kind,same_controller_view'||value.kind!=='human_statement'||typeof value.same_controller_view!=='boolean')fail();
    return {kind:value.kind,same_controller_view:value.same_controller_view};
  }
  function originValid(row){
    if(!Object.hasOwn(row,'origin'))return true;
    try{return typeof records.validateOrigin==='function'&&records.validateOrigin(row)===true;}catch{return false;}
  }
  function checkOrigins(rows){
    const checked=new Set(),visiting=new Set();
    function visit(ref){if(checked.has(ref))return;if(visiting.has(ref))fail();const row=rows.get(ref);if(!row)fail();visiting.add(ref);for(const parent of row.sourceRefs)visit(parent);if(!originValid(row))fail();visiting.delete(ref);checked.add(ref);}
    for(const ref of rows.keys())visit(ref);
  }
  function closure(ref,source,actorId,metadata,visiting=new Set()){
    if(!id(ref)||visiting.has(ref)||visiting.size>=64||metadata.size>=256)return false;
    let row=metadata.get(ref);
    if(!row){row=records.metadata(source.campaign,ref);if(row)metadata.set(ref,structuredClone(row));}
    if(row?.id!==ref||!eligible(row,source,actorId))return false;
    const next=new Set([...visiting,ref]);
    return row.sourceRefs.every(parent=>closure(parent,source,actorId,metadata,next))&&originValid(row);
  }
  function issue(source,references,{actorId=null}={}){
    if(!sourceAuthority.revalidate(source)||!list(references)||references.length>64||actorId!==null&&!id(actorId))fail();
    if(source.actors!==undefined&&!list(source.actors))fail();
    const nativeSource=structuredClone(source),actorRevision=actorProof(nativeSource,actorId);
    const dependencies=new Map(),selected=[];
    for(const ref of references){
      const metadata=new Map();
      if(!closure(ref,nativeSource,actorId,metadata))continue;
      const row=metadata.get(ref),attribution=authorship(row,nativeSource),body=records.readText(nativeSource.campaign,ref,row.revision);
      if(!body||body.revision!==row.revision||typeof body.text!=='string'||body.text.length>16000||textHash(body.text)!==row.contentHash)fail();
      for(const [key,value] of metadata)dependencies.set(key,hash(value));
      selected.push({ref,revision:row.revision,kind:row.kind,text:body.text,...(attribution?{authorship:attribution}:{})});
    }
    // A player's current message is GM input, not evidence that this NPC heard
    // in-character speech. Actor portrayal receives only known, entitled records.
    const packet=freeze({source_ref:nativeSource.id,scene:nativeSource.scene,utterance:actorId===null?nativeSource.text:'',
      actor_ref:actorId,human_controlled_actor_refs:[...(nativeSource.actors??[])],portrayal:{kind:actorId===null?'gm':'independent_npc',actor_ref:actorId},records:selected,trace_id:nativeSource.traceId??nativeSource.id});
    const grant=Object.freeze(Object.create(null));
    grants.set(grant,{source:nativeSource,actorId,actorRevision,dependencies,packet});
    inspect(grant);return grant;
  }
  function inspect(grant){
    const state=grant&&grants.get(grant);if(!state||!sourceAuthority.revalidate(state.source))fail();
    if(actorProof(state.source,state.actorId)!==state.actorRevision)fail();
    const currentRows=new Map();
    for(const [ref,revision] of state.dependencies){
      const current=records.metadata(state.source.campaign,ref);
      if(!eligible(current,state.source,state.actorId)||hash(current)!==revision)fail();
      currentRows.set(ref,current);
    }
    checkOrigins(currentRows);
    return state.packet;
  }
  function audience(grant){
    inspect(grant);const {source}=grants.get(grant);
    return freeze({campaign:source.campaign,scene:source.scene,source_ref:source.id,recipients:[...source.recipients],revision:source.revision});
  }
  /** Native durable lineage only: hashes and references, never record bodies or a disclosure grant. */
  function dependencyManifest(grant){
    inspect(grant);const state=grants.get(grant),source=state.source;
    return freeze({version:state.actorId===null?1:2,campaignId:source.campaign,sceneId:source.scene,sourceRef:source.id,sourceRevision:source.revision,recipientIds:[...source.recipients],actorId:state.actorId,actorRevision:state.actorRevision,records:[...state.dependencies].map(([ref,metadataHash])=>({ref,metadataHash}))});
  }
  function verifyDependencies(source,manifest){
    const keys=['version','campaignId','sceneId','sourceRef','sourceRevision','recipientIds','actorId','actorRevision','records'];
    if(!sourceAuthority.revalidate(source)||!manifest||Object.keys(manifest).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(manifest,k))||manifest.version!==(manifest.actorId===null?1:2)||manifest.campaignId!==source.campaign||manifest.sceneId!==source.scene||manifest.sourceRef!==source.id||manifest.sourceRevision!==source.revision||!list(manifest.recipientIds)||JSON.stringify(manifest.recipientIds)!==JSON.stringify(source.recipients)||manifest.actorId!==null&&!id(manifest.actorId)||!Array.isArray(manifest.records)||manifest.records.length>16384)fail();
    if(actorProof(source,manifest.actorId)!==manifest.actorRevision)fail();
    const refs=new Set();
    for(const entry of manifest.records){if(!entry||Object.keys(entry).sort().join(',')!=='metadataHash,ref'||!id(entry.ref)||typeof entry.metadataHash!=='string'||!/^[a-f0-9]{64}$/.test(entry.metadataHash)||refs.has(entry.ref))fail();refs.add(entry.ref);}
    const rows=new Map();
    for(const entry of manifest.records){
      const row=records.metadata(source.campaign,entry.ref);
      if(!eligible(row,source,manifest.actorId)||hash(row)!==entry.metadataHash||row.sourceRefs.some(ref=>!refs.has(ref)))fail();
      rows.set(entry.ref,row);
    }
    const depths=new Map(),visiting=new Set();
    function depth(ref){if(visiting.has(ref))fail();if(depths.has(ref))return depths.get(ref);visiting.add(ref);const n=1+Math.max(0,...rows.get(ref).sourceRefs.map(depth));visiting.delete(ref);if(n>64)fail();depths.set(ref,n);return n;}
    for(const ref of refs)depth(ref);
    checkOrigins(rows);
    return true;
  }
  // A model-selected reference is only a lookup candidate, never an entitlement.
  function read(source,reference){return inspect(issue(source,[reference]));}
  function entitled(source,reference,{actorId=null}={}){
    if(!sourceAuthority.revalidate(source))fail();
    actorProof(source,actorId);
    return closure(reference,source,actorId,new Map());
  }
  return Object.freeze({issue,inspect,audience,read,entitled,dependencyManifest,verifyDependencies});
}
