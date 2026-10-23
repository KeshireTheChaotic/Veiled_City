/** Stable native adjudication failure contract shared by native validators. No rule or narrative policy is implemented by the error itself. */
export function nativeArbitrationFailure(reason){return Object.assign(new Error(`Unified GM arbitration held: ${reason}`),{code:'GM_ARBITRATION',expected:true});}
