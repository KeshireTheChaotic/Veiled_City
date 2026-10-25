/** Original World supply reader; actor evidence remains an external owning-framework capability. */
import {assertNpcAvailability,activeCityProxy} from './city-constraints.js';
import {createWorldSupply,worldNpcEvidence} from './frameworks/world/public.js';
export {supplyRevision} from './frameworks/world/public.js';
let worldSupply;
function supply(){return worldSupply??=createWorldSupply({actorSource:(...args)=>worldNpcEvidence.actorSource(...args),assertNpcAvailability:(...args)=>assertNpcAvailability(...args),activeCityProxy:(...args)=>activeCityProxy(...args)});}
export function validateServiceAccess(...args){return supply().validateServiceAccess(...args);}
export function assertServiceAccess(...args){return supply().assertServiceAccess(...args);}
export function transferSupply(...args){return supply().transferSupply(...args);}
