/** Protected source administration only, never approval of ordinary narration. */
export function canonReviewInput(e){
 try{
  const o=e.options,character=o.getString('character',true),proposal=o.getString('proposal',true),resolution=o.getString('resolution',true),revision=o.getString('revision',true),value=o.getString('value')??'',note=o.getString('note')??'',visibility=o.getString('visibility')??'gm',replace=o.getBoolean?.('replace')??false;
  if(![character,proposal].every(v=>typeof v==='string'&&v.length>0&&v.length<=256)||!['accept','reject','custom'].includes(resolution)||!['public','party','gm'].includes(visibility)||typeof revision!=='string'||!/^(0|[1-9][0-9]{0,8})$/.test(revision)||typeof value!=='string'||value.length>4000||resolution==='custom'&&!value.trim()||typeof note!=='string'||note.length>4000||typeof replace!=='boolean')return null;
  return {op:'canon-review',character,proposal,resolution,expectedRevision:revision==='0'?null:Number(revision),value,note,visibility,replace};
 }catch{return null;}
}
