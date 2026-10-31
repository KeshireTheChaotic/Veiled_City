/** Closed combined-request dispatch. All permissions, costs and results remain in existing native adapters. */
import {applyEnvironmentArrival} from './frameworks/daggerheart/public.js';
import {applyEnvironmentSceneAction} from './frameworks/daggerheart/public.js';
import {applyEnvironmentWitnessAccounts} from './frameworks/daggerheart/public.js';
import {applyEnvironmentDoorChain} from './frameworks/daggerheart/public.js';
import {applyEnvironmentImagingRecord} from './frameworks/daggerheart/public.js';
import {establishEnvironmentUploadRecording,startEnvironmentUploadCountdown,advanceEnvironmentUploadCountdown,
  adjustEnvironmentUploadCountdown} from './frameworks/daggerheart/public.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentDispatchRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentDispatchRules({capabilities:{applyEnvironmentArrival:(...args)=>applyEnvironmentArrival(...args),applyEnvironmentSceneAction:(...args)=>applyEnvironmentSceneAction(...args),applyEnvironmentWitnessAccounts:(...args)=>applyEnvironmentWitnessAccounts(...args),applyEnvironmentDoorChain:(...args)=>applyEnvironmentDoorChain(...args),applyEnvironmentImagingRecord:(...args)=>applyEnvironmentImagingRecord(...args),establishEnvironmentUploadRecording:(...args)=>establishEnvironmentUploadRecording(...args),startEnvironmentUploadCountdown:(...args)=>startEnvironmentUploadCountdown(...args),advanceEnvironmentUploadCountdown:(...args)=>advanceEnvironmentUploadCountdown(...args),adjustEnvironmentUploadCountdown:(...args)=>adjustEnvironmentUploadCountdown(...args),fail:(...args)=>fail(...args)}});}
export function executeEnvironmentProposal(...args){return rules().executeEnvironmentProposal(...args);}
