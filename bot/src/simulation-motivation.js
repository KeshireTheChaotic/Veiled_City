/** Original NPC motivation provider: one source-composed engine, unchanged native policy and receipts. */
import { cityObject, cityKey, cityInteger, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { activeCityProxy, assertNpcAvailability, assertWorldActorControl } from "./city-constraints.js";
import {nativeWorldOperationAllows,nativeWorldCoordinatorReady} from './native-world-operations.js';
import {inspectWorldInformationTransfer} from './world-information-transfer.js';
import {createNpcMotivationRules} from './frameworks/npc/public.js';
export {motivationKey} from './frameworks/npc/public.js';
let npcMotivation;
function motivation(){return npcMotivation??=createNpcMotivationRules({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityInteger:(...args)=>cityInteger(...args),cityAudit:(...args)=>cityAudit(...args),requireCitySource:(...args)=>requireCitySource(...args),activeCityProxy:(...args)=>activeCityProxy(...args),assertNpcAvailability:(...args)=>assertNpcAvailability(...args),assertWorldActorControl:(...args)=>assertWorldActorControl(...args),nativeWorldOperationAllows:(...args)=>nativeWorldOperationAllows(...args),nativeWorldCoordinatorReady:(...args)=>nativeWorldCoordinatorReady(...args),inspectWorldInformationTransfer:(...args)=>inspectWorldInformationTransfer(...args)});}
export function ownedKnowledgeSource(...args){return motivation().ownedKnowledgeSource(...args);}
export function actorSource(...args){return motivation().actorSource(...args);}
export function proposeGoalTransition(...args){return motivation().proposeGoalTransition(...args);}
export function reviewGoalTransition(...args){return motivation().reviewGoalTransition(...args);}
export function runMotivationCycle(...args){return motivation().runMotivationCycle(...args);}

import {npcEvidenceProvider} from './frameworks/npc/public.js';
const provideActorEvidence=()=>motivation().actorSource;
npcEvidenceProvider.provideSource(provideActorEvidence);
