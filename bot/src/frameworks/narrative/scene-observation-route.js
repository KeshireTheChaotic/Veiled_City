/** Conservative complete-request admission for a READ-ONLY optimization, never action adjudication.
 * Everything else retains the combined semantic GM path. No action/effect/consent is authorized here.
 */
export function sceneObservationOperation(text,placeName='',placeType=''){
  if(typeof text!=='string'||text.length>240||/[\r\n;"'`\u201c\u201d]/u.test(text))return null;
  const value=text.trim().replace(/[.!?]$/,'').toLocaleLowerCase();
  if(['set the scene','describe the scene','describe my surroundings','what does it look like inside',
    'what does it look like','what do my surroundings look like','what does this place look like',
    'what does the room look like'].includes(value))return 'describe_scene';
  // Native display name is used only to admit a description query, never to resolve travel or intent.
  if([placeName,placeType&&`the ${placeType}`].filter(Boolean).flatMap(name=>[`what does ${name} look like`,`what does ${name} look like inside`])
    .map(x=>x.toLocaleLowerCase()).includes(value))return 'describe_scene';
  if(['what else is going on currently','what else is going on','what is currently going on in the scene',
    'what is my current situation'].includes(value))return 'current_situation';
  return null;
}
