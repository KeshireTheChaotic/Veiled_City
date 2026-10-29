/** Knowledge source composition for audience-authorized memory/reference lookup. */
import {contextMemoriesForScope} from './context-memory-service.js';
import {retrieveMemoryRevisions} from './memory-lifecycle-service.js';
import {knowledgeSessionScene} from './contracts/session-scene.js';
import {createScopedMemory} from './scoped-memory.js';
function currentScene(...args){return knowledgeSessionScene.currentScene(...args);}
function sceneView(...args){return knowledgeSessionScene.sceneView(...args);}
let scopedRules;
function scoped(){return scopedRules??=createScopedMemory({contextMemoriesForScope:(...args)=>contextMemoriesForScope(...args),retrieveMemoryRevisions:(...args)=>retrieveMemoryRevisions(...args),currentScene:(...args)=>currentScene(...args),sceneView:(...args)=>sceneView(...args)});}
export function scopedSceneMemory(...args){return scoped().scopedSceneMemory(...args);}
export function resolveScopedMemoryReference(...args){return scoped().resolveScopedMemoryReference(...args);}