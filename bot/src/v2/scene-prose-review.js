import {createProseMaterialReview} from './prose-material-review.js';
/** Names are used only by native screening, never added to an inference packet. */
export function createSceneProseReview({sceneStore,characterRepository,authorizeMaterial=()=>false}){
 const readers=sceneStore?.readers;
 if(typeof readers?.readScene!=='function'||typeof readers?.readActor!=='function'||typeof characterRepository?.getCharacter!=='function')throw new TypeError('Native scene and character identity readers required');
 function identities(audience){
  const scene=readers.readScene(audience.campaign,audience.scene);
  if(!scene||scene.campaignId!==audience.campaign||scene.id!==audience.scene||!Array.isArray(scene.participants)||scene.participants.length>256)throw new Error('Native prose scene identities required');
  const controlled=[],independent=[];
  for(const actorId of new Set(scene.participants.map(p=>p.actorId))){
   const actor=readers.readActor(audience.campaign,actorId);if(!actor||actor.id!==actorId||actor.campaignId!==audience.campaign||actor.sceneId!==audience.scene)throw new Error('Native prose actor identity required');
   const names=[];if(typeof actor.name==='string'&&actor.name.trim())names.push(actor.name);
   if(actor.kind==='pc'){const pc=characterRepository.getCharacter(actor.id);if(!pc||pc.guild_id!==audience.campaign||pc.id!==actor.id||typeof pc.name!=='string'||!pc.name.trim())throw new Error('Current prose PC identity required');names.push(pc.name);}
   const target=actor.kind==='pc'||actor.controllerUserId?controlled:independent;
   target.push(...names);
  }
  return {controlled:[...new Set(controlled)],independent:[...new Set(independent)]};
 }
 return createProseMaterialReview({authorizeMaterial,readControlledNames:a=>identities(a).controlled,readIndependentSpeakers:a=>identities(a).independent});
}
