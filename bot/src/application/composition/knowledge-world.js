import {connectKnowledgeWorld} from '../../framework-to-framework/knowledge--world/public.js';
import {knowledgeWorldEvents} from '../../frameworks/knowledge/public.js';
let composed=null;
/** No database/model/client construction; bind the native event source once at startup. */
export function initializeKnowledgeWorld(){return composed??=connectKnowledgeWorld({consumer:knowledgeWorldEvents});}
