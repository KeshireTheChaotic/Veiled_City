/** Audience-bound Director metadata for existing opening requests. No prose, world effects, new knowledge or provider calls. */
import {currentScene} from './scene-continuity.js';
import {worldDirectorBridgeBeats} from './world-narrative-bridge.js';
export function openingWorldOpportunities(db,guild,scope){
  const out={version:1,beats:[],examined_limit:100,
    authority:'Existing verified scene observations and pacing requests only; never establish new presence, facts, consent, NPC knowledge or outcomes.'};
  if(!db.getActiveSession(guild)||!['party','private'].includes(scope?.mode))return out;
  if(scope.mode==='private'&&db.getCharacter(scope.actorCharacterId)?.owner_user_id!==scope.actorUserId)return out;
  const scene=currentScene(db,guild);
  for(const source of db.listWorldEvents(guild,{includeGM:true,limit:100})){
    const actual=source.details?.scope;
    if(source.status!=='active'||source.kind!=='native_director_narrative_scope'||source.session_id!==scene.session_id||source.scene!==scene.key
      ||actual?.mode!==scope.mode||scope.mode==='private'&&(actual.actorUserId!==scope.actorUserId||actual.actorCharacterId!==scope.actorCharacterId))continue;
    const bridge=worldDirectorBridgeBeats(db,guild,source,actual);if(!bridge)continue;
    for(const beat of bridge.beats){
      if(beat.audience.visibility!==(scope.mode==='private'?'character':'party')||out.beats.some(b=>b.signal_ref===beat.signal_ref))continue;
      out.beats.push({id:beat.id,kind:beat.kind,source_ref:beat.source_ref,signal_ref:beat.signal_ref,reason:beat.reason,
        ...(beat.epistemic?{epistemic:beat.epistemic,fictional_scope:beat.fictional_scope}:{}),
        execution_authority:false,publication_authority:false});
      if(out.beats.length===3)return out;
    }
  }
  return out;
}
