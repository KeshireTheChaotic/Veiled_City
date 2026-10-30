import {relationshipEvidence,activeEvidence,evidenceType,updateRelationshipDimensions,relationshipPairKey,relationshipProjection,historicalArchiveProjection} from '../../frameworks/knowledge/public.js';
import {persistenceRelationshipEvidence,persistenceSourceEvidence,persistenceRelationshipState,persistenceArchiveProjection} from '../../frameworks/persistence/public.js';

/** Bind the original Knowledge classification to the Persistence-owned consumer. */
export function connectPersistenceKnowledge(){return persistenceRelationshipEvidence.bind({relationshipEvidence});}
export function connectPersistenceSourceEvidence(){return persistenceSourceEvidence.bind({activeEvidence,evidenceType});}
export function connectPersistenceRelationshipState(){return persistenceRelationshipState.bind({updateRelationshipDimensions,relationshipPairKey,relationshipProjection});}
export function connectPersistenceArchiveProjection(){return persistenceArchiveProjection.bind({historicalArchiveProjection});}

import {persistenceKnowledgeProposal} from '../../frameworks/persistence/public.js';
import {assertCanonProposalProof} from '../../frameworks/knowledge/public.js';
export function connectPersistenceKnowledgeProposal(){return persistenceKnowledgeProposal.bind({assertCanonProposalProof});}
