import {nativeKnowledgeEvidence} from '../../frameworks/daggerheart/public.js';
import {objectiveEvidence,evidenceType} from '../../frameworks/knowledge/public.js';

/** Bind Knowledge's original read-only evidence rules without granting authority. */
export function connectNativeKnowledgeEvidence(){return nativeKnowledgeEvidence.bind({objectiveEvidence,evidenceType});}
import {nativePersonalContinuity} from '../../frameworks/daggerheart/public.js';
import {knowledgePersonalContinuity,personalCharacter} from '../../frameworks/knowledge/public.js';
/** Pass Knowledge's original personal continuity readers to native rules unchanged. */
export function connectNativePersonalContinuity(){return nativePersonalContinuity.bind({personalCharacter,personalArc:knowledgePersonalContinuity.personalArc});}

import {nativeKnowledgeActions} from '../../frameworks/daggerheart/public.js';
import {knowledgeOrganizationSource,knowledgeEvidenceCustodySource} from '../../frameworks/knowledge/public.js';
/** Pass Knowledge's original organization request and evidence custody operations to native consent responses unchanged. */
export function connectNativeKnowledgeActions(){return nativeKnowledgeActions.bind({organizationRequest:knowledgeOrganizationSource.organizationRequest,manageEvidence:knowledgeEvidenceCustodySource.manageEvidence});}
