/** Read-only administrative store shape; authentication stays at command dispatch. */
export function assertAdministrativeReadStore(store){
  if(['listBackups','backupPreview','listMutationLedger','listSnapshots'].some(name=>typeof store?.[name]!=='function'))throw new TypeError('Discord administrative reads require a complete read interface.');
  return store;
}
