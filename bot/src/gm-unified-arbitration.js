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
import {inspectIncomingCandidate,inspectVolleyCandidate} from './pc-incoming.js';
import {EncounterLibrary} from './encounter.js';
import {featureDisposition} from './native-feature-catalog.js';
import {requireNativeAdversaryFeature} from './native-adversary-context.js';
import {applyNativeEnvironmentProfileProposals} from './native-environment-proposals.js';
import {executeEnvironmentProposal} from './native-environment-dispatch.js';
import {authorizeFeatureChoice,reserveFeatureWindow,pendingFeatureWindows} from './native-feature-windows.js';
import {nativeAlliancePlan} from './native-encounter-relations.js';
import {nativeFeatureReviewContract} from './native-house-errata.js';
import {isGroupFeature,planGroupFeature} from './native-group-features.js';
import {prepareNativeUnarmedAttack} from './native-unarmed-attacks.js';
import {reservePreRollFear,bindPreRollFearBoard,cancelPreRollFear} from './pre-roll-fear.js';
import {reservePreRollFearNotice} from './pre-roll-fear-notice.js';
import {prepareOrdinaryRollModifier} from './native-roll-modifiers.js';
import {prepareNativeRollParticipation} from './native-roll-participation.js';
import {prepareNativeEquippedAttack} from './native-equipped-attacks.js';
import {prepareCampaignPvpFromBoard} from './pvp-attacks.js';
import {registerEnvironmentTraceRisk} from './native-environment-trace.js';
import {reserveCampaignAttackNotices} from './native-publications.js';

