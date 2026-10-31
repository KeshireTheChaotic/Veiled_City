/** Original canon readers only; no proposal/resolution/write or transaction ownership. */
export function createCanonReadStore(db){
  const names=['listCanon','listCanonConflicts'];
  if(names.some(name=>typeof db?.[name]!=='function'))throw new TypeError('Canon displays require the original two read methods.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,(...args)=>db[name](...args)])));
}
