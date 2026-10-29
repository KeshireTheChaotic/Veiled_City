/** Knowledge source composition for narrative retention and disclosed-memory selection. */
import {knowledgeNarrativeSources} from './contracts/narrative-sources.js';
import {knowledgeWorldEvents} from './contracts/world-events.js';
import {knowledgeWorldIdentities} from './contracts/world-identities.js';
import {rememberEntity,narrativeMemoryEpistemic} from './memory-lifecycle-service.js';
import {createNarrativeMemory} from './narrative-memory.js';
function narrativeSourceVisible(...args){return knowledgeNarrativeSources.narrativeSourceVisible(...args);}
function narrativeVisible(...args){return knowledgeNarrativeSources.narrativeVisible(...args);}
function indexWorldEvent(...args){return knowledgeWorldEvents.indexWorldEvent(...args);}
function narrativeQueryRelevance(...args){return knowledgeNarrativeSources.narrativeQueryRelevance(...args);}
function narrativeIdentityRelevance(...args){return knowledgeNarrativeSources.narrativeIdentityRelevance(...args);}
let narrativeMemoryRules;
function memory(){return narrativeMemoryRules??=createNarrativeMemory({narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),narrativeVisible:(...args)=>narrativeVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),rememberEntity:(...args)=>rememberEntity(...args),narrativeMemoryEpistemic:(...args)=>narrativeMemoryEpistemic(...args),narrativeQueryRelevance:(...args)=>narrativeQueryRelevance(...args),narrativeIdentityRelevance:(...args)=>narrativeIdentityRelevance(...args),BACKGROUND_WORLD_KINDS:knowledgeWorldIdentities.backgroundWorldKinds()});}
export function retainEstablishedNarrative(...args){return memory().retainEstablishedNarrative(...args);}
export function queueNarrativeMemory(...args){return memory().queueNarrativeMemory(...args);}
export function acknowledgeNarrativeMemory(...args){return memory().acknowledgeNarrativeMemory(...args);}
export function disclosedNarrativeMemory(...args){return memory().disclosedNarrativeMemory(...args);}
export function selectDisclosedNarrativeMemory(...args){return memory().selectDisclosedNarrativeMemory(...args);}