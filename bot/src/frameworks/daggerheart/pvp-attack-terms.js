/** Existing native attack terms from verified PC equipment and target state; no action is authorized or rolled. */
export function createPvpAttackTerms({fail,rangeBands}){
  if(typeof fail!=='function'||!Array.isArray(rangeBands))throw new TypeError('PC attack terms require native failure and range-band capabilities.');
  function calculatePvpAttackTerms(input,pc,target,actualRange){
    let range,damage,damage_type;
    const proficiency=pc.data.proficiency;
    if(!Number.isSafeInteger(proficiency)||proficiency<1||proficiency>50)fail('Verified current Proficiency required.');
    if(input.kind==='unarmed'){
      if(input.weapon!==null||!['Strength','Finesse'].includes(input.trait))fail('Reviewed unarmed Strength/Finesse only.');
      range='Melee';damage=`${proficiency}d4`;damage_type='physical';
    }else if(input.kind==='weapon'){
      const weapons=(pc.data.inventory||[]).filter(weapon=>weapon?.name===input.weapon&&weapon.equipped===true),weapon=weapons[0];
      if(weapons.length!==1||!weapon||weapon.trait!==input.trait||!rangeBands.includes(weapon.range)
        ||!Number.isSafeInteger(weapon.damage_die)||weapon.damage_die<2||weapon.damage_die>1000
        ||!Number.isSafeInteger(weapon.damage_modifier)||Math.abs(weapon.damage_modifier)>100
        ||!['physical','magic'].includes(weapon.damage_type))
        fail('Exact equipped weapon trait/range/damage metadata required; missing source stays pending ruling.');
      range=weapon.range;damage=`${proficiency}d${weapon.damage_die}${weapon.damage_modifier?`${weapon.damage_modifier>0?'+':''}${weapon.damage_modifier}`:''}`;
      damage_type=weapon.damage_type;
    }else fail('Unsupported spell/feature PC-target mapping; no adversary-to-PC conversion. Keep pending native ruling.');
    if(!rangeBands.includes(actualRange)||rangeBands.indexOf(actualRange)>rangeBands.indexOf(range))
      fail('Native target outside current weapon range.');
    if(!Number.isSafeInteger(target.data.evasion)||target.data.evasion<1||target.data.evasion>100)
      fail('Verified current target Evasion required, never adversary Difficulty.');
    return {range,damage,damage_type,evasion:target.data.evasion};
  }
  return Object.freeze({calculatePvpAttackTerms});
}
