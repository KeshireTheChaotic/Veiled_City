/** Domain-neutral JSON byte hashing; field order and serialization semantics are intentionally preserved. */
import {createHash} from 'node:crypto';
export const jsonHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
