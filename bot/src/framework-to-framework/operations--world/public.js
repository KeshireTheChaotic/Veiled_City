import {operationsWorldOverview} from '../../frameworks/operations/public.js';
import {simulationOverview} from '../../frameworks/world/public.js';
export function connectOperationsWorldOverview(){return operationsWorldOverview.bind({simulationOverview});}
