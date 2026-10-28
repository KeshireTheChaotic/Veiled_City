import {createFunctionPort} from '../../../kernel/function-port.js';

/** Publication reads audience-scoped World simulation receipts through the original World reader. */
export const publicationWorldReceipts=createFunctionPort(['worldSimulationReceiptForAudience'],{
 code:'PUBLICATION_WORLD_RECEIPTS_COMPOSITION',label:'Publication World receipts'
});