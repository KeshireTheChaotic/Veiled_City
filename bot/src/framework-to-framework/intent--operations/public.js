import {delegationPolicy} from '../../frameworks/intent/public.js';
import {operationsIntentPolicy} from '../../frameworks/operations/public.js';
/** Original policy reader only; no delegation configuration or execution capability. */
export function connectOperationsIntentPolicy(){return operationsIntentPolicy.bind({delegationPolicy});}
