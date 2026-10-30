import {connectOperationsPersistenceSnapshot} from '../../framework-to-framework/operations--persistence/public.js';
import {connectOperationsKnowledgeDisclosure} from '../../framework-to-framework/knowledge--operations/public.js';
/** Same original Knowledge predicates before standalone diagnostic construction; opens no file. */
export function initializeStandaloneDiagnostics(){connectOperationsPersistenceSnapshot();return connectOperationsKnowledgeDisclosure();}
