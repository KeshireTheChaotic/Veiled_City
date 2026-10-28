import {createFunctionPort} from '../../../kernel/function-port.js';

/** Persistence consumes Knowledge's original read-only archive projection. */
export const persistenceArchiveProjection=createFunctionPort(['historicalArchiveProjection'],{
 code:'PERSISTENCE_ARCHIVE_PROJECTION_COMPOSITION',label:'Persistence Knowledge archive projection'
});
