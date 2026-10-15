/** Permission inventory comes from native closed contracts, never caller-provided identifiers. */
import {INTENT_PAYLOADS,intentOperations} from './ai-intent-contracts.js';
export const PRIVATE_DELEGATION_FAMILIES=new Set(['goal','consequence','scene','group','strategy','encounter']);
export function delegationCatalog(){
  const all=[...new Set(Object.keys(INTENT_PAYLOADS).flatMap(feature=>intentOperations(feature).map(op=>`${feature}.${op}`)))].sort();
  return {all,private_eligible:all.filter(id=>PRIVATE_DELEGATION_FAMILIES.has(id.split('.')[0])),
    authority:'Permission eligibility only; native flags, derived risk/review, consent, expiry and budgets still apply.'};
}
