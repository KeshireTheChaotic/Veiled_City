/** One World institutional/supply runtime; original factories retain validators and transactional effects. */
import {createWorldSupply} from './supply-dependencies.js';
import {createCityCoreRules} from './city-core-rules.js';
import {worldNpcEvidence} from './contracts/npc-evidence.js';
import {activeCityProxy} from './active-proxy.js';
import {assertNpcAvailability,assertInstitutionDelegation,assertWorldActorControl,nativeWorldOperationAllows,nativeWorldStrategyStepAllowed} from './execution-source.js';
const supply=createWorldSupply({actorSource:(...args)=>worldNpcEvidence.actorSource(...args),assertNpcAvailability,activeCityProxy});
export const {validateServiceAccess,assertServiceAccess,transferSupply}=supply;
const core=createCityCoreRules({capabilities:{assertInstitutionDelegation,assertWorldActorControl,assertServiceAccess,nativeWorldOperationAllows,nativeWorldStrategyStepAllowed}});
export const {updateCityCore,assignDistrictLocation,addWorldLink,inspectInstitutionAction,submitInstitutionAction,reviewInstitutionAction,executeInstitutionAction,runInstitutionDirector}=core;
