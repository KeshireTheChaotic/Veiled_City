/** Original setup capability on caller's database; configuration retains its own existing validation and writes. */
export function createCampaignConfigurationStore(db){
  if(typeof db?.configureCampaign!=='function')throw new TypeError('Campaign setup requires the original configuration method.');
  return Object.freeze({configureCampaign:(...args)=>db.configureCampaign(...args)});
}
