/** Existing Daggerheart device use hold; this policy does not authorize reset or mutate inventory. */
export function nativeDeviceUseIssue(pc,accepted){
  if(accepted?.data.type!=='interact'||accepted.data.operation!=='use_device')return null;
  const device=pc?.data.inventory?.find(i=>i?.id===accepted.data.target_key);
  return device?.disabled_by?'NATIVE_DEVICE_RESET_REQUIRED':null;
}
