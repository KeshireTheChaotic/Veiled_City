/** Exact command preference-store shape; no SQL, defaults or permission policy duplicated. */
export function assertPlayerSettingsStore(store){
  if(['getCampaign','setPrivateChannel','setAccessibility'].some(name=>typeof store?.[name]!=='function'))throw new TypeError('Discord player settings require a complete storage interface.');
  return store;
}
