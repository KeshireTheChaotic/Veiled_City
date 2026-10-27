import {operationsNpcReview} from '../../frameworks/operations/public.js';
import {reviewGoalTransition,manageStrategy} from '../../frameworks/npc/public.js';
export function connectOperationsNpcReview(){return operationsNpcReview.bind({reviewGoalTransition,manageStrategy});}
