/** Native shape and canonical projection of voluntary action-consent terms. */
const resources=value=>Array.isArray(value)&&value.length<=32&&new Set(value).size===value.length
  &&value.every(key=>typeof key==="string"&&/^[a-z][a-z0-9_-]*:[^\s]{1,180}$/i.test(key));

export function createActionConsentTerms({fail}){
  if(typeof fail!=="function")throw new TypeError("Native consent terms require the established failure constructor.");
  function termsFor(window,accepted,input){
    if(!resources(input?.reads)||!resources(input?.writes)||!Array.isArray(input?.required_participants)
      ||!input.required_participants.length||input.required_participants.length>12
      ||new Set(input.required_participants).size!==input.required_participants.length
      ||typeof input.operation!=="string"||!input.operation||typeof input.location_key!=="string"||!input.location_key)
      fail("Consent needs bounded exact resources and participants.");
    return {window:window.record_key,window_revision:window.data.revision,accepted_intent:accepted.record_key,
      actor:accepted.data.actor,source_event:accepted.source_event,source_hash:accepted.data.source_hash,
      operation:input.operation,reads:[...input.reads].sort(),writes:[...input.writes].sort(),location_key:input.location_key,
      required_participants:[...input.required_participants].sort(),scene:accepted.data.scene,session_id:accepted.data.session_id,
      source_audience:accepted.visibility,source_subject:accepted.subject_key||null};
  }
  return Object.freeze({termsFor});
}
