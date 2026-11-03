/** Native ordering across opt-in stores. A failed reservation deliberately leaves
 * a durable roll hold for reconciliation. No spending, attack or general unlock.
 */
export function createPreRollFearCoordinator({rollStore,fearStore,opportunityReader}){
  if(typeof rollStore?.holdForFear!=='function'||typeof rollStore?.releaseCancelledFear!=='function'||typeof fearStore?.reserve!=='function'||typeof opportunityReader?.read!=='function')throw new TypeError('Native pre-roll coordination dependencies required');
  function reserve(c,q,{check}){
    if(typeof check!=='function')throw new Error('Native Fear authority required');
    const initial=opportunityReader.read(c,q),fingerprint=JSON.stringify(initial);
    const current=()=>{check();if(JSON.stringify(opportunityReader.read(c,q))!==fingerprint)throw new Error('Fear opportunity changed during coordination');};
    const hold=rollStore.holdForFear(c,q,initial.decision.id,{check:current});
    if(hold.status!=='held')throw new Error('Fear hold already closed');
    return fearStore.reserve(c,q,{readOpportunity:opportunityReader.read,check:()=>{current();const h=rollStore.readFearHold(c,q);if(h?.status!=='held'||h.decisionRef!==hold.decisionRef)throw new Error('Current native Fear hold required');}});
  }
  function cancel(c,q,{check,readPublication}){
    const cancellation=fearStore.cancel(c,q,{check,readPublication});
    rollStore.releaseCancelledFear(c,q,{check,readCancellation:fearStore.read});return cancellation;
  }
  return Object.freeze({reserve,cancel});
}
