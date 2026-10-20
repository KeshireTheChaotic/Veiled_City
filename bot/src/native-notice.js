/** Closed native renderers. Persisted text is never an authorization or a model-controlled template. */
import {createHash} from 'node:crypto';
import {personalCharacter} from './personal-continuity.js';
import {formatRollRequest} from './roll-requests.js';
import {inspectNativeEquippedAttack} from './native-equipped-attacks.js';
import {inspectOrdinaryRollModifier} from './native-roll-modifiers.js';
import {inspectNativeRollParticipation} from './native-roll-participation.js';
import {formatSharedRoll,validateRollSharePreview,sourceConfirmedRollAttempt} from './roll-sharing.js';
import {pvpOwnerContext} from './narrative-pvp.js';
import {progressPvp,validatePvpRoundReceipt,validatePvpResolutionReceipt} from './pvp-rounds.js';
import {pvpProjection} from './pvp-authorship.js';
import {currentScene} from './scene-continuity.js';
import {typedRollProof} from './typed-roll-proof.js';
import {renderFearEffect,validateFearEffect} from './pvp-fear-moves.js';
import {damagePvpOwnerContext} from './pvp-profiles.js';
import {assertGmRulingRequest} from './gm-action-ruling.js';
import {nativeGmNotice} from './gm-arbitration-output.js';
import {inspectNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {renderPreRollFearNotice} from './pre-roll-fear-notice.js';
import {pvpAttackOwnerStatus} from './pvp-attacks.js';
import {pvpDamageOwnerStatus} from './pvp-damage.js';
export const noticeHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fail(){throw Object.assign(new Error('Native notice source, revision, owner or audience is stale.'),{code:'NATIVE_NOTICE'});}
export function renderNativeNotice(db,guild,d){
  const scene=currentScene(db,guild);
  if(scene.key!==d.scene||scene.session_id!==d.session)fail();
  if(d.user)personalCharacter(db,guild,d.user,d.character);
  if(d.kind==='gm_arbitration_private'){
    if(!d.user||!d.character)fail();
    const projection=nativeGmNotice(db,guild,d.ref,{mode:'private',actorUserId:d.user,actorCharacterId:d.character});
    if(!projection||projection.revision!==d.revision)fail();return projection.text;
  }
  if(d.kind==='pre_roll_fear'){
    return renderPreRollFearNotice(db,guild,d);
  }
  if(d.kind==='pvp_attack_status'){
    if(!d.user||!d.character)fail();
    const p=pvpAttackOwnerStatus(db,guild,d.user,d.ref);
    if(!p.campaign||p.character!==d.character||noticeHash(p)!==d.revision)fail();
    return [`**Private campaign PvP ${p.role} status**`,d.ref,`Native status: ${p.status}.`,
      p.role==='attacker'?`Your attack: ${p.trait}; ${p.damage} ${p.damage_type}; range ${p.range}. Review your own mechanics before authorizing dice.`
        :`Your base Evasion: ${p.evasion}. No defender approval or reaction is implied. Optional reactions, Armor and death choices remain yours.`,
      ...(p.own_roll?[`Your saved native roll: ${p.own_roll.total}, ${p.own_roll.duality}; ${p.own_roll.hit?'hit':'miss'}.`]:[]),
      'No PvP Hope or Critical Stress. Fear requires its distinct immediate native consequence.',
      `/vc-roll pvp-menu reference:${d.ref}`,
      `Safety stop: /vc-roll pvp json:{"op":"safety-stop","character_id":"${d.character}"}`,
      'Status delivery grants no new attack, player choice or public disclosure; any saved result above remains native history.'].join('\n');
  }
  if(d.kind==='pvp_damage_choice'){
    if(!d.user||!d.character)fail();
    const p=pvpDamageOwnerStatus(db,guild,d.user,d.ref);
    if(!p.native_campaign||p.character!==d.character||noticeHash(p)!==d.revision)fail();
    return ['**Your private native damage/Armor decision**',d.ref,
      `Verified incoming damage: ${p.damage}; severity ${p.severity}${p.direct?'; direct damage':''}.`,
      'No HP or Armor change has been made by this notice. Review your own native defenses before deciding.',
      'Final HP invokes YOUR SRD death choice. No forced reaction, guaranteed nonlethal cap or automatic spending.',
      `/vc-roll pvp-menu reference:${d.ref}`].join('\n');
  }
  if(d.kind==='roll_private'||d.kind==='roll_party'){
    const r=db.getCityRecord(guild,'roll_request',d.ref),source=r&&db.getWorldEvent(guild,r.source_event);
    if(!r||noticeHash([r.status,r.data])!==d.revision||!source||source.status!=='active'
      ||!db.ownerAuthoredSource(guild,source.event_key,r.data.owner_user_id)
      ||db.getCharacter(r.subject_key)?.owner_user_id!==r.data.owner_user_id
      ||r.data.session_id!==d.session||r.data.scene!==d.scene)fail();
    if(r.data.input?.attack_source?.startsWith('native-unarmed:')){
      if(r.status==='resolved')typedRollProof(db,guild,r);
      else inspectNativeUnarmedAttack(db,guild,r.data.input,db.getCharacter(r.subject_key));
    }
    if(d.kind==='roll_party'){
      const s=r.data.party_disclosure?.source_event&&db.getWorldEvent(guild,r.data.party_disclosure.source_event),roll=db.getSavedRoll(guild,r.data.roll_id);
      if(d.user||!s||s.status!=='active'||s.visibility!=='party'||s.details.request!==r.record_key
        ||s.details.author!==r.data.owner_user_id||!db.ownerAuthoredSource(guild,s.event_key,r.data.owner_user_id)
        ||!roll||roll.session_id!==d.session||roll.payload.total!==r.data.result?.total
        ||roll.payload.duality!==r.data.result?.duality)fail();
      const selected=r.data.tag?.participants.find(p=>p.roll_id===r.data.roll_id),owner=selected?.user||r.data.owner_user_id,
        character=selected?.character||r.subject_key;
      const {request,revision,...savedResult}=roll.payload,{request:resultRequest,revision:resultRevision,...declaredResult}=r.data.result;
      if(request!==r.record_key||roll.discord_user_id!==owner||roll.character_id!==character
        ||db.getCharacter(character)?.owner_user_id!==owner||noticeHash(savedResult)!==noticeHash(declaredResult)
        ||resultRequest!==undefined&&resultRequest!==request||resultRevision!==undefined&&resultRevision!==revision)fail();
      if(r.data.input?.accepted_intent)typedRollProof(db,guild,r);
      if(r.data.party_disclosure.preview){
        const preview=validateRollSharePreview(db,guild,r,r.data.party_disclosure.preview);
        if(s.details.preview!==preview.record_key||r.data.party_disclosure.context!==preview.data.text)fail();
      }else if(r.data.party_disclosure.context)fail();
      return formatSharedRoll(r);
    }
    const own=r.data.owner_user_id===d.user&&r.subject_key===d.character;
    const participant=r.data.tag?.participants.some(p=>p.user===d.user&&p.character===d.character);
    const helper=r.data.helpers?.some(p=>p.user===d.user&&p.character===d.character);
    const disclosure=r.data.disclosures?.find(p=>p.user===d.user&&p.character===d.character);
    const ds=disclosure&&db.getWorldEvent(guild,disclosure.source_event);
    const shared=ds?.status==='active'&&ds.kind==='roll_disclosure'&&ds.visibility==='character'&&ds.subject_key===d.character
      &&ds.source_id===`player:${r.data.owner_user_id}`&&ds.details.author===r.data.owner_user_id
      &&ds.details.request===r.record_key&&ds.session_id===d.session&&ds.scene===d.scene
      &&db.ownerAuthoredSource(guild,ds.event_key,r.data.owner_user_id);
    const partner=r.status==='awaiting_partner'&&r.data.tag?.partner_user===d.user
      &&db.getCityRecord(guild,'roll_request',r.data.tag.partner_request)?.subject_key===d.character;
    if(!own&&!participant&&!helper&&!shared&&!partner)fail();
    if(shared&&disclosure.context&&(ds.details.attempt!==disclosure.context||sourceConfirmedRollAttempt(db,guild,r)!==disclosure.context))fail();
    if(r.data.input?.gm_ruling&&r.status!=='resolved'){
      try{assertGmRulingRequest(db,guild,r);}catch{fail();}
    }
    const historical=r.status==='resolved',pc=db.getCharacter(r.subject_key);
    if(r.data.input?.native_equipped_ref)inspectNativeEquippedAttack(db,guild,r.data.input,pc,{historical});
    for(const modifier of r.data.breakdown?.modifiers||[]){
      const event=db.getWorldEvent(guild,modifier.source);
      if(event?.details?.issuer==='native:ordinary-roll-modifier')inspectOrdinaryRollModifier(db,guild,r.data.input,pc,event,{historical});
    }
    for(const contribution of [...(r.data.helpers||[]),...(r.data.tag?.participants||[]).filter(p=>p.proof)]){
      const event=db.getWorldEvent(guild,contribution.proof);
      if(event?.details?.issuer==='native:roll-participation')inspectNativeRollParticipation(db,guild,r,db.getCharacter(contribution.character),event,
        (r.data.helpers||[]).includes(contribution)?'help':'participate',contribution.description,{historical});
    }
    if(r.data.tag){const event=db.getWorldEvent(guild,r.data.tag.proof);
      if(event?.details?.issuer==='native:roll-participation')inspectNativeRollParticipation(db,guild,r,pc,event,'tag',r.data.tag.description,{historical});}
    if(historical&&r.data.input?.accepted_intent)typedRollProof(db,guild,r);
    return formatRollRequest(r,{user:d.user,db,guild});
  }
  if(d.kind==='pvp_projection'){
    if(d.user)fail();return pvpProjection(db,guild,d.ref).data.text;
  }
  if(d.kind==='pvp_damage_status'){
    const {contract:p,who}=damagePvpOwnerContext(db,guild,d.user,d.ref);
    if(who.character!==d.character||noticeHash([p.status,p.data])!==d.revision)fail();
    if(p.data.version===4)return ['**Private campaign conflict status**',p.record_key,
      'Native campaign mode does not imply your reaction, spending or a bilateral signature.',
      'Use your private attack/defense menu for actual choices. No PvP Hope or Critical Stress.',
      `/vc-roll pvp-menu reference:${p.record_key}`,
      `Safety stop: /vc-roll pvp json:{"op":"safety-stop","character_id":"${d.character}"}`].join('\n');
    return [`**Private DAMAGE PvP offer/status — ${p.record_key}**`,
      `Revision: ${p.data.terms_hash}; status: ${p.status}. Real lethal risk; YOUR native SRD death-move choice.`,
      'Notification is not Review, consent, a reaction, dice or damage. No PvP Hope or Critical Stress award.',
      'Review all exact stakes, boundaries and target-specific edges before independently accepting.',
      db.getCityCalendar(guild).flags.pvp_private_ui===true?`/vc-roll pvp-menu reference:${p.record_key}`:'/vc-roll pvp JSON: damage-review',
      'Stop: neutral withdrawal preserves committed effects. Immediate action Fear is never banked.'].join('\n');
  }
  if(d.kind==='pvp_status'){
    const {proposal:p,terms}=pvpOwnerContext(db,guild,d.user,d.ref),progress=progressPvp(db,guild,d.user,d.ref);
    if(noticeHash([p.status,p.data,progress])!==d.revision)fail();
    if(progress.own)validatePvpRoundReceipt(db,guild,p,db.pvpRoundForRoll(guild,p.record_key,d.character,progress.own.roll_id));
    if(progress.resolution)validatePvpResolutionReceipt(db,guild,p,db.getCityRecord(guild,'pvp_resolution_receipt',progress.resolution.receipt));
    const t=terms.data.snapshot.terms;
    return [`**Private narrative PvP offer/status — ${p.record_key}**`,
      'Nonbinding terms/status only; this notice neither consents nor authors a PC response.',
      `Revision: ${p.data.terms_hash}; mode: ${t.mode}; objective: ${t.objective}`,
      ...t.stakes.map(s=>`${db.getCharacter(s.character).name}: best ${s.best}; worst ${s.worst}; tie ${s.tie}`),
      `Boundaries: ${t.boundaries.join('; ')}; audience: ${t.audience}; ownership: ${t.authorship}`,
      `Hope: ${t.hope_policy}; Fear: ${t.fear_policy}; stop: ${t.stop_policy}`,
      ...(db.getCityCalendar(guild).flags.pvp_private_ui===true?[`/vc-roll pvp-menu reference:${p.record_key}`]:[]),
      JSON.stringify(progress)].join('\n');
  }
  if(d.kind==='pvp_fear_effect'){
    const effect=validateFearEffect(db,guild,d.ref),trigger=db.getCityRecord(guild,'pvp_fear_trigger',effect.data.trigger);
    if(effect.data.proposal!==d.proposal||effect.data.terms_hash!==d.terms_hash
      ||effect.visibility!==d.visibility||effect.subject_key!==(d.character||null)
      ||d.user&&db.getCharacter(d.character)?.owner_user_id!==d.user
        ||!d.user&&effect.visibility!=='party'||trigger?.status!=='resolved')fail();
    return renderFearEffect(db,guild,effect.record_key,d.user?{mode:'private',actorUserId:d.user,actorCharacterId:d.character}:
      {mode:'party',actorUserId:null,actorCharacterId:null});
  }
  fail();
}
