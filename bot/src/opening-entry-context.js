/** Original source composition; native World event issuance is fixed at Session bootstrap. */
import {createOpeningEntryContext,sessionWorldEvents} from './frameworks/session/public.js';
import {inspectOpeningEntryOpportunity} from './session-opening-attendance.js';
import {assemblyHookSources} from './assembly-context.js';
import {currentScene} from './scene-continuity.js';
const entry=createOpeningEntryContext({inspectOpeningEntryOpportunity:(...args)=>inspectOpeningEntryOpportunity(...args),assemblyHookSources:(...args)=>assemblyHookSources(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>sessionWorldEvents.indexWorldEvent(...args)});
export function openingEntryProjection(...args){return entry.openingEntryProjection(...args);}
export function openingEntryNarrativeCandidate(...args){return entry.openingEntryNarrativeCandidate(...args);}
import {sessionOpeningEntrySource} from './frameworks/session/public.js';
// Provide this module's original opening entry functions to the fixed Session slot; no other authority is granted.
sessionOpeningEntrySource.bind({openingEntryProjection,openingEntryNarrativeCandidate});
