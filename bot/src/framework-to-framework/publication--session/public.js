import {openingEntryEvidence,assemblyCoverageEvidence,openingCohortNarrativeCandidate} from '../../frameworks/session/public.js';
import {publicationSessionEvidence} from '../../frameworks/publication/public.js';

/** Bind Session's original evidence readers to Publication's fixed consumer. */
export function connectPublicationSessionEvidence(){return publicationSessionEvidence.bind({openingEntryEvidence,assemblyCoverageEvidence,openingCohortNarrativeCandidate});}
