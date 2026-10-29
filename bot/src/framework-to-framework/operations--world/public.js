import {operationsWorldOverview} from '../../frameworks/operations/public.js';
import {simulationOverview} from '../../frameworks/world/public.js';
export function connectOperationsWorldOverview(){return operationsWorldOverview.bind({simulationOverview});}

import {operationsWorldConsequence} from '../../frameworks/operations/public.js';
import {reviewConsequence} from '../../frameworks/world/public.js';
export function connectOperationsWorldConsequence(){return operationsWorldConsequence.bind({reviewConsequence});}

import {operationsWorldAudit} from '../../frameworks/operations/public.js';
import {cityAudit} from '../../frameworks/world/public.js';
export function connectOperationsWorldAudit(){return operationsWorldAudit.bind({cityAudit});}

import {operationsWorldGroups} from '../../frameworks/operations/public.js';
import {manageGroup} from '../../frameworks/world/public.js';
export function connectOperationsWorldGroups(){return operationsWorldGroups.bind({manageGroup});}

import {operationsWorldSeedDrafts} from '../../frameworks/operations/public.js';
import {reviewSeedDraft} from '../../frameworks/world/public.js';
export function connectOperationsWorldSeedDrafts(){return operationsWorldSeedDrafts.bind({reviewSeedDraft});}
