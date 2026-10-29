/** Session source composition; native World event issuance is fixed at application bootstrap. */
import {createSessionOpening} from './session-opening.js';
import {sessionWorldEvents} from './contracts/world-events.js';
import {sessionAssemblyContextSource,sessionAssemblyStateSource,sessionOpeningSource} from './contracts/opening-sources.js';
const {assemblyInputFingerprint}=sessionAssemblyContextSource,{assemblyPlanHash}=sessionAssemblyStateSource;
const opening=createSessionOpening({assemblyInputFingerprint:(...args)=>assemblyInputFingerprint(...args),assemblyPlanHash:(...args)=>assemblyPlanHash(...args),indexWorldEvent:(...args)=>sessionWorldEvents.indexWorldEvent(...args)});
export function rebaseSessionOpening(...args){return opening.rebaseSessionOpening(...args);}
export function assertSessionOpeningFence(...args){return opening.assertSessionOpeningFence(...args);}
export function inspectSessionOpening(...args){return opening.inspectSessionOpening(...args);}
export function scheduleSessionOpening(...args){return opening.scheduleSessionOpening(...args);}
export function beginSessionOpeningAttempt(...args){return opening.beginSessionOpeningAttempt(...args);}
export function assertSessionOpeningAttempt(...args){return opening.assertSessionOpeningAttempt(...args);}
export function rebindSessionOpeningRefresh(...args){return opening.rebindSessionOpeningRefresh(...args);}
export function bindSessionOpeningTurn(...args){return opening.bindSessionOpeningTurn(...args);}
export function assertSessionOpeningPublication(...args){return opening.assertSessionOpeningPublication(...args);}
// Provide this module's original session opening functions to the fixed Session slot; no other authority is granted.
sessionOpeningSource.bind({inspectSessionOpening,beginSessionOpeningAttempt,assertSessionOpeningAttempt,assertSessionOpeningFence,rebaseSessionOpening,bindSessionOpeningTurn,rebindSessionOpeningRefresh});
