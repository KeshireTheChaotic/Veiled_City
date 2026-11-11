/** Shared PC/NPC reaction routing and native NPC d20 proof helpers. */
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
import {gmD20Roll} from './dice.js';
const fail=code=>new Error(code);

/** Route an already source-qualified cohort without collapsing PC agency into GM dice. */
export function splitMixedReactionCohort(targets){
  if(!Array.isArray(targets)||!targets.length)throw fail('mixed_reaction_cohort');
  const keys=new Set();
  for(const target of targets){
    if(!target||!['character','npc'].includes(target.kind)||typeof target.key!=='string'||!target.key
      ||keys.has(`${target.kind}:${target.key}`)||target.kind==='character'&&(!target.owner||!target.presence_hash)
      ||target.kind==='npc'&&(!target.presence_hash||!target.control_hash))throw fail('mixed_reaction_cohort');
    keys.add(`${target.kind}:${target.key}`);
  }
  return Object.freeze({pc:Object.freeze(targets.filter(t=>t.kind==='character').map(t=>Object.freeze({...t}))),
    npc:Object.freeze(targets.filter(t=>t.kind==='npc').map(t=>Object.freeze({...t}))),cohort_hash:hash(targets)});
}

/** Resolve one GM-controlled NPC reaction from a native statblock, or a pinned ordinary profile at +0. */
export function rollNativeNpcReaction({target,combatant=null,template=null,profile=null,experienceName=null,difficulty,rng}){
  const ordinary=profile!==null;
  if(target?.kind!=='npc'||target.owner||!target.presence_hash||!target.control_hash
    ||(ordinary?combatant!==null||template!==null||profile.npc_key!==target.key||!profile.guild_id
      ||hash(profile)!==target.profile_hash||target.profile_hash!==target.template_hash||experienceName!==null
      :!combatant||combatant.status!=='active'||combatant.hp_current<=0||!template||hash(template)!==target.template_hash)
    ||!Number.isSafeInteger(difficulty)||difficulty<0)throw fail('mixed_reaction_npc_source');
  let modifier=0,experience=null;
  if(experienceName!==null){
    if(typeof experienceName!=='string'||!experienceName.trim())throw fail('mixed_reaction_experience_source');
    const matches=(template.experiences||[]).filter(item=>item?.name===experienceName);
    if(matches.length!==1||!Number.isSafeInteger(matches[0].modifier)||matches[0].modifier<0)throw fail('mixed_reaction_experience_source');
    experience={name:matches[0].name,modifier:matches[0].modifier};modifier=experience.modifier;
  }
  const result=gmD20Roll({kind:'reaction',modifier,difficulty},rng);
  const data={version:ordinary?2:1,target:{kind:target.kind,key:target.key,presence_hash:target.presence_hash,control_hash:target.control_hash,
    template_hash:target.template_hash},combatant_hash:ordinary?null:hash(combatant),
    ...(ordinary?{profile:{key:profile.npc_key,hash:target.profile_hash}}:{}),experience,result};
  return Object.freeze({...data,receipt_hash:hash(data)});
}

/** Recompute roll arithmetic and immutable receipt digest before accepting an NPC reaction. */
export function inspectNativeNpcReaction(receipt){
  const {receipt_hash,...data}=receipt||{},r=data.result,templateHash=data.target?.template_hash;
  if(![1,2].includes(data.version)||data.target?.kind!=='npc'||!data.target.key||!data.target.presence_hash||!data.target.control_hash
    ||!templateHash||(data.version===1?!data.combatant_hash||data.profile!==undefined
      :data.combatant_hash!==null||data.profile?.key!==data.target.key||data.profile?.hash!==templateHash||data.experience!==null)
    ||!r||!['gm_d20'].includes(r.family)||r.kind!=='reaction'
    ||data.experience!==null&&(!data.experience||typeof data.experience.name!=='string'||!Number.isSafeInteger(data.experience.modifier)||data.experience.modifier<0)
    ||r.modifier!==(data.experience?.modifier??0)||hash(receipt_hash?data:null)!==receipt_hash)throw fail('mixed_reaction_npc_receipt');
  let i=0;const expected=gmD20Roll({kind:'reaction',modifier:r.modifier,difficulty:r.difficulty},()=>r.faces[i++]);
  if(hash(expected)!==hash(r))throw fail('mixed_reaction_npc_arithmetic');
  return receipt;
}
