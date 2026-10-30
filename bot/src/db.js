/** Historical standalone database API; Application composes original providers before any construction. */
import {initializeStandalonePersistence} from './application/composition/standalone-persistence.js';
initializeStandalonePersistence();
export {VeiledDB} from './frameworks/persistence/public.js';
