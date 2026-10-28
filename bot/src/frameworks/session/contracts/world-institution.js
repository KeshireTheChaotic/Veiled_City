import {createFunctionPort} from '../../../kernel/function-port.js';
/** Session forwards original World institution lookup and delegation checks. */
export function createSessionWorldInstitutionConsumer(){return createFunctionPort(['requireCityRecord','assertInstitutionDelegation'],{code:'SESSION_WORLD_INSTITUTION_COMPOSITION',label:'Session World institution'});}
export const sessionWorldInstitution=createSessionWorldInstitutionConsumer();
