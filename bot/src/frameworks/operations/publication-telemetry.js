import {operationalMetrics,measureNative} from './operational-metrics.js';
import {currentTurnTrace,turnTraceFor} from './turn-trace-context.js';
import {turnLatency} from './turn-latency.js';
import {failureTrace} from './failure-trace.js';
/** Stable callbacks over original singleton/context stores; no game or publication authority. */
export const publicationTelemetrySource=Object.freeze({
  record:(...args)=>operationalMetrics.record(...args),
  incident:(...args)=>operationalMetrics.incident(...args),
  publication:(...args)=>turnLatency.publication(...args),
  measureNative,currentTurnTrace,turnTraceFor,failureTrace
});
