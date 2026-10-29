/** Native non-effect clause construction. Closed primitives, never model prose or semantic safety labels. */
import {sceneFictionFailure as fail} from './scene-fiction-context.js';
import {npcAddresses} from './narrative-speakers.js';
import {narrativeWorldConstraints} from './frameworks/narrative/public.js';
const {activeCityProxy,assertNpcAvailability}=narrativeWorldConstraints;
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {factVisibleTo} from './disclosure-authority.js';
import {nativeClauseSchema} from './frameworks/narrative/native-clause-schema-v9.js';
export {nativeClauseSchema};
function shape(schema,value){
  if(schema.anyOf)return schema.anyOf.some(s=>shape(s,value));
  if(schema.enum)return schema.enum.includes(value);
  if(schema.type==='string')return typeof value==='string'&&value.length<=schema.maxLength;
  return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===schema.required.length
    &&schema.required.every(k=>Object.hasOwn(value,k)&&shape(schema.properties[k],value[k]));
}
/** Native source/audience context owns the world/perception/speaker; no generated word is copied. */
export function constructNativeClause(db,guild,act,b){
  const c=act.construction;
  if(!shape(nativeClauseSchema,c)||act.text!==''||act.source_refs.length||!b.location||act.location_key!==b.location)throw fail('native_clause_shape');
  if(c.kind==='weather'){
    if(act.kind!=='scene_description'||act.speaker_key||c.motion==='bead'&&c.phenomenon!=='rain')throw fail('native_clause_role');
    const subject={rain:'Rain',mist:'Mist',snow:'Snow'}[c.phenomenon],verb=c.motion==='bead'?'beads':'settles';
    return `${subject} ${verb} on the ${c.surface}.`;
  }
  if(c.kind==='physical_sense'){
    if(act.kind!=='player_perception'||act.speaker_key||b.viewpoint!=='character'||!['player','player_private'].includes(b.audience))throw fail('native_clause_viewpoint');
    const pair={touch:['warm_air','dryers'],hearing:['low_hum','room'],smell:['detergent','laundry']}[c.sense];
    if(c.stimulus!==pair[0]||c.origin!==pair[1])throw fail('native_clause_stimulus');
    const verb={touch:'feel',hearing:'hear',smell:'smell'}[c.sense],stimulus={warm_air:'warm air',low_hum:'a low hum',detergent:'detergent'}[c.stimulus];
    return `You ${verb} ${stimulus} from the ${c.origin}.`;
  }
  if(act.kind!=='npc_speech'||!act.speaker_key||db.getCharacter(act.speaker_key)||activeCityProxy(db,guild,act.speaker_key))throw fail('native_clause_speaker');
  const npc=db.getSimulationEntity(guild,'npc',act.speaker_key),profile=db.getNpcProfile(guild,act.speaker_key),
    identity=db.getCityRecord(guild,'autonomous_entity',`npc:${act.speaker_key}`);
  if(!npc||!profile||npc.state.location_key!==b.location||npc.state.hidden||npc.state.removed||profile.activity_tier==='dormant'
    ||!factVisibleTo({visibility:npc.state.visibility||'party',subject_character_id:npc.state.subject_character_id},b.scope)
    ||identity&&!narrativeSourceVisible(db,guild,identity.source_event,b.scope))throw fail('native_clause_locality');
  try{assertNpcAvailability(db,guild,act.speaker_key,{type:'contact',location_key:b.location});}
  catch(error){if(error.constructor===Error&&!error.code)throw fail('native_clause_speaker_unavailable');throw error;}
  if(!npcAddresses(db,guild,act.speaker_key,b.scope,b.location).some(a=>a.character===c.character_ref&&a.name===c.name)
    ||!c.name||/[\r\n\x00-\x1f`*_<>\[\]\\]/u.test(c.name))throw fail('native_clause_name');
  return c.question==='seen'?`Have you seen ${c.name}?`:`Are you looking for ${c.name}?`;
}
