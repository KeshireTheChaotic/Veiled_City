import {connectPublicationNarrativeGrammar} from '../../framework-to-framework/narrative--publication/public.js';
/** Fixed startup composition; no database, client, model or effects. */
export function initializePublicationNarrative(){return connectPublicationNarrativeGrammar();}
