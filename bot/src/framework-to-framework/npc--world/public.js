import {npcWorldMotivation} from '../../frameworks/npc/public.js';
import {cityObject,cityKey,cityInteger,cityAudit,requireCitySource,activeCityProxy,assertNpcAvailability,assertWorldActorControl,nativeWorldOperationAllows,nativeWorldCoordinatorReady,inspectWorldInformationTransfer} from '../../frameworks/world/public.js';
import {ownedKnowledgeSource} from '../../frameworks/npc/public.js';
import {worldNpcKnowledge} from '../../frameworks/world/public.js';
import {npcEvidenceProvider} from '../../frameworks/npc/public.js';
import {createNpcEvidenceConsumer} from '../../frameworks/world/public.js';
/** Exact actor/source/evidence arguments and original checked result; no authority inferred from JSON. */
export function connectNpcWorldEvidence({consumer=createNpcEvidenceConsumer(),source=npcEvidenceProvider.actorSourceFunction()}={}){npcWorldMotivation.bind({cityObject,cityKey,cityInteger,cityAudit,requireCitySource,activeCityProxy,assertNpcAvailability,assertWorldActorControl,nativeWorldOperationAllows,nativeWorldCoordinatorReady,inspectWorldInformationTransfer});worldNpcKnowledge.bind(ownedKnowledgeSource);return consumer.bind(source);}

import {npcWorldStrategy} from '../../frameworks/npc/public.js';
import {submitInstitutionAction,reviewInstitutionAction,actorState,submitNpcAction,nativeWorldOperationOrigin,nativeWorldStrategyAllowed,withNativeStrategyExecution,ACTION_TYPES,ACTION_COSTS} from '../../frameworks/world/public.js';
export function connectNpcWorldStrategy(){return npcWorldStrategy.bind({cityObject,cityKey,cityInteger,cityAudit,submitInstitutionAction,reviewInstitutionAction,actorState,submitNpcAction,nativeWorldOperationAllows,nativeWorldOperationOrigin,nativeWorldStrategyAllowed,withNativeStrategyExecution,ACTION_TYPES,ACTION_COSTS});}

import {npcWorldEvidenceEvent} from '../../frameworks/npc/public.js';
import {indexWorldEvent} from '../../frameworks/world/public.js';
export function connectNpcWorldEvidenceEvent(){return npcWorldEvidenceEvent.bind(indexWorldEvent);}

import {npcWorldConversations} from '../../frameworks/npc/public.js';
export function connectNpcWorldConversations(){return npcWorldConversations.bind({cityObject,cityKey,cityAudit,requireCitySource,activeCityProxy,assertNpcAvailability,actorState,submitNpcAction});}

import {worldNpcCognition} from '../../frameworks/world/public.js';
import {retrieveNpcCognition} from '../../frameworks/npc/public.js';
export function connectWorldNpcCognition(){return worldNpcCognition.bind(retrieveNpcCognition);}

import {worldNpcOpportunity} from '../../frameworks/world/public.js';
import {runMotivationCycle,runStrategyOpportunity} from '../../frameworks/npc/public.js';
export function connectWorldNpcOpportunity(){return worldNpcOpportunity.bind({runMotivationCycle,runStrategyOpportunity});}

import {worldNpcGoalProposal} from '../../frameworks/world/public.js';
import {proposeGoalTransition} from '../../frameworks/npc/public.js';
export function connectWorldNpcGoalProposal(){return worldNpcGoalProposal.bind(proposeGoalTransition);}

import {worldNpcSeed} from '../../frameworks/world/public.js';
import {seedNpcCognition} from '../../frameworks/npc/public.js';
export function connectWorldNpcSeed(){return worldNpcSeed.bind(seedNpcCognition);}

import {worldNpcVisibility} from '../../frameworks/world/public.js';
import {actorEvidenceVisible} from '../../frameworks/npc/public.js';
export function connectWorldNpcVisibility(){return worldNpcVisibility.bind(actorEvidenceVisible);}
