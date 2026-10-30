import {publicationSessionScene} from './contracts/session-scene.js';
const {currentScene}=publicationSessionScene;
import {protectedAgreements} from './output-records.js';
/** Actual scene and recipient/control scope, not membership of the player who happened to post. */
export function protectedPvpScope(db,guild,scope={mode:"party"}){
  const session=db.getActiveSession(guild);if(!session)return [];
  const scene=currentScene(db,guild),roster=db.roster(session.id);
  let character=scope.actorCharacterId;
  if(scope.recipientUserId)character=db.activeAssignment(session.id,scope.recipientUserId)?.character_id;
  return protectedAgreements(db,guild).filter(p=>p.data.session_id===session.id&&p.data.scene===scene.key
    &&(scope.mode!=="private"?p.data.participants.some(w=>roster.some(r=>r.character_id===w.character))
      :!character||p.data.participants.some(w=>w.character===character)
        ||db.getCharacter(character)?.data.location===p.data.location_key));
}
