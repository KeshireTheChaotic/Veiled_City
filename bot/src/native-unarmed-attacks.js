/** Bounded native PC-to-NPC unarmed eligibility. Never rolls, grants gear, or admits PC targets. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {nativeEncounterActor} from './native-encounter-relations.js';
import {nativeActorControl} from './native-actor-control.js';
import {scenePresence,sceneAccess} from './scene-continuity.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {assertNonPvpCombatant,isPvpIntent} from './pvp-authority.js';
import {indexWorldEvent} from './city-calendar.js';
import {adjudicateAcceptedIntent} from './rules-arbitration.js';

import {createUnarmedAttackRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createUnarmedAttackRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),nativeEncounterActor:(...args)=>nativeEncounterActor(...args),nativeActorControl:(...args)=>nativeActorControl(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),adjudicateAcceptedIntent:(...args)=>adjudicateAcceptedIntent(...args),isPvpIntent:(...args)=>isPvpIntent(...args),assertNonPvpCombatant:(...args)=>assertNonPvpCombatant(...args)}});}
export function prepareNativeUnarmedAttack(...args){return rules().prepareNativeUnarmedAttack(...args);}
export function inspectNativeUnarmedAttack(...args){return rules().inspectNativeUnarmedAttack(...args);}
