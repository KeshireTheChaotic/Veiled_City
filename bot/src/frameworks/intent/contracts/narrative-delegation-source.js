import {createFunctionPort} from '../../../kernel/function-port.js';

/** Intent's closed operation vocabulary supplied to the Narrative catalog; no execution authority. */
export const intentNarrativeDelegationSource=createFunctionPort(['delegationFeatureKeys','delegationOperations'],{
  code:'INTENT_NARRATIVE_DELEGATION_SOURCE_COMPOSITION',label:'Intent Narrative delegation source'
});
