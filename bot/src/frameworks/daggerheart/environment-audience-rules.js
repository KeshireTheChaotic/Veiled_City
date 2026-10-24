/** Native environmental provenance/entitlement only; never world fact creation or execution permission. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
export function createEnvironmentAudienceRules({capabilities}){
const {narrativeSourceVisible,conversationPrincipal,currentScene,scenePresence}=capabilities||{};
if([narrativeSourceVisible,conversationPrincipal,currentScene,scenePresence].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native environmental proof capabilities required.');
function assertEnvironmentAudience(db,guild,original,viewer,origin,{current=false}={}){
  if(!viewer||!['party','private'].includes(viewer.mode)||!original||!['party','private'].includes(original.mode))
    throw fail('environment_output_audience_shape');
  const same=hash(original)===hash(viewer);
  if(original.mode==='private'&&!same)throw fail('environment_private_source_cannot_change_recipient');
  if(!same||current){
    const scene=currentScene(db,guild);
    if(scene.key!==origin.scene||scene.session_id!==origin.session)throw fail('environment_output_current_scene');
    if(viewer.actorCharacterId&&viewer.actorUserId){
      let principal;
      try{principal=conversationPrincipal(db,guild,viewer.actorUserId,viewer.actorCharacterId);}catch(error){
        if(!['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))throw error;
        throw fail('environment_output_current_owner');
      }
      const pc=db.getCharacter(viewer.actorCharacterId),presence=scenePresence(db,guild,'character',pc?.id);
      // A camera may reuse its original scope. A different PC needs real local presence.
      if(principal.kind!=='owner'||pc?.guild_id!==guild||pc.owner_user_id!==viewer.actorUserId
        ||same&&origin.principal&&principal.revision!==origin.principal
        ||(!same||origin.viewpoint==='character')&&(pc.data.location!==origin.location||presence?.status!=='active'
          ||presence.data.state!=='actually_present'||presence.location_key!==origin.location
          ||!narrativeSourceVisible(db,guild,presence.source_event,viewer)))throw fail('environment_output_local_owner_presence');
    }else if(!same)throw fail('environment_shared_output_needs_authenticated_viewpoint');
  }
  if(!narrativeSourceVisible(db,guild,origin.source,viewer))throw fail('environment_output_original_source_visibility');
  return true;
}

return Object.freeze({assertEnvironmentAudience});
}
