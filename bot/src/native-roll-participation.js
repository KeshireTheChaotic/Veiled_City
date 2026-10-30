/** Source-bound collaboration eligibility. This never enrolls an owner, spends Hope or rolls dice. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {mayKnowRoll} from './roll-collaboration.js';
import {nativeEnvironmentNarrative} from './frameworks/daggerheart/public.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {isPvpIntent} from './pvp-authority.js';

import {createRollParticipationRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createRollParticipationRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),sceneAccess:(...args)=>sceneAccess(...args),scenePresence:(...args)=>scenePresence(...args),mayKnowRoll:(...args)=>mayKnowRoll(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),isPvpIntent:(...args)=>isPvpIntent(...args)}});}
export function prepareNativeRollParticipation(...args){return rules().prepareNativeRollParticipation(...args);}
export function inspectNativeRollParticipation(...args){return rules().inspectNativeRollParticipation(...args);}
