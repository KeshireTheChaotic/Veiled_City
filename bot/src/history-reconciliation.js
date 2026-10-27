/** Original fixed Session source composition for Knowledge history reconciliation. */
import {knowledgeSessionScene} from './frameworks/knowledge/public.js';
function sceneView(...args){return knowledgeSessionScene.sceneView(...args);}
import {createHistoryReconciliation} from './frameworks/knowledge/public.js';
let historyRules;
function history(){return historyRules??=createHistoryReconciliation({sceneView:(...args)=>sceneView(...args)});}
export function reconcileHistory(...args){return history().reconcileHistory(...args);}
