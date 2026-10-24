/** Source-bound owner-private announcement for one already reserved native NPC spotlight. */
import {createHash} from 'node:crypto';
import {inspectPreRollFear} from './pre-roll-fear.js';
import {reserveNativeNotice,publishNativeNotice} from './native-publications.js';
import {StateConflictError} from "./kernel/errors.js";
import {inspectNativeGmDecision} from './gm-action-capability.js';

function held(){throw new StateConflictError('Pre-roll Fear notice is stale or outside its exact private audience.');}
const noticeHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

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

import {createPreRollFearNoticeRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPreRollFearNoticeRules({capabilities:{inspectPreRollFear:(...args)=>inspectPreRollFear(...args),inspectNativeGmDecision:(...args)=>inspectNativeGmDecision(...args),reserveNativeNotice:(...args)=>reserveNativeNotice(...args),noticeHash:(...args)=>noticeHash(...args),held:(...args)=>held(...args)}});}
function validated(...args){return rules().validatePreRollFearNotice(...args);}
export function preRollFearAnnouncement(...args){return rules().preRollFearAnnouncement(...args);}
export function reservePreRollFearNotice(...args){return rules().reservePreRollFearNotice(...args);}
