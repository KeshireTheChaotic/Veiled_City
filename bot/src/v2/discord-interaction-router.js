import {MessageFlags} from 'discord.js';
import {createNativeDeathWorkflow} from './native-death-workflow.js';
import {createDiscordDeathCommands} from './discord-death-commands.js';
/** Owns the interaction surface on a fresh native client. The host must route
 * other native commands/components through the supplied callbacks, not install
 * additional peer listeners. Natural message intake is a separate GM surface.
 */
export function createDiscordInteractionRouter({client,nativeDeath,handleOtherCommand=async()=>false,handleOtherComponent=async()=>false,onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof client?.listenerCount!=='function'||typeof handleOtherCommand!=='function'||typeof handleOtherComponent!=='function'||typeof onError!=='function'||typeof nativeDeath?.readOwnerRoute!=='function')throw new TypeError('Exclusive native interaction router dependencies required');
  if(client.listenerCount('interactionCreate')!==0)throw new Error('Native interaction router requires an unclaimed client; do not install alongside legacy handlers');
  let workflow,commands,closed=false;const pending=new Map(),denials=new Set(),controller=new AbortController();
  const report=(error,event,stage)=>{try{onError(error,{interactionId:event?.id??null,stage});}catch{}};
  try{
    workflow=createNativeDeathWorkflow({...nativeDeath,client,onError});
    commands=createDiscordDeathCommands({...nativeDeath,client,workflow,readRoute:nativeDeath.readOwnerRoute,onError});
  }catch(error){commands?.close();workflow?.close();throw error;}
  async function deny(event){
    if(closed||denials.has(event.id))return;denials.add(event.id);if(denials.size>1024)denials.delete(denials.values().next().value);
    const content='This control is unavailable or needs native review. No new action was confirmed.';
    try{
      if(!event.deferred&&!event.replied&&typeof event.reply==='function')await event.reply({content,flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}});
      else if(event.ephemeral===true&&typeof event.editReply==='function')await event.editReply({content,allowedMentions:{parse:[]}});
    }catch(error){report(error,event,'private_denial');}
  }
  async function route(event){
    if(closed||event?.client!==client||event.user?.bot!==false)return;
    try{
      if(event.isChatInputCommand?.()===true){
        const claimed=commands.claimsRoute(event),handled=await commands.handle(event);
        if(handled)return;if(claimed){await deny(event);return;}
        if(!closed)await handleOtherCommand(event,{signal:controller.signal});
      }else if(typeof event.customId==='string'){
        if(event.customId.startsWith('vk2death:')){if(!nativeDeath.promptStore.readPrompt(event.customId))await deny(event);return;}
        if(!closed)await handleOtherComponent(event,{signal:controller.signal});
      }
    }catch(error){report(error,event,'routing');await deny(event);}
  }
  const listener=event=>{
    if(closed||event?.client!==client||typeof event.id!=='string'||!event.id||pending.has(event.id))return;
    const key=event.id,job=route(event);pending.set(key,job);void job.catch(error=>report(error,event,'routing')).finally(()=>pending.delete(key));
  };
  client.on('interactionCreate',listener);
  return Object.freeze({async drain(){await Promise.allSettled([...pending.values()]);return workflow.drain();},close(){if(closed)return;closed=true;controller.abort();client.off('interactionCreate',listener);commands.close();workflow.close();}});
}
