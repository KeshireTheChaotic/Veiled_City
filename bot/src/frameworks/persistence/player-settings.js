/** Original per-player preference methods only; same connection and existing SQL implementations. */
export function createPlayerSettingsStore(db){
  const names=['getCampaign','setPrivateChannel','setAccessibility'];
  if(names.some(name=>typeof db?.[name]!=='function'))throw new TypeError('Player settings require the original campaign and preference methods.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,(...args)=>db[name](...args)])));
}
