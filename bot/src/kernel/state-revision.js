/** Domain-neutral exact row revision. JSON serialization order and historical absent sentinel are preserved. */
import {jsonHash} from './json-hash.js';
export const stateRevision=row=>row?jsonHash(row):'absent';
