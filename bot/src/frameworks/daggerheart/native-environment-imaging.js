import {nativeArbitrationOrigin} from './contracts/environment-sources.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {nativeGmOpportunityPeer} from './contracts/environment-sources.js';
const {nativeGmOpportunity}=nativeGmOpportunityPeer;
import {nativeScenes} from './contracts/scenes.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeEnvironmentNarrative} from './contracts/environment-narrative.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {assertEnvironmentAudience} from './environment-audience-source.js';
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {createEnvironmentImagingRules} from './environment-imaging-rules.js';
import {imagingSituationPeer} from './contracts/environment-sources.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentImagingRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),fail:(...args)=>fail(...args)}});}
export function validateImagingRecordProposal(...args){return rules().validateImagingRecordProposal(...args);}
export function applyEnvironmentImagingRecord(...args){return rules().applyEnvironmentImagingRecord(...args);}
export function inspectEnvironmentImagingRecord(...args){return rules().inspectEnvironmentImagingRecord(...args);}
export function environmentImagingProjection(...args){return rules().environmentImagingProjection(...args);}
export function nativeEnvironmentImagingSituation(...args){return rules().nativeEnvironmentImagingSituation(...args);}
// Provide this module's original nativeEnvironmentImagingSituation to the fixed port; no other authority is granted.
imagingSituationPeer.bind({nativeEnvironmentImagingSituation});
