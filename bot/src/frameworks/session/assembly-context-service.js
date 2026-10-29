/** Session's assembly context composition; the factory retains all assembly rules. */
import {createAssemblyContext} from './assembly-context.js';
import {currentScene,scenePresence} from './scene-source.js';
import {sessionAssemblyContextSource} from './contracts/opening-sources.js';
import {sessionOpeningWorld} from './contracts/opening-world.js';

const context=createAssemblyContext({currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),openingWorldOpportunities:(...args)=>sessionOpeningWorld.openingWorldOpportunities(...args)});
export const assemblyHookSources=(...args)=>context.assemblyHookSources(...args);
export const assemblyInputs=(...args)=>context.assemblyInputs(...args);
export const assemblyInputFingerprint=(...args)=>context.assemblyInputFingerprint(...args);
export const certifyAssemblyPlan=(...args)=>context.certifyAssemblyPlan(...args);
export const assemblyPlanFreshness=(...args)=>context.assemblyPlanFreshness(...args);
export const assemblyHookSelection=(...args)=>context.assemblyHookSelection(...args);
export const assemblyHookProjection=(...args)=>context.assemblyHookProjection(...args);
export const assemblyWriterBrief=(...args)=>context.assemblyWriterBrief(...args);

// Preserve the original module-load binding and the five provided functions.
sessionAssemblyContextSource.bind({assemblyInputFingerprint,certifyAssemblyPlan,assemblyPlanFreshness,assemblyHookSources,assemblyHookSelection});
