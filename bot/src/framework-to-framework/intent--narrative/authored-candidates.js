import {contextSourceKey} from '../../frameworks/narrative/public.js';
import {createAuthoredCandidatePersistence} from '../../frameworks/intent/public.js';
export const persistAuthoredCandidates=createAuthoredCandidatePersistence({contextSourceKey});
export {authoredCandidatesSchema,currentAuthoredCandidatesSchema,AUTHORED_CANDIDATES_PROMPT} from '../../frameworks/intent/public.js';
