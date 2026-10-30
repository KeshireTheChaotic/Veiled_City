/** Original GM fact query only; caller retains authorization and connection ownership. */
export function createGmFactReadStore(db){
  if(typeof db?.listFactsForGM!=='function')throw new TypeError('GM fact display requires the original fact reader.');
  return Object.freeze({listFactsForGM:(...args)=>db.listFactsForGM(...args)});
}
