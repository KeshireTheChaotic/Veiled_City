import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session asks native rules for movement condition checks, owner consent, action review, arbitration and condition recovery without owning them. */
export const sessionNativeRules=createFunctionPort(['nativeMovementConditionIssue','hasOwnerConsent','actionReviewOperation','adjudicateAcceptedIntent','clearNativeConditionFromOutcome'],{code:'SESSION_NATIVE_RULES_COMPOSITION',label:'Session native rules'});
