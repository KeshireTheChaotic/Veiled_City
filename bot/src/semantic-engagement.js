/** Request-local router interpretation. No effect, consent, listener or disclosure authority. */
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene} from './scene-continuity.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
const bindings=new WeakMap();
export const engagementKinds=['scene_description','current_situation','conversation','action','rules','no_response','uncertain'];
export function bindSemanticEngagement(db,guild,scope,sourceRef,classification){
  const source=db.getWorldEvent(guild,sourceRef),scene=currentScene(db,guild);
  if(!classification||!engagementKinds.includes(classification.engagement_kind)||typeof classification.observation_only!=='boolean'
    ||!['current_location','other','none'].includes(classification.target_scope)||typeof classification.respond!=='boolean'
    ||source?.status!=='active'||source.kind!=='ai_gm_input'||source.session_id!==scene.session_id||source.scene!==scene.key
    ||source.details.author!==scope.actorUserId||source.details.character_id!==scope.actorCharacterId
    ||source.details.private_scene!==(scope.mode==='private')||!db.ownerAuthoredSource(guild,sourceRef,scope.actorUserId))return null;
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  if(principal.kind!=='owner'||principal.revision!==source.details.revision)return null;
  const value=Object.freeze({respond:classification.respond,engagement_kind:classification.engagement_kind,
    observation_only:classification.observation_only,target_scope:classification.target_scope});
  bindings.set(value,{guild,scope:hash(scope),source:sourceRef,source_hash:hash(source.details),revision:principal.revision,scene:scene.key});return value;
}
export function currentSemanticEngagement(db,guild,value,scope,sourceRef){
  const binding=value&&bindings.get(value),source=sourceRef&&db.getWorldEvent(guild,sourceRef);
  if(!binding||binding.guild!==guild||binding.scope!==hash(scope)||binding.source!==sourceRef||source?.status!=='active'
    ||binding.scene!==currentScene(db,guild).key||binding.source_hash!==hash(source.details))return null;
  try{if(conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId).revision!==binding.revision)return null;}catch{return null;}
  return value;
}
export function semanticSceneOperation(value){
  if(!value?.respond||!value.observation_only||value.target_scope!=='current_location')return null;
  return ({scene_description:'describe_scene',current_situation:'current_situation'})[value.engagement_kind]||null;
}
