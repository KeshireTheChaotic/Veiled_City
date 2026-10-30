/** Current isolated writer contract. Audience, ownership and effects are NOT model fields. */
import {NARRATIVE_ACT_KINDS,compileNarrativeActs} from './narrative-acts-v9.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail} from './frameworks/narrative/public.js';
import {nativeClauseSchema,constructNativeClause} from './narrative-clauses-v9.js';
import {NARRATIVE_V9_INSTRUCTIONS,NATIVE_CLAUSE_INSTRUCTIONS,narrativeResponseV9Schema} from './frameworks/narrative/writer-contract-v9.js';
export {NARRATIVE_V9_INSTRUCTIONS,NATIVE_CLAUSE_INSTRUCTIONS,narrativeResponseV9Schema};
const fields='id,kind,location_key,source_refs,speaker_key,task_id,text';
/** Native mapping to existing per-unit validators/receipt machinery, not a role-label waiver. */
export function actToNativeUnit(act,binding,{db,guild}={}){
  if(!act||![fields,`construction,${fields}`].includes(Object.keys(act).sort().join())||!['speaker_key','location_key'].every(k=>typeof act[k]==='string'&&act[k].length<=160)
    ||!NARRATIVE_ACT_KINDS.includes(act.kind)||act.kind==='gm_internal_note')throw fail('v9_act_shape');
  const speech=['npc_speech','npc_offer','npc_allegation'].includes(act.kind);
  if(speech&&!act.speaker_key||!speech&&act.kind!=='scene_description'&&act.speaker_key)throw fail('v9_actor_role');
  // Model paragraph breaks become spaces; the unit validator still rejects every other control character.
  const text=act.construction?constructNativeClause(db,guild,act,binding)
    :typeof act.text==='string'?act.text.replace(/\s*[\r\n\t]\s*/g,' '):act.text;
  return {id:act.id,kind:act.kind==='lead'?'lead':speech?'npc_speech':'scene',text:act.kind==='artifact_text'?`A sign reads: ${text}`:text,
    subject_key:act.speaker_key,location_key:act.location_key,visibility:binding.scope.mode==='private'?'character':'party',
    epistemic:'observation',source_refs:act.source_refs,receipt_kind:'',receipt_ref:''};
}
export function compileWriterV9(answer,audience,verifyUnit,native={}){
  if(!answer||Object.keys(answer).sort().join()!=='acts,fiction_delta,version'||answer.version!==9
    ||!Array.isArray(answer.acts)||answer.acts.length>8||!Array.isArray(answer.fiction_delta)||answer.fiction_delta.length>4)throw fail('v9_response_shape');
  const mapped=new Map();
  // Compiler requires meaningful text, but native construction starts with an EMPTY model text.
  // Mint its words here and retain the original closed proposal for all later revalidation.
  const proposals=answer.acts.map(act=>act?.construction?{...act,text:'[native clause pending]'}:act);
  const compiled=compileNarrativeActs({...audience,proposals,verifyAct:(proposal,b)=>{
    const act=answer.acts.find(a=>a?.id===proposal.id),unit=actToNativeUnit(act,b,native);
    verifyUnit(unit,answer.fiction_delta.filter(e=>e&&typeof e==='object'&&!Array.isArray(e)),act);
    mapped.set(act.id,unit);
    return {approved:true,proof_ref:`narrative-act:${hash([b.proof_ref,act,unit])}`,task_id:act.task_id,audience:b.audience,source_event:b.source_event};
  }});
  return {answer:{fiction_delta:answer.fiction_delta,narrative_units:compiled.filter(c=>c.status==='verified_candidate').map(c=>mapped.get(c.id))},
    acts:answer.acts,compiled};
}
