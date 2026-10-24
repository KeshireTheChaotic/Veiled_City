import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {nativeGmOpportunity} from './gm-action-capability.js';
import {establishNarrativeEntity,worldAuthority} from './autonomous-world.js';
import {worldIdentityOrigin} from './world-authorship.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {assertEnvironmentAudience} from './native-environment-audience.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentDoorChainRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentDoorChainRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),buildNarrativeContext:(...args)=>buildNarrativeContext(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),establishNarrativeEntity:(...args)=>establishNarrativeEntity(...args),worldAuthority:(...args)=>worldAuthority(...args),worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),fail:(...args)=>fail(...args)}});}
export function validateDoorChainProposal(...args){return rules().validateDoorChainProposal(...args);}
export function applyEnvironmentDoorChain(...args){return rules().applyEnvironmentDoorChain(...args);}
export function inspectEnvironmentDoorChain(...args){return rules().inspectEnvironmentDoorChain(...args);}
export function environmentDoorChainProjection(...args){return rules().environmentDoorChainProjection(...args);}
export function nativeEnvironmentDoorChainSituation(...args){return rules().nativeEnvironmentDoorChainSituation(...args);}
