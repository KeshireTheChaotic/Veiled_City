import {createTypedRollResolver} from '../../frameworks/daggerheart/public.js';
import {createAuthoredRollSourceCapability} from '../../frameworks/intent/public.js';

/** Accepted authored source capability -> native typed request/effect/receipt service. No rule copied into the adapter. */
export function connectTypedRolls({source,mechanics,reserveCampaignAttackNotices}){
  return createTypedRollResolver({source:createAuthoredRollSourceCapability(source),mechanics,reserveCampaignAttackNotices});
}
