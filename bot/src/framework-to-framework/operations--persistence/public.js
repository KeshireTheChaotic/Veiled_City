import {persistenceOperations} from '../../frameworks/persistence/public.js';
import {validateChannelRouting,instrumentSqlReads} from '../../frameworks/operations/public.js';
export function connectPersistenceOperations(){return persistenceOperations.bind({validateChannelRouting,instrumentSqlReads});}

import {operationsPersistenceSnapshot} from '../../frameworks/operations/public.js';
import {openDiagnosticSnapshot} from '../../frameworks/persistence/public.js';
export function connectOperationsPersistenceSnapshot(){return operationsPersistenceSnapshot.bind({openDiagnosticSnapshot});}
