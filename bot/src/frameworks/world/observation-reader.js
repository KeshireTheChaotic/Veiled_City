/** Original reader and registration point for World observation. */
import {worldObservationSource,renderWorldObservation} from './public.js';
export {establishWorldDescription,renderWorldObservation} from './public.js';
worldObservationSource.bind({renderWorldObservation});
