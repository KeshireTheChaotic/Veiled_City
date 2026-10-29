import {createFunctionPort} from '../../../kernel/function-port.js';

/** Publication reads opening entry and assembly coverage evidence from the original Session readers. */
export const publicationSessionEvidence=createFunctionPort(['openingEntryEvidence','assemblyCoverageEvidence','openingCohortNarrativeCandidate','openingEntryProjection','openingEntryNarrativeCandidate','assertSessionOpeningPublication'],{
 code:'PUBLICATION_SESSION_EVIDENCE_COMPOSITION',label:'Publication Session evidence'
});
