import {createFunctionPort} from '../../../kernel/function-port.js';

/** Intent reads original World proxy and availability rules through fixed capabilities. */
export const intentWorldConstraints=createFunctionPort(['activeCityProxy','assertNpcAvailability'],{
 code:'INTENT_WORLD_CONSTRAINTS_COMPOSITION',label:'Intent World constraints'
});
