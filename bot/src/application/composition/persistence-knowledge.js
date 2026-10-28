import {connectPersistenceKnowledge,connectPersistenceSourceEvidence} from '../../framework-to-framework/knowledge--persistence/public.js';

/** Wire the original pure relationship evidence reader before database services. */
export function initializePersistenceKnowledge(){connectPersistenceSourceEvidence();return connectPersistenceKnowledge();}
