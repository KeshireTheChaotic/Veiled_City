import {connectPublicationSessionScene,connectSessionPublicationContinuation,connectPublicationSessionPrincipal,connectSessionPublicationRecap} from '../../framework-to-framework/publication--session/public.js';
import {connectPublicationSessionEvidence} from '../../framework-to-framework/publication--session/public.js';

export function initializePublicationSession(){connectPublicationSessionScene();connectSessionPublicationContinuation();connectSessionPublicationRecap();connectPublicationSessionPrincipal();return connectPublicationSessionEvidence();}
