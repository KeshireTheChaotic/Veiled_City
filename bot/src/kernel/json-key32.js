/** Existing JSON SHA256 prefix shared across domains; not source, consent or execution authority. */
import {jsonHash} from './json-hash.js';
export const jsonKey32=value=>jsonHash(value).slice(0,32);
