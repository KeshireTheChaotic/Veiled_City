import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native originals for action review, rules arbitration and condition recovery, each provided by its composing native module at load; native rules keep every check. */
const slot=(name,code,label)=>createFunctionPort([name],{code,label});
export const nativeActionReviewSource=slot('actionReviewOperation','NATIVE_ACTION_REVIEW_SOURCE_COMPOSITION','Native action review source');
export const nativeRulesArbitrationSource=slot('adjudicateAcceptedIntent','NATIVE_RULES_ARBITRATION_SOURCE_COMPOSITION','Native rules arbitration source');
export const nativeConditionRecoverySource=slot('clearNativeConditionFromOutcome','NATIVE_CONDITION_RECOVERY_SOURCE_COMPOSITION','Native condition recovery source');
