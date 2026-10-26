/** One original reversible actor-relative memory service; bootstrap does no database/provider work. */
import {createMemoryClusters} from './memory-clusters.js';
import {knowledgeWorldMemory} from './contracts/world-memory.js';
export const {manageMemoryCluster,clusterContext,memoryMaintenanceCandidate}=createMemoryClusters({cityObject:(...args)=>knowledgeWorldMemory.cityObject(...args),cityKey:(...args)=>knowledgeWorldMemory.cityKey(...args),cityAudit:(...args)=>knowledgeWorldMemory.cityAudit(...args),requireCitySource:(...args)=>knowledgeWorldMemory.requireCitySource(...args)});
