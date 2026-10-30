/** Exact read-only administrative methods; no SQL, backup creation or restore exposed. */
export function createAdministrativeReadStore(db){
  const names=['listBackups','backupPreview','listMutationLedger','listSnapshots'];
  if(names.some(name=>typeof db?.[name]!=='function'))throw new TypeError('Administrative reads require the original four database methods.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,(...args)=>db[name](...args)])));
}
