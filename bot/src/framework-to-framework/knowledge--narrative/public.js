import {createKnowledgeNarrativeVisibilityConsumer} from '../../frameworks/knowledge/public.js';
import {nativeNarrativeSource} from '../../frameworks/narrative/public.js';
/** Bind the shared native closure, not copied policy or a new grant adapter. */
export function connectKnowledgeNarrative({consumer=createKnowledgeNarrativeVisibilityConsumer()}={}){
  return consumer.bind(nativeNarrativeSource.nativeSource().narrativeSourceVisible);
}

import {narrativeKnowledgeEvidence} from '../../frameworks/narrative/public.js';
import {factVisibleTo,activeEvidence,evidenceType,retainEstablishedNarrative,selectDisclosedNarrativeMemory} from '../../frameworks/knowledge/public.js';
export function connectNarrativeKnowledgeEvidence(){return narrativeKnowledgeEvidence.bind({factVisibleTo,activeEvidence,evidenceType});}

import {knowledgeNarrativeSources} from '../../frameworks/knowledge/public.js';
import {narrativeSourceVisible,narrativeImportanceSource,narrativeAuthorityContextSource,narrativeRelevanceSource} from '../../frameworks/narrative/public.js';
/** Pass Narrative's original visibility, importance and relevance functions to Knowledge unchanged. */
export function connectKnowledgeNarrativeSources(){return knowledgeNarrativeSources.bind({narrativeSourceVisible,narrativeImportance:narrativeImportanceSource.narrativeImportance,narrativeVisible:narrativeAuthorityContextSource.narrativeVisible,narrativeQueryRelevance:narrativeRelevanceSource.narrativeQueryRelevance,narrativeIdentityRelevance:narrativeRelevanceSource.narrativeIdentityRelevance});}
import {narrativeKnowledgeReaders} from '../../frameworks/narrative/public.js';
import {mentionsPublicIdentity,scopedQueryPlan,queryScopedFacts,listNarrativeRecords,NARRATIVE_RECORD_LIMIT} from '../../frameworks/knowledge/public.js';
/** Bind Knowledge's original public referent and scoped query readers to Narrative's fixed consumer. */
const narrativeRecordLimit=()=>NARRATIVE_RECORD_LIMIT;
export function connectNarrativeKnowledgeReaders(){return narrativeKnowledgeReaders.bind({mentionsPublicIdentity,scopedQueryPlan,queryScopedFacts,listNarrativeRecords,narrativeRecordLimit});}


import {narrativeKnowledgeMemory} from '../../frameworks/narrative/public.js';
/** Bind only Knowledge's accepted-retention and disclosed-memory selection operations. */
export function connectNarrativeKnowledgeMemory(){return narrativeKnowledgeMemory.bind({retainEstablishedNarrative,selectDisclosedNarrativeMemory});}

import {narrativeKnowledgePersonal} from '../../frameworks/narrative/public.js';
import {personalContinuityCharacter as personalCharacter} from '../../frameworks/knowledge/public.js';
export function connectNarrativeKnowledgePersonal(){return narrativeKnowledgePersonal.bind({personalCharacter});}
