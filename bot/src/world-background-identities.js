/** Original World background reader; provenance and record retrieval remain fixed source capabilities. */
import {sceneFictionFailure as fail} from './scene-fiction-context.js';
import {worldIdentityOrigin} from './world-authorship.js';
import {listNarrativeRecords,NARRATIVE_RECORD_LIMIT} from './narrative-records.js';
import {createBackgroundIdentityRules} from './frameworks/world/public.js';
export {BACKGROUND_WORLD_KINDS} from './frameworks/world/public.js';
let backgroundRules;
function background(){return backgroundRules??=createBackgroundIdentityRules({listNarrativeRecords,NARRATIVE_RECORD_LIMIT,worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args),fail});}
export function validateBackgroundIdentity(...args){return background().validateBackgroundIdentity(...args);}
export function backgroundIdentityContext(...args){return background().backgroundIdentityContext(...args);}
