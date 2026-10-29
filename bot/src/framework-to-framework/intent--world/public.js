import {intentArraySchema} from '../../frameworks/intent/public.js';
import {npcActionSchema} from '../../frameworks/world/public.js';

/** Existing proposal contract composition only; native rules alone validate and commit effects. */
export const npcDirectorSchema={type:'object',additionalProperties:false,
  properties:{actions:{type:'array',maxItems:4,items:npcActionSchema},ai_intents:intentArraySchema},required:['actions','ai_intents']};

import {delegationPolicy} from '../../frameworks/intent/public.js';
import {worldDelegationPolicy} from '../../frameworks/world/public.js';
export function connectWorldDelegation(){return worldDelegationPolicy.bind(delegationPolicy);}

import {intentWorldPrimitives,intentWorldActions} from '../../frameworks/intent/public.js';
import {requireCitySource,cityObject,cityInteger,cityAudit,indexWorldEvent,inspectNpcAction,inspectInstitutionAction,submitInstitutionAction,executeInstitutionAction} from '../../frameworks/world/public.js';
export function connectIntentWorldNative(){intentWorldPrimitives.bind({requireCitySource,cityObject,cityInteger,cityAudit,indexWorldEvent});return intentWorldActions.bind({inspectNpcAction,inspectInstitutionAction,submitInstitutionAction,executeInstitutionAction});}

import {intentAiIntentDispatch,intentTypedIntentReaders} from '../../frameworks/intent/public.js';
import {worldIntentDispatch} from '../../frameworks/world/public.js';
/** Pass Intent's original AI intent dispatch and typed-intent readers to World unchanged. */
export function connectWorldIntentDispatch(){const d=intentAiIntentDispatch,r=intentTypedIntentReaders;return worldIntentDispatch.bind({delegateConsequence:d.delegateConsequence,delegateWorldGoal:d.delegateWorldGoal,maintainMemory:d.maintainMemory,continueLongProjects:d.continueLongProjects,dispatchAiIntents:d.dispatchAiIntents,currentAcceptedIntent:r.currentAcceptedIntent,currentTypedMovement:r.currentTypedMovement});}

import {validateIntent} from '../../frameworks/intent/public.js';
import {worldIntentValidation} from '../../frameworks/world/public.js';
/** Pass Intent's original AI intent validation to World unchanged. */
export function connectWorldIntentValidation(){return worldIntentValidation.bind({validateIntent});}

import {intentWorldOperations} from '../../frameworks/intent/public.js';
import {prepareNativeWorldOperation,nativeWorldOperationAllows,nativeWorldOperationOrigin,inspectNativeWorldOperationReceipt,nativeWorldOperationCatalog,nativeWorldStrategyScope,resolvePlaceReference,attemptCityInfluence,subscribeConsequence,reviewConsequence} from '../../frameworks/world/public.js';
/** Bind World's original operations, receipts, place lookup and callable city influence to Intent's fixed consumer. */
export function connectIntentWorldOperations(){return intentWorldOperations.bind({prepareNativeWorldOperation,nativeWorldOperationAllows,nativeWorldOperationOrigin,inspectNativeWorldOperationReceipt,nativeWorldOperationCatalog,nativeWorldStrategyScope,resolvePlaceReference,attemptCityInfluence,subscribeConsequence,reviewConsequence});}

import {intentWorldConstraints} from '../../frameworks/intent/public.js';
import {activeCityProxy,assertNpcAvailability} from '../../frameworks/world/public.js';
/** Bind World's original proxy and availability rules to Intent's fixed consumer. */
export function connectIntentWorldConstraints(){return intentWorldConstraints.bind({activeCityProxy,assertNpcAvailability});}
