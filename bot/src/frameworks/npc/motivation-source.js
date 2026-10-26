/** One original NPC goal/evidence runtime; composition does no database/model/provider work. */
import {createNpcMotivationRules} from './motivation.js';
import {npcWorldMotivation} from './contracts/world-motivation.js';
import {npcEvidenceProvider} from './contracts/world-evidence-source.js';
const motivation=createNpcMotivationRules({cityObject:(...args)=>npcWorldMotivation.cityObject(...args),cityKey:(...args)=>npcWorldMotivation.cityKey(...args),cityInteger:(...args)=>npcWorldMotivation.cityInteger(...args),cityAudit:(...args)=>npcWorldMotivation.cityAudit(...args),requireCitySource:(...args)=>npcWorldMotivation.requireCitySource(...args),activeCityProxy:(...args)=>npcWorldMotivation.activeCityProxy(...args),assertNpcAvailability:(...args)=>npcWorldMotivation.assertNpcAvailability(...args),assertWorldActorControl:(...args)=>npcWorldMotivation.assertWorldActorControl(...args),nativeWorldOperationAllows:(...args)=>npcWorldMotivation.nativeWorldOperationAllows(...args),nativeWorldCoordinatorReady:(...args)=>npcWorldMotivation.nativeWorldCoordinatorReady(...args),inspectWorldInformationTransfer:(...args)=>npcWorldMotivation.inspectWorldInformationTransfer(...args)});
export const {actorSource,proposeGoalTransition,reviewGoalTransition,runMotivationCycle}=motivation;
const provideActorEvidence=()=>actorSource;
npcEvidenceProvider.provideSource(provideActorEvidence);
