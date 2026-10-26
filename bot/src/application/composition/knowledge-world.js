import {connectKnowledgeWorld,connectWorldKnowledge} from '../../framework-to-framework/knowledge--world/public.js';
import {knowledgeWorldEvents} from '../../frameworks/knowledge/public.js';
import {worldKnowledgeSources} from '../../frameworks/world/public.js';
let composed=null;
/** No database/model/client construction; bind the native event source once at startup. */
export function initializeKnowledgeWorld(){
  if(!composed){
    connectWorldKnowledge({consumer:worldKnowledgeSources});
    composed=connectKnowledgeWorld({consumer:knowledgeWorldEvents});
  }
  return composed;
}
