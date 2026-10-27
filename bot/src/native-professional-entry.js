/** Source provider for native prepared-position evidence and encounter use. */
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {createProfessionalEntryRules} from './frameworks/daggerheart/public.js';
export {PROFESSIONAL_ENTRY} from './frameworks/daggerheart/professional-entry-rules.js';
let nativeRules;
function rules(){return nativeRules??=createProfessionalEntryRules({capabilities:{currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)}});}
export function establishPreparedPositions(...args){return rules().establishPreparedPositions(...args);}
export function preparedPositionCandidates(...args){return rules().preparedPositionCandidates(...args);}
export function qualifyProfessionalEntry(...args){return rules().qualifyProfessionalEntry(...args);}
export function professionalEntryRollState(...args){return rules().professionalEntryRollState(...args);}
export function commitProfessionalEntryUse(...args){return rules().commitProfessionalEntryUse(...args);}
export function inspectProfessionalEntryUse(...args){return rules().inspectProfessionalEntryUse(...args);}
