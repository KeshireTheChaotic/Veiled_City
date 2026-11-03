/** Native result mapping for owner-selected death moves; no dice, PC choice, or writes. */
import {hopeCap} from './pc-resources.js';

export function riskItAllOutcome(duality){
  return duality==='Fear'?'dead':duality==='Critical'?'recovered':'allocate_recovery';
}

export function avoidDeathOutcome(data,hope,level){
  const scar=hope<=level,cap=hopeCap(data),hope_max=cap-(scar?1:0);
  return {scar,hope_max,result:scar&&cap===1?'journey_ended':'unconscious'};
}
