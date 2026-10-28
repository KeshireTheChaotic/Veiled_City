import {publicationWorldReceipts} from '../../frameworks/publication/public.js';
import {worldSimulationReceiptForAudience} from '../../frameworks/world/public.js';

/** Bind World's original audience-scoped simulation receipt reader to Publication's fixed consumer. */
export function connectPublicationWorldReceipts(){return publicationWorldReceipts.bind({worldSimulationReceiptForAudience});}
