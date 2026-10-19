/** Exact-state, authenticated GM recovery. Cancels unused permission, never refunds or rewrites outcomes. */
import {fearReservationHash as hash,fearReservationFailure as fail,inspectFearReservation,writeFearReservation} from './fear-reservations.js';
import {validatePcDeathOutcome} from './pc-death.js';
import {inspectPreRollFear,assertPreRollFearAcknowledged} from './pre-roll-fear.js';
import {rollArbitratedIncomingAttack} from './pc-incoming.js';

function operator(db,interaction,authorize){
  if(typeof authorize!=='function'||authorize(db,interaction)!==true||!interaction?.id||!interaction.guildId||!interaction.user?.id)
    throw fail('authenticated GM interaction required for exact recovery');
}
function snapshot(db,guild,key){
  // No current-source check here: stale context may revoke future permission, never authorize an effect.
  const {row,binding}=inspectFearReservation(db,guild,key),
    job=db.getCityRecord(guild,'pre_roll_fear_publication',`pre-roll-fear-publication:${hash(key)}`),
    parts=job?.data.turn_id?db.listTurnPublications(guild,job.data.turn_id):[],
    attack=db.incomingAttackForNativeDecision(guild,binding.decision),
    cost=db.getCityRecord(guild,'gm_action_cost_receipt',`gm-action-cost:${hash([binding.decision,key])}`),
    roll=attack&&db.getCityRecord(guild,'npc_attack_roll_receipt',`${attack.record_key}:roll`);
  const uncertain=parts.some(p=>!['pending','failed','delivered'].includes(p.status)
    ||p.status==='failed'&&!p.last_failure?.startsWith('NOT_SENT: ')
    ||p.status==='delivered'&&(!p.discord_message_id||!p.channel_id)),
    committed=['executing','completed'].includes(row.status)||!!cost||!!roll||!!attack?.data.roll
      ||!!attack&&!['awaiting_defense','ready','hold_for_owner'].includes(attack.status);
  const material={state:row.data.state_source,status:row.status,binding:hash(binding),
    publication:job?hash(job):null,parts:parts.map(p=>[p.id,p.status,p.payload_hash,p.attempt_count,p.discord_message_id,p.channel_id,p.last_failure]),
    attack:attack?hash(attack):null,cost:cost?hash(cost):null,roll:roll?hash(roll):null};
  return {row,binding,revision:hash(material),uncertain,committed,parts};
}

/** authorize is the command adapter's existing native GM predicate; model-supplied role fields are never consumed. */
export function recoverPreRollFear(db,interaction,input,authorize,{library,rng}={}){
  operator(db,interaction,authorize);
  const keys=Object.keys(input||{}).sort().join(),review=input?.op==='pre-roll-fear-review',cancel=input?.op==='pre-roll-fear-cancel',
    resume=input?.op==='pre-roll-fear-resume';
  if(!review&&!cancel&&!resume||keys!==(review?'key,op':resume?'expected_revision,key,op':'expected_revision,key,op,reason')||typeof input.key!=='string'
    ||cancel&&(typeof input.expected_revision!=='string'||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>500))
    throw fail('closed exact recovery fields required');
  return db.transaction(()=>{
    const guild=interaction.guildId,s=snapshot(db,guild,input.key),{row,binding}=s;
    if(review)return {key:row.record_key,status:row.status,revision:s.revision,effect_committed:s.committed,
      delivery_review_required:s.uncertain,can_cancel:row.status==='awaiting_announcement'&&!s.committed&&!s.uncertain,
      instruction:s.uncertain?'Use existing exact-part publication reconciliation first; no blind resend or invented acknowledgement.'
        :'Cancellation revokes this unused hostile permission only. Saved owner choices and outcomes are never reversed.'};
    // Valid immutable terminal ancestry makes duplicate cancellation a pure saved read, including after restart.
    if(cancel&&row.status==='cancelled')return {key:row.record_key,status:'cancelled'};
    if(input.expected_revision!==s.revision)throw fail('review revision changed; inspect exact current recovery state');
    if(resume){
      if(row.status==='cancelled')throw fail('cancelled hostile permission cannot resume');
      inspectPreRollFear(db,guild,row.record_key,{current:row.status!=='completed'});
      const attack=db.incomingAttackForNativeDecision(guild,binding.decision),offer=attack?.data.offer;
      if(!attack||attack.subject_key!==binding.character||offer.input?.character!==binding.character
        ||offer.input?.ruling!==`ai-decision:${binding.decision}`||offer.input?.npc!==binding.npc)
        throw fail('exact native incoming NPC decision and affected owner required');
      if(!attack.data.roll&&['awaiting_defense','hold_for_owner'].includes(attack.status))
        return {key:row.record_key,status:row.status,attack:attack.record_key,attack_status:attack.status,
          instruction:'Affected owner must privately review and confirm applicable defenses. Recovery never chooses for them.'};
      if(!attack.data.roll){
        if(attack.status!=='ready'||row.status!=='awaiting_announcement')throw fail('native interruption is not ready to resume');
        assertPreRollFearAcknowledged(db,guild,row.record_key);
      }
      const receipt=rollArbitratedIncomingAttack(db,guild,attack.record_key,{library,rng}),
        actual=db.getCityRecord(guild,'pc_incoming_attack',attack.record_key);
      return {key:row.record_key,status:db.getCityRecord(guild,'pre_roll_fear_interrupt',row.record_key).status,
        attack:attack.record_key,attack_status:actual.status,receipt:receipt.record_key};
    }
    if(row.status!=='awaiting_announcement'||s.committed)throw fail('committed native interruption cannot be cancelled or refunded');
    if(s.uncertain)throw fail('uncertain or active delivery requires exact publication reconciliation before cancellation');
    const done=writeFearReservation(db,guild,binding,'cancelled',row);
    db.recordMutation(guild,{sessionId:binding.session,actorType:'human',actorId:interaction.user.id,sourceLayer:'pre_roll_fear_recovery',
      mutationType:'cancel_unused_pre_roll_fear',entityKey:row.record_key,visibility:'gm',rationale:input.reason.trim(),
      payload:{interaction:interaction.id,review_revision:s.revision,previous_state:row.data.state_source,
        cancelled_state:done.data.state_source,announcement_acknowledged:s.parts.some(p=>p.status==='delivered'),
        effect_committed:false,pool_delta:0}});
    return {key:done.record_key,status:done.status};
  });
}

/** A final-HP hit is not a lawful completed interruption while an affected owner's death choice is unresolved. */
export function assertPreRollFearDeathTerminal(db,guild,attack){
  const damage=db.getCityRecord(guild,'pc_effect_receipt',`${attack.record_key}:damage`),hp=damage?.data.after?.hp;
  if(!hp||hp.current!==hp.max)return;
  const request=db.getCityRecord(guild,'pc_death_move_request',`${attack.record_key}:death`);
  if(request?.status!=='resolved')throw fail('affected owner native death move remains pending');
  const outcome=validatePcDeathOutcome(db,guild,`${request.record_key}:outcome`);
  if(outcome.status!=='resolved'||outcome.subject_key!==attack.subject_key)throw fail('affected owner native death outcome is not terminal');
}
