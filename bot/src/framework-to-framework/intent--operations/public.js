import {delegationPolicy} from '../../frameworks/intent/public.js';
import {operationsIntentPolicy} from '../../frameworks/operations/public.js';
/** Original policy reader only; no delegation configuration or execution capability. */
export function connectOperationsIntentPolicy(){return operationsIntentPolicy.bind({delegationPolicy});}
import {intentContext} from '../../frameworks/intent/public.js';
import {operationsIntentContext} from '../../frameworks/operations/public.js';
export function connectOperationsIntentContext(){return operationsIntentContext.bind({intentContext});}
import {reviewAiIntent} from '../../frameworks/intent/public.js';
import {operationsIntentReview} from '../../frameworks/operations/public.js';
export function connectOperationsIntentReview(){return operationsIntentReview.bind({reviewAiIntent});}
