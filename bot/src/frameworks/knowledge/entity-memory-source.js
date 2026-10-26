/** Fixed Knowledge-owned retrieval composition; native authoring and source authority stay external. */
import {createEntityMemory} from './entity-memory.js';
import {knowledgeWorldIdentities} from './contracts/world-identities.js';
import {knowledgeNarrativeVisibility} from './contracts/narrative-visibility.js';
let entityRules;
function entities(){return entityRules??=createEntityMemory({
  resolvePlaceReference:(...args)=>knowledgeWorldIdentities.resolvePlaceReference(...args),
  preflightNpcIdentity:(...args)=>knowledgeWorldIdentities.preflightNpcIdentity(...args),
  worldIdentityOrigin:(...args)=>knowledgeWorldIdentities.worldIdentityOrigin(...args),
  narrativeSourceVisible:(...args)=>knowledgeNarrativeVisibility.narrativeSourceVisible(...args)
});}
export function tierWorldAdditions(...args){return entities().tierWorldAdditions(...args);}
