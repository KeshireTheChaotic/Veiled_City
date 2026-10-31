/** Shared PC/NPC reaction routing and native NPC d20 proof helpers. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {gmD20Roll} from './dice.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';

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

/** Resolve one GM-controlled NPC reaction from an exact adversary statblock Experience. */
export function rollNativeNpcReaction({target,combatant,template,experienceName=null,difficulty,rng}){
  if(target?.kind!=='npc'||target.owner||!target.presence_hash||!target.control_hash
    ||!combatant||combatant.status!=='active'||combatant.hp_current<=0||!template||hash(template)!==target.template_hash
    ||!Number.isSafeInteger(difficulty)||difficulty<0)throw fail('mixed_reaction_npc_source');
  let modifier=0,experience=null;
  if(experienceName!==null){
    if(typeof experienceName!=='string'||!experienceName.trim())throw fail('mixed_reaction_experience_source');
    const matches=(template.experiences||[]).filter(item=>item?.name===experienceName);
    if(matches.length!==1||!Number.isSafeInteger(matches[0].modifier)||matches[0].modifier<0)throw fail('mixed_reaction_experience_source');
    experience={name:matches[0].name,modifier:matches[0].modifier};modifier=experience.modifier;
  }
  const result=gmD20Roll({kind:'reaction',modifier,difficulty},rng);
  const data={version:1,target:{kind:target.kind,key:target.key,presence_hash:target.presence_hash,control_hash:target.control_hash,
    template_hash:target.template_hash},combatant_hash:hash(combatant),experience,result};
  return Object.freeze({...data,receipt_hash:hash(data)});
}

/** Recompute roll arithmetic and immutable receipt digest before accepting an NPC reaction. */
export function inspectNativeNpcReaction(receipt){
  const {receipt_hash,...data}=receipt||{},r=data.result,templateHash=data.target?.template_hash;
  if(data.version!==1||data.target?.kind!=='npc'||!data.target.key||!data.target.presence_hash||!data.target.control_hash
    ||!templateHash||!data.combatant_hash||!r||!['gm_d20'].includes(r.family)||r.kind!=='reaction'
    ||data.experience!==null&&(!data.experience||typeof data.experience.name!=='string'||!Number.isSafeInteger(data.experience.modifier)||data.experience.modifier<0)
    ||r.modifier!==(data.experience?.modifier??0)||hash(receipt_hash?data:null)!==receipt_hash)throw fail('mixed_reaction_npc_receipt');
  let i=0;const expected=gmD20Roll({kind:'reaction',modifier:r.modifier,difficulty:r.difficulty},()=>r.faces[i++]);
  if(hash(expected)!==hash(r))throw fail('mixed_reaction_npc_arithmetic');
  return receipt;
}

/** Persist one complete mixed cohort atomically through the existing native owner/NPC writers. */
export function prepareMixedReactionCohort({transaction,targets,key,readReceipt,writeExecution,createPcInvitation,inspectPcInvitation,resolveNpcReaction,writeNpcReceipt}){
  if(typeof transaction!=='function'||typeof key!=='string'||!key||typeof readReceipt!=='function'
    ||typeof writeExecution!=='function'||typeof createPcInvitation!=='function'||typeof inspectPcInvitation!=='function'
    ||typeof resolveNpcReaction!=='function'||typeof writeNpcReceipt!=='function')
    throw fail('mixed_reaction_capabilities');
  const cohort=splitMixedReactionCohort(targets);
  return transaction(()=>{
    const existing=readReceipt(key);
    if(existing){
      if(existing.cohort_hash!==cohort.cohort_hash||!Array.isArray(existing.reactions)||existing.reactions.length!==targets.length)
        throw fail('mixed_reaction_replay_conflict');
      for(const [i,reaction] of existing.reactions.entries()){
        const target=targets[i];
        if(reaction.kind!==target.kind||reaction.target!==`${target.kind}:${target.key}`)throw fail('mixed_reaction_replay_conflict');
        if(target.kind==='npc'){
          const receipt=inspectNativeNpcReaction(reaction.receipt);
          if(receipt.target.key!==target.key||receipt.target.presence_hash!==target.presence_hash
            ||receipt.target.control_hash!==target.control_hash||receipt.target.template_hash!==target.template_hash)throw fail('mixed_reaction_replay_conflict');
        }else{
          const invitation=inspectPcInvitation(reaction.invitation);
          if(hash(invitation?.data)!==reaction.invitation_hash||invitation?.data?.native?.character!==target.key
            ||invitation?.data?.native?.owner!==target.owner)throw fail('mixed_reaction_replay_conflict');
        }
      }
      return existing;
    }
    const reactions=[];
    for(const target of targets){
      if(target.kind==='character'){
        const invitation=createPcInvitation(target);
        if(!invitation||invitation.kind!=='gm_arbitration_decision'||invitation.status!=='pending_pc_reaction'
          ||invitation.data?.native?.character!==target.key||invitation.data?.native?.owner!==target.owner)
          throw fail('mixed_reaction_pc_invitation');
        reactions.push({kind:'character',target:`character:${target.key}`,invitation:invitation.record_key,invitation_hash:hash(invitation.data)});
      }else{
        const receipt=inspectNativeNpcReaction(resolveNpcReaction(target));
        if(receipt.target.key!==target.key||receipt.target.presence_hash!==target.presence_hash||receipt.target.control_hash!==target.control_hash
          ||receipt.target.template_hash!==target.template_hash)throw fail('mixed_reaction_npc_target');
        const stored=writeNpcReceipt(target,receipt);
        if(!stored||stored.kind!=='native_npc_reaction'||stored.status!=='resolved'||stored.data?.receipt_hash!==receipt.receipt_hash)
          throw fail('mixed_reaction_npc_persistence');
        reactions.push({kind:'npc',target:`npc:${target.key}`,receipt:stored.data});
      }
    }
    const result=Object.freeze({version:1,key,cohort_hash:cohort.cohort_hash,reactions:Object.freeze(reactions)});
    const saved=writeExecution(result);
    if(!saved||saved.key!==key||saved.cohort_hash!==cohort.cohort_hash||saved.reactions?.length!==targets.length||hash(saved)!==hash(result))
      throw fail('mixed_reaction_execution_persistence');
    return saved;
  });
}
