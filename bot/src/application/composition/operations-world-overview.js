import {connectOperationsWorldOverview,connectOperationsWorldConsequence,connectOperationsWorldAudit,connectOperationsWorldGroups} from '../../framework-to-framework/operations--world/public.js';
export function initializeOperationsWorldOverview(){connectOperationsWorldGroups();connectOperationsWorldAudit();connectOperationsWorldConsequence();return connectOperationsWorldOverview();}
