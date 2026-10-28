/** Shared construction of an expected scene-fiction hold; it does not decide when to hold. */
export function sceneFictionFailure(reason){return Object.assign(new Error(`Scene fiction held: ${reason}. No character action or outcome was inferred.`),
  {code:'SCENE_FICTION',expected:true,diagnostic:{category:reason}});}
