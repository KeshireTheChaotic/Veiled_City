/** Existing campaign initialization/status methods on the caller's database; no new connection or transaction. */
export function createCampaignStatusStore(db){
  const names=['ensureCampaign','getActiveSession','getDirectorState','getPartyState'];
  if(names.some(name=>typeof db?.[name]!=='function'))throw new TypeError('Campaign status requires the complete original storage interface.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,(...args)=>db[name](...args)])));
}
