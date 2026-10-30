/** Read compatibility for complete native nonmaterial renderings, not a classifier for arbitrary prose. */
import {createHash} from 'node:crypto';
import {narrativeSessionScene} from './contracts/session-scene.js';
const {currentScene}=narrativeSessionScene;
import {narrativeSessionPrincipal} from './contracts/session-principal.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}
import {narrativeWorldPrimitives} from './contracts/world-primitives.js';
const {indexWorldEvent}=narrativeWorldPrimitives;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const questions=["What kind of work would you like to look for?",
  "What sort of work would you look for, and where would you start?",
  "What would you like to do next?"];
function context(db,guild,scope){
  const scene=currentScene(db,guild),session=db.getActiveSession(guild);
  if(!session||scene.session_id!==session.id)return null;
  let principal=null;
  if(scope.actorUserId&&scope.actorCharacterId){
    try{principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);}catch{return null;}
  }else if(scope.mode==='private')return null;
  const actor=scope.actorCharacterId&&db.getCharacter(scope.actorCharacterId);
  const roster=db.roster(session.id).filter(r=>['present','late','guest'].includes(r.presence));
  const characters=roster.map(r=>db.getCharacter(r.character_id)).filter(pc=>pc&&
    (scope.mode!=='private'?(!actor||pc.data.location===actor.data.location):pc.id===scope.actorCharacterId));
  if(!characters.length)return null;
  return {scene:scene.key,session:session.id,principal:principal?.revision||null,
    characters:characters.map(pc=>({id:pc.id,name:pc.name,owner:pc.owner_user_id,location:pc.data.location||null}))};
}
/** Decoder accepts only complete byte-equivalent productions of the bounded native formatter. */
export function decodeNonmaterialGrammar(db,guild,value,scope={mode:'party'}){
  const state=context(db,guild,scope);if(!state)return null;
  const productions=[{text:'The rain drums against the roof.',kind:'incidental_atmosphere'},
    ...questions.map(text=>({text,kind:'open_GM_question'})),
    ...state.characters.flatMap(pc=>[
      {text:`${pc.name} bleeds money.`,kind:'figurative_not_resource',character:pc.id},
      {text:`${pc.name} is dead to me, as the saying goes.`,kind:'figurative_not_status',character:pc.id}])];
  let remainder=String(value||''),atoms=[];
  if(!remainder.trim())return null;
  while(remainder.length){
    const space=/^\s*/.exec(remainder)[0];remainder=remainder.slice(space.length);
    if(!remainder){atoms.push({space});break;}
    const p=productions.find(p=>remainder.startsWith(p.text)&&(!remainder.slice(p.text.length)||/^\s/.test(remainder.slice(p.text.length))));
    if(!p||atoms.length>=12)return null;
    atoms.push({space,...p});remainder=remainder.slice(p.text.length);
  }
  const text=atoms.map(a=>a.space+(a.text||'')).join('');
  if(text!==String(value))return null;
  return {version:1,renderer:1,state,atoms,text,epistemic:'nonmaterial_not_PC_outcome'};
}
export function establishGrammarScope(db,guild,grammar,scope){
  const details={issuer:'native:nonmaterial-grammar',scope,state:grammar.state,epistemic:grammar.epistemic};
  return indexWorldEvent(db,guild,{key:`nonmaterial-scope:${hash(details)}`,kind:'native_nonmaterial_scope',
    title:'Native nonmaterial rendering scope',source_id:details.issuer,session_id:grammar.state.session,scene:grammar.state.scene,
    visibility:'gm',subject_key:null,details},details.issuer);
}
export function renderNonmaterialGrammar(db,guild,part){
  const grammar=decodeNonmaterialGrammar(db,guild,part.input_text,part.scope);
  if(!grammar||hash(grammar)!==part.grammar_hash)throw Object.assign(new Error('Native nonmaterial grammar scope is stale.'),{code:'NARRATIVE_PVP'});
  return grammar.text;
}
export const grammarHash=hash;
