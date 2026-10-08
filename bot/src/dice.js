/** Cryptographically backed dice and Duality-roll helpers. */
import { randomInt, randomUUID } from "node:crypto";

export function d(sides){ return randomInt(1,sides+1); }

export function dualityRoll({modifier=0,experience=0,advantage=0,disadvantage=0,helperDice=[]}={},rng=d) {
  if(![modifier,experience,advantage,disadvantage].every(Number.isSafeInteger)||advantage<0||disadvantage<0
    ||!Array.isArray(helperDice)||helperDice.some(value=>!Number.isSafeInteger(value)||value<1||value>6))
    throw new Error("Verified integer modifiers, nonnegative source counts and actual helper d6 results required.");
  if(helperDice.length&&disadvantage>advantage) throw new Error("Help with net disadvantage requires a saved GM ruling; no automatic arithmetic.");
  const roll=sides=>{const value=rng(sides);if(!Number.isInteger(value)||value<1||value>sides) throw new Error("Native die out of range.");return value;};
  const hope=roll(12), fear=roll(12);
  const advDice=advantage===disadvantage?[]:[roll(6)];
  const advNet = advantage>disadvantage ? Math.max(...advDice,0)
    : disadvantage>advantage ? -Math.max(...advDice,0) : 0;
  const applied=helperDice.length?Math.max(advNet,...helperDice):advNet;
  const total=hope+fear+modifier+experience+applied;
  let duality="Hope";
  if(fear>hope) duality="Fear";
  else if(fear===hope) duality="Critical";
  return {id:randomUUID(),hope,fear,modifier,experience,advantage,disadvantage,adv_dice:advDice,helper_dice:helperDice,adv_net:applied,total,duality};
}

export function diceSpec(expr="1d6") {
  const m=String(expr).trim().match(/^(\d{1,2})d(\d{1,4})([+-]\d+)?$/i);
  if(!m) throw new Error("Use dice notation like 2d6+3.");
  const count=Number(m[1]), sides=Number(m[2]), mod=Number(m[3]||0);
  if(count<1||count>50||sides<2||sides>1000) throw new Error("Dice expression is outside supported limits.");
  return {count,sides,mod};
}
export function parseDice(expr="1d6",rng=d) {
  const {count,sides,mod}=diceSpec(expr);
  const dice=Array.from({length:count},()=>{const value=rng(sides);if(!Number.isInteger(value)||value<1||value>sides) throw new Error("Native die out of range.");return value;});
  return {expression:expr,dice,modifier:mod,total:dice.reduce((a,b)=>a+b,0)+mod};
}
