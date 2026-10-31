import {nativeArbitrationOrigin} from './contracts/environment-sources.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {nativeNarrativeContext} from './contracts/narrative-context.js';
const {buildNarrativeContext}=nativeNarrativeContext;
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {nativeGmOpportunityPeer} from './contracts/environment-sources.js';
const {nativeGmOpportunity}=nativeGmOpportunityPeer;
import {nativeWorldAutonomy} from './contracts/world-autonomy.js';
function establishNarrativeEntity(...args){return nativeWorldAutonomy.establishNarrativeEntity(...args);}function worldAuthority(...args){return nativeWorldAutonomy.worldAuthority(...args);}
import {nativeWorldAuthoring} from './contracts/environment-sources.js';
function worldIdentityOrigin(...args){return nativeWorldAuthoring.worldIdentityOrigin(...args);}
import {nativeScenes} from './contracts/scenes.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeEnvironmentNarrative} from './contracts/environment-narrative.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {assertEnvironmentAudience} from './environment-audience-source.js';
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {createEnvironmentDoorChainRules} from './environment-door-chain-rules.js';
import {doorChainSituationPeer} from './contracts/environment-sources.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentDoorChainRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),buildNarrativeContext:(...args)=>buildNarrativeContext(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),establishNarrativeEntity:(...args)=>establishNarrativeEntity(...args),worldAuthority:(...args)=>worldAuthority(...args),worldIdentityOrigin:(...args)=>worldIdentityOrigin(...args),currentScene:(...args)=>currentScene(...args),scenePresence:(...args)=>scenePresence(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),fail:(...args)=>fail(...args)}});}
export function validateDoorChainProposal(...args){return rules().validateDoorChainProposal(...args);}
export function applyEnvironmentDoorChain(...args){return rules().applyEnvironmentDoorChain(...args);}
export function inspectEnvironmentDoorChain(...args){return rules().inspectEnvironmentDoorChain(...args);}
export function environmentDoorChainProjection(...args){return rules().environmentDoorChainProjection(...args);}
export function nativeEnvironmentDoorChainSituation(...args){return rules().nativeEnvironmentDoorChainSituation(...args);}
// Provide this module's original nativeEnvironmentDoorChainSituation to the fixed port; no other authority is granted.
doorChainSituationPeer.bind({nativeEnvironmentDoorChainSituation});
