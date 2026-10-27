/** Original verified source composition; source adapter decomposition remains RF04-F05. */
import {createAssemblyContext,currentScene,scenePresence} from './frameworks/session/public.js';
export {hookHash,assemblySourceError} from './frameworks/session/public.js';
import {openingWorldOpportunities} from './opening-world-bridge.js';
const context=createAssemblyContext({currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),openingWorldOpportunities:(...args)=>openingWorldOpportunities(...args)});
export const assemblyHookSources=(...args)=>context.assemblyHookSources(...args);
export const assemblyInputs=(...args)=>context.assemblyInputs(...args);
export const assemblyInputFingerprint=(...args)=>context.assemblyInputFingerprint(...args);
export const certifyAssemblyPlan=(...args)=>context.certifyAssemblyPlan(...args);
export const assemblyPlanFreshness=(...args)=>context.assemblyPlanFreshness(...args);
export const assemblyHookSelection=(...args)=>context.assemblyHookSelection(...args);
export const assemblyHookProjection=(...args)=>context.assemblyHookProjection(...args);
export const assemblyWriterBrief=(...args)=>context.assemblyWriterBrief(...args);
