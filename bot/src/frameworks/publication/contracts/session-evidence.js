import {createFunctionPort} from '../../../kernel/function-port.js';

/** Publication reads opening and assembly evidence from the original Session readers. */
export const publicationSessionEvidence=createFunctionPort(['openingEntryEvidence','assemblyCoverageEvidence','openingCohortNarrativeCandidate','openingEntryProjection','openingEntryNarrativeCandidate','assertSessionOpeningPublication','assemblyHookSelection'],{
 code:'PUBLICATION_SESSION_EVIDENCE_COMPOSITION',label:'Publication Session evidence'
});
