/** Original fixed Session source composition for Knowledge history reconciliation. */
import {knowledgeSessionScene} from './contracts/session-scene.js';
import {knowledgeHistoryReconciliationSource} from './contracts/history-reconciliation-source.js';
import {createHistoryReconciliation} from './history-reconciliation.js';
let historyRules;
function history(){return historyRules??=createHistoryReconciliation({sceneView:(...args)=>knowledgeSessionScene.sceneView(...args)});}
export function reconcileHistory(...args){return history().reconcileHistory(...args);}
knowledgeHistoryReconciliationSource.bind({reconcileHistory});
