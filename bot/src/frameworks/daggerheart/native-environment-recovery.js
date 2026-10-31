import {inspectEnvironmentSceneEffect} from "./native-environment-scene.js";
import {nativeAccessOrdinaryProof} from './contracts/environment-access-peers.js';
const {ordinaryActionProof,ordinaryPrerequisite}=nativeAccessOrdinaryProof;
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from "./native-environment-countdown.js";
import {nativeScenes} from "./contracts/scenes.js";
function recordScenePresence(...args){return nativeScenes.recordScenePresence(...args);}function scenePresence(...args){return nativeScenes.scenePresence(...args);}
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeWorldEvents} from "./contracts/world-events.js";
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {createEnvironmentRecoveryRules} from "./environment-recovery-rules.js";
let nativeRules;
function rules(){return nativeRules??=createEnvironmentRecoveryRules({capabilities:{inspectEnvironmentSceneEffect:(...args)=>inspectEnvironmentSceneEffect(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),captureCountdownActionAncestry:(...args)=>captureCountdownActionAncestry(...args),inspectCountdownActionAncestry:(...args)=>inspectCountdownActionAncestry(...args),recordScenePresence:(...args)=>recordScenePresence(...args),scenePresence:(...args)=>scenePresence(...args),hash:(...args)=>hash(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function resolveNativeEnvironmentEvent(...args){return rules().resolveNativeEnvironmentEvent(...args);}
export function inspectNativeEnvironmentResolution(...args){return rules().inspectNativeEnvironmentResolution(...args);}
export function environmentResolutionText(...args){return rules().environmentResolutionText(...args);}
