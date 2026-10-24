import {createAudienceAuthority} from './audience-first-capability.js';
import {authorizeIncomingOffer} from './pc-incoming.js';
import {assertFearIncomingExecution} from './pvp-fear-moves.js';
import {inspectNativeGmDecision} from './gm-action-capability.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail} from './scene-fiction-context.js';
import {createGmMechanicalProposalRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createGmMechanicalProposalRules({capabilities:{createAudienceAuthority:(...args)=>createAudienceAuthority(...args),authorizeIncomingOffer:(...args)=>authorizeIncomingOffer(...args),assertFearIncomingExecution:(...args)=>assertFearIncomingExecution(...args),inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args)}});}
export function projectNativeGmProposal(...args){return rules().projectNativeGmProposal(...args);}
