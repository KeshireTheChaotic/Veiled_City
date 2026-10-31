import {createAudienceAuthority} from './audience-first-capability.js';
import {authorizeIncomingOffer} from './pc-incoming.js';
import {assertFearIncomingExecution} from './frameworks/daggerheart/public.js';
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {jsonHash as hash} from './kernel/json-hash.js';
import {sceneFictionFailure as fail} from './kernel/scene-fiction-failure.js';
import {createGmMechanicalProposalRules} from './frameworks/daggerheart/public.js';
import {featureDisposition} from './native-feature-catalog.js';
let nativeRules;
function rules(){return nativeRules??=createGmMechanicalProposalRules({capabilities:{featureDisposition:(...args)=>featureDisposition(...args),createAudienceAuthority:(...args)=>createAudienceAuthority(...args),authorizeIncomingOffer:(...args)=>authorizeIncomingOffer(...args),assertFearIncomingExecution:(...args)=>assertFearIncomingExecution(...args),inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args)}});}
export function projectNativeGmProposal(...args){return rules().projectNativeGmProposal(...args);}
