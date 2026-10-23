/** Existing v3 PvP profile terms and owner-distinctness rules; no consent or damage is applied here. */
const boundaryTerms=Object.freeze(['no_forced_player_dialogue','no_private_information_disclosure','no_forced_player_control',
  'no_involuntary_item_loss','no_authored_permanent_scar']);
const text=(value,max=600)=>typeof value==='string'&&!!value.trim()&&value.length<=max;

export function createPvpProfileTerms({fail}){
  if(typeof fail!=='function')throw new TypeError('PvP profile terms require the established native failure constructor.');
  function closed(value,fields){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==fields.length||fields.some(key=>!(key in value)))
      fail('Closed v3 PvP fields required.');
  }
  function checkTerms(input,{historical=false,resolveOwner,currentMinute}={}){
    if(typeof resolveOwner!=='function'||!historical&&typeof currentMinute!=='function')
      throw new TypeError('PvP profile terms require current owner and clock capabilities.');
    closed(input,['version','profile','objective','participants','interaction_scope','target_permissions','stakes','boundaries',
      'allow_damage','lethality','last_hp_policy','critical_stress_policy','hope_policy','fear_policy','scoring_policy',
      'features','resource_spending','audience','stop_policy','expires_minute',...(input?.spotlight_policy!==undefined?['spotlight_policy']:[])]);
    if(input.version!==3||input.profile!=='damage_enabled'||input.allow_damage!==true)
      fail('Separate v3 damage-enabled profile required; narrative scores never authorize HP.');
    if(input.lethality!=='lethal'||input.last_hp_policy!=='owner_selected_srd_death_move')
      fail('Vanilla lethal damage/death risk only; guaranteed-nonlethal damage tiers are disabled by owner ruling.');
    if(!text(input.objective)||!Array.isArray(input.participants)||input.participants.length<2||input.participants.length>12
      ||!Array.isArray(input.stakes)||input.stakes.length!==input.participants.length)
      fail('Bounded independent participants and per-owner stakes required.');
    const owners=[];
    const participants=input.participants.map(participant=>{
      closed(participant,['character','team']);
      const owner=resolveOwner(participant.character,historical);owners.push(owner.user);
      if(participant.team!==null&&!text(participant.team,40))fail('Explicit bounded team or null required.');
      return {...participant};
    });
    if(new Set(participants.map(participant=>participant.character)).size!==participants.length||new Set(owners).size!==participants.length)
      fail('Independent distinct affected owners required; no multi-PC self approval.');
    if(!['duel','free_for_all','teams'].includes(input.interaction_scope)
      ||input.interaction_scope==='duel'&&participants.length!==2
      ||input.interaction_scope!=='teams'&&participants.some(participant=>participant.team!==null)
      ||input.interaction_scope==='teams'&&(participants.some(participant=>!participant.team)||new Set(participants.map(participant=>participant.team)).size<2))
      fail('Explicit duel, FFA or team scope required.');
    if(input.spotlight_policy!==undefined&&(input.interaction_scope==='duel'||input.spotlight_policy!=='fair_opportunities_native_target_locks'))
      fail('Fixed explicit native group spotlight policy required; no authored initiative or effects.');
    const stakes=participants.map(participant=>{
      const rows=input.stakes.filter(value=>value.character===participant.character),stake=rows[0];
      closed(stake,['character','best','worst']);
      if(rows.length!==1||!text(stake.best)||!text(stake.worst))fail('Exact per-participant bounded stakes required.');
      return {...stake};
    });
    if(!Array.isArray(input.target_permissions)||!input.target_permissions.length||input.target_permissions.length>132)
      fail('Explicit target-specific attack edges required.');
    const target_permissions=input.target_permissions.map(edge=>{
      closed(edge,['actor','target','effect_class','max_risk']);
      if(edge.actor===edge.target||![edge.actor,edge.target].every(character=>participants.some(p=>p.character===character))
        ||edge.effect_class!=='attack_damage'||edge.max_risk!=='lethal')fail('Exact attack/target/lethal-risk edge required.');
      return {...edge};
    });
    if(new Set(target_permissions.map(edge=>`${edge.actor}:${edge.target}`)).size!==target_permissions.length)fail('Duplicate target edge.');
    if(!Array.isArray(input.boundaries)||input.boundaries.length!==boundaryTerms.length||boundaryTerms.some(term=>!input.boundaries.includes(term)))
      fail('Mandatory agency, disclosure and property boundaries required.');
    if(input.critical_stress_policy!=='disabled'||input.hope_policy!=='no_pvp_hope_generation'
      ||input.fear_policy!=='immediate_contextual_fear'||input.scoring_policy!=='none'||input.resource_spending!=='owner_native_only'
      ||!['private','approved_bounded_result'].includes(input.audience)
      ||input.stop_policy!=='neutral_withdrawal_preserve_committed_effects')
      fail('Fixed PvP policy required; no Hope/critical Stress or unsigned score/damage mapping.');
    if(!Array.isArray(input.features)||input.features.length>24||new Set(input.features).size!==input.features.length
      ||input.features.some(feature=>!text(feature,180)))fail('Bounded explicit native feature references required.');
    if(!Number.isSafeInteger(input.expires_minute)||input.expires_minute<1||!historical&&input.expires_minute<=currentMinute())
      fail('Current fictional expiry required.');
    return {...input,participants,stakes,target_permissions,boundaries:[...boundaryTerms],features:[...input.features]};
  }
  return Object.freeze({checkTerms});
}
