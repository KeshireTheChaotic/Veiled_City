import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {nativeGmOpportunity} from './gm-action-capability.js';
import {currentScene} from './scene-continuity.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {assertEnvironmentAudience} from './native-environment-audience.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentImagingRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentImagingRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),fail:(...args)=>fail(...args)}});}
export function validateImagingRecordProposal(...args){return rules().validateImagingRecordProposal(...args);}
export function applyEnvironmentImagingRecord(...args){return rules().applyEnvironmentImagingRecord(...args);}
export function inspectEnvironmentImagingRecord(...args){return rules().inspectEnvironmentImagingRecord(...args);}
export function environmentImagingProjection(...args){return rules().environmentImagingProjection(...args);}
export function nativeEnvironmentImagingSituation(...args){return rules().nativeEnvironmentImagingSituation(...args);}
