/** Existing player-visible active-thread query only; SQL and visibility remain Persistence-owned. */
export function createCaseboardReadStore(db){
  if(typeof db?.listVisibleActiveThreads!=='function')throw new TypeError('Caseboard display requires the original visible-thread reader.');
  return Object.freeze({listVisibleActiveThreads:(...args)=>db.listVisibleActiveThreads(...args)});
}
