/** Native character registration and in-place control rebinding for a verified human GM operation.
 * Discord adapters only translate commands; every check and the commit live here. */
export function createNativeCharacterRegistration({sceneStore,gmAuthority}){
  if(typeof sceneStore?.commitSnapshot!=='function'||typeof sceneStore?.activeScenes!=='function'||typeof gmAuthority?.check!=='function')throw new TypeError('Native scene store and human GM authority required');
  /** Registers an existing native character to its repository owner in the sole active scene.
   * Rebinding or replacing an existing registration is refused here and needs native review.
   */
  function register(proof,repository,rebind=false){
    const c=proof.campaignId,actorId=proof.targetRef,character=repository.getCharacter(actorId);
    const check=()=>{
      gmAuthority.check(proof);const sessions=sceneStore.activeSessions(c),scenes=sessions.length===1?sceneStore.activeScenes(c,sessions[0].id):[];
      if(sessions.length!==1||scenes.length!==1)throw new Error('Exactly one active scene required to register a character');
      if(character?.id!==actorId||character.guild_id!==c||typeof character.owner_user_id!=='string'||!character.owner_user_id||!['active','reserve','guest'].includes(character.status)||repository.getCharacter(actorId)?.owner_user_id!==character.owner_user_id)throw new Error('Native character with a registered owner required');
      const existing=sceneStore.readers.readActor(c,actorId);
      if(rebind){if(existing?.kind!=='pc'||existing.status!=='active'||existing.sceneId!==scenes[0].id||existing.ownerUserId===character.owner_user_id&&!done)throw new Error('Active registered character with a changed repository owner required');}
      else if(existing&&existing.status==='active'&&!(existing.sceneId===scenes[0].id&&existing.ownerUserId===character.owner_user_id&&existing.controlRole==='owner'))throw new Error('Existing character registration requires native review');
      return {scene:scenes[0],existing};
    };
    let done=false;const {scene,existing}=check(),owner=character.owner_user_id,data={id:actorId,campaignId:c,sceneId:scene.id,kind:'pc',status:'active',ownerUserId:owner,controllerUserId:owner,controlRole:'owner'};if(rebind&&existing.name)data.name=existing.name;done=true;
    return sceneStore.commitSnapshot({campaignId:c,principal:proof.principal,sourceRef:`pc-${rebind?'rebind':'register'}:${proof.sourceRef}`,records:[{kind:'actor',data,expectedRevision:rebind?Number(existing.revision):null}]},{check});
  }
  return Object.freeze({register});
}
