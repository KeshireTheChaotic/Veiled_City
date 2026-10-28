/** Original native encounter catalog, actor, roster and budget rules for World encounter beats; World adds no encounter rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const worldNativeEncounter=createFunctionPort(['loadEncounterLibrary','isEncounterLibrary','encounterActors','livePcRoster','partyTier','baseBattlePoints','battlePointCost','recomputeBudget'],{code:'WORLD_NATIVE_ENCOUNTER_COMPOSITION',label:'World native encounter'});
