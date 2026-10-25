/** Original fixed source composition for NPC cognition; existing public exports preserved. */
import {narrativeContextEligible} from './narrative-salience.js';
import {clusterContext} from './memory-clusters.js';
import {sceneView,npcEvidenceActive} from './scene-continuity.js';
import {recordImportedNpcKnowledge} from './npc-cognition-projection.js';
import {createNpcCognition} from './frameworks/npc/public.js';
export {normalizeEntityKey as normalizeNpcKey} from './kernel/entity-key.js';
let cognitionRules;
function cognition(){return cognitionRules??=createNpcCognition({narrativeContextEligible:(...args)=>narrativeContextEligible(...args),clusterContext:(...args)=>clusterContext(...args),sceneView:(...args)=>sceneView(...args),npcEvidenceActive:(...args)=>npcEvidenceActive(...args),recordImportedNpcKnowledge:(...args)=>recordImportedNpcKnowledge(...args)});}
export function retrieveNpcCognition(...args){return cognition().retrieveNpcCognition(...args);}
export function dossierDecisionProfile(...args){return cognition().dossierDecisionProfile(...args);}
export function seedNpcCognition(...args){return cognition().seedNpcCognition(...args);}
