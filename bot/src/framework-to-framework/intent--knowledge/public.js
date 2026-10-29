import {authoredTurnEnvelope} from '../../frameworks/intent/public.js';
import {knowledgeIntentAuthoredTurn} from '../../frameworks/knowledge/public.js';

/** Bind the original saved reader; the adapter creates no authorization. */
export function connectKnowledgeIntentAuthoredTurn(){return knowledgeIntentAuthoredTurn.bind({authoredTurnEnvelope});}

import {intentKnowledgeMaintenance} from '../../frameworks/intent/public.js';
import {reconcileHistory,manageMemoryCluster,memoryMaintenanceCandidate} from '../../frameworks/knowledge/public.js';
/** Bind Knowledge's original history reconciliation and memory cluster maintenance to Intent's fixed consumer. */
export function connectIntentKnowledgeMaintenance(){return intentKnowledgeMaintenance.bind({reconcileHistory,manageMemoryCluster,memoryMaintenanceCandidate});}

import {intentKnowledgeActions,intentKnowledgeMemory} from '../../frameworks/intent/public.js';
import {manageEvidence,inviteOrganization,resolveScopedMemoryReference} from '../../frameworks/knowledge/public.js';
/** Bind only the two existing Knowledge effects requested by Intent workflows. */
export function connectIntentKnowledgeActions(){return intentKnowledgeActions.bind({manageEvidence,inviteOrganization});}


/** Bind only Knowledge's audience-scoped memory reference resolver. */
export function connectIntentKnowledgeMemory(){return intentKnowledgeMemory.bind({resolveScopedMemoryReference});}

import {intentKnowledgeSemanticProof} from '../../frameworks/intent/public.js';
import {assertSemanticCandidateProof} from '../../frameworks/knowledge/public.js';
export function connectIntentKnowledgeSemanticProof(){return intentKnowledgeSemanticProof.bind({assertSemanticCandidateProof});}
