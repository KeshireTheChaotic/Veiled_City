import {operationsWorldOverview} from '../../frameworks/operations/public.js';
import {simulationOverview} from '../../frameworks/world/public.js';
export function connectOperationsWorldOverview(){return operationsWorldOverview.bind({simulationOverview});}

import {operationsWorldConsequence} from '../../frameworks/operations/public.js';
import {reviewConsequence} from '../../frameworks/world/public.js';
export function connectOperationsWorldConsequence(){return operationsWorldConsequence.bind({reviewConsequence});}
