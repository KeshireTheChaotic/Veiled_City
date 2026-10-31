import {nativeArbitrationOrigin} from './contracts/environment-sources.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {nativeNarrativeContext} from './contracts/narrative-context.js';
const {buildNarrativeContext}=nativeNarrativeContext;
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeGmOpportunityPeer} from './contracts/environment-sources.js';
const {nativeGmOpportunity}=nativeGmOpportunityPeer;
import {reservedCampaignFearPeer} from './contracts/environment-sources.js';
const {reservedCampaignFear}=reservedCampaignFearPeer;
import {nativeWorldAutonomy} from './contracts/world-autonomy.js';
function establishNarrativeEntity(...args){return nativeWorldAutonomy.establishNarrativeEntity(...args);}
import {nativeWorldAuthoring} from './contracts/environment-sources.js';
function worldIdentityOrigin(...args){return nativeWorldAuthoring.worldIdentityOrigin(...args);}
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {assertEnvironmentAudience} from './environment-audience-source.js';
import {createEnvironmentArrivalRules} from './environment-arrival-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentArrivalRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),buildNarrativeContext:(...args)=>buildNarrativeContext(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),reservedCampaignFear:(...args)=>reservedCampaignFear(...args),establishNarrativeEntity:(...args)=>establishNarrativeEntity(...args),worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args)}});}
export function applyEnvironmentArrival(...args){return rules().applyEnvironmentArrival(...args);}
export function inspectEnvironmentArrival(...args){return rules().inspectEnvironmentArrival(...args);}
