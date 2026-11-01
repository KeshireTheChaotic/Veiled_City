/** Existing player-safe fact query only; SQL, visibility and session ownership stay in Persistence. */
export function createPlayerFactReadStore(db){
  if(typeof db?.playerFactsFor!=='function')throw new TypeError('Player fact display requires the original player-safe reader.');
  return Object.freeze({playerFactsFor:(...args)=>db.playerFactsFor(...args)});
}