export const UNIFIED_ARBITRATION_PROMPT="Evaluate unified_arbitration in this SAME GM call. "
  +"Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes. "
  +"Select player:<original player_intents index> or exact shared/NPC intent_ref. "
  +"NPC proposals select native local actor and native knowledge refs; no PC declaration or secret disclosure may be invented. "
  +"Each decision needs current rules, reason, stakes before dice, and justified Difficulty for an action/reaction. "
  +"NPC attack uses actual PC Evasion, never invented Difficulty. "
  +"Ordinary NPC fiction normally uses npc_no_roll. "
  +"PC roll questions are adjudication only: player alone executes dice. "
  +"At Storm Drain Shrine, apply the exact Local Memory advantage only to the player's declared question about recent local movement after their respectful offering; the player owns the action, dice and resource choices. "
  +"For an exact owner unarmed_attack against a local native NPC, use feature_ref=unarmed_attack, request_pc_action_roll, stakes_kind=native_attack, "
  +"srd:attack-rolls, Strength or Finesse, difficulty=null; native rules derive Proficiency d4 physical at Melee. No inferred weapon or PC target. "
  +"A triggered feature decision uses proposal_version=2 and the EXACT trigger_ref and feature_ref from feature_windows; a Reaction does not mint normal spotlight. "
  +"An action from action_features uses the v1 default variant: OMIT proposal_version and trigger_ref. "
  +"Select its exact feature_ref, operation, trait, Difficulty and source-derived target policy, stakes_kind=native_feature. "
  +"Do not omit an entitled target from an all_in_range feature. "
  +"Blood Rush currently permits Stress recovery while electing the current position only; other relocation remains reviewed. "
  +"For exact owner weapon_attack against a local native NPC, equipped_attack requests native preparation ONLY from a unique already-approved, currently equipped weapon/rule/exact-target source. No approval, ambiguous gear or unsupported range stays reviewed; an inventory name alone does not authorize acquisition or mechanics. "
  +"Unsupported features/proxies remain review-only. PC attacks use their separate native campaign path only when campaign PvP is explicitly enabled; "
  +"use the exact accepted actor/PC target, unarmed_attack or equipped_attack, request_pc_action_roll, native_attack and srd:attack-rolls. "
  +"PC Difficulty is current target Evasion (or null for native derivation), never adversary Difficulty. This prepares an owner-private request, not dice, damage, target consent or optional spending. "
  +"Disabled campaign mode retains historical bilateral PvP. Never invent a signature or waive an owner safety-stop. "
  +"Do not emit duplicate gm_ruling/native_adjudication for a unified decision. "
  +"No dice faces, role waiver, outcome or automatic Fear spending. "
  +"Optional pre-roll Fear requires unified_arbitration version=2 and one exact pre_roll_fear request_ref/npc_intent_ref from the current board. "
  +"Select one otherwise-legal standard NPC attack against that pending action owner only; native code reserves 1 existing Fear and requires acknowledged notice before dice. "
  +"No printed feature, Experience, added modifier, extra action or owner choice is purchased. Version1 with no interrupt remains valid. "
  +"Version3 additionally accepts environment_profiles (at most one exact supported environment template at the current location); use [] unless its supported native capabilities are supplied. "
  +"A profile is GM-private provenance, not a feature effect, PC knowledge, new actor, attack or encounter. Unsupported profiles remain held without blocking independent actions. "
  +"Version4 adds environment_actions (at most one), only for supplied executable capabilities. Sirens Outside uses its exact native environment instance, feature_ref and ordinary NPC identity/category; native code validates a current GM opportunity, printed Fear, identity collisions and audience. No combat statistics, PC response or custody is authorized. Use [] when unavailable. "
  +"Version5 also admits exact source-defined environment scene actions: Code Blue medical_emergency, Emergency Cascade service_emergency with an actual local service, or Automatic Correction mundane_detail using the closed native property/value domain. These establish a local complication, never PC injury, a decision, automatic service damage or an invented numerical modifier. Unsupported actions stay private review. "
  +"Version6 admits Upload in Progress: upload_start requires an existing clear local video with native creation and pending-upload provenance, never a camera assertion; upload_advance selects one actual new native fictional occurrence and contextual ruling; upload_adjust requires the affected owner's own successful tick_back_upload/redirect_upload action. No timer, assumed PC act, invented recording, recipient knowledge or duplicate tick. "
  +"Version7 admits Everybody Saw Something Different only with an independently GM-established local supernatural incident, exactly three actual local unproxied NPCs, their already native-authored attributed speech and own evidence, an exact established true detail per account, and three pairwise contradictory quote anchors. This is contextual GM comparison, never truth promotion, forced testimony or invented knowledge. "
  +"Only when supplied as an executable local environment capability, Everything Logs may use its exact feature_ref on an ordinary request_pc_action_roll/attempt_only intrusion ruling, without advantage/disadvantage. Native code records this classification before dice and opens an owner-private response only on an actual action failure. No second reaction or post-hoc success claim; exactly 1 Hope is optional and owner-chosen, never automatic. "
  +"For an explicit GM-owned alliance choice between currently active local unproxied NPC combatants, use set_allies or clear_allies, exact other NPC target_refs, npc_no_roll, srd:gm-moves, stakes=none, no feature or dice. "
  +"This does not enroll PCs or prove a powered device, movement, NPC knowledge or disclosure. "
  +"Group membership and relationship scores alone never grant Local Mesh. "
  +"For source-grounded collaboration eligibility only, use proposal_version=3, disposition=native_feature_resolution, stakes_kind=attempt_only, null trait/Difficulty, no feature/Experience/odds, and collaboration {kind,request,partner_request}. "
  +"Help requires an exact owner-authored help_ally intent targeting the pending request PC, srd:help-an-ally, and empty partner_request. "
  +"Tag uses the initiator's accepted original action and two actual pending request refs with srd:tag-team-rolls. Eligibility is not consent: both owners separately authorize; native code alone charges/rolls.";

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
    let status='needs_rules_review',native=null,review_contract=null,reason='No supported native effect adapter; no outcome or permission granted.';
    const rules=resolveRuleReferences(db,guild,'RAW',p.rule_basis_refs);
    try{
    if(!rules||!p.reason.trim()||p.advantage&&p.disadvantage)reason='Missing current rule, explanation, or incompatible dice choice.';
    else if(['blocked','needs_consent','needs_rules_review'].includes(p.disposition)){status=p.disposition;reason=p.reason;}
    else if(entry.actor.type==='character'&&p.proposal_version===3){
      native=prepareNativeRollParticipation(db,guild,origin,entry,p);status='pending_owner_choice';
      reason='Native collaboration eligibility only; each owner separately chooses participation and any Hope payment.';
    }
    else if(entry.actor.type==='character'&&isPvpIntent(db,guild,db.getCityRecord(guild,'typed_intent',entry.intent_ref))
      &&['unarmed_attack','equipped_attack'].includes(p.feature_ref)){
      const request=prepareCampaignPvpFromBoard(db,guild,origin,board,entry,p);
      reserveCampaignAttackNotices(db,guild,request.record_key);
      native={operation:'campaign_pvp_attack',request:request.record_key,accepted_intent:entry.intent_ref};
      status='pending_owner_choice';reason='Campaign native attack preparation only; rightful owner reviews mechanics and rolls. No defender consent or outcome is invented.';
    }
    else if(entry.actor.type==='character'&&p.feature_ref==='unarmed_attack'){
      native=prepareNativeUnarmedAttack(db,guild,origin,entry,p,{library});
      status=native.disposition==='roll_pending'?'pending_pc_roll':'needs_rules_review';reason='Native unarmed eligibility only; owner alone rolls and chooses optional costs.';
    }
    else if(entry.actor.type==='character'&&p.feature_ref==='equipped_attack'){
      native=prepareNativeEquippedAttack(db,guild,origin,entry,p,{library});
      status=native.disposition==='roll_pending'?'pending_pc_roll':'needs_rules_review';reason='Native exact existing equipped approval only; no acquired gear, new mapping or owner dice are invented.';
    }
    else if(p.feature_ref&&p.feature_ref!=='standard_attack'
      &&!(entry.actor.type==='character'&&['environment:haunted-nightclub:too-loud-to-think','environment:aster-vale-predictive-lab:everything-logs','environment:storm-drain-shrine:local-memory'].includes(p.feature_ref)
        &&featureDisposition(p.feature_ref).status==='supported')){
      const feature=featureDisposition(p.feature_ref);
      reason=feature.reason; // Catalog membership alone never grants a feature capability.
      if(feature.status==='supported'){
        requireNativeAdversaryFeature(db,guild,origin,entry.actor.key,p.feature_ref,{library});
        native=isGroupFeature(feature.feature.feature_key)
          ?planGroupFeature(db,guild,o,entry,p,feature.feature,{library,opportunity:nativeGmOpportunity(db,guild,board)})
          :feature.feature.native_handler==='coordinated_volley'
          ?inspectVolleyCandidate(db,guild,o,entry,p,feature.feature,{library,opportunity:nativeGmOpportunity(db,guild,board)})
          :authorizeFeatureChoice(db,guild,o,entry,p,feature.feature,{library});status=native.operation==='request_feature_reaction_roll'?'pending_pc_reaction':'gm_action_ready';
        reason=native.operation==='commit_group_feature'?'Source-verified feature action only; each affected owner separately submits their reaction and choices.'
          :native.operation==='commit_adversary_volley'
          ?'Current sourced GM spotlight and exact Volley targets; one shared native attack awaits owner defense, with independent target effects.'
          :'Exact native reaction occurrence only; no ordinary spotlight or player roll is inferred.';
      }else{
        review_contract=nativeFeatureReviewContract(p.feature_ref);
        if(review_contract)reason+=` Missing native authority: ${review_contract.missing} [${review_contract.erratum} v${review_contract.erratum_version}]. Owner decisions remain owner-only.`;
      }
    }
    else if(entry.actor.type==='character'){
      const accepted=db.getCityRecord(guild,'typed_intent',entry.intent_ref);
      (accepted.status==='resolved'?historicalActionSource:consentAction)(db,guild,entry.intent_ref,{resolved:true});
      if(isPvpIntent(db,guild,accepted)){status='needs_consent';reason='Exact bilateral PvP agreement required.';}
      else if(accepted.data.coordination||accepted.data.dependencies?.some(ref=>db.getCityRecord(guild,'typed_intent',ref)?.status!=='resolved')){
        status='blocked';reason='Native shared window or exact prerequisite remains unresolved; no automatic participation.';
      }else if(['no_roll','request_pc_action_roll'].includes(p.disposition)&&p.stakes_kind==='attempt_only'
        &&(!p.feature_ref||['environment:haunted-nightclub:too-loud-to-think','environment:aster-vale-predictive-lab:everything-logs','environment:storm-drain-shrine:local-memory'].includes(p.feature_ref)&&p.disposition==='request_pc_action_roll')&&!p.experience_ref
        &&(p.disposition==='request_pc_action_roll'||!p.advantage&&!p.disadvantage)){
        const scope={mode:accepted.visibility==='character'?'private':'party',actorUserId:accepted.data.owner_user_id,actorCharacterId:accepted.data.actor};
        const traceRisk=p.feature_ref==='environment:aster-vale-predictive-lab:everything-logs'
          ?registerEnvironmentTraceRisk(db,guild,origin,board,entry,p):null;
        const nativeModifiers=traceRisk?[]:prepareOrdinaryRollModifier(db,guild,origin,entry,p);
        const modifiers=p.disposition==='no_roll'?[]:[...new Set([...db.rollModifierSources(guild,accepted.data.actor,p.trait,'action',accepted.record_key,
          {sessionId:accepted.data.session_id,sceneKey:accepted.data.scene}).map(s=>s.event_key),...nativeModifiers])];
        const r=adjudicateGmRuling(db,guild,entry.intent_ref,{version:1,disposition:p.disposition==='no_roll'?'narrative_no_roll':'standard_action_roll',
          context_refs:[nativeGmSceneContext(db,guild,scope)?.ref,...gmRulingContext(db,guild,scope).evidence.map(e=>e.ref)].filter(Boolean).slice(0,8),capability:{kind:'mundane',ref:''},
          effect_class:p.disposition==='no_roll'&&accepted.data.type==='other'&&['describe_scene','current_situation'].includes(accepted.data.operation)?'observation':'attempt_only',
          trait:p.trait,difficulty:p.difficulty,risk:p.disposition==='no_roll'?'none':'Your declared attempt may fail.',
          stakes:p.disposition==='no_roll'?'none':'Success or failure settles this declared attempt only. New damage, custody, movement, access or costs require separate native authority.',
          explanation:'Source-bound ordinary Daggerheart adjudication of your exact accepted declaration.',
          difficulty_reason:'AI GM selected the saved Difficulty against current native scene context; no unsupported effect is authorized.',
          saved_ruling_key:'',override_refs:[],raw_refs:p.rule_basis_refs,house_refs:[],homebrew_refs:[],modifier_keys:modifiers},scope);
        native=r.data.adjudication||null;
        if(traceRisk&&native?.disposition==='roll_pending')native={...native,environment_trace_risk:traceRisk.record_key};
        status=native?.disposition==='roll_pending'?'pending_pc_roll':native?.receipts?.length?'resolved_no_roll':'needs_rules_review';reason=r.data.review_reason||p.reason;
      }
    }else if(p.disposition==='npc_no_roll'&&['set_allies','clear_allies'].includes(entry.operation)&&p.difficulty===null&&p.trait===null
      &&p.stakes==='none'&&p.rule_basis_refs.includes('srd:gm-moves')&&!p.feature_ref&&!p.experience_ref&&!p.advantage&&!p.disadvantage){
      native=nativeAlliancePlan(db,guild,o,entry,{library});status='gm_action_ready';reason='GM-owned explicit native NPC alliance only; no PC participation, movement, attack or knowledge grant.';
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
      if(!['GM_ARBITRATION','PC_EFFECT_AUTHORITY','PC_NATIVE_ELIGIBILITY','STATE_CONFLICT','INVALID_INPUT'].includes(error.code))throw error;
      status='needs_rules_review';native=null;reason=error.message;
      if(p.feature_ref){
        review_contract=nativeFeatureReviewContract(p.feature_ref);
        reason=`Missing native authority for this native handler: ${reason}`;
      }
    }
    const data={version:1,board:board.record_key,entry:entry.intent_ref,entry_hash:hash(entry),proposal:p,proposal_hash:hash(p),
      origin:o.binding,scope:o.scope,rules:rules||[],reason,native,...(review_contract?{review_contract}:{}),authority:'GM ruling only; controller executes; native receipts own outcomes.'};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_gm_arbitration',source_id:'native:unified-gm',title:'Source-bound GM ruling',
      session_id:o.binding.session,scene:o.binding.scene,location_key:o.binding.location||'',visibility:'gm',details:{board:board.record_key,payload_hash:hash(data)}},'native:unified-gm');
    const saved=db.saveCityRecord(guild,{kind:'gm_arbitration_decision',key,status,source_event:source.event_key,visibility:'gm',data});
    if(native?.window)reserveFeatureWindow(db,guild,saved.record_key);
    return saved;
    });
  });
}
export function applyUnifiedArbitration(db,guild,result,playerRows,options={}){
  return db.transaction(()=>applyUnifiedBatch(db,guild,result,playerRows,options));
}
/** Classify only sealed, bounded Help eligibility before generic PC-conflict staging.
 * This never permits damage or a PC choice; unsuccessful eligibility stays scoped review. */
