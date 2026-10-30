import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {nativeNarrativeContext} from './frameworks/daggerheart/public.js';
const {buildNarrativeContext}=nativeNarrativeContext;
import {inspectNativeEnvironmentInstance} from './frameworks/daggerheart/public.js';
import {featureDisposition} from './native-feature-catalog.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {nativeGmOpportunity} from './gm-action-capability.js';
import {nativeWorldAutonomy} from './frameworks/daggerheart/public.js';
function establishNarrativeEntity(...args){return nativeWorldAutonomy.establishNarrativeEntity(...args);}function worldAuthority(...args){return nativeWorldAutonomy.worldAuthority(...args);}
import {nativeWorldAuthoring} from './frameworks/daggerheart/public.js';
function worldIdentityOrigin(...args){return nativeWorldAuthoring.worldIdentityOrigin(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {jsonHash as hash} from './kernel/json-hash.js';
import {nativeEnvironmentNarrative} from './frameworks/daggerheart/public.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {assertEnvironmentAudience} from './frameworks/daggerheart/public.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentDoorChainRules} from './frameworks/daggerheart/public.js';
import {doorChainSituationPeer} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentDoorChainRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),buildNarrativeContext:(...args)=>buildNarrativeContext(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),establishNarrativeEntity:(...args)=>establishNarrativeEntity(...args),worldAuthority:(...args)=>worldAuthority(...args),worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),fail:(...args)=>fail(...args)}});}
export function validateDoorChainProposal(...args){return rules().validateDoorChainProposal(...args);}
export function applyEnvironmentDoorChain(...args){return rules().applyEnvironmentDoorChain(...args);}
export function inspectEnvironmentDoorChain(...args){return rules().inspectEnvironmentDoorChain(...args);}
export function environmentDoorChainProjection(...args){return rules().environmentDoorChainProjection(...args);}
export function nativeEnvironmentDoorChainSituation(...args){return rules().nativeEnvironmentDoorChainSituation(...args);}
// Provide this module's original nativeEnvironmentDoorChainSituation to the fixed port; no other authority is granted.
doorChainSituationPeer.bind({nativeEnvironmentDoorChainSituation});
