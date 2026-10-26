import {npcSceneAccess,npcEvidenceActive,assertNpcObservation} from '../../frameworks/npc/public.js';
import {sceneAccess,sessionNpcObservations} from '../../frameworks/session/public.js';
/** Scene access feeds original NPC policy; old scene-reader callers receive that same policy through compatibility port. */
export function connectNpcSessionObservation(){
 npcSceneAccess.bind(sceneAccess);
 return sessionNpcObservations.bind({npcEvidenceActive,assertNpcObservation});
}
