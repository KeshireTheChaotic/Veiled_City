/** Original fixed Narrative/World and same-owner lifecycle composition for disclosed narrative memory. */
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {narrativeVisible} from './narrative-authority-context.js';
import {knowledgeWorldEvents} from './frameworks/knowledge/public.js';
function indexWorldEvent(...args){return knowledgeWorldEvents.indexWorldEvent(...args);}
import {rememberEntity,narrativeMemoryEpistemic} from './memory-lifecycle.js';
import {narrativeQueryRelevance,narrativeIdentityRelevance} from './narrative-relevance.js';
import {BACKGROUND_WORLD_KINDS} from './world-background-identities.js';
import {createNarrativeMemory} from './frameworks/knowledge/public.js';
let narrativeMemoryRules;
function memory(){return narrativeMemoryRules??=createNarrativeMemory({narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),narrativeVisible:(...args)=>narrativeVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),rememberEntity:(...args)=>rememberEntity(...args),narrativeMemoryEpistemic:(...args)=>narrativeMemoryEpistemic(...args),narrativeQueryRelevance:(...args)=>narrativeQueryRelevance(...args),narrativeIdentityRelevance:(...args)=>narrativeIdentityRelevance(...args),BACKGROUND_WORLD_KINDS});}
export function retainEstablishedNarrative(...args){return memory().retainEstablishedNarrative(...args);}
export function queueNarrativeMemory(...args){return memory().queueNarrativeMemory(...args);}
export function acknowledgeNarrativeMemory(...args){return memory().acknowledgeNarrativeMemory(...args);}
export function disclosedNarrativeMemory(...args){return memory().disclosedNarrativeMemory(...args);}
export function selectDisclosedNarrativeMemory(...args){return memory().selectDisclosedNarrativeMemory(...args);}
