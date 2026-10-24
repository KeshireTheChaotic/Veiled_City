/** Native authority and execution policy; injected source/other-native capabilities confer no model authority. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
export function createActorControlRules({capabilities}){
const {activeCityProxy}=capabilities||{};
if([activeCityProxy].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native GM capabilities required.');
function nativeActorControl(db,guild,type,key){
  let owner_control_type='admin',basis=['unsupported_actor_requires_native_adapter'];
  const pc=typeof key==='string'&&db.getCharacter(key);
  if(pc){
    owner_control_type=pc.guild_id===guild?'player':'admin';
    basis=['character',pc.guild_id,pc.id,pc.owner_user_id,pc.status];
  }else if(typeof key==='string'&&key&&['npc','faction','institution','community','organization','district','location'].includes(type)){
    const proxy=type==='npc'&&activeCityProxy(db,guild,key),entity=db.getSimulationEntity(guild,type,key),
      profile=type==='npc'&&db.getNpcProfile(guild,key),record=type!=='npc'&&db.getCityRecord(guild,type,key),
      identity=db.getCityRecord(guild,'autonomous_entity',`${type}:${key}`),state=entity?.state||record?.data||{};
    const memberships=['faction','institution','community','organization'].includes(type)
      ?db.listCityRecords(guild,{kind:'community_membership',actor:`community:${key}`,status:'active',includeGM:true,limit:100}):[];
    if(proxy){owner_control_type='proxy';basis=['npc_proxy',proxy];}
    else if(state.owner_user_id||state.owner_character_id||state.player_controlled===true
      ||memberships.some(row=>row.data.role==='founder'&&db.getCharacter(row.subject_key)?.guild_id===guild)){
      owner_control_type='player';basis=['owned_world_actor',state.owner_user_id,state.owner_character_id,memberships];
    }else if(state.owner_control_type!==undefined&&state.owner_control_type!=='ai_world'){
      owner_control_type=['ai_world','player','proxy','admin'].includes(state.owner_control_type)?state.owner_control_type:'admin';
      basis=['explicit_control',state.owner_control_type];
    }else if(type==='npc'?entity&&profile:entity||record?.status==='active'||identity?.status==='active'){
      owner_control_type='ai_world';basis=type==='npc'?['native_npc',entity.entity_key,profile.npc_key]
        :['native_world_actor',entity?.entity_key,profile?.npc_key,record?.record_key,identity?.record_key];
    }
  }
  return Object.freeze({version:1,actor_type:type,actor_key:key,owner_control_type,
    revision:hash([guild,type,key,owner_control_type,basis]),execution_authority:false});
}

return Object.freeze({nativeActorControl});
}
