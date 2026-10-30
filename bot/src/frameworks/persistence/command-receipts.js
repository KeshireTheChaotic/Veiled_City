/** Per-connection view of existing command receipts; all SQL and transaction/savepoint behavior remain in VeiledDB. */
export function createCommandReceiptStore(db){
  const names=['getOperationReceipt','recordOperationReceipt','getActiveSession','recordMutation','transaction'];
  if(names.some(name=>typeof db?.[name]!=='function'))throw new TypeError('Command receipt storage requires the five original synchronous database methods.');
  return Object.freeze(Object.fromEntries(names.map(name=>[name,(...args)=>db[name](...args)])));
}
