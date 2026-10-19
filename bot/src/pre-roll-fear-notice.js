/** Source-bound owner-private announcement for one already reserved native NPC spotlight. */
import {createHash} from 'node:crypto';
import {inspectPreRollFear} from './pre-roll-fear.js';
import {reserveNativeNotice,publishNativeNotice} from './native-publications.js';
import {StateConflictError} from './errors.js';
import {inspectNativeGmDecision} from './gm-action-capability.js';

function held(){throw new StateConflictError('Pre-roll Fear notice is stale or outside its exact private audience.');}
const reservationEvent=binding=>`pre-roll-fear:${binding.request}:state:awaiting_announcement`;
const noticeHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function validated(db,guild,key,scope){
  const inspected=inspectPreRollFear(db,guild,key,{current:true});
  const {row,binding,entry}=inspected||{};
  const checked=binding?.decision&&inspectNativeGmDecision(db,guild,binding.decision),ruling=checked?.row,
    currentEntry=checked?.entry,proposal=ruling?.data?.proposal,native=ruling?.data?.native;
  if(!row||!binding||!entry||!['awaiting_announcement','executing'].includes(row.status)
    ||row.source_event!==reservationEvent(binding)||binding.version!==1||binding.base_cost!==1
    ||binding.owner!==scope?.actorUserId||binding.character!==scope?.actorCharacterId||scope?.mode!=='private'
    ||!Array.isArray(entry.target_refs)||entry.target_refs.length!==1
    ||entry.intent_ref!==binding.entry_ref||entry.actor?.type!=='npc'||entry.actor?.key!==binding.npc||entry.operation!=='attack'
    ||entry.target_refs[0]!==binding.character||!ruling||ruling.status!=='gm_action_ready'
    ||!currentEntry||currentEntry.intent_ref!==binding.entry_ref
    ||ruling.data.board!==binding.board||ruling.data.entry!==binding.entry_ref
    ||ruling.data.entry_hash!==noticeHash(entry)||ruling.data.proposal_hash!==noticeHash(proposal)
    ||!ruling.data.origin||noticeHash(ruling.data.origin)!==noticeHash(binding.origin)
    ||proposal?.disposition!=='gm_attack_roll'||proposal.feature_ref!=='standard_attack'||proposal.experience_ref
    ||proposal.advantage||proposal.disadvantage||native?.operation!=='commit_adversary_attack'
    ||native.input?.npc!==binding.npc||native.input?.character!==binding.character
    ||binding.owner!==db.getCharacter(binding.character)?.owner_user_id)held();
  return {...inspected,ruling};
}

/** Exact owner-only acknowledgment text; this is notice of a reserved decision, not consent or execution. */
export function preRollFearAnnouncement(db,guild,key,scope){
  const {row,binding,entry}=validated(db,guild,key,scope);
  const revision=noticeHash(binding);
  return {kind:'pre_roll_fear',ref:key,user:binding.owner,character:binding.character,revision,
    session:binding.session,scene:binding.scene,npc:binding.npc,target:entry.target_refs[0],
    base_cost:binding.base_cost,printed_fear_cost:binding.printed_fear_cost};
}

/** Re-render a native notice only while the current NPC decision and owner-private scope still validate. */
export function renderPreRollFearNotice(db,guild,d){
  const {row,binding,entry}=validated(db,guild,d.ref,{mode:'private',actorUserId:d.user,actorCharacterId:d.character});
  if(binding.session!==d.session||binding.scene!==d.scene||noticeHash(binding)!==d.revision)held();
  const attack=db.incomingAttackForNativeDecision(guild,binding.decision);
  if(!attack||attack.subject_key!==binding.character||attack.data.offer.input.npc!==binding.npc)held();
  return [`**Pre-roll Fear — GM-reserved campaign resource**`,
    `The GM reserves exactly 1 existing campaign Fear${binding.printed_fear_cost?` plus ${binding.printed_fear_cost} printed feature Fear`:''}.`,
    `The announced NPC intent is a standard attack by native NPC ${binding.npc} against your character ${entry.target_refs[0]}.`,
    `Your original action remains unrolled. Review your own defenses: /vc-roll effect json:${JSON.stringify({op:'review',attack:attack.record_key})}`,
    'This notice is not an outcome, consent, or a damage result.'].join('\n');
}

export function reservePreRollFearNotice(db,guild,key){
  const inspected=inspectPreRollFear(db,guild,key,{current:true})||{}, {row,binding}=inspected;
  if(!row||!binding||row.source_event!==reservationEvent(binding)||!['awaiting_announcement','executing'].includes(row.status))held();
  validated(db,guild,key,{mode:'private',actorUserId:binding.owner,actorCharacterId:binding.character});
  const revision=noticeHash(binding);
  return reserveNativeNotice(db,guild,{kind:'pre_roll_fear_publication',
    key:`pre-roll-fear-publication:${noticeHash(key)}`,source:row.source_event,
    notice:{kind:'pre_roll_fear',ref:key,user:binding.owner,character:binding.character,revision}});
}

export function publishPreRollFearNotice(db,guild,key,sendPublication){
  const publicationKey=`pre-roll-fear-publication:${noticeHash(key)}`,
    prior=db.getCityRecord(guild,'pre_roll_fear_publication',publicationKey);
  // A completed acknowledged publication is durable history; don't rerender it against a now-resolved request.
  if(prior?.status==='delivered')return Promise.resolve(false);
  const receipt=reservePreRollFearNotice(db,guild,key);
  const {binding}=inspectPreRollFear(db,guild,key,{current:true})||{};
  if(!binding)held();
  const notice=receipt.data;
  return publishNativeNotice(db,guild,{kind:receipt.kind,key:receipt.record_key,source:receipt.source_event,
    notice:{kind:notice.kind,ref:notice.ref,user:notice.user,character:notice.character,revision:notice.revision}},
  publication=>sendPublication(publication));
}
