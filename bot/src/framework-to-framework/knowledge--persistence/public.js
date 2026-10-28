import {relationshipEvidence,activeEvidence,evidenceType} from '../../frameworks/knowledge/public.js';
import {persistenceRelationshipEvidence,persistenceSourceEvidence} from '../../frameworks/persistence/public.js';

/** Bind the original Knowledge classification to the Persistence-owned consumer. */
export function connectPersistenceKnowledge(){return persistenceRelationshipEvidence.bind({relationshipEvidence});}
export function connectPersistenceSourceEvidence(){return persistenceSourceEvidence.bind({activeEvidence,evidenceType});}
