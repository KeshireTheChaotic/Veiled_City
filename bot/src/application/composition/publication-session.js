import {connectPublicationSessionPrincipal,connectSessionPublicationRecap} from '../../framework-to-framework/publication--session/public.js';
import {connectPublicationSessionEvidence} from '../../framework-to-framework/publication--session/public.js';

export function initializePublicationSession(){connectSessionPublicationRecap();connectPublicationSessionPrincipal();return connectPublicationSessionEvidence();}
