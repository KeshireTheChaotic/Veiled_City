import {createNarrativeContextEligibility} from './context-eligibility.js';
import {narrativeImportanceSource} from './importance-source.js';
export const {narrativeContextEligible}=createNarrativeContextEligibility({narrativeImportance:(...args)=>narrativeImportanceSource.narrativeImportance(...args)});
