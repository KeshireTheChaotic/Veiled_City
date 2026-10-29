/** Knowledge source composition for audience-scoped memory lifecycle. */
import {knowledgeNarrativeSources} from './contracts/narrative-sources.js';
import {knowledgeWorldIdentities} from './contracts/world-identities.js';
import {createMemoryLifecycle} from './memory-lifecycle.js';
function narrativeSourceVisible(...args){return knowledgeNarrativeSources.narrativeSourceVisible(...args);}
function narrativeImportance(...args){return knowledgeNarrativeSources.narrativeImportance(...args);}
function worldIdentityOrigin(...args){return knowledgeWorldIdentities.worldIdentityOrigin(...args);}
let lifecycleRules;
function lifecycle(){return lifecycleRules??=createMemoryLifecycle({narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),narrativeImportance:(...args)=>narrativeImportance(...args),BACKGROUND_WORLD_KINDS:knowledgeWorldIdentities.backgroundWorldKinds(),worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args)});}
export function narrativeMemoryEpistemic(...args){return lifecycle().narrativeMemoryEpistemic(...args);}
export function rememberEntity(...args){return lifecycle().rememberEntity(...args);}
export function reviseMemory(...args){return lifecycle().reviseMemory(...args);}
export function retractMemory(...args){return lifecycle().retractMemory(...args);}
export function retrieveMemoryRevisions(...args){return lifecycle().retrieveMemoryRevisions(...args);}