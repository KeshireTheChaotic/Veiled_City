import {nativeAccessOrdinaryProof} from './contracts/environment-access-peers.js';
const {ordinaryActionProof,ordinaryPrerequisite}=nativeAccessOrdinaryProof;
import {nativeAccessCountdownAncestry} from './contracts/environment-access-peers.js';
const {captureCountdownActionAncestry,inspectCountdownActionAncestry}=nativeAccessCountdownAncestry;
import {nativeScenes} from './contracts/scenes.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}function currentScene(...args){return nativeScenes.currentScene(...args);}
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeEnvironmentNarrative} from './contracts/environment-narrative.js';
function narrativeSourceVisible(...args){return nativeEnvironmentNarrative.narrativeSourceVisible(...args);}
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {createEnvironmentRecordingRules} from './environment-recording-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentRecordingRules({capabilities:{ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),captureCountdownActionAncestry:(...args)=>captureCountdownActionAncestry(...args),inspectCountdownActionAncestry:(...args)=>inspectCountdownActionAncestry(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),currentScene:(...args)=>currentScene(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function createNativeEnvironmentRecording(...args){return rules().createNativeEnvironmentRecording(...args);}
export function inspectNativeEnvironmentRecording(...args){return rules().inspectNativeEnvironmentRecording(...args);}
