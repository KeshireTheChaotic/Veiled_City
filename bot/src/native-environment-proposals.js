/** Bounded combined-request environment profile producer. Unsupported features never become Director capabilities. */
import {inspectArbitrationOrigin} from './scene-intent-board.js';
import {nativeNarrativeContext} from './frameworks/daggerheart/public.js';
const {buildNarrativeContext}=nativeNarrativeContext;
import {establishNativeEnvironmentInstance} from './frameworks/daggerheart/public.js';
import {compileNativeActors,executableNativeFeatures} from './native-feature-catalog.js';
import {jsonHash as hash} from './kernel/json-hash.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';

import {createEnvironmentProfileProposalRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentProfileProposalRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),buildNarrativeContext:(...args)=>buildNarrativeContext(...args),establishNativeEnvironmentInstance:(...args)=>establishNativeEnvironmentInstance(...args),compileNativeActors:(...args)=>compileNativeActors(...args),executableNativeFeatures:(...args)=>executableNativeFeatures(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args)}});}
export function applyNativeEnvironmentProfileProposals(...args){return rules().applyNativeEnvironmentProfileProposals(...args);}
