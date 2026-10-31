import {nativeArbitrationOrigin} from './frameworks/daggerheart/public.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {inspectNativeEnvironmentInstance} from './frameworks/daggerheart/public.js';
import {featureDisposition} from './frameworks/daggerheart/public.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {nativeGmOpportunityPeer} from './frameworks/daggerheart/public.js';
const {nativeGmOpportunity}=nativeGmOpportunityPeer;
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {jsonHash as hash} from './kernel/json-hash.js';
import {nativeEnvironmentNarrative} from './frameworks/daggerheart/public.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {assertEnvironmentAudience} from './frameworks/daggerheart/public.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentImagingRules} from './frameworks/daggerheart/public.js';
import {imagingSituationPeer} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentImagingRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),fail:(...args)=>fail(...args)}});}
export function validateImagingRecordProposal(...args){return rules().validateImagingRecordProposal(...args);}
export function applyEnvironmentImagingRecord(...args){return rules().applyEnvironmentImagingRecord(...args);}
export function inspectEnvironmentImagingRecord(...args){return rules().inspectEnvironmentImagingRecord(...args);}
export function environmentImagingProjection(...args){return rules().environmentImagingProjection(...args);}
export function nativeEnvironmentImagingSituation(...args){return rules().nativeEnvironmentImagingSituation(...args);}
// Provide this module's original nativeEnvironmentImagingSituation to the fixed port; no other authority is granted.
imagingSituationPeer.bind({nativeEnvironmentImagingSituation});
