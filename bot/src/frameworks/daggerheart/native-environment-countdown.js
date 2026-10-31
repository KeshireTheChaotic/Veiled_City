/** W6 construction: fictional Upload in Progress receipts; never elapsed time or inferred PC conduct. */
import {nativeArbitrationOrigin} from './contracts/environment-sources.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeGmOpportunityPeer} from './contracts/environment-sources.js';
const {nativeGmOpportunity}=nativeGmOpportunityPeer;
import {reservedCampaignFearPeer} from './contracts/environment-sources.js';
const {reservedCampaignFear}=reservedCampaignFearPeer;
import {nativeAccessOrdinaryProof} from './contracts/environment-access-peers.js';
const {ordinaryActionProof,ordinaryPrerequisite}=nativeAccessOrdinaryProof;
import {inspectEnvironmentSceneEffect} from './native-environment-scene.js';
import {nativeEnvironmentNarrative} from './contracts/environment-narrative.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {nativeScenes} from './contracts/scenes.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {inspectNativeEnvironmentRecording} from './native-environment-recording.js';

import {createEnvironmentCountdownRules} from './environment-countdown-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentCountdownRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeGmOpportunity:(...args)=>nativeGmOpportunity(...args),reservedCampaignFear:(...args)=>reservedCampaignFear(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),inspectEnvironmentSceneEffect:(...args)=>inspectEnvironmentSceneEffect(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),currentScene:(...args)=>currentScene(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),inspectNativeEnvironmentRecording:(...args)=>inspectNativeEnvironmentRecording(...args)}});}
export function establishEnvironmentUploadRecording(...args){return rules().establishEnvironmentUploadRecording(...args);}
export function startEnvironmentUploadCountdown(...args){return rules().startEnvironmentUploadCountdown(...args);}
export function captureCountdownActionAncestry(...args){return rules().captureCountdownActionAncestry(...args);}
export function inspectCountdownActionAncestry(...args){return rules().inspectCountdownActionAncestry(...args);}
export function advanceEnvironmentUploadCountdown(...args){return rules().advanceEnvironmentUploadCountdown(...args);}
export function adjustEnvironmentUploadCountdown(...args){return rules().adjustEnvironmentUploadCountdown(...args);}
export function inspectEnvironmentCountdown(...args){return rules().inspectEnvironmentCountdown(...args);}
export function environmentCountdownProjection(...args){return rules().environmentCountdownProjection(...args);}
export function environmentUploadState(...args){return rules().environmentUploadState(...args);}
export function closingTimeMovesReadiness(...args){return rules().closingTimeMovesReadiness(...args);}
import {nativeAccessCountdownAncestry} from './contracts/environment-access-peers.js';
nativeAccessCountdownAncestry.bind({captureCountdownActionAncestry,inspectCountdownActionAncestry});
