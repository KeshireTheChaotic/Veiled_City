import {createKernel,createMemoryJournal,createRulesetRegistry} from './kernel.js';
import {createSourceAuthority} from './source-authority.js';
import {createContextAuthority} from './context-authority.js';
import {createModelGateway} from './model-gateway.js';
import {createOfflinePublicationQueue} from './publication-queue.js';
import {createProseMaterialReview} from './prose-material-review.js';
import {createKnowledgeAuthority} from './knowledge-authority.js';
import {createRecallPlanner} from './recall-planner.js';
import {createPrivatePlanner} from './private-planner.js';

/** Explicit no-send composition. Providers/readers are native dependencies, never model-supplied. */
export function createRehearsal({readers,records,provider,selectContext=()=>[],rules=[],knowledge:knowledgeConfig=null,recall:recallConfig=null,planning=null,proseReview=null,actionAuthority=null}){
  if(typeof selectContext!=='function')throw new TypeError('Native context selector required');
  const authority=createSourceAuthority(readers),journal=createMemoryJournal();
  const context=createContextAuthority({sourceAuthority:authority,records:records??knowledgeConfig?.store,readActor:readers.readActor});
  const recall=recallConfig?createRecallPlanner({...recallConfig,contextAuthority:context}):null;
  const knowledge=knowledgeConfig?createKnowledgeAuthority({...knowledgeConfig,sourceAuthority:authority}):null;
  const receiptReads=new Map();
  function rememberReceipt(source,result){
    if(result?.effects_committed===true||result?.receipt_hash!==undefined){
      if(typeof result.receipt_ref!=='string'||!result.receipt_ref||result.receipt_ref.length>256||typeof result.receipt_hash!=='string'||!/^[a-f0-9]{64}$/.test(result.receipt_hash))throw new Error('Native receipt proof required');
      const key=JSON.stringify([source.id,source.revision]),seen=receiptReads.get(key)??new Map(),prior=seen.get(result.receipt_ref);
      if(prior&&prior!==result.receipt_hash)throw new Error('Native receipt changed during inference');
      seen.set(result.receipt_ref,result.receipt_hash);receiptReads.set(key,seen);
    }
    return result;
  }
  const nativeActions=actionAuthority?{supports:kind=>actionAuthority.supports(kind),describe:()=>actionAuthority.describe(),propose:(source,input)=>rememberReceipt(source,actionAuthority.propose(source,input)),inspect:(source,ref)=>rememberReceipt(source,actionAuthority.inspect(source,ref))}:null;
  function receiptDependencies(source){
    const result=[];
    for(const [receiptRef,receiptHash] of receiptReads.get(JSON.stringify([source.id,source.revision]))??[]){if(actionAuthority.inspect(source,receiptRef).receipt_hash!==receiptHash)throw new Error('Native receipt dependency changed');result.push({receiptRef,receiptHash});}
    return result;
  }
  const kernel=createKernel({authority,journal,rules:createRulesetRegistry(rules),context,knowledge,actionAuthority:nativeActions});
  const gateway=createModelGateway({contextAuthority:context,provider});
  const publications=createOfflinePublicationQueue({gateway,contextAuthority:context,materialReview:proseReview??createProseMaterialReview({authorizeMaterial:candidate=>actionAuthority?.authorizeMaterial?.(candidate)===true})});
  const planner=planning?createPrivatePlanner({...planning,sourceAuthority:authority}):null;
  async function plan(event,{signal}={}){
    if(!planner)throw new Error('Private planner not installed');
    const proof=authority.authenticate(event);kernel.intake(event);
    return planner.plan(journal.source(proof.id),{signal});
  }
  async function respond(event,{signal}={}){
    const proof=authority.authenticate(event),handle=kernel.intake(event),source=journal.source(proof.id);
    let references;
    try{references=recall?recall.select(source):await selectContext(source);}catch{references=[];}
    const grant=context.issue(source,references);
    const extraGrants=[];
    const capabilities=kernel.bind(handle,{contextReader:{read(nativeSource,ref){
      const extra=context.issue(nativeSource,[ref]);extraGrants.push(extra);return context.inspect(extra);
    }}});
    const draft=await gateway.generate(grant,{signal,capabilities,validateContext:()=>{for(const extra of extraGrants)context.inspect(extra);receiptDependencies(source);}});
    const publication=publications.queue(draft,{additionalGrants:extraGrants,receiptDependencies:receiptDependencies(source)});
    const {traceId,modelCalls,toolCalls,elapsedMs,usage}=gateway.inspect(draft);
    return Object.freeze({publication,sourceHandle:handle,metrics:Object.freeze({traceId,modelCalls,toolCalls,elapsedMs,usage})});
  }
  return Object.freeze({respond,plan,inspectPlan:handle=>{if(!planner)throw new Error('Private planner not installed');return planner.inspect(handle);},
    inspectPublication:publications.inspect,reviewPublication:publications.review,repairPublication:publications.repair,capabilities:kernel.bind,describe:kernel.describe});
}
