/** Current isolated writer contract. Audience, ownership and effects are NOT model fields. */
import {NARRATIVE_ACT_KINDS,compileNarrativeActs} from './narrative-acts-v9.js';
import {narrativeResponseSchema} from './gm-fiction-schema.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail} from './scene-fiction-context.js';
const str=maxLength=>({type:'string',maxLength});
const closed=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
export const narrativeResponseV9Schema=closed({version:{type:'integer',enum:[9]},acts:{type:'array',maxItems:8,items:closed({
  id:str(64),task_id:str(160),kind:{type:'string',enum:NARRATIVE_ACT_KINDS.filter(k=>k!=='gm_internal_note')},
  speaker_key:str(160),location_key:str(160),text:str(1800),source_refs:{type:'array',maxItems:8,items:str(160)}
})},fiction_delta:narrativeResponseSchema.properties.fiction_delta});
export const NARRATIVE_V9_INSTRUCTIONS='Return version:9, acts and fiction_delta. Each act answers a native task_id from audience_v9.task_ids. '
  +'The server alone chose the audience and viewpoint BEFORE this request. Do not set visibility, owners, grants or outcomes. '
  +'Use independent scene_description, entitled player_perception, local npc_speech/npc_offer/npc_allegation, or artifact_text. '
  +'speaker_key is an actual native local NPC key (empty for scenery/perception/artifact). artifact_text is ONLY the nonbinding printed words of a local sign. '
  +'NPC offers/questions do not select a player response; allegations are attributed testimony, not truth or binding history. '
  +'No dice, Difficulty, costs, Hope/Fear, success, injury, custody, consent, player reaction or private disclosure is created by prose. '
  +'Never impersonate a player/proxy. References for NPC factual recall must be native actor-known AND audience-entitled. '
  +'Task completion is native and based on actual accepted output; no answered/safe claim. Generated prose retains residual semantic risk.';
const fields='id,kind,location_key,source_refs,speaker_key,task_id,text';
/** Native mapping to existing per-unit validators/receipt machinery, not a role-label waiver. */
export function actToNativeUnit(act,binding){
  if(!act||Object.keys(act).sort().join()!==fields||!['speaker_key','location_key'].every(k=>typeof act[k]==='string'&&act[k].length<=160)
    ||!NARRATIVE_ACT_KINDS.includes(act.kind)||act.kind==='gm_internal_note')throw fail('v9_act_shape');
  const speech=['npc_speech','npc_offer','npc_allegation'].includes(act.kind);
  if(speech&&!act.speaker_key||!speech&&act.kind!=='scene_description'&&act.speaker_key)throw fail('v9_actor_role');
  return {id:act.id,kind:speech?'npc_speech':'scene',text:act.kind==='artifact_text'?`A sign reads: ${act.text}`:act.text,
    subject_key:act.speaker_key,location_key:act.location_key,visibility:binding.scope.mode==='private'?'character':'party',
    epistemic:'observation',source_refs:act.source_refs,receipt_kind:'',receipt_ref:''};
}
export function compileWriterV9(answer,audience,verifyUnit){
  if(!answer||Object.keys(answer).sort().join()!=='acts,fiction_delta,version'||answer.version!==9
    ||!Array.isArray(answer.acts)||answer.acts.length>8||!Array.isArray(answer.fiction_delta)||answer.fiction_delta.length>4)throw fail('v9_response_shape');
  const mapped=new Map();
  const compiled=compileNarrativeActs({...audience,proposals:answer.acts,verifyAct:(act,b)=>{
    const unit=actToNativeUnit(act,b);verifyUnit(unit,answer.fiction_delta.filter(e=>e&&typeof e==='object'&&!Array.isArray(e)));
    mapped.set(act.id,unit);
    return {approved:true,proof_ref:`narrative-act:${hash([b.proof_ref,act,unit])}`,task_id:act.task_id,audience:b.audience,source_event:b.source_event};
  }});
  return {answer:{fiction_delta:answer.fiction_delta,narrative_units:compiled.filter(c=>c.status==='verified_candidate').map(c=>mapped.get(c.id))},
    acts:answer.acts,compiled};
}
