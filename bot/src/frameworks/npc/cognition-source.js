/** One original GM-private cognition service; packets are not publication authority. */
import {createNpcCognition} from './cognition.js';
import {npcNarrativeContext} from './contracts/narrative-context.js';
import {npcKnowledgeClusters} from './contracts/knowledge-clusters.js';
import {npcSessionView} from './contracts/session-view.js';
import {npcEvidenceActive} from './observation-source.js';
import {recordImportedNpcKnowledge} from './evidence-projection-source.js';
export const {retrieveNpcCognition,dossierDecisionProfile,seedNpcCognition}=createNpcCognition({narrativeContextEligible:(...args)=>npcNarrativeContext.narrativeContextEligible(...args),clusterContext:(...args)=>npcKnowledgeClusters.clusterContext(...args),sceneView:(...args)=>npcSessionView.sceneView(...args),npcEvidenceActive,recordImportedNpcKnowledge});
