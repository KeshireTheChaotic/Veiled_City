/** Shared error construction only; no rule, narrative or execution policy. */
export function arbitrationFailure(reason){return Object.assign(new Error(`Unified GM arbitration held: ${reason}`),{code:'GM_ARBITRATION',expected:true});}
