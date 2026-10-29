import {openingEntryEvidence,assemblyCoverageEvidence,openingCohortNarrativeCandidate,openingEntryProjection,openingEntryNarrativeCandidate,assertSessionOpeningPublication,assemblyHookSelection} from '../../frameworks/session/public.js';
import {publicationSessionEvidence} from '../../frameworks/publication/public.js';

/** Bind Session's original evidence readers to Publication's fixed consumer. */
export function connectPublicationSessionEvidence(){return publicationSessionEvidence.bind({openingEntryEvidence,assemblyCoverageEvidence,openingCohortNarrativeCandidate,openingEntryProjection,openingEntryNarrativeCandidate,assertSessionOpeningPublication,assemblyHookSelection});}

import {publicationSessionPrincipal} from '../../frameworks/publication/public.js';
import {conversationPrincipal} from '../../frameworks/session/public.js';
/** Bind the original Session reader without evaluating player state. */
export function connectPublicationSessionPrincipal(){return publicationSessionPrincipal.bind({conversationPrincipal});}
