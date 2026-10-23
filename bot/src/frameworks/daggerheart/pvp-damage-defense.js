/** Existing Daggerheart defense evidence validation; no damage, Armor or resource mutation. */
export function createPvpDamageDefense({fail}){
  if(typeof fail!=='function')throw new TypeError('PvP damage defense requires its established failure constructor.');

  function closed(input,fields){
    if(!input||Array.isArray(input)||Object.keys(input).length!==fields.length||fields.some(key=>!(key in input)))
      fail('Closed native damage fields required.');
  }

  function validatePvpDamageDefense(pc,input,ruling,types,{native=false}={}){
    closed(input,['source','resistance','armor_reduction','armor_allowed']);
    if(!native&&!ruling?.created_by||!['none','half','immune'].includes(input.resistance)||![1,2].includes(input.armor_reduction)
      ||typeof input.armor_allowed!=='boolean')fail('Exact source-reviewed native defenses required.');
    const base=input.resistance==='none'&&input.armor_reduction===1&&input.armor_allowed;
    if(native&&(!base||input.source!=='base'||[...(pc.data.inventory||[]),...(pc.data.domain_cards||[])].some(v=>
      (v?.active===true||v?.equipped===true)&&(v.armor_severity_reduction===2||v.resistance_types?.length||v.immunity_types?.length))))
      fail('Applicable special defenses need exact native selection/review; the baseline cannot suppress owned protection.');
    const owned=[...(pc.data.inventory||[]),...(pc.data.domain_cards||[])].filter(v=>v?.name===input.source&&(v.active===true||v.equipped===true));
    if(input.source==='base'?!base:owned.length!==1)
      fail('Defense requires an actual active owned source and separately reviewed native applicability.');
    if(input.resistance!=='none'){
      const applicable=owned[0]?.[input.resistance==='half'?'resistance_types':'immunity_types'];
      if(!Array.isArray(applicable)||!applicable.length||applicable.some(t=>!['physical','magic'].includes(t))||types.some(t=>!applicable.includes(t)))
        fail('Exact owned resistance/immunity damage-type scope required; mixed sources cannot inherit a partial ward.');
    }
    if(input.armor_reduction===2&&owned[0]?.armor_severity_reduction!==2)
      fail('Native owned two-threshold Armor mapping required; a feature name is not permission.');
    if((pc.data.conditions||[]).some(c=>c?.active!==false))fail('Unmapped current defensive conditions require native review.');
    const {major,severe}=pc.data.thresholds||{},hp=pc.data.resources?.hp,armor=pc.data.resources?.armor;
    if(![major,severe,hp?.current,hp?.max,armor?.current,armor?.max].every(Number.isSafeInteger)||major<1||severe<major
      ||hp.current<0||hp.current>hp.max||hp.max<1||hp.max>12||armor.current<0||armor.current>armor.max)
      fail('Verified current thresholds, HP and Armor required.');
  }

  return Object.freeze({validatePvpDamageDefense});
}
