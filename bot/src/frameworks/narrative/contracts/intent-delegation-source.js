import {createFunctionPort} from '../../../kernel/function-port.js';

/** Intent's original closed operation vocabulary; Narrative derives eligibility without re-owning schemas. */
export const narrativeIntentDelegationSource=createFunctionPort(['delegationFeatureKeys','delegationOperations'],{
  code:'NARRATIVE_INTENT_DELEGATION_SOURCE_COMPOSITION',label:'Narrative Intent delegation source'
});
