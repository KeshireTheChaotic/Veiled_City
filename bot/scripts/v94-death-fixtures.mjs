/** Native final-HP fixture, not a fabricated death or damage receipt. */
import {attackFixture} from "./v94-pvp-attack-fixtures.mjs";
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from "../src/pvp-attacks.js";
import {rollPvpDamage,preparePvpDamage,reviewPvpDamage,resolvePvpDamage} from "../src/pvp-damage.js";
export async function fallenFixture(f,{setup=()=>{}}={}){
  const x=await attackFixture(f);f.db.updateCharacterData(f.pcs[1].id,d=>{d.level=1;d.resources.hp.current=5;});
  setup(f);
  const attack=preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"death-parent"});
  for(const pc of f.pcs.slice(0,2)){reviewPvpAttack(f.db,f.guild,pc.owner_user_id,attack.record_key);authorizePvpAttack(f.db,f.guild,pc.owner_user_id,
    {attack:attack.record_key,expected_revision:attack.data.offer_hash},{interactionId:`death-parent:${pc.id}`});}
  const roll=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:attack.record_key,expected_revision:attack.data.offer_hash},{rng:()=>1});
  const damage=rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:roll.record_key},{rng:()=>1});
  f.db.upsertRulesRuling(f.guild,{key:"death-damage",createdBy:"gm",ruling:"Native SRD thresholds/Armor and PC-owned last-HP death move."});
  const offer=preparePvpDamage(f.db,f.guild,"gm",{damage_receipts:[damage.record_key],ruling:"death-damage",defenses:{source:"base",resistance:"none",armor_reduction:1,armor_allowed:true}},{gm:true,interactionId:"death-damage"});
  const user=f.pcs[1].owner_user_id,review=reviewPvpDamage(f.db,f.guild,user,offer.record_key);
  const effect=resolvePvpDamage(f.db,f.guild,user,{damage:offer.record_key,expected_revision:review.revision,armor:false},{interactionId:"death-armor"});
  return {attack,roll,damage,offer,effect,request:f.db.listCityRecords(f.guild,{kind:"pc_death_move_request",includeGM:true})[0]};
}
