import {createFunctionPort} from '../../../kernel/function-port.js';

/** Publication output preparation is provided by the original root implementation. */
export const publicationOpeningOutput=createFunctionPort([
  'prepareOpeningEntryOutput','prepareOpeningCohortOutput','prepareAssemblyOutput'
],{code:'PUBLICATION_OPENING_OUTPUT_COMPOSITION',label:'Publication opening output'});

/** Publication queueing is provided by the original root implementation. */
export const publicationOpeningQueue=createFunctionPort(['queueTurnPublications'],{
  code:'PUBLICATION_OPENING_QUEUE_COMPOSITION',label:'Publication opening queue'
});

/** Publication delivery is provided by the original root implementation. */
export const publicationOpeningDelivery=createFunctionPort(['deliverQueuedTurn'],{
  code:'PUBLICATION_OPENING_DELIVERY_COMPOSITION',label:'Publication opening delivery'
});
