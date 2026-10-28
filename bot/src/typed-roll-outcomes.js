/** Convert a terminal native roll request into one typed-action outcome receipt and resume its DAG. */
import { buildActionPlan, transitionAction } from "./action-dependency.js";
import {nativeActionContinuation} from './frameworks/daggerheart/public.js';
function drainActionContinuations(...args){return nativeActionContinuation.drainActionContinuations(...args);}
import {typedRollProof} from "./typed-roll-proof.js";
import {rollBreakdown,rollRevision,reserveRollAmendment} from "./roll-requests.js";
import {captureActionFeatureWindows} from './native-feature-windows.js';
import {captureEnvironmentTrace} from './native-environment-trace.js';


import {createTypedRollOutcomeRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createTypedRollOutcomeRules({capabilities:{buildActionPlan:(...args)=>buildActionPlan(...args),transitionAction:(...args)=>transitionAction(...args),drainActionContinuations:(...args)=>drainActionContinuations(...args),typedRollProof:(...args)=>typedRollProof(...args),rollBreakdown:(...args)=>rollBreakdown(...args),rollRevision:(...args)=>rollRevision(...args),reserveRollAmendment:(...args)=>reserveRollAmendment(...args),captureActionFeatureWindows:(...args)=>captureActionFeatureWindows(...args),captureEnvironmentTrace:(...args)=>captureEnvironmentTrace(...args)}});}
export function finalizeTypedRollAction(...args){return rules().finalizeTypedRollAction(...args);}
export function reviewTypedRollOutcome(...args){return rules().reviewTypedRollOutcome(...args);}
