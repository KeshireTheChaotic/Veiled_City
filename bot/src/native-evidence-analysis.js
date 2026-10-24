/** Native reading of an already visible, owner-held original. No custody, facts, disclosure or inferred conclusions. */
import {principalAllows} from './kernel/application-authority.js';
import {ordinaryActionProof,ordinaryPrerequisite,effectHash} from './ordinary-effect-proof.js';


import {createEvidenceAnalysisRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEvidenceAnalysisRules({capabilities:{principalAllows:(...args)=>principalAllows(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),effectHash:(...args)=>effectHash(...args)}});}
export function routineEvidenceContext(...args){return rules().routineEvidenceContext(...args);}
export function applyRoutineEvidenceAnalysis(...args){return rules().applyRoutineEvidenceAnalysis(...args);}
export function verifyRoutineEvidenceAnalysis(...args){return rules().verifyRoutineEvidenceAnalysis(...args);}
