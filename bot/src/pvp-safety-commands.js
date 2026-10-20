/** Urgent owner safety controls commit before Discord, model work or normal command continuations. */
import {setCampaignPvpMode,campaignPvpPolicy,setPvpSafetyStop,pvpSafetyStatus} from './pvp-campaign-policy.js';
import {PermissionError,UserInputError} from './errors.js';
import {acknowledgeNative,interactionFailure} from './discord/interaction-lifecycle.js';

export async function handlePvpSafetyCommand(interaction,{db,gm=false}){
  if(!interaction.guildId||!interaction.isChatInputCommand()||interaction.options.getSubcommand()!=='pvp'
    ||!(interaction.commandName==='vc-roll'||interaction.commandName==='vc'&&interaction.options.getSubcommandGroup()==='roll'))return false;
  let input;try{input=JSON.parse(interaction.options.getString('json')||'{}');}catch{return false;}
  if(!['safety-stop','safety-status','campaign-mode','campaign-status'].includes(input?.op))return false;
  const {op,...fields}=input,guild=interaction.guildId,user=interaction.user?.id,native={interactionId:interaction.id};
  let content;
  // Deliberately no await before the authenticated native stop. A blocked model or
  // failed Discord acknowledgement must not postpone protection of this owner.
  if(op==='safety-stop'){
    if(Object.keys(fields).length!==1||typeof fields.character_id!=='string')throw new UserInputError('Use only your exact character_id for a safety stop.');
    setPvpSafetyStop(db,guild,user,fields,native);
    content='Safety stop saved. New and unfinished hostile PvP effects involving your character are held. Committed native outcomes remain unchanged. '
      +'This stop is sticky; no GM override or implicit re-enrollment.';
  }else if(op==='safety-status'){
    if(Object.keys(fields).length!==1||typeof fields.character_id!=='string')
      throw new UserInputError('Use only your exact character_id for safety status.');
    const status=pvpSafetyStatus(db,guild,user,fields);
    content=status.stopped?'Your PvP safety stop is active. New and unfinished hostile effects involving your character remain held.'
      :'Your character has no saved PvP safety stop. This status does not grant consent or authorize an attack.';
  }else{
    if(!gm)throw new PermissionError('GM/admin permission required for campaign PvP policy.');
    if(op==='campaign-mode'){
      if(Object.keys(fields).length!==1||typeof fields.enabled!=='boolean')throw new UserInputError('Use only an explicit enabled boolean for campaign PvP policy.');
      setCampaignPvpMode(db,guild,user,fields,{...native,gm:true});
    }else if(Object.keys(fields).length)throw new UserInputError('Campaign policy status accepts no additional fields.');
    const policy=campaignPvpPolicy(db,guild);
    content=`Campaign PvP policy: ${policy.enabled?'enabled':'disabled'}; revision ${policy.revision}. `
      +(policy.enabled?'Qualified source-bound native PC attacks may execute without bilateral approval. ':'Policy alone does not execute attacks or effects. ')
      +'Owner safety stops, Armor and death choices remain enforced.';
  }
  if((interaction.deferred||interaction.replied)&&interaction.ephemeral!==true)
    throw new PermissionError('PvP safety controls require a native private response.');
  try{
    await acknowledgeNative(interaction,op);
    await interaction.editReply({content,allowedMentions:{parse:[]}});
  }catch(error){throw interactionFailure(interaction,error);}
  return true;
}
