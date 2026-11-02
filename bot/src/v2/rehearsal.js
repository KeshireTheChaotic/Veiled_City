import {createKernel,createMemoryJournal,createRulesetRegistry} from './kernel.js';
import {createSourceAuthority} from './source-authority.js';
import {createContextAuthority} from './context-authority.js';
import {createModelGateway} from './model-gateway.js';
import {createOfflinePublicationQueue} from './publication-queue.js';

/** Explicit no-send composition. Providers/readers are native dependencies, never model-supplied. */
export function createRehearsal({readers,records,provider,selectContext=()=>[],rules=[]}){
  if(typeof selectContext!=='function')throw new TypeError('Native context selector required');
  const authority=createSourceAuthority(readers),journal=createMemoryJournal();
  const kernel=createKernel({authority,journal,rules:createRulesetRegistry(rules)});
  const context=createContextAuthority({sourceAuthority:authority,records,readActor:readers.readActor});
  const gateway=createModelGateway({contextAuthority:context,provider});
  const publications=createOfflinePublicationQueue({gateway,contextAuthority:context});
  async function respond(event,{signal}={}){
    const proof=authority.authenticate(event),handle=kernel.intake(event),source=journal.source(proof.id);
    let references;
    try{references=await selectContext(source);}catch{references=[];}
    const grant=context.issue(source,references);
    const draft=await gateway.generate(grant,{signal});
    const publication=publications.queue(draft);
    const {traceId,modelCalls,elapsedMs,usage}=gateway.inspect(draft);
    return Object.freeze({publication,sourceHandle:handle,metrics:Object.freeze({traceId,modelCalls,elapsedMs,usage})});
  }
  return Object.freeze({respond,inspectPublication:publications.inspect,capabilities:kernel.bind,describe:kernel.describe});
}
