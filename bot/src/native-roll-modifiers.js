/** Ordinary contextual odds, not feature activation, owner spending or a claimed outcome. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {gmRulingContext,nativeGmSceneContext} from './gm-action-ruling.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {isPvpIntent} from './pvp-authority.js';
import {prepareEnvironmentNoiseOdds,prepareEnvironmentMemoryOdds,inspectEnvironmentNoiseOdds} from './native-environment-noise.js';

import {createRollModifierRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createRollModifierRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),consentAction:(...args)=>consentAction(...args),historicalActionSource:(...args)=>historicalActionSource(...args),gmRulingContext:(...args)=>gmRulingContext(...args),nativeGmSceneContext:(...args)=>nativeGmSceneContext(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),isPvpIntent:(...args)=>isPvpIntent(...args),prepareEnvironmentNoiseOdds:(...args)=>prepareEnvironmentNoiseOdds(...args),prepareEnvironmentMemoryOdds:(...args)=>prepareEnvironmentMemoryOdds(...args),inspectEnvironmentNoiseOdds:(...args)=>inspectEnvironmentNoiseOdds(...args)}});}
export function prepareOrdinaryRollModifier(...args){return rules().prepareOrdinaryRollModifier(...args);}
export function inspectOrdinaryRollModifier(...args){return rules().inspectOrdinaryRollModifier(...args);}
