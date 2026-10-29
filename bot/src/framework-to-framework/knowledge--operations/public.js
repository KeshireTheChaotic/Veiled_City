import {operationsKnowledgeOrganizationReview} from '../../frameworks/operations/public.js';
import {reviewOrganization} from '../../frameworks/knowledge/public.js';

/** Bind only Knowledge's original organization review function to Operations. */
export function connectKnowledgeOperationsOrganizationReview(){
 return operationsKnowledgeOrganizationReview.bind({reviewOrganization});
}
