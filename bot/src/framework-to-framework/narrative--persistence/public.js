import {normalizeGmHookImport} from '../../frameworks/narrative/public.js';
import {persistenceGmHookImport} from '../../frameworks/persistence/public.js';

/** Bind the original Narrative GM hook normalizer to Persistence's fixed consumer. */
export function connectPersistenceGmHookImport(){return persistenceGmHookImport.bind({normalizeGmHookImport});}
