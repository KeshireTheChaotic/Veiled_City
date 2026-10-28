/** Audience-bound Director metadata for existing opening requests. No prose, world effects, new knowledge or provider calls. */
import {currentScene} from './frameworks/session/public.js';
import {worldNarrativeBridgeSource} from './frameworks/world/public.js';
const {worldDirectorBridgeBeats,openingOpportunityRequests}=worldNarrativeBridgeSource;
export function openingWorldOpportunities(db,guild,scope){
  const out={version:1,beats:[],requests:[],examined_limit:12,source_limit_reached:false,
    authority:'Existing verified scene observations and pacing requests only; never establish new presence, facts, consent, NPC knowledge or outcomes.'};
  if(!db.getActiveSession(guild)||!['party','private'].includes(scope?.mode))return out;
  if(scope.mode==='private'){
    const pc=db.getCharacter(scope.actorCharacterId);if(pc?.guild_id!==guild||pc.owner_user_id!==scope.actorUserId)return out;
  }
  const scene=currentScene(db,guild),sources=db.openingDirectorSources(guild,scene.session_id,scene.key,scope);
  out.requests=openingOpportunityRequests(db,guild,scope);
  out.source_limit_reached=sources.length>out.examined_limit;
  for(const source of sources.slice(0,out.examined_limit)){
    const actual=source.details?.scope;
    if(source.status!=='active'||source.kind!=='native_director_narrative_scope'||source.session_id!==scene.session_id||source.scene!==scene.key
      ||actual?.mode!==scope.mode||scope.mode==='private'&&(actual.actorUserId!==scope.actorUserId||actual.actorCharacterId!==scope.actorCharacterId))continue;
    const bridge=worldDirectorBridgeBeats(db,guild,source,actual);if(!bridge)continue;
    for(const beat of bridge.beats){
      if(beat.audience.visibility!==(scope.mode==='private'?'character':'party')||out.beats.some(b=>b.signal_ref===beat.signal_ref))continue;
      out.beats.push({id:beat.id,kind:beat.kind,source_ref:beat.source_ref,signal_ref:beat.signal_ref,reason:beat.reason,
        audience:beat.audience,
        ...(typeof beat.visible_text==='string'?{visible_text:beat.visible_text}:{}),
        ...(beat.epistemic?{epistemic:beat.epistemic,fictional_scope:beat.fictional_scope}:{}),
        execution_authority:false,publication_authority:false});
      if(out.beats.length===3)return out;
    }
  }
  return out;
}
import {sessionOpeningWorld} from './frameworks/session/public.js';
// Provide this module's original opening opportunities to the fixed Session slot; no other authority is granted.
sessionOpeningWorld.bind({openingWorldOpportunities});
