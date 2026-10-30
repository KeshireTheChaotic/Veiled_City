/** Status initialization/read capability only; no raw connection or arbitrary repository access. */
export function assertCampaignStatusStore(store){
  if(['ensureCampaign','getActiveSession','getDirectorState','getPartyState'].some(name=>typeof store?.[name]!=='function'))throw new TypeError('Campaign status requires the complete original storage interface.');
  return store;
}
