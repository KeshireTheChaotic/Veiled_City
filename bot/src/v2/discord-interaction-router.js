import {createDiscordCostCommands} from './discord-cost-commands.js';
import {createNativeCostWorkflow} from './native-cost-workflow.js';
import {MessageFlags} from 'discord.js';
import {createNativeDeathWorkflow} from './native-death-workflow.js';
import {createDiscordDeathCommands} from './discord-death-commands.js';
import {createDiscordSessionAttendance} from './discord-session-attendance.js';
import {createDiscordGmSession} from './discord-gm-session.js';
import {createDiscordPlayerChannel} from './discord-player-channel.js';
import {createDiscordGmAuthority} from './discord-gm-authority.js';
import {createDiscordCharacterExports} from './discord-character-exports.js';
/** Owns the interaction surface on a fresh native client. The host must route
 * other native commands/components through the supplied callbacks, not install
 * additional peer listeners. Natural message intake is a separate GM surface.
 */
export function createDiscordInteractionRouter({client,nativeDeath,nativeCost=null,nativeSession=null,nativeGm=null,nativeCharacterExports=null,allowedGuildIds=null,handleOtherCommand=async()=>false,handleOtherComponent=async()=>false,onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof client?.listenerCount!=='function'||typeof handleOtherCommand!=='function'||typeof handleOtherComponent!=='function'||typeof onError!=='function'||typeof nativeDeath?.readOwnerRoute!=='function')throw new TypeError('Exclusive native interaction router dependencies required');
  if(client.listenerCount('interactionCreate')!==0)throw new Error('Native interaction router requires an unclaimed client; do not install alongside legacy handlers');
  let workflow,costs,costCommands,commands,attendance,playerChannel,gmAuthority,gmSession,characterExports,closed=false;const pending=new Map(),denials=new Set(),observed=new WeakSet(),controller=new AbortController();
  const report=(error,event,stage)=>{try{onError(error,{interactionId:event?.id??null,stage});}catch{}};
  try{
    workflow=createNativeDeathWorkflow({...nativeDeath,client,onError});
    commands=createDiscordDeathCommands({...nativeDeath,client,workflow,readRoute:nativeDeath.readOwnerRoute,onError});
    if(nativeCharacterExports)characterExports=createDiscordCharacterExports({...nativeCharacterExports,client,interactionReceipts:nativeDeath.interactionReceipts,wasObserved:e=>observed.has(e),onError});
    if(nativeCost){costs=createNativeCostWorkflow({...nativeCost,client,allowedGuildIds,onError});costCommands=createDiscordCostCommands({...nativeCost,client,workflow:costs,onError});}
    if(nativeSession){attendance=createDiscordSessionAttendance({...nativeSession,client,sceneStore:nativeDeath.sceneStore,interactionReceipts:nativeDeath.interactionReceipts,onError});playerChannel=createDiscordPlayerChannel({client,readOwnerSession:nativeSession.readOwnerSession,sceneStore:nativeDeath.sceneStore,interactionReceipts:nativeDeath.interactionReceipts,onError});}
    if(nativeGm){const {readPolicy,clock,leaseMs,...services}=nativeGm;gmAuthority=createDiscordGmAuthority({client,readPolicy,...(clock?{clock}:{}),...(leaseMs?{leaseMs}:{})});gmSession=createDiscordGmSession({...services,readGmRoleId:c=>readPolicy(c).gmRoleId,client,gmAuthority,sceneStore:nativeDeath.sceneStore,interactionReceipts:nativeDeath.interactionReceipts,onError});}
  }catch(error){characterExports?.close();costCommands?.close();costs?.close();gmSession?.close();gmAuthority?.close();playerChannel?.close();attendance?.close();commands?.close();workflow?.close();throw error;}
  async function deny(event){
    if(closed||denials.has(event.id))return;denials.add(event.id);if(denials.size>1024)denials.delete(denials.values().next().value);
    const content='This control is unavailable or needs native review. No new action was confirmed.';
    try{
      if(!event.deferred&&!event.replied&&typeof event.reply==='function')await event.reply({content,flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}});
      else if(event.ephemeral===true&&typeof event.editReply==='function')await event.editReply({content,allowedMentions:{parse:[]}});
    }catch(error){report(error,event,'private_denial');}
  }
  async function route(event){
    if(closed||event?.client!==client||event.user?.bot!==false||allowedGuildIds&&!allowedGuildIds.has(event.guildId))return;
    try{
      if(event.isChatInputCommand?.()===true){
        if(characterExports?.claimsRoute(event)){await characterExports.handle(event);return;}
        const claimed=commands.claimsRoute(event),handled=await commands.handle(event);
        if(handled)return;if(claimed){await deny(event);return;}
        if(costCommands&&costCommands.claimsRoute(event)){await costCommands.handle(event);return;}
        if(attendance){const claimedAttendance=attendance.claimsRoute(event),attended=await attendance.handle(event);if(attended)return;if(claimedAttendance){await deny(event);return;}}
        if(playerChannel&&playerChannel.claimsRoute(event)){await playerChannel.handle(event);return;}
        if(gmSession&&gmSession.claimsRoute(event)){await gmSession.handle(event);return;}
        if(!closed)await handleOtherCommand(event,{signal:controller.signal});
      }else if(typeof event.customId==='string'){
        if(event.customId.startsWith('vk2cost:')&&nativeCost){if(!nativeCost.promptStore.readPrompt(event.customId))await deny(event);return;}
        if(event.customId.startsWith('vk2death:')){if(!nativeDeath.promptStore.readPrompt(event.customId))await deny(event);return;}
        if(!closed)await handleOtherComponent(event,{signal:controller.signal});
      }
    }catch(error){report(error,event,'routing');await deny(event);}
  }
  const listener=event=>{
    if(closed||event?.client!==client||typeof event.id!=='string'||!event.id||pending.has(event.id))return;
    observed.add(event);
    const key=event.id,job=route(event);pending.set(key,job);void job.catch(error=>report(error,event,'routing')).finally(()=>pending.delete(key));
  };
  client.on('interactionCreate',listener);
  return Object.freeze({costs,async drain(){await Promise.allSettled([...pending.values()]);await costs?.drain();return workflow.drain();},close(){if(closed)return;closed=true;controller.abort();client.off('interactionCreate',listener);characterExports?.close();costCommands?.close();costs?.close();gmSession?.close();gmAuthority?.close();playerChannel?.close();attendance?.close();commands.close();workflow.close();}});
}

