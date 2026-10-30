/** Small native arithmetic operations. These are plans, never source, consent or write authority.
 * Existing source-qualified workflows own their transactions, receipts and state writers.
 */
import {nativeArbitrationFailure as fail} from './native-failure.js';
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

/** Closed modifier vocabulary; callers supply native facts, never model-supplied trust fields. */
export function nativeModifierPlan(operation,facts){
  if(!operation||!facts||typeof facts!=='object')throw fail('native_modifier_operation_shape');
  if(operation.kind==='capped_count'&&exact(operation,'cap,kind,per')&&exact(facts,'count')
    &&[operation.cap,operation.per,facts.count].every(Number.isSafeInteger)&&operation.cap>=0&&operation.per>=0&&facts.count>=0){
    const value=operation.per*facts.count;if(!Number.isSafeInteger(value))throw fail('native_modifier_operation_capacity');
    return Math.min(operation.cap,value);
  }
  if(operation.kind==='threshold'&&exact(operation,'above,below,kind,threshold')&&exact(facts,'value')
    &&[operation.above,operation.below,operation.threshold,facts.value].every(Number.isSafeInteger))
    return facts.value>=operation.threshold?operation.above:operation.below;
  if(operation.kind==='bands'&&exact(operation,'bands,kind')&&exact(facts,'value')&&Number.isSafeInteger(facts.value)
    &&Array.isArray(operation.bands)&&operation.bands.length>0&&operation.bands.length<=12){
    let last=-Infinity;
    for(const band of operation.bands){
      if(!exact(band,'max,min,value')||![band.min,band.max,band.value].every(Number.isSafeInteger)||band.min>band.max||band.min<=last)
        throw fail('native_modifier_operation_bands');
      last=band.max;
    }
    const band=operation.bands.find(b=>facts.value>=b.min&&facts.value<=b.max);
    if(!band)throw fail('native_modifier_operation_unproved_range');
    return band.value;
  }
  if(operation.kind==='conditional'&&exact(operation,'kind,otherwise,value')&&exact(facts,'eligible')
    &&typeof facts.eligible==='boolean'&&[operation.value,operation.otherwise].every(Number.isSafeInteger))
    return facts.eligible?operation.value:operation.otherwise;
  throw fail('native_modifier_operation_shape');
}

/** Durations expire from native events; a model cannot invent elapsed scenes or damage. */
export function nativeDurationExpired(duration,event){
  if(!exact(duration,'kind,ref')||typeof duration.ref!=='string'||!duration.ref
    ||!exact(event,'kind,ref')||typeof event.ref!=='string')throw fail('native_duration_operation_shape');
  const events={scene:'scene_ended',severe_damage:'severe_damage_committed',next_action:'action_roll_committed',next_reaction:'reaction_roll_committed'};
  if(!Object.hasOwn(events,duration.kind))throw fail('native_duration_operation_kind');
  return event.kind===events[duration.kind]&&event.ref===duration.ref;
}
