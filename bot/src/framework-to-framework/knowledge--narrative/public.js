import {createKnowledgeNarrativeVisibilityConsumer} from '../../frameworks/knowledge/public.js';
import {nativeNarrativeSource} from '../../frameworks/narrative/public.js';
/** Bind the shared native closure, not copied policy or a new grant adapter. */
export function connectKnowledgeNarrative({consumer=createKnowledgeNarrativeVisibilityConsumer()}={}){
  return consumer.bind(nativeNarrativeSource.nativeSource().narrativeSourceVisible);
}

import {narrativeKnowledgeEvidence} from '../../frameworks/narrative/public.js';
import {factVisibleTo,activeEvidence,evidenceType} from '../../frameworks/knowledge/public.js';
export function connectNarrativeKnowledgeEvidence(){return narrativeKnowledgeEvidence.bind({factVisibleTo,activeEvidence,evidenceType});}
