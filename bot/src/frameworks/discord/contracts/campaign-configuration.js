/** Campaign setup has only its original named persistence capability. */
export function assertCampaignConfigurationStore(store){
  if(typeof store?.configureCampaign!=='function')throw new TypeError('Campaign setup requires the original configuration method.');
  return store;
}
