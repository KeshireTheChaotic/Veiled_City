/** Audience entitlement for a committed local environmental effect; never a new execution grant. */
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {createEnvironmentAudienceRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentAudienceRules({capabilities:{narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args)}});}
export function assertEnvironmentAudience(...args){return rules().assertEnvironmentAudience(...args);}
