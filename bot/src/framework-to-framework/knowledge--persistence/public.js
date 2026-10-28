import {relationshipEvidence,activeEvidence,evidenceType,updateRelationshipDimensions,relationshipPairKey,relationshipProjection} from '../../frameworks/knowledge/public.js';
import {persistenceRelationshipEvidence,persistenceSourceEvidence,persistenceRelationshipState} from '../../frameworks/persistence/public.js';

/** Bind the original Knowledge classification to the Persistence-owned consumer. */
export function connectPersistenceKnowledge(){return persistenceRelationshipEvidence.bind({relationshipEvidence});}
export function connectPersistenceSourceEvidence(){return persistenceSourceEvidence.bind({activeEvidence,evidenceType});}
export function connectPersistenceRelationshipState(){return persistenceRelationshipState.bind({updateRelationshipDimensions,relationshipPairKey,relationshipProjection});}
