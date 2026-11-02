import {createHash,randomUUID} from 'node:crypto';

export const TOOL_NAMES=Object.freeze(['context_read','action_propose','state_inspect','knowledge_propose']);
function canonical(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  throw new TypeError('JSON data required');
}
const hash=value=>createHash('sha256').update(canonical(value)).digest('hex');
const text=(value,max=256)=>typeof value==='string'&&value.length>0&&value.length<=max;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function closed(value,required,optional=[]){
  return object(value)&&required.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>required.includes(k)||optional.includes(k));
}
const blocked=code=>Object.freeze({status:'blocked',code});
function freeze(value){
  if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;
}
function snapshot(value){canonical(value);return freeze(structuredClone(value));}

/** Code-owned registry. Registration is deliberately absent from the AI capability object. */
export function createRulesetRegistry(definitions=[]){
  const entries=new Map();
  for(const definition of definitions){
    if(!definition||!text(definition.kind)||!text(definition.version)||typeof definition.validate!=='function'||typeof definition.prepare!=='function')throw new TypeError('Versioned native validator and preparation function required');
    if(entries.has(definition.kind))throw new Error('Duplicate native operation');
    entries.set(definition.kind,Object.freeze({...definition}));
  }
  return Object.freeze({
    get:kind=>entries.get(kind),
    describe:()=>Object.freeze([...entries.values()].map(({kind,version})=>Object.freeze({kind,version})))
  });
}

/** Offline repository implementation only. R7 replaces this with transactional durable storage. */
export function createMemoryJournal(){
  const sources=new Map(),receipts=new Map();
  return Object.freeze({
    source:id=>sources.get(id),
    recordSource(source){
      const value=snapshot(source),prior=sources.get(source.id);
      if(prior&&hash(prior)!==hash(value))throw new Error('Source identity conflict');
      if(!prior)sources.set(source.id,value);
      return sources.get(source.id);
    },
    receipt:id=>receipts.get(id),
    recordReceipt(receipt){
      const value=snapshot(receipt),prior=receipts.get(receipt.id);
      if(prior&&hash(prior)!==hash(value))throw new Error('Receipt identity conflict');
      if(!prior)receipts.set(receipt.id,value);
      return receipts.get(receipt.id);
    }
  });
}

/**
 * New generic boundary, currently preparation-only. Native intake and revalidation
 * are supplied by the trusted application, never by model arguments. No effect,
 * dice, publication, database patch or protected knowledge commit exists here.
 */
