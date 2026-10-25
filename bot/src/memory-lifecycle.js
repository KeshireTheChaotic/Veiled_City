/** Original fixed source composition for Knowledge memory lifecycle. */
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {narrativeImportance} from './narrative-salience.js';
import {BACKGROUND_WORLD_KINDS} from './world-background-identities.js';
import {worldIdentityOrigin} from './world-authorship.js';
import {createMemoryLifecycle} from './frameworks/knowledge/public.js';
let lifecycleRules;
function lifecycle(){return lifecycleRules??=createMemoryLifecycle({narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),narrativeImportance:(...args)=>narrativeImportance(...args),BACKGROUND_WORLD_KINDS,worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args)});}
export function narrativeMemoryEpistemic(...args){return lifecycle().narrativeMemoryEpistemic(...args);}
export function rememberEntity(...args){return lifecycle().rememberEntity(...args);}
export function reviseMemory(...args){return lifecycle().reviseMemory(...args);}
export function retractMemory(...args){return lifecycle().retractMemory(...args);}
export function retrieveMemoryRevisions(...args){return lifecycle().retrieveMemoryRevisions(...args);}
