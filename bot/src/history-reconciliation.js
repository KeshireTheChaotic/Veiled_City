/** Original fixed Session source composition for Knowledge history reconciliation. */
import {knowledgeSessionScene} from './frameworks/knowledge/public.js';
function sceneView(...args){return knowledgeSessionScene.sceneView(...args);}
import {createHistoryReconciliation} from './frameworks/knowledge/public.js';
let historyRules;
function history(){return historyRules??=createHistoryReconciliation({sceneView:(...args)=>sceneView(...args)});}
export function reconcileHistory(...args){return history().reconcileHistory(...args);}
import {knowledgeHistoryReconciliationSource} from './frameworks/knowledge/public.js';
// Provide this module's original history reconciliation to the fixed Knowledge slot; no other authority is granted.
knowledgeHistoryReconciliationSource.bind({reconcileHistory});
