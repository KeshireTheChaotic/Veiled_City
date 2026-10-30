import {operationalMetrics} from '../../frameworks/operations/public.js';
import {narrativeOperationsMetrics} from '../../frameworks/narrative/public.js';
// Preserve the original singleton receiver, trace binding and exact arguments/results/errors.
const recordNarrativeMetric=(...args)=>operationalMetrics.record(...args);
const recordNarrativeIncident=(...args)=>operationalMetrics.incident(...args);
export function connectNarrativeOperationsMetrics(){return narrativeOperationsMetrics.bind({recordNarrativeMetric,recordNarrativeIncident});}
