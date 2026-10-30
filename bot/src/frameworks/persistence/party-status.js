/** Original party status access, including existing campaign initialization; no connection/transaction ownership. */
export function createPartyStatusStore(db){
  const names=['getPartyState','getActiveSession'];
  if(names.some(name=>typeof db?.[name]!=='function'))throw new TypeError('Party status requires the complete original storage interface.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,(...args)=>db[name](...args)])));
}
