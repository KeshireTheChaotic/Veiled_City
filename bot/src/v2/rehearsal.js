import {createKernel,createMemoryJournal,createRulesetRegistry} from './kernel.js';
import {createSourceAuthority} from './source-authority.js';
import {createContextAuthority} from './context-authority.js';
import {createModelGateway} from './model-gateway.js';
import {createOfflinePublicationQueue} from './publication-queue.js';
import {createKnowledgeAuthority} from './knowledge-authority.js';
import {createRecallPlanner} from './recall-planner.js';
import {createPrivatePlanner} from './private-planner.js';

/** Explicit no-send composition. Providers/readers are native dependencies, never model-supplied. */
export function createRehearsal({readers,records,provider,selectContext=()=>[],rules=[],knowledge:knowledgeConfig=null,recall:recallConfig=null,planning=null}){
  if(typeof selectContext!=='function')throw new TypeError('Native context selector required');
  const authority=createSourceAuthority(readers),journal=createMemoryJournal();
  const context=createContextAuthority({sourceAuthority:authority,records:records??knowledgeConfig?.store,readActor:readers.readActor});
  const recall=recallConfig?createRecallPlanner({...recallConfig,contextAuthority:context}):null;
  const knowledge=knowledgeConfig?createKnowledgeAuthority({...knowledgeConfig,sourceAuthority:authority}):null;
  const kernel=createKernel({authority,journal,rules:createRulesetRegistry(rules),context,knowledge});
  const gateway=createModelGateway({contextAuthority:context,provider});
  const publications=createOfflinePublicationQueue({gateway,contextAuthority:context});
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
    const draft=await gateway.generate(grant,{signal});
    const publication=publications.queue(draft);
    const {traceId,modelCalls,elapsedMs,usage}=gateway.inspect(draft);
    return Object.freeze({publication,sourceHandle:handle,metrics:Object.freeze({traceId,modelCalls,elapsedMs,usage})});
  }
  return Object.freeze({respond,plan,inspectPlan:handle=>{if(!planner)throw new Error('Private planner not installed');return planner.inspect(handle);},
    inspectPublication:publications.inspect,capabilities:kernel.bind,describe:kernel.describe});
}
