import {createFunctionPort} from '../../../kernel/function-port.js';

/** Narrative inspects the opening cohort source through the original Session reader. */
export const narrativeOpeningCohort=createFunctionPort(['inspectOpeningCohortSource'],{
 code:'NARRATIVE_OPENING_COHORT_COMPOSITION',label:'Narrative opening cohort'
});
