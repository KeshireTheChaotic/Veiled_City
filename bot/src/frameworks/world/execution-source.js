/** One native World runtime preserves opaque live grants and nested synchronous strategy frames. */
import {createWorldAvailability} from './availability.js';
import {createWorldOperationAuthority} from './operation-authority.js';
import {activeCityProxy} from './active-proxy.js';
import {worldNativeActorControl} from './contracts/actor-control.js';
import {worldDelegationPolicy} from './contracts/delegation-policy.js';
import {worldConversationPrincipal} from './contracts/conversation-principal.js';
import {worldNpcEvidence} from './contracts/npc-evidence.js';
const availability=createWorldAvailability({
 nativeActorControl:(...args)=>worldNativeActorControl.nativeActorControl(...args),activeCityProxy,
 delegationPolicy:(...args)=>worldDelegationPolicy.delegationPolicy(...args),
 nativeWorldStrategyStepAllowed:(...args)=>authority.nativeWorldStrategyStepAllowed(...args)
});
const authority=createWorldOperationAuthority({
 actorSource:(...args)=>worldNpcEvidence.actorSource(...args),
 conversationPrincipal:(...args)=>worldConversationPrincipal.conversationPrincipal(...args),
 assertWorldActorControl:availability.assertWorldActorControl
});
export const {worldActorControl,assertWorldActorControl,assertNpcAvailability,npcAvailability,assertInstitutionDelegation,assertQueuedCompatibility}=availability;
export const {nativeWorldCoordinatorReady,nativeWorldOperationCatalog,prepareNativeWorldOperation,nativeWorldOperationAllows,nativeWorldOperationOrigin,inspectNativeWorldOperationReceipt,nativeWorldStrategyAllowed,nativeWorldStrategyScope,withNativeStrategyExecution,nativeWorldStrategyStepAllowed}=authority;
