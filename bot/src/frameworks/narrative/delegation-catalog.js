import {narrativeIntentDelegationSource} from './contracts/intent-delegation-source.js';

/** Permission inventory comes from native closed contracts, never caller-provided identifiers. */
export const PRIVATE_DELEGATION_FAMILIES=new Set(['goal','consequence','scene','group','strategy','encounter','institution']);
export function delegationCatalog(){
  const all=[...new Set(narrativeIntentDelegationSource.delegationFeatureKeys().flatMap(feature=>
    narrativeIntentDelegationSource.delegationOperations(feature).map(op=>`${feature}.${op}`)))].sort();
  return {all,private_eligible:all.filter(id=>PRIVATE_DELEGATION_FAMILIES.has(id.split('.')[0])),
    authority:'Permission eligibility only; native flags, derived risk/review, consent, expiry and budgets still apply.'};
}
