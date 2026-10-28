/** Original same-owner lifecycle composition for descriptive context memory. */
import {rememberEntity} from './memory-lifecycle.js';
import {createContextMemory} from './frameworks/knowledge/public.js';
let contextRules;
function contextMemories(){return contextRules??=createContextMemory({rememberEntity:(...args)=>rememberEntity(...args)});}
export const contextMemorySchema=contextMemories().contextMemorySchema;
export const CONTEXT_MEMORY_PROMPT=contextMemories().CONTEXT_MEMORY_PROMPT;
export function persistentMemories(...args){return contextMemories().persistentMemories(...args);}
export function saveContextMemories(...args){return contextMemories().saveContextMemories(...args);}
export function contextMemoriesForScope(...args){return contextMemories().contextMemoriesForScope(...args);}
import {knowledgeContextMemorySource} from './frameworks/knowledge/public.js';
// Provide this module's original scoped context memory reader to the fixed Knowledge slot; no other authority is granted.
knowledgeContextMemorySource.bind({contextMemoriesForScope});
