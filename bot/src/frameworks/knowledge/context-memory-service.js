/** Knowledge source composition for audience-bound descriptive context memory. */
import {rememberEntity} from './memory-lifecycle-service.js';
import {createContextMemory} from './context-memory.js';
import {knowledgeContextMemorySource} from './contracts/context-memory-source.js';
let contextRules;
function contextMemories(){return contextRules??=createContextMemory({rememberEntity:(...args)=>rememberEntity(...args)});}
contextMemories();
export function persistentMemories(...args){return contextMemories().persistentMemories(...args);}
export function saveContextMemories(...args){return contextMemories().saveContextMemories(...args);}
export function contextMemoriesForScope(...args){return contextMemories().contextMemoriesForScope(...args);}
// Provide the original scoped context memory reader to the fixed Knowledge slot; no other authority is granted.
knowledgeContextMemorySource.bind({contextMemoriesForScope});