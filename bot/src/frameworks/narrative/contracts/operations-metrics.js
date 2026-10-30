import {createFunctionPort} from '../../../kernel/function-port.js';
/** Exact original Operations telemetry callback; contains no narration or gameplay policy. */
export const narrativeOperationsMetrics=createFunctionPort(['recordNarrativeMetric','recordNarrativeIncident'],{code:'NARRATIVE_OPERATIONS_METRICS_COMPOSITION',label:'Narrative Operations metrics'});
