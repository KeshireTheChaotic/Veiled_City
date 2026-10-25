/** Original fixed World/Narrative source composition for existing-identity retrieval. */
import {resolvePlaceReference,preflightNpcIdentity} from './location-language.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {worldIdentityOrigin} from './world-authorship.js';
import {createEntityMemory} from './frameworks/knowledge/public.js';
let entityRules;
function entities(){return entityRules??=createEntityMemory({resolvePlaceReference:(...args)=>resolvePlaceReference(...args),preflightNpcIdentity:(...args)=>preflightNpcIdentity(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args)});}
export function tierWorldAdditions(...args){return entities().tierWorldAdditions(...args);}
