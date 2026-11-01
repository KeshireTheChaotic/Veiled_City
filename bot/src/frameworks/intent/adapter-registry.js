/** Original Intent adapter registry; registration order and replacement behavior are preserved. */
export const adapters=new Map();
export function registerIntentAdapter(feature,adapter){adapters.set(feature,adapter);}
