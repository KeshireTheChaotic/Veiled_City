/** Native control classification only; ownership is not an execution, disclosure or rules capability. */
import {activeCityProxy} from './city-constraints.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

export function nativeActorControl(db,guild,type,key){
  let owner_control_type='admin',basis=['unsupported_actor_requires_native_adapter'];
  const pc=typeof key==='string'&&db.getCharacter(key);
  if(pc){
    owner_control_type=pc.guild_id===guild?'player':'admin';
    basis=['character',pc.guild_id,pc.id,pc.owner_user_id,pc.status];
  }else if(type==='npc'&&typeof key==='string'&&key){
    const proxy=activeCityProxy(db,guild,key),entity=db.getSimulationEntity(guild,'npc',key),profile=db.getNpcProfile(guild,key);
    if(proxy){owner_control_type='proxy';basis=['npc_proxy',proxy];}
    else if(entity&&profile){owner_control_type='ai_world';basis=['native_npc',entity.entity_key,profile.npc_key];}
  }
  return Object.freeze({version:1,actor_type:type,actor_key:key,owner_control_type,
    revision:hash([guild,type,key,owner_control_type,basis]),execution_authority:false});
}
