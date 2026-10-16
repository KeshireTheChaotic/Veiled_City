/** Source-valid common decisions. GM discretion creates rulings; only native services execute outcomes. */
import {inspectArbitrationOrigin,buildSceneIntentBoard,currentScenePlayerInputs,arbitrationTurnOrigin} from './scene-intent-board.js';
import {matchesArbitrationSchema,gmArbitrationProposalSchema,unifiedArbitrationSchema,arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {resolveRuleReferences} from './rule-reference-catalog.js';
import {gmRulingContext,adjudicateGmRuling,nativeGmSceneContext} from './gm-action-ruling.js';
import {indexWorldEvent} from './city-calendar.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {isPvpIntent} from './pvp-authority.js';
import {nativeGmOpportunity,nativeReactionTarget} from './gm-action-capability.js';
import {inspectIncomingCandidate} from './pc-incoming.js';
import {EncounterLibrary} from './encounter.js';

export const UNIFIED_ARBITRATION_PROMPT='Evaluate unified_arbitration in this SAME GM call. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes. Select player:<original player_intents index> or exact shared/NPC intent_ref. NPC proposals select native local actor and native knowledge refs; no PC declaration or secret disclosure may be invented. Each decision needs current rules, reason, stakes before dice, and justified Difficulty for an action/reaction. NPC attack uses actual PC Evasion, never invented Difficulty. Ordinary NPC fiction normally uses npc_no_roll. PC roll questions are adjudication only: player alone executes dice. Unsupported features/proxies/PvP remain review/consent. Do not emit duplicate gm_ruling/native_adjudication for a unified decision. No dice faces, role waiver, outcome or automatic Fear spending.';

export function adjudicateSceneBoard(db,guild,origin,board,proposals,{library=new EncounterLibrary('../content')}={}){
  const o=inspectArbitrationOrigin(db,guild,origin);
  if(board?.kind!=='scene_intent_board'||hash(db.getCityRecord(guild,board.kind,board.record_key)?.data)!==hash(board.data)
    ||hash(board.data.origin)!==hash(o.binding)||!Array.isArray(proposals)||proposals.length>16)throw fail('current_native_board');
  const seen=new Set();
  return db.transaction(()=>{
    const batchKey=`gm-batch:${hash(board.record_key)}`,batch=db.getCityRecord(guild,'gm_arbitration_batch',batchKey);
    if(batch&&batch.data.proposal_hash!==hash(proposals))throw fail('immutable_decision_batch_changed');
    if(!batch)db.saveCityRecord(guild,{kind:'gm_arbitration_batch',key:batchKey,status:'accepted',source_event:board.source_event,visibility:'gm',data:{board:board.record_key,proposal_hash:hash(proposals)}});
    return proposals.map(p=>{
    if(!matchesArbitrationSchema(gmArbitrationProposalSchema,p))throw fail('decision_shape');
    const entry=board.data.entries.find(e=>e.intent_ref===p.intent_ref||e.proposal_ref===p.intent_ref);
    if(!entry||seen.has(entry.intent_ref))throw fail('decision_occurrence');seen.add(entry.intent_ref);
    const key=`gm-decision:${hash([board.record_key,entry.intent_ref])}`,prior=db.getCityRecord(guild,'gm_arbitration_decision',key);
    if(entry.actor.type==='character'){
      const live=db.getCityRecord(guild,'typed_intent',entry.intent_ref);
      (live?.status==='resolved'?historicalActionSource:consentAction)(db,guild,entry.intent_ref,{resolved:true});
    }
    if(prior){if(prior.data.proposal_hash!==hash(p)||prior.data.entry_hash!==hash(entry))throw fail('immutable_decision_changed');return prior;}
    let status='needs_rules_review',native=null,reason='No supported native effect adapter; no outcome or permission granted.';
    const rules=resolveRuleReferences(db,guild,'RAW',p.rule_basis_refs);
    try{
    if(!rules||!p.reason.trim()||p.advantage&&p.disadvantage)reason='Missing current rule, explanation, or incompatible dice choice.';
    else if(['blocked','needs_consent','needs_rules_review'].includes(p.disposition)){status=p.disposition;reason=p.reason;}
    else if(entry.actor.type==='character'){
      const accepted=db.getCityRecord(guild,'typed_intent',entry.intent_ref);
      (accepted.status==='resolved'?historicalActionSource:consentAction)(db,guild,entry.intent_ref,{resolved:true});
      if(isPvpIntent(db,guild,accepted)){status='needs_consent';reason='Exact bilateral PvP agreement required.';}
      else if(accepted.data.coordination||accepted.data.dependencies?.some(ref=>db.getCityRecord(guild,'typed_intent',ref)?.status!=='resolved')){
        status='blocked';reason='Native shared window or exact prerequisite remains unresolved; no automatic participation.';
      }else if(['no_roll','request_pc_action_roll'].includes(p.disposition)&&p.stakes_kind==='attempt_only'&&!p.feature_ref&&!p.experience_ref&&!p.advantage&&!p.disadvantage){
        const scope={mode:accepted.visibility==='character'?'private':'party',actorUserId:accepted.data.owner_user_id,actorCharacterId:accepted.data.actor};
        const r=adjudicateGmRuling(db,guild,entry.intent_ref,{version:1,disposition:p.disposition==='no_roll'?'narrative_no_roll':'standard_action_roll',
          context_refs:[nativeGmSceneContext(db,guild,scope)?.ref,...gmRulingContext(db,guild,scope).evidence.map(e=>e.ref)].filter(Boolean).slice(0,8),capability:{kind:'mundane',ref:''},
          effect_class:p.disposition==='no_roll'&&accepted.data.type==='other'&&['describe_scene','current_situation'].includes(accepted.data.operation)?'observation':'attempt_only',
          trait:p.trait,difficulty:p.difficulty,risk:p.disposition==='no_roll'?'none':'Your declared attempt may fail.',
          stakes:p.disposition==='no_roll'?'none':'Success or failure settles this declared attempt only. New damage, custody, movement, access or costs require separate native authority.',
          explanation:'Source-bound ordinary Daggerheart adjudication of your exact accepted declaration.',
          difficulty_reason:'AI GM selected the saved Difficulty against current native scene context; no unsupported effect is authorized.',
          saved_ruling_key:'',override_refs:[],raw_refs:p.rule_basis_refs,house_refs:[],homebrew_refs:[],modifier_keys:[]},scope);
        native=r.data.adjudication||null;status=native?.disposition==='roll_pending'?'pending_pc_roll':native?.receipts?.length?'resolved_no_roll':'needs_rules_review';reason=r.data.review_reason||p.reason;
      }
    }else if(p.disposition==='npc_no_roll'&&['speak','walk','prepare'].includes(entry.operation)&&p.difficulty===null&&p.trait===null
      &&p.stakes==='none'&&!p.feature_ref&&!p.experience_ref&&!p.advantage&&!p.disadvantage){
      status='resolved_no_roll';reason='Ordinary NPC fiction only; no relocation, PC response, damage, knowledge or resource effect.';
    }else if(p.disposition==='gm_attack_roll'&&p.stakes_kind==='native_attack'&&entry.operation==='attack'&&p.rule_basis_refs.includes('srd:adversary-attacks')&&p.feature_ref==='standard_attack'&&entry.target_refs.length===1&&!p.experience_ref){
      const opportunity=nativeGmOpportunity(db,guild,board),encounter=db.getCurrentEncounter(o.binding.session),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
        combatant=binding?.data.combatants.find(c=>c.actor===entry.actor.key)?.id;
      const input={npc:entry.actor.key,combatant,character:entry.target_refs[0],source:o.binding.source,ruling:'',defenses:{resistance:'none',armor_reduction:1,armor_allowed:true,source:'base'}};
      const facts=inspectIncomingCandidate(db,guild,input,{library});
      if(p.difficulty!==null&&p.difficulty!==facts.evasion||p.trait!==null||!p.stakes.trim())throw fail('attack_fixed_evasion_or_stakes');
      status='gm_action_ready';native={operation:'commit_adversary_attack',input,opportunity,template_hash:facts.snapshot.template};reason='Current standard attack; awaits exact target-owned defense review before any dice.';
    }else if(p.disposition==='request_pc_reaction_roll'&&p.stakes_kind==='attempt_only'&&['prepare','attack'].includes(entry.operation)&&entry.target_refs.length===1
      &&p.rule_basis_refs.includes('srd:reaction-rolls')&&p.trait!==null&&p.difficulty!==null&&p.stakes.trim()&&p.difficulty_reason.trim()
      &&!p.feature_ref&&!p.experience_ref&&!p.advantage&&!p.disadvantage){
      const pc=db.getCharacter(entry.target_refs[0]);
      // Actual local PC, not a model's name/target label. No successful NPC effect is established.
      const ctx=nativeReactionTarget(db,guild,o,pc,entry.actor.key);
      status='pending_pc_reaction';native={operation:'request_pc_reaction_roll',character:pc.id,owner:pc.owner_user_id,principal:ctx.principal,target_snapshot:ctx,opportunity:nativeGmOpportunity(db,guild,board)};
      reason='Owner-private reaction invitation; no PC action, dice or negative effect is executed.';
    }else if(p.disposition==='gm_exceptional_action_roll'&&entry.operation==='exceptional_action'&&p.rule_basis_refs.includes('srd:exceptional-adversary-actions')
      &&p.stakes_kind==='attempt_only'&&entry.objective_ref&&entry.target_refs.every(ref=>!db.getCharacter(ref))&&p.difficulty!==null&&p.trait===null&&p.stakes.trim()&&p.difficulty_reason.trim()&&!p.feature_ref){
      const opportunity=nativeGmOpportunity(db,guild,board),encounter=db.getCurrentEncounter(o.binding.session),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
        combatant=binding?.data.combatants.find(c=>c.actor===entry.actor.key)?.id,c=combatant&&db.listCombatants(encounter.id).find(c=>c.id===combatant),template=c&&library.findAdversary(c.base_name);
      const experience=p.experience_ref&&template?.experiences?.find(e=>e.name===p.experience_ref&&Number.isSafeInteger(e.modifier)&&e.modifier>=0);
      if(!template||c.status!=='active'||p.experience_ref&&!experience)throw fail('exceptional_native_statblock_or_experience');
      status='gm_action_ready';native={operation:'commit_exceptional_adversary_action',opportunity,combatant,template_hash:hash(template),experience:experience||null};
      reason='GM-owned exceptional independent NPC task only; no PC effect, default contested roll or routine behavior roll.';
    }
    }catch(error){
      if(!['GM_ARBITRATION','PC_EFFECT_AUTHORITY','PC_NATIVE_ELIGIBILITY'].includes(error.code))throw error;
      status='needs_rules_review';native=null;reason=error.message;
    }
    const data={version:1,board:board.record_key,entry:entry.intent_ref,entry_hash:hash(entry),proposal:p,proposal_hash:hash(p),
      origin:o.binding,scope:o.scope,rules:rules||[],reason,native,authority:'GM ruling only; controller executes; native receipts own outcomes.'};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_gm_arbitration',source_id:'native:unified-gm',title:'Source-bound GM ruling',
      session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location||'',visibility:'gm',details:{board:board.record_key,payload_hash:hash(data)}},'native:unified-gm');
    return db.saveCityRecord(guild,{kind:'gm_arbitration_decision',key,status,source_event:source.event_key,visibility:'gm',data});
    });
  });
}
export function applyUnifiedArbitration(db,guild,result,playerRows){
  if(!result?.unified_arbitration)return [];
  if(!matchesArbitrationSchema(unifiedArbitrationSchema,result.unified_arbitration))throw fail('transport_shape');
  const origin=arbitrationTurnOrigin(result);if(!origin)throw fail('native_service_origin_required');
  const rows=currentScenePlayerInputs(db,guild,origin,playerRows),board=buildSceneIntentBoard(db,guild,origin,rows,result.unified_arbitration.npc_intents);
  return adjudicateSceneBoard(db,guild,origin,board,result.unified_arbitration.decisions);
}
