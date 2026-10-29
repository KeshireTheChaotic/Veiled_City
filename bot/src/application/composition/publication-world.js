import {connectPublicationWorldDirectorReview,connectPublicationWorldSimulation,connectPublicationWorldReceipts,connectPublicationWorldConstraints,connectPublicationWorldEvents} from '../../framework-to-framework/publication--world/public.js';

/** Wire World's audience-scoped receipt reader into Publication before runtime services; no state writes. */
export function initializePublicationWorld(){connectPublicationWorldDirectorReview();connectPublicationWorldSimulation();connectPublicationWorldEvents();connectPublicationWorldConstraints();return connectPublicationWorldReceipts();}
