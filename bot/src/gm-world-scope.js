/** Shared read-only GM-owned fiction scope. Native occupancy, current control and audience confer no PC effect authority. */
import {createHash} from 'node:crypto';
import {currentScene,scenePresence,sceneAccess} from './scene-continuity.js';
import {narrativeSessionPrincipal} from './frameworks/narrative/public.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}
import {activeCityProxy,assertNpcAvailability} from './city-constraints.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fail(){throw Object.assign(new Error('Current native GM-owned fiction scope required.'),{code:'GM_WORLD_NARRATIVE',expected:true});}
export function gmOwnedScope(db,guild,type,key,scope,{declineOnly=false}={}){
  if(!['npc','location'].includes(type)||typeof key!=='string'||!key)fail();
  const scene=currentScene(db,guild),roster=db.roster(scene.session_id).filter(r=>['present','late','guest'].includes(r.presence));
  let characters=roster.map(r=>r.character_id).filter(Boolean),principal=null;
  if(scope.mode==='private'){
    const p=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
    if(p.kind!=='owner'||!roster.some(r=>r.character_id===scope.actorCharacterId&&r.discord_user_id===scope.actorUserId))fail();
    characters=[scope.actorCharacterId];principal=p.revision;
  }
  const entity=db.getSimulationEntity(guild,type,key),authored=db.getCityRecord(guild,'autonomous_entity',`${type}:${key}`);
  const source=authored&&db.getWorldEvent(guild,authored.source_event),visibility=authored?.visibility||entity?.state.visibility||'party';
  if(!entity||source&&source.status!=='active'||authored&&!source||entity.state.hidden||entity.state.removed
    ||['dead','removed','dormant'].includes(entity.state.status)
    ||!['public','party'].includes(visibility)&&!(scope.mode==='private'&&visibility==='character'&&authored?.subject_key===scope.actorCharacterId))fail();
  const location=type==='location'?key:entity.state.location_key;
  const observers=characters.filter(id=>db.getCharacter(id)?.data.location===location);
  if(!observers.length)fail();
  let profile=null;
  if(type==='npc'){
    profile=db.getNpcProfile(guild,key);
    if(!profile||db.getCharacter(key)||activeCityProxy(db,guild,key)||profile.activity_tier==='dormant'
      ||profile.decision_profile?.conversation_policy==='refuse'&&!declineOnly)fail();
    const clock=db.getSimulationClock(guild),commitment=db.overlappingCommitment(guild,`npc:${key}`,clock.minute,clock.minute+1);
    if(commitment?.location_key&&commitment.location_key!==location)fail();
    assertNpcAvailability(db,guild,key,{type:'contact',location_key:location});
    const presence=scenePresence(db,guild,'npc',key);
    if(presence&&!observers.some(id=>sceneAccess(db,guild,{observer_type:'character',observer_key:id,
      target_type:'npc',target_key:key,sense:'sound'})))fail();
  }
  return {scene:scene.key,session:scene.session_id,location,entity:hash(entity),profile:hash(profile),
    authored:authored?hash(authored):null,principal,visibility:scope.mode==='private'?'character':'party'};
}
export function gmWorldScope(db,guild,npc,scope){return gmOwnedScope(db,guild,'npc',npc,scope);}
