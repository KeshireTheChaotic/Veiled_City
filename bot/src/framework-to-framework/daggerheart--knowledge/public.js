import {nativeKnowledgeEvidence} from '../../frameworks/daggerheart/public.js';
import {objectiveEvidence,evidenceType} from '../../frameworks/knowledge/public.js';

/** Bind Knowledge's original read-only evidence rules without granting authority. */
export function connectNativeKnowledgeEvidence(){return nativeKnowledgeEvidence.bind({objectiveEvidence,evidenceType});}
