import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeAccessOrdinaryProof,nativeAccessCountdownAncestry} from './contracts/environment-access-peers.js';
const {ordinaryActionProof,ordinaryPrerequisite}=nativeAccessOrdinaryProof;
const {captureCountdownActionAncestry,inspectCountdownActionAncestry}=nativeAccessCountdownAncestry;
import {nativeWorldEstablishedEvidence} from './contracts/world-established-evidence.js';
const {nativeEstablishedFact}=nativeWorldEstablishedEvidence;
import {nativePrincipals} from './contracts/principals.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeScenes} from './contracts/scenes.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {stateRevision} from '../../kernel/state-revision.js';
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';
import {createEnvironmentAccessRules} from './environment-access-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentAccessRules({capabilities:{inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),captureCountdownActionAncestry:(...args)=>captureCountdownActionAncestry(...args),inspectCountdownActionAncestry:(...args)=>inspectCountdownActionAncestry(...args),nativeEstablishedFact:(...args)=>nativeEstablishedFact(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),stateRevision:(...args)=>stateRevision(...args),hash:(...args)=>hash(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function establishEnvironmentAdmission(...args){return rules().establishEnvironmentAdmission(...args);}
export function inspectEnvironmentAdmission(...args){return rules().inspectEnvironmentAdmission(...args);}
export function nativeVipAdmission(...args){return rules().nativeVipAdmission(...args);}
import {nativeVipAdmissionSource} from './contracts/movement-checks.js';
/** Register the single original admission reader at bootstrap or legacy root import. */
export function registerNativeEnvironmentAccess(){return nativeVipAdmissionSource.bind({nativeVipAdmission});}
