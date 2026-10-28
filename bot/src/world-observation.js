/** Original reader and registration point for World observation. */
import {worldObservationSource,renderWorldObservation} from './frameworks/world/public.js';
export {establishWorldDescription,renderWorldObservation} from './frameworks/world/public.js';
worldObservationSource.bind({renderWorldObservation});
