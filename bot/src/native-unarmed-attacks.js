/** Bounded native PC-to-NPC unarmed eligibility. Never rolls, grants gear, or admits PC targets. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativeEncounterActor} from './native-encounter-relations.js';
import {nativeActorControl} from './native-actor-control.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}
import {nativeEnvironmentNarrative} from './frameworks/daggerheart/public.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {assertNonPvpCombatant,isPvpIntent} from './pvp-authority.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {adjudicateAcceptedIntent} from './rules-arbitration.js';

import {createUnarmedAttackRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createUnarmedAttackRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),nativeEncounterActor:(...args)=>nativeEncounterActor(...args),nativeActorControl:(...args)=>nativeActorControl(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),adjudicateAcceptedIntent:(...args)=>adjudicateAcceptedIntent(...args),isPvpIntent:(...args)=>isPvpIntent(...args),assertNonPvpCombatant:(...args)=>assertNonPvpCombatant(...args)}});}
export function prepareNativeUnarmedAttack(...args){return rules().prepareNativeUnarmedAttack(...args);}
export function inspectNativeUnarmedAttack(...args){return rules().inspectNativeUnarmedAttack(...args);}
