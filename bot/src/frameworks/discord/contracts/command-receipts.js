/** Command receipt storage contract; the supplied transaction retains the original connection and synchronous callback semantics. */
export function assertCommandReceiptStore(store){
  if(['getOperationReceipt','recordOperationReceipt','getActiveSession','recordMutation','transaction'].some(name=>typeof store?.[name]!=='function'))
    throw new TypeError('Discord command receipts require a complete synchronous storage interface.');
  return store;
}
