import {publicationTelemetrySource} from '../../frameworks/operations/public.js';
import {publicationOperations} from '../../frameworks/publication/public.js';
/** Bind the same original singleton/context callbacks; no payload or retry interpretation. */
export function connectPublicationOperations(){return publicationOperations.bind(publicationTelemetrySource);}
