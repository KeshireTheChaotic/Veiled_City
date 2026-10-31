/** Original saved-ruling query only, same caller connection/current method and existing read filters. */
export function createRulesRulingReadStore(db){
  if(typeof db?.searchRulesRulings!=='function')throw new TypeError('Saved rulings require the original search reader.');
  return Object.freeze({searchRulesRulings:(...args)=>db.searchRulesRulings(...args)});
}
