/** In-process Director provenance. JSON/model fields cannot mint this Symbol binding. */
import {createHash} from 'node:crypto';
import {currentScene} from './scene-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
const sourceBinding=Symbol('native-director-narrative-source');
export const nativeDirectorNarrativeSource=result=>result?.[sourceBinding]?.ref||null;
export const nativeDirectorNarrativeContent=result=>result?.[sourceBinding]?.content||null;
export function bindDirectorNarrativeSource(db,guild,result,scope,layer,trigger,content){
  const scene=currentScene(db,guild),details={version:1,scope,layer,scene:scene.key,session:scene.session_id,
    trigger_hash:createHash('sha256').update(JSON.stringify(trigger)).digest('hex'),clock:db.getSimulationClock(guild)};
  const key=`director-fiction:${createHash('sha256').update(JSON.stringify(details)).digest('hex')}`;
  const event=indexWorldEvent(db,guild,{key,kind:'native_director_narrative_scope',title:'Native Director fiction scope, not PC intent or consequence',
    source_id:'native:director',visibility:scope.mode==='private'?'character':'party',subject_key:scope.actorCharacterId||null,
    scene:scene.key,session_id:scene.session_id,details},'native:director');
  result[sourceBinding]={ref:event.event_key,content};return event.event_key;
}
