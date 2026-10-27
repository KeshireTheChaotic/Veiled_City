import {connectKnowledgeWorld,connectWorldKnowledge,connectKnowledgeIdentities,connectKnowledgeMemory,connectKnowledgeHistory,connectWorldEstablishedEvidence} from '../../framework-to-framework/knowledge--world/public.js';
import {knowledgeWorldEvents,knowledgeWorldIdentities} from '../../frameworks/knowledge/public.js';
import {worldKnowledgeSources} from '../../frameworks/world/public.js';
let composed=null;
/** No database/model/client construction; bind the native event source once at startup. */
export function initializeKnowledgeWorld(){
  if(!composed){
    connectWorldEstablishedEvidence();
    connectWorldKnowledge({consumer:worldKnowledgeSources});
    connectKnowledgeIdentities({consumer:knowledgeWorldIdentities});
    connectKnowledgeMemory();
    connectKnowledgeHistory();
    composed=connectKnowledgeWorld({consumer:knowledgeWorldEvents});
  }
  return composed;
}
