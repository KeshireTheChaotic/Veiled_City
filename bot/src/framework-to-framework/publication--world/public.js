import {publicationWorldReceipts} from '../../frameworks/publication/public.js';
import {worldSimulationReceiptForAudience} from '../../frameworks/world/public.js';

/** Bind World's original audience-scoped simulation receipt reader to Publication's fixed consumer. */
export function connectPublicationWorldReceipts(){return publicationWorldReceipts.bind({worldSimulationReceiptForAudience});}

import {publicationWorldConstraints} from '../../frameworks/publication/public.js';
import {activeCityProxy} from '../../frameworks/world/public.js';
/** Bind World's original proxy evidence query to Publication's fixed consumer. */
export function connectPublicationWorldConstraints(){return publicationWorldConstraints.bind({activeCityProxy});}

import {publicationWorldEvents} from '../../frameworks/publication/public.js';
import {indexWorldEvent} from '../../frameworks/world/public.js';
export function connectPublicationWorldEvents(){return publicationWorldEvents.bind({indexWorldEvent});}

import {publicationWorldSimulation} from '../../frameworks/publication/public.js';
import {simulationOverview,acknowledgeSimulationHook} from '../../frameworks/world/public.js';
export function connectPublicationWorldSimulation(){return publicationWorldSimulation.bind({simulationOverview,acknowledgeSimulationHook});}
