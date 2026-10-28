import {relationshipEvidence} from '../../frameworks/knowledge/public.js';
import {persistenceRelationshipEvidence} from '../../frameworks/persistence/public.js';

/** Bind the original Knowledge classification to the Persistence-owned consumer. */
export function connectPersistenceKnowledge(){return persistenceRelationshipEvidence.bind({relationshipEvidence});}
