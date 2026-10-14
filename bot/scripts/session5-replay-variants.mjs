/** Offline request-design experiment only. Runtime reasoning remains unchanged pending model-quality qualification. */
export function routineReplayVariant(request,{variant='A',operation='unknown'}={}){
  const result=structuredClone(request);
  if(variant==='B'&&request.model==='gpt-6-luna'&&['scene_description','observation'].includes(operation))
    result.reasoning={effort:'none'};
  return result;
}
