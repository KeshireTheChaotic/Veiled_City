/** Original owner-scoped character list reader; no character lifecycle writes or SQL changes. */
export function createCharacterListStore(db){
  if(typeof db?.listCharacters!=='function')throw new TypeError('Character list requires the original character reader.');
  return Object.freeze({listCharacters:(...args)=>db.listCharacters(...args)});
}
