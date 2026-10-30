/** Existing Discord ephemeral option compatibility, applied once to each reply method. */
import {MessageFlags} from 'discord.js';
export function translateEphemeralReplies(interaction){
  for(const method of ['reply','deferReply','followUp']){
    const original=interaction?.[method];
    if(typeof original!=='function'||original.ephemeralTranslated)continue;
    const translated=function(payload){
      if(payload&&typeof payload==='object'&&'ephemeral' in payload){
        const {ephemeral,...rest}=payload;
        payload=ephemeral?{...rest,flags:(Number(rest.flags)||0)|MessageFlags.Ephemeral}:rest;
      }
      return original.call(this,payload);
    };
    translated.ephemeralTranslated=true;interaction[method]=translated;
  }
  return interaction;
}
