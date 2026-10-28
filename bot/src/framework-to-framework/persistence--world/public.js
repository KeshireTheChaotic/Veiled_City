import {processCityDue} from '../../frameworks/world/public.js';
import {persistenceCityDue} from '../../frameworks/persistence/public.js';

/** Bind the original World calendar function to Persistence's fixed consumer. */
export function connectPersistenceCityDue(){return persistenceCityDue.bind({processCityDue});}
