/** Synthetic native owner-proposal setup; no lexical extraction, forged approval or consequence receipt. */
import {captureWorldInput} from '../src/autonomous-world.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {captureArcCandidate} from '../src/personal-continuity.js';
export function typedProposalInputs(db,guild,user,character,messageId,text,operation,{privateScene=true}={}){
  const scope={mode:privateScene?'private':'party',actorUserId:user,actorCharacterId:character};
  captureWorldInput(db,guild,user,character,messageId,text,{privateScene});
  return persistPlayerIntents(db,guild,[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',
    operation,utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Explicit synthetic owner proposal.'}],scope,{messageId});
}
export function typedArcCandidate(db,guild,user,character,messageId,text){
  const [accepted]=typedProposalInputs(db,guild,user,character,messageId,text,'personal_commitment_candidate');
  return captureArcCandidate(db,guild,user,character,messageId,text,{acceptedIntent:accepted.record_key});
}
