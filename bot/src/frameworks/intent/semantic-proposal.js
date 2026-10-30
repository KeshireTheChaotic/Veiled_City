import {createHash} from 'node:crypto';
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,32);
function error(message,diagnostic={}){
  return Object.assign(new Error(message),{code:'PLAYER_INTENT',diagnostic});
}

export const proposalFields=['actor_character_id','attempted_action','authored_outcome_claim','dependencies','desired_outcome',
  'destination_scope','end','framing','operation','proposal_id','sequence_index','source_event','source_span','start',
  'target','temporal_relation','type','version'];
const targetFields=['grounding','key','kind','phrase'];
const framings=['immediate','conditional','hypothetical','quoted','reported','ooc'];
const temporalRelations=['sequential','parallel','reaction','unspecified'];

function exactFields(value,fields){return value&&Object.keys(value).sort().join(',')===fields.slice().sort().join(',');}
function sourceHash(value){return createHash('sha256').update(String(value)).digest('hex');}
export function proposalIdentity(value){
  return `proposal:${digest([value.source_event,value.start,value.end,value.actor_character_id,value.type,value.operation])}`;
}
export function sameProposal(row,proposal){
  return proposalFields.every(field=>JSON.stringify(row?.data?.[field])===JSON.stringify(proposal[field]));
}

/** Validate a model proposal against the immutable authenticated source. No outcome is accepted here. */
export function validateProposal(value,envelope,scope={}){
  if(!exactFields(value,proposalFields)||value.version!==2)throw error('Closed version-2 semantic proposal required.');
  if(!envelope||value.source_event!==envelope.source_event||envelope.raw_hash!==sourceHash(envelope.raw_text))
    throw error('Proposal requires the immutable current authored source.');
  if(value.actor_character_id!==envelope.character_id||scope.actorCharacterId!==envelope.character_id
    ||scope.actorUserId!==envelope.user_id)throw error('Proposal actor does not match the authenticated principal.');
  if(!Number.isSafeInteger(value.start)||!Number.isSafeInteger(value.end)||value.start<0||value.end<=value.start
    ||value.end>envelope.raw_text.length||envelope.raw_text.slice(value.start,value.end)!==value.source_span)
    throw error('Proposal offsets and span must exactly match the immutable source.',{
      category:'unmatched_source_span',index:value.sequence_index,
      nearby_offsets:{start:Math.max(0,Math.min(Number(value.start)||0,envelope.raw_text.length)),end:envelope.raw_text.length}
    });
  if(typeof value.source_span!=='string'||!value.source_span||value.source_span.length>1200
    ||typeof value.attempted_action!=='string'||!value.attempted_action||value.attempted_action.length>1200)
    throw error('Proposal needs bounded source and attempted action text.');
  if(!Number.isSafeInteger(value.sequence_index)||value.sequence_index<0||value.sequence_index>11
    ||!Array.isArray(value.dependencies)||value.dependencies.length>12||value.dependencies.some(x=>typeof x!=='string'||x.length>100))
    throw error('Proposal ordering and dependencies must be bounded.');
  if(!exactFields(value.target,targetFields)||!['known','candidate','ambiguous','unknown'].includes(value.target.grounding)
    ||!['location','npc','character','object','operation','unknown',''].includes(value.target.kind)
    ||typeof value.target.key!=='string'&&value.target.key!==null||typeof value.target.phrase!=='string')
    throw error('Proposal target must use the closed grounding contract.');
  if(!framings.includes(value.framing)||!temporalRelations.includes(value.temporal_relation)
    ||!['approach','exterior','interior','zone','none'].includes(value.destination_scope))
    throw error('Proposal framing, timing or destination scope is invalid.');
  if(value.desired_outcome!==null&&typeof value.desired_outcome!=='string')throw error('Desired outcome must be text or null.');
  if(value.authored_outcome_claim!==null){
    const claim=value.authored_outcome_claim;
    if(!exactFields(claim,['claimed_by','status','text'])||claim.claimed_by!==envelope.user_id
      ||claim.status!=='unverified'||typeof claim.text!=='string'||!claim.text.trim())
      throw error('Authored outcome claims begin as attributed unverified claims.');
  }
  const expected=proposalIdentity(value);
  if(value.proposal_id&&value.proposal_id!==expected)throw error('Proposal identity must be derived from authenticated offsets.');
  return {...value,proposal_id:expected};
}
