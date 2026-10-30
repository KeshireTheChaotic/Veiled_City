import {connectPublicationNarrativeNpc,connectPublicationNarrativeAuthoring,connectPublicationNarrativeScene,connectPublicationNarrativeWorld,connectPublicationNarrativeGrammar} from '../../framework-to-framework/narrative--publication/public.js';
/** Fixed startup composition; no database, client, model or effects. */
export function initializePublicationNarrative(){connectPublicationNarrativeNpc();connectPublicationNarrativeAuthoring();connectPublicationNarrativeScene();connectPublicationNarrativeWorld();return connectPublicationNarrativeGrammar();}
