/** Closed combined-request dispatch. All permissions, costs and results remain in existing native adapters. */
import {applyEnvironmentArrival} from './native-environment-arrivals.js';
import {applyEnvironmentSceneAction} from './native-environment-scene.js';
import {applyEnvironmentWitnessAccounts} from './native-environment-witnesses.js';
import {applyEnvironmentDoorChain} from './native-environment-door-chain.js';
import {applyEnvironmentImagingRecord} from './native-environment-imaging.js';
import {establishEnvironmentUploadRecording,startEnvironmentUploadCountdown,advanceEnvironmentUploadCountdown,
  adjustEnvironmentUploadCountdown} from './native-environment-countdown.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentDispatchRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentDispatchRules({capabilities:{applyEnvironmentArrival:(...args)=>applyEnvironmentArrival(...args),applyEnvironmentSceneAction:(...args)=>applyEnvironmentSceneAction(...args),applyEnvironmentWitnessAccounts:(...args)=>applyEnvironmentWitnessAccounts(...args),applyEnvironmentDoorChain:(...args)=>applyEnvironmentDoorChain(...args),applyEnvironmentImagingRecord:(...args)=>applyEnvironmentImagingRecord(...args),establishEnvironmentUploadRecording:(...args)=>establishEnvironmentUploadRecording(...args),startEnvironmentUploadCountdown:(...args)=>startEnvironmentUploadCountdown(...args),advanceEnvironmentUploadCountdown:(...args)=>advanceEnvironmentUploadCountdown(...args),adjustEnvironmentUploadCountdown:(...args)=>adjustEnvironmentUploadCountdown(...args),fail:(...args)=>fail(...args)}});}
export function executeEnvironmentProposal(...args){return rules().executeEnvironmentProposal(...args);}
