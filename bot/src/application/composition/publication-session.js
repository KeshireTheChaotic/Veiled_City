import {connectSessionPublicationContinuation,connectPublicationSessionPrincipal,connectSessionPublicationRecap} from '../../framework-to-framework/publication--session/public.js';
import {connectPublicationSessionEvidence} from '../../framework-to-framework/publication--session/public.js';

export function initializePublicationSession(){connectSessionPublicationContinuation();connectSessionPublicationRecap();connectPublicationSessionPrincipal();return connectPublicationSessionEvidence();}
