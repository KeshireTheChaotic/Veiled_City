/** Source provider for native prepared-position evidence and encounter use. */
import {nativeScenes} from './contracts/scenes.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {createProfessionalEntryRules} from './professional-entry-rules.js';
import {PROFESSIONAL_ENTRY} from './professional-entry-rules.js';
export {PROFESSIONAL_ENTRY};
let nativeRules;
function rules(){return nativeRules??=createProfessionalEntryRules({capabilities:{currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)}});}
export function establishPreparedPositions(...args){return rules().establishPreparedPositions(...args);}
export function preparedPositionCandidates(...args){return rules().preparedPositionCandidates(...args);}
export function qualifyProfessionalEntry(...args){return rules().qualifyProfessionalEntry(...args);}
export function professionalEntryRollState(...args){return rules().professionalEntryRollState(...args);}
export function commitProfessionalEntryUse(...args){return rules().commitProfessionalEntryUse(...args);}
export function inspectProfessionalEntryUse(...args){return rules().inspectProfessionalEntryUse(...args);}

/** Original Native feature identifier for fixed Intent composition. */
export const professionalEntryFeature=()=>PROFESSIONAL_ENTRY;
