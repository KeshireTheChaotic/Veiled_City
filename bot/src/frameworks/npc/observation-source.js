/** One original NPC observation service using source-owned evidence/access functions. */
import {createNpcObservationRules} from './observation.js';
import {npcKnowledgeEvidence} from './contracts/knowledge-evidence.js';
import {npcSceneAccess} from './contracts/scene-access.js';
export const {npcEvidenceActive,assertNpcObservation}=createNpcObservationRules({activeEvidence:(...args)=>npcKnowledgeEvidence.activeEvidence(...args),sceneAccess:(...args)=>npcSceneAccess.sceneAccess(...args)});
