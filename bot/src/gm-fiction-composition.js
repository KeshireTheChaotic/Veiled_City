/** Bounded native composition: actor-owned NPC acts and exact audience-visible source quotations, never PC outcomes. */
import {createHash} from 'node:crypto';
import {quoteNpcWords} from './fresh-npc-authoring.js';
import {compositionTones as tones} from './gm-fiction-schema.js';
export {npcCompositionSchema} from './gm-fiction-schema.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const gestures={pause:'The NPC pauses before speaking.',smile:'The NPC gives a small smile.',
  fidget:'The NPC fidgets with their hands.',fold_arms:'The NPC folds their arms.',
  listen:'The NPC listens without interrupting.',look_away:'The NPC glances away for a moment.'};
const questions={next_step:'What would you like to do next?',goal:'What are you hoping to accomplish?',
  needs:'What do you need from me?',work:'What kind of work are you looking for?',
  reason:'What brings you here?',details:'Could you tell me a little more?'};
const threats={arrest_attempt:'I intend to attempt an arrest. Your response is yours to decide.',
  seizure_attempt:'I intend to attempt a seizure. That is a warning, not a completed transfer.',
  call_for_help:'I intend to call for help. Nobody else has responded yet.'};
function fail(){throw Object.assign(new Error('NPC composition requires current actor scope and exact audience-visible native sources.'),
  {code:'GM_WORLD_NARRATIVE',expected:true});}
function fields(value,names){return value&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).sort().join(',')===names.slice().sort().join(',');}
export function validateCompositionShape(input){
  if(!fields(input,['version','kind','entity_key','tone','beats'])||input.version!==2||input.kind!=='npc_composition'
    ||typeof input.entity_key!=='string'||!/^[a-z0-9][a-z0-9-]{0,159}$/.test(input.entity_key)
    ||!tones.includes(input.tone)||!Array.isArray(input.beats)||input.beats.length<1||input.beats.length>6)fail();
  for(const b of input.beats){
    if(b?.op==='quote'){
      if(!fields(b,['op','source_ref','knowledge_key','source_span'])||[['source_ref',200],['knowledge_key',160],['source_span',1200]]
        .some(([k,n])=>typeof b[k]!=='string'||!b[k].trim()||b[k].length>n))fail();
    }else if(b?.op==='gesture'){if(!fields(b,['op','gesture'])||!Object.hasOwn(gestures,b.gesture))fail();}
    else if(b?.op==='question'){if(!fields(b,['op','topic'])||!Object.hasOwn(questions,b.topic))fail();}
    else if(b?.op==='threat'){if(!fields(b,['op','action'])||!Object.hasOwn(threats,b.action))fail();}
    else fail();
  }
}
/** The source is independent of the proposal. A source ID or a knowledge flag alone is insufficient. */
export function compositionEvidence(db,guild,input,scope,state){
  validateCompositionShape(input);const refs=[];
  for(const b of input.beats.filter(b=>b.op==='quote')){
    const source=db.getWorldEvent(guild,b.source_ref),knowledge=db.getNpcKnowledge(guild,input.entity_key,b.knowledge_key);
    if(!source||source.status!=='active'||source.kind!=='observation'||source.source_id!=='human_gm'
      ||source.truth_status!=='observed'||source.session_id!==state.session||source.scene!==state.scene
      ||source.location_key!==state.location||source.details.npc_key!==input.entity_key||source.details.quote!==b.source_span
      ||!knowledge||knowledge.source_ref!==source.event_key||knowledge.content!==b.source_span
      ||knowledge.belief_state!=='known'||knowledge.is_secret)fail();
    if(!['party','public'].includes(source.visibility)&&!(scope.mode==='private'&&source.visibility==='character'
      &&source.subject_key===scope.actorCharacterId))fail();
    refs.push({source:source.event_key,source_hash:hash(source),knowledge:b.knowledge_key,knowledge_hash:hash(knowledge)});
  }
  return refs;
}
/** Every free word is an exact scoped source excerpt. Native grammar attributes it only to this NPC. */
export function projectComposition(input){
  validateCompositionShape(input);
  return input.beats.map(b=>{
    if(b.op==='gesture')return gestures[b.gesture];
    if(b.op==='question')return `The NPC asks: “${questions[b.topic]}”`;
    if(b.op==='threat')return `The NPC warns: “${threats[b.action]}”`;
    return `The NPC says (an attributed statement, not proof of another character's actions):\n${quoteNpcWords(b.source_span)}`;
  }).join('\n');
}
