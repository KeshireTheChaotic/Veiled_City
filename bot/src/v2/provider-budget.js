/** Hard ceiling on provider calls for a qualification run. With the provider's own output-token
 * bound this caps spend; it never retries and never resets itself.
 */
export function createCallBudget(provider,{maxCalls}){
  if(typeof provider?.generate!=='function'||!Number.isSafeInteger(maxCalls)||maxCalls<1||maxCalls>1000)throw new TypeError('Provider and a bounded call budget required');
  let used=0;
  return Object.freeze({
    async generate(input){if(used>=maxCalls)throw new Error(`Inference call budget of ${maxCalls} exhausted`);used++;return provider.generate(input);},
    get used(){return used;},get remaining(){return maxCalls-used;}
  });
}
