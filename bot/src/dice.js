/** Cryptographically backed dice and Duality-roll helpers. */
import { randomInt, randomUUID } from "node:crypto";

export function d(sides){ return randomInt(1,sides+1); }

export function dualityRoll({modifier=0,experience=0,advantage=0,disadvantage=0}={}) {
  const hope=d(12), fear=d(12);
  const advDice=[];
  for(let i=0;i<Math.max(advantage,disadvantage);i++) advDice.push(d(6));
  const advNet = advantage>disadvantage ? Math.max(...advDice,0)
    : disadvantage>advantage ? -Math.max(...advDice,0) : 0;
  const total=hope+fear+modifier+experience+advNet;
  let duality="Hope";
  if(fear>hope) duality="Fear";
  else if(fear===hope) duality="Critical";
  return {id:randomUUID(),hope,fear,modifier,experience,advantage,disadvantage,adv_dice:advDice,adv_net:advNet,total,duality};
}

export function parseDice(expr="1d6") {
  const m=String(expr).trim().match(/^(\d{1,2})d(\d{1,4})([+-]\d+)?$/i);
  if(!m) throw new Error("Use dice notation like 2d6+3.");
  const count=Number(m[1]), sides=Number(m[2]), mod=Number(m[3]||0);
  if(count<1||count>50||sides<2||sides>1000) throw new Error("Dice expression is outside supported limits.");
  const dice=Array.from({length:count},()=>d(sides));
  return {expression:expr,dice,modifier:mod,total:dice.reduce((a,b)=>a+b,0)+mod};
}
