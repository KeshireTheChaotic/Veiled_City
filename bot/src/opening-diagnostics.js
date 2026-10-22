/** Closed operational categories. Provider strings, prompt/body and campaign prose never enter diagnostics. */
const codes=new Set(['OPENING_INPUT_CHANGED','OPENING_FENCE_LOST','OPENING_REBASE_PENDING','OPENING_COMMITTED_SOURCE_CHANGED',
  'OPENING_PAUSED_OR_REVOKED','OPENING_DIRECTOR_PAUSED','OPENING_MANUAL_REFRESH_REQUIRED','OPENING_ENTRY_STALE','OPENING_INITIAL_SLOT_PENDING',
  'OPENING_INITIAL_WORK_ACTIVE','OPENING_PRIOR_DELIVERY_REVIEW','OPENING_ENTRY_HISTORY','OPENING_COHORT_WRITER',
  'OPENING_COHORT_PLANNER','OPENING_COHORT_NARRATIVE_REQUIRED','ASSEMBLY_STALE_REVIEW','OPENING_WRITER_PROVIDER','OPENING_WRITER_PARSE','OPENING_PROVIDER_DEADLINE']);
export function openingErrorCode(error){
  if(codes.has(error?.code))return error.code;
  if(error?.code==='SESSION_OPENING')return 'OPENING_SOURCE_INVALID';
  if(['ASSEMBLY_SOURCE','SESSION_OPENING_ATTENDANCE'].includes(error?.code))return 'OPENING_SOURCE_CHANGED';
  if(['SCENE_FICTION','NARRATIVE_PVP','OUTPUT_AUTHORITY','NARRATIVE_INTEGRITY'].includes(error?.code))return 'OPENING_NATIVE_OUTPUT_HELD';
  if(error?.code==='AI_GENERATION_DEADLINE'||error?.name==='TimeoutError')return 'OPENING_PROVIDER_DEADLINE';
  return 'OPENING_AUTHORING_ERROR';
}
export function openingDiagnostic(row,{code,stage,durationMs=0,plannerInvocations=0}={}){
  return {version:1,category:code,stage,attempt:row.data.attempts,epoch:row.data.epoch?.number||0,
    input_hash:row.data.epoch?.input_fingerprint||row.data.context?.input_fingerprint||null,
    duration_ms:Math.max(0,Math.round(durationMs)),planner_invocations:plannerInvocations,
    provider_calls:'UNMEASURED',tokens:'UNMEASURED',cost:'UNMEASURED',
    retry:'Authenticated exact-state review; never retry uncertain transport.'};
}
