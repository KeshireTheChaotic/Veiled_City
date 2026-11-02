import {createFunctionPort} from '../../../kernel/function-port.js';

/** Fixed Narrative eligibility catalog consumed by Intent validation; it grants no permission or execution. */
export const intentNarrativeDelegationCatalog=createFunctionPort(['delegationCatalog'],{
  code:'INTENT_NARRATIVE_DELEGATION_CATALOG_COMPOSITION',label:'Intent Narrative delegation catalog'
});
