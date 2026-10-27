import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from './native-environment-countdown.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}function currentScene(...args){return nativeScenes.currentScene(...args);}
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentRecordingRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentRecordingRules({capabilities:{ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),captureCountdownActionAncestry:(...args)=>captureCountdownActionAncestry(...args),inspectCountdownActionAncestry:(...args)=>inspectCountdownActionAncestry(...args),scenePresence:(...args)=>scenePresence(...args),sceneAccess:(...args)=>sceneAccess(...args),currentScene:(...args)=>currentScene(...args),hash:(...args)=>hash(...args),narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function createNativeEnvironmentRecording(...args){return rules().createNativeEnvironmentRecording(...args);}
export function inspectNativeEnvironmentRecording(...args){return rules().inspectNativeEnvironmentRecording(...args);}
