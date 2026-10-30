import {connectPersistenceKnowledge,connectPersistenceSourceEvidence,connectPersistenceRelationshipState,connectPersistenceArchiveProjection,connectPersistenceKnowledgeProposal} from '../../framework-to-framework/knowledge--persistence/public.js';
import {connectPersistenceCityDue} from '../../framework-to-framework/persistence--world/public.js';
import {connectPersistenceSessionArchive} from '../../framework-to-framework/persistence--session/public.js';
import {connectPersistenceOperations} from '../../framework-to-framework/operations--persistence/public.js';
import {connectPersistenceNativeFear} from '../../framework-to-framework/daggerheart--persistence/public.js';
/** Same original eager providers for every historical standalone database import. */
export function initializeStandalonePersistence(){connectPersistenceKnowledge();connectPersistenceSourceEvidence();connectPersistenceRelationshipState();connectPersistenceArchiveProjection();connectPersistenceCityDue();connectPersistenceSessionArchive();connectPersistenceKnowledgeProposal();connectPersistenceOperations();connectPersistenceNativeFear();}
