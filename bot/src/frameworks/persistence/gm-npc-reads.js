/** Original GM cognition readers only; caller retains authorization, database and transaction ownership. */
export function createGmNpcReadStore(db){
  const names=['findNpcProfile','listNpcMemories','listNpcKnowledge','listNpcGoals'];
  if(names.some(name=>typeof db?.[name]!=='function'))throw new TypeError('GM cognition display requires the complete original read interface.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,(...args)=>db[name](...args)])));
}
