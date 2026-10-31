/** Original Director status readers only; existing caller connection and method dispatch retained. */
export function createDirectorStatusStore(db){
  const names=['getDirectorState','isDirectorPaused'];
  if(names.some(name=>typeof db?.[name]!=='function'))throw new TypeError('Director status requires its complete original read interface.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,(...args)=>db[name](...args)])));
}
