/** Bounded combined-request environment profile producer. Unsupported features never become Director capabilities. */
import {nativeArbitrationOrigin} from './contracts/environment-sources.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {nativeNarrativeContext} from './contracts/narrative-context.js';
const {buildNarrativeContext}=nativeNarrativeContext;
import {establishNativeEnvironmentInstance} from './native-environment-instance.js';
import {compileNativeActors,executableNativeFeatures} from './native-feature-catalog.js';
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {arbitrationFailure as fail} from '../../kernel/arbitration-failure.js';

import {createEnvironmentProfileProposalRules} from './environment-profile-proposal-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentProfileProposalRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),buildNarrativeContext:(...args)=>buildNarrativeContext(...args),establishNativeEnvironmentInstance:(...args)=>establishNativeEnvironmentInstance(...args),compileNativeActors:(...args)=>compileNativeActors(...args),executableNativeFeatures:(...args)=>executableNativeFeatures(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args)}});}
export function applyNativeEnvironmentProfileProposals(...args){return rules().applyNativeEnvironmentProfileProposals(...args);}
