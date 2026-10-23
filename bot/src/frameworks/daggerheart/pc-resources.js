/** Pure PC pool/marked-slot arithmetic. No ownership, consent, spending or effect authority. */
const fail=message=>{throw Object.assign(new Error(message),{code:'PC_NATIVE_ELIGIBILITY',expected:true});};
export function hopeCap(data){const cap=data.resources?.hope_max??6;
  if(!Number.isSafeInteger(cap)||cap<0||cap>6)fail("Verified permanent Hope-slot cap required.");return cap;
}

export function pcEffectResource(data,resourceName,amount){
  const fail=message=>{throw Object.assign(new Error(message),{code:'PC_EFFECT_AUTHORITY',expected:true});};
  const resource=data.resources?.[resourceName],before=resourceName==='hope'?resource:resource?.current,max=resourceName==='hope'?hopeCap(data):resource?.max;
  if(!Number.isSafeInteger(before)||!Number.isSafeInteger(max)||before<0||before>max)fail('Verified current resource required.');
  const after=Math.max(0,Math.min(max,before+amount));
  if(amount>0&&before+amount>max||amount<0&&['hope'].includes(resourceName)&&before+amount<0)fail('Insufficient resources or cost overflow.');
  return {before,max,after};
}
