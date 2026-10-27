/** Original fixed Knowledge and Session source composition for scoped memory. */
import {contextMemoriesForScope} from './context-memory.js';
import {retrieveMemoryRevisions} from './memory-lifecycle.js';
import {knowledgeSessionScene} from './frameworks/knowledge/public.js';
function currentScene(...args){return knowledgeSessionScene.currentScene(...args);}function sceneView(...args){return knowledgeSessionScene.sceneView(...args);}
import {createScopedMemory} from './frameworks/knowledge/public.js';
let scopedRules;
function scoped(){return scopedRules??=createScopedMemory({contextMemoriesForScope:(...args)=>contextMemoriesForScope(...args),retrieveMemoryRevisions:(...args)=>retrieveMemoryRevisions(...args),currentScene:(...args)=>currentScene(...args),sceneView:(...args)=>sceneView(...args)});}
export function scopedSceneMemory(...args){return scoped().scopedSceneMemory(...args);}
export function resolveScopedMemoryReference(...args){return scoped().resolveScopedMemoryReference(...args);}
