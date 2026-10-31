/** Lazy original campaign lookup: privileged permission short-circuit must not inspect the DB. */
export function createGmAccessStore(db){
  return Object.freeze({getCampaign:(...args)=>db.getCampaign(...args)});
}
