import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {inspectNativeEnvironmentInstance} from './frameworks/daggerheart/public.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeGmOpportunity} from './gm-action-capability.js';
import {reservedCampaignFear} from './fear-reservations.js';
import {nativeWorldAutonomy} from './frameworks/daggerheart/public.js';
function establishNarrativeEntity(...args){return nativeWorldAutonomy.establishNarrativeEntity(...args);}
import {nativeWorldAuthoring} from './frameworks/daggerheart/public.js';
function worldIdentityOrigin(...args){return nativeWorldAuthoring.worldIdentityOrigin(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {jsonHash as hash} from './kernel/json-hash.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {assertEnvironmentAudience} from './native-environment-audience.js';
import {createEnvironmentArrivalRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentArrivalRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),buildNarrativeContext:(...args)=>buildNarrativeContext(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),reservedCampaignFear:(...args)=>reservedCampaignFear(...args),establishNarrativeEntity:(...args)=>establishNarrativeEntity(...args),worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args)}});}
export function applyEnvironmentArrival(...args){return rules().applyEnvironmentArrival(...args);}
export function inspectEnvironmentArrival(...args){return rules().inspectEnvironmentArrival(...args);}