export function createKernel({authority,journal,rules=createRulesetRegistry(),knowledge=null}){
  if(typeof authority?.authenticate!=='function'||typeof authority?.revalidate!=='function')throw new TypeError('Native authentication and revalidation required');
  if(!['source','recordSource','receipt','recordReceipt'].every(k=>typeof journal?.[k]==='function'))throw new TypeError('Source and receipt repository required');
  if(knowledge!==null&&typeof knowledge.propose!=='function')throw new TypeError('Native knowledge proposal authority required');
  const handles=new WeakMap();
  function intake(event){
    const proof=authority.authenticate(event);
    if(!closed(proof,['id','principal','campaign','scene','revision','actors','recipients','text'])
      ||!['id','principal','campaign','scene','revision'].every(k=>text(proof[k]))||!text(proof.text,16000)
      ||!Array.isArray(proof.actors)||!proof.actors.length||proof.actors.some(x=>!text(x))||new Set(proof.actors).size!==proof.actors.length
      ||!Array.isArray(proof.recipients)||!proof.recipients.length||proof.recipients.some(x=>!text(x))||new Set(proof.recipients).size!==proof.recipients.length)throw new Error('Authenticated source proof required');
    const existing=journal.source(proof.id);
    const source=journal.recordSource({...proof,traceId:existing?.traceId??randomUUID()});
    const handle=Object.freeze(Object.create(null));handles.set(handle,source);return handle;
  }
  function bind(handle){
    const source=handles.get(handle);
    if(!source)throw new Error('Native source handle required');
    const current=()=>{try{return authority.revalidate(source)===true;}catch{return false;}};
    const check=fn=>input=>{
      if(!current())return blocked('source_authority_changed');
      try{canonical(input);}catch{return blocked('invalid_json');}
      if(canonical(input).length>32000)return blocked('input_too_large');
      return fn(input);
    };
    return Object.freeze({
      context_read:check(input=>{
        if(!closed(input,['topic'],['focus','cursor'])||!text(input.topic)||('focus'in input&&!text(input.focus))||('cursor'in input&&!text(input.cursor)))return blocked('invalid_context_query');
        if(input.topic!=='conversation'||input.cursor)return blocked('context_not_available');
        // No omniscient context fallback. R2 adds source/actor/audience-scoped retrieval.
        return snapshot({source_ref:source.id,text:source.text,trace_id:source.traceId});
      }),
      action_propose:check(input=>{
        if(!closed(input,['source_ref','actor_ref','action'],['expected_revision','reason'])||!text(input.source_ref)||!text(input.actor_ref)
          ||!closed(input.action,['kind','parameters'])||!text(input.action.kind)||!object(input.action.parameters)
          ||('expected_revision'in input&&!text(input.expected_revision))||('reason'in input&&!text(input.reason,2000)))return blocked('invalid_action_proposal');
        if(input.source_ref!==source.id)return blocked('source_mismatch');
        if(!source.actors.includes(input.actor_ref))return blocked('actor_not_controlled');
        if(input.expected_revision!==undefined&&input.expected_revision!==source.revision)return blocked('stale_revision');
        const rule=rules.get(input.action.kind);
        if(!rule)return blocked('unknown_operation');
        const proposal=snapshot({sourceRef:source.id,actorRef:input.actor_ref,kind:input.action.kind,parameters:input.action.parameters,revision:source.revision,ruleVersion:rule.version});
        const id=`proposal:${hash(proposal)}`;
        const prior=journal.receipt(id);
        if(prior)return snapshot({receipt_ref:prior.id,status:prior.status,trace_id:source.traceId});
        let prepared;
        try{
          const validation=rule.validate({source,proposal});
          if(validation&&typeof validation.then==='function'){Promise.resolve(validation).catch(()=>{});return blocked('asynchronous_native_handler');}
          if(validation!==true)return blocked('native_validation_failed');
          prepared=rule.prepare({source,proposal});
          if(prepared&&typeof prepared.then==='function'){Promise.resolve(prepared).catch(()=>{});return blocked('asynchronous_native_handler');}
        }catch{return blocked('native_preparation_failed');}
        // No successful-effect status may be minted by this R1 preparation shell.
        if(!['pending','awaiting_player_roll','awaiting_consent','awaiting_owner_choice'].includes(prepared?.status))return blocked('unsupported_preparation_status');
        if(!current())return blocked('source_authority_changed');
        const receipt=journal.recordReceipt({id,sourceRef:source.id,principal:source.principal,campaign:source.campaign,scene:source.scene,revision:source.revision,actorRef:proposal.actorRef,ruleVersion:rule.version,proposal,status:prepared.status,traceId:source.traceId,effectsCommitted:false});
        return snapshot({receipt_ref:receipt.id,status:receipt.status,trace_id:source.traceId});
      }),
      state_inspect:check(input=>{
        if(!closed(input,['receipt_ref'])||!text(input.receipt_ref))return blocked('invalid_receipt_query');
        const receipt=journal.receipt(input.receipt_ref);
        if(!receipt||receipt.sourceRef!==source.id||receipt.principal!==source.principal||receipt.campaign!==source.campaign||receipt.scene!==source.scene||receipt.revision!==source.revision)return blocked('receipt_not_available');
        return snapshot({receipt_ref:receipt.id,status:receipt.status,rule_version:receipt.ruleVersion,effects_committed:false,trace_id:receipt.traceId});
      }),
      knowledge_propose:check(input=>{
        if(!closed(input,['source_ref','kind','claim'],['subject_ref','evidence_refs'])||input.source_ref!==source.id||!['testimony','observation','identity','memory','fact','canon_proposal'].includes(input.kind)||!text(input.claim,8000)
          ||('subject_ref'in input&&!text(input.subject_ref))||('evidence_refs'in input&&(!Array.isArray(input.evidence_refs)||input.evidence_refs.length>32||input.evidence_refs.some(r=>!text(r)))))return blocked('invalid_knowledge_proposal');
        if(!knowledge)return blocked('knowledge_authority_not_installed');
        try{return snapshot(knowledge.propose(source,input));}catch{return blocked('knowledge_proposal_failed');}
      })
    });
  }
  return Object.freeze({intake,bind,describe:()=>snapshot({mode:'offline',effectExecution:false,publication:false,tools:[...TOOL_NAMES],rules:rules.describe()})});
}
