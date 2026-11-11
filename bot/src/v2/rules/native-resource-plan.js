/** Pure arithmetic only; no source, consent or mutation authority. */
const fail=code=>new Error(code);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).sort().join()===keys;

export function nativeResourcePlan(balance,delta,{overflow='hold'}={}){
  if(!exact(balance,'current,max')||![balance.current,balance.max,delta].every(Number.isSafeInteger)
    ||balance.max<0||balance.current<0||balance.current>balance.max||!['hold','cap'].includes(overflow))throw fail('native_resource_operation_shape');
  const raw=balance.current+delta;
  if(!Number.isSafeInteger(raw)||raw<0||overflow==='hold'&&raw>balance.max)throw fail('native_resource_operation_capacity');
  const after=Math.min(balance.max,raw);
  return Object.freeze({before:balance.current,after,delta:after-balance.current});
}