export function prepareUnifiedCollaboration(db,guild,result,playerRows){
  const proposals=result?.unified_arbitration?.decisions?.filter(p=>p.proposal_version===3&&p.collaboration?.kind==='help')||[];
  if(!proposals.length)return new Set();
  if(!matchesArbitrationSchema(unifiedArbitrationSchema,result.unified_arbitration))throw fail('transport_shape');
  const origin=arbitrationTurnOrigin(result);if(!origin)throw fail('native_service_origin_required');
  const rows=currentScenePlayerInputs(db,guild,origin,playerRows),board=buildSceneIntentBoard(db,guild,origin,rows,result.unified_arbitration.npc_intents),classified=new Set();
  for(const p of proposals){
    const entry=board.data.entries.find(e=>e.intent_ref===p.intent_ref||e.proposal_ref===p.intent_ref),a=entry&&db.getCityRecord(guild,'typed_intent',entry.intent_ref);
    if(entry?.actor.type!=='character'||a?.data.type!=='interact'||a.data.operation!=='help_ally'
      ||!resolveRuleReferences(db,guild,'RAW',p.rule_basis_refs)||!matchesArbitrationSchema(gmArbitrationProposalSchema,p))continue;
    consentAction(db,guild,a.record_key);
    try{prepareNativeRollParticipation(db,guild,origin,entry,p);}
    catch(error){if(error.code!=='GM_ARBITRATION')throw error;}
    // The ordinary decision pass records any hold; classification is never an authorization receipt.
    classified.add(a.record_key);
  }
  return classified;
}
function applyUnifiedBatch(db,guild,result,playerRows,{content}={}){
  if(!result?.unified_arbitration)return [];
  if(!matchesArbitrationSchema(unifiedArbitrationSchema,result.unified_arbitration))throw fail('transport_shape');
  const origin=arbitrationTurnOrigin(result);if(!origin)throw fail('native_service_origin_required');
  applyNativeEnvironmentProfileProposals(db,guild,origin,result.unified_arbitration.environment_profiles||[]);
  const rows=currentScenePlayerInputs(db,guild,origin,playerRows),board=buildSceneIntentBoard(db,guild,origin,rows,result.unified_arbitration.npc_intents);
  let interrupt=null;
  for(const selection of result.unified_arbitration.pre_roll_fear||[]){
    if(result.unified_arbitration.npc_intents.length!==1)throw fail('one_pre_roll_npc_spotlight_only');
    const proposal=result.unified_arbitration.decisions.find(p=>p.intent_ref===selection.npc_intent_ref);
    interrupt=reservePreRollFear(db,guild,origin,board,selection,proposal);bindPreRollFearBoard(db,guild,interrupt);
  }
  const decisions=adjudicateSceneBoard(db,guild,origin,board,result.unified_arbitration.decisions);
  if(interrupt){
    const decision=decisions.find(d=>d.record_key===interrupt.data.binding.decision);
    if(decision?.status==='gm_action_ready'&&decision.data.native?.operation==='commit_adversary_attack')
      reservePreRollFearNotice(db,guild,interrupt.record_key);
    else cancelPreRollFear(db,guild,origin,interrupt.record_key);
  }
  // One bounded native GM reactive policy, in the current authenticated GM opportunity.
  // It is not a model role, a civic simulation score, or an extra provider invocation.
  const o=inspectArbitrationOrigin(db,guild,origin),remaining=4-board.data.entries.filter(e=>e.actor.type==='npc').length;
  let used=0;
  for(const w of pendingFeatureWindows(db,guild)){
    if(used>=remaining||w.status!=='pending'||w.data.feature!=='adversary:static-wraith:feedback'||w.data.origin_source!==o.binding.source
      ||db.getCityRecord(guild,'native_feature_reservation',`feature-reservation:${hash(w.record_key)}`))continue;
    const proposal={actor_key:w.data.actor,operation:'reaction',target_refs:[w.data.target],objective_ref:'',source_refs:[],dependencies:[]};
    const child=buildSceneIntentBoard(db,guild,origin,[],[proposal],w.record_key),p={intent_ref:child.data.entries[0].intent_ref,disposition:'native_feature_resolution',
      rule_basis_refs:['srd:reaction-rolls'],difficulty:12,trait:'Instinct',stakes_kind:'native_feature',stakes:'Native Feedback reaction.',reason:'Native GM reactive policy feedback_v1; current visible owned-device use.',
      difficulty_reason:'Exact native Static Wraith feature.',feature_ref:w.data.feature,experience_ref:'',advantage:false,disadvantage:false,proposal_version:2,trigger_ref:w.record_key};
    decisions.push(...adjudicateSceneBoard(db,guild,origin,child,[p]));used++;
  }
  // Presence changes invalidate the original NPC snapshot: perform them only after all
  // decisions/reactive policies have consumed the sealed board. A held proposal must
  // not discard independently authorized sibling actions.
  for(const proposal of result.unified_arbitration.environment_actions||[]){
    const key=`environment-action-review:${hash([o.binding.source,o.scope,proposal])}`;
    if(db.getCityRecord(guild,'native_environment_action_review',key))continue;
    try{executeEnvironmentProposal(db,guild,origin,board,proposal,{content});}
    catch(error){
      if(!['GM_ARBITRATION','SCENE_FICTION','AUTONOMOUS_WORLD','NARRATIVE_AUTHORITY','STATE_CONFLICT','INVALID_INPUT'].includes(error.code))throw error;
      db.saveCityRecord(guild,{kind:'native_environment_action_review',key,status:'needs_review',visibility:'gm',source_event:o.binding.source,
        data:{version:1,proposal:structuredClone(proposal),scope:o.scope,scene:o.binding.scene,session:o.binding.session,
          reason:error.message,execution_authorized:false,recovery:'Reconcile the source, supported capability and native opportunity; no proposed arrival or cost was committed.'}});
    }
  }
  return decisions;
}
