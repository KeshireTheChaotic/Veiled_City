/** Original fixed World source composition for Knowledge memory clusters. */
import {cityObject,cityKey,cityAudit} from './city-calendar.js';
import {requireCitySource} from './city-core.js';
import {createMemoryClusters} from './frameworks/knowledge/public.js';
let clusterRules;
function clusters(){return clusterRules??=createMemoryClusters({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityAudit:(...args)=>cityAudit(...args),requireCitySource:(...args)=>requireCitySource(...args)});}
export function manageMemoryCluster(...args){return clusters().manageMemoryCluster(...args);}
export function clusterContext(...args){return clusters().clusterContext(...args);}
export function memoryMaintenanceCandidate(...args){return clusters().memoryMaintenanceCandidate(...args);}
