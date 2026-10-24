/** Native PC attack preparation, owner choices, dice and immutable receipt proof. */
import {createHash} from 'node:crypto';
import {d,dualityRoll} from './dice.js';
import {createPvpAttackTerms} from './pvp-attack-terms.js';
export function createPvpAttackRules({capabilities}){
const {validateDamageAttackIntent,personalCharacter,scenePresence,sceneAccess,indexWorldEvent,rollTraitBreakdown,captureAttackFear,pendingPvpFear,assertPcCanAct,assertPcAttackable,blazeActionAuthorization,blazeCriticalResult,validateBlazeSavedRoll,brawlAdmission,reserveBrawlAttack,verifyBrawlAttack,consumeBrawlAttack,brawlBatchMayFinish,resolveAutonomousPvpFear,assertPvpSafety,selectRuleBasis,assertPreRollFearRollAllowed,inspectArbitrationOrigin,stageDamagePvp,reserveCampaignAttackNotices,settlePvpDamageAction,consentAction,RANGE_BANDS}=capabilities||{};
if([validateDamageAttackIntent,personalCharacter,scenePresence,sceneAccess,indexWorldEvent,rollTraitBreakdown,captureAttackFear,pendingPvpFear,assertPcCanAct,assertPcAttackable,blazeActionAuthorization,blazeCriticalResult,validateBlazeSavedRoll,brawlAdmission,reserveBrawlAttack,verifyBrawlAttack,consumeBrawlAttack,brawlBatchMayFinish,resolveAutonomousPvpFear,assertPvpSafety,selectRuleBasis,assertPreRollFearRollAllowed,inspectArbitrationOrigin,stageDamagePvp,reserveCampaignAttackNotices,settlePvpDamageAction,consentAction].some(fn=>typeof fn!=='function')||!Array.isArray(RANGE_BANDS))throw new TypeError('Native PC attack capabilities required');
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const CAMPAIGN_PREPARATION=Symbol('native-campaign-attack-preparation');
const campaignAttackActorHash=pc=>hash({status:pc.status,traits:pc.data.traits,proficiency:pc.data.proficiency,
  inventory:pc.data.inventory,conditions:pc.data.conditions});
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function closed(input,keys){if(!input||Array.isArray(input)||Object.keys(input).length!==keys.length||keys.some(k=>!(k in input)))fail("Closed native PC attack fields required.");}
let nativeAttackTerms;
function calculatePvpAttackTerms(...args){
  // The scene and combat ownership graph is cyclic; defer this pure adapter's
  // construction until after module initialization so RANGE_BANDS is initialized.
  nativeAttackTerms??=createPvpAttackTerms({fail,rangeBands:RANGE_BANDS}).calculatePvpAttackTerms;
  return nativeAttackTerms(...args);
}
function mechanics(db,guild,input,{campaign=false,nativePreparation=null}={}){
  const ctx=validateDamageAttackIntent(db,guild,input.attack),{row,contract}=ctx;
  const pc=db.getCharacter(row.data.actor),target=db.getCharacter(row.data.target),ruling=db.getRulesRuling(guild,input.ruling);
  if(!blazeActionAuthorization(db,guild,pc.id,ctx.accepted.record_key))assertPcCanAct(pc,db,guild);
  assertPcAttackable(target,db,guild);
  const proposal=nativePreparation?.mechanics||ctx.accepted.data.native_adjudication;
  if(campaign&&(ctx.accepted.data.operation==='unarmed_attack'&&input.kind!=='unarmed'
    ||ctx.accepted.data.operation==='weapon_attack'&&input.kind!=='weapon'))fail('Native attack cannot substitute the declared weapon/unarmed action.');
  const nativeBasis=campaign&&selectRuleBasis(db,guild,{savedRulingKey:input.ruling,kind:'attack',
    overrideRefs:proposal?.override_refs||[],rawRefs:proposal?.raw_refs||[],houseRefs:proposal?.house_refs||[],homebrewRefs:proposal?.homebrew_refs||[]});
  if(campaign?nativeBasis.kind==='provisional':!ruling?.created_by)
    fail('Exact applicable native attack rules required; unsupported mechanics remain held for review.');
  if(campaign&&(!proposal||proposal.kind!=='attack'||proposal.trait!==input.trait
    ||hash(proposal.modifier_keys||[])!==hash(input.modifier_keys)||proposal.saved_ruling_key!==input.ruling))
    fail('Campaign mechanics must match the exact current source-bound proposal; owner choice remains separate.');
  const actorPresence=scenePresence(db,guild,"character",pc.id),targetPresence=scenePresence(db,guild,"character",target.id);
  for(const presence of [actorPresence,targetPresence])if(presence?.data.state!=="actually_present"||presence.location_key!==contract.data.location_key
    ||db.getWorldEvent(guild,presence.source_event)?.status!=="active")fail("Current source-backed actual attack/target presence required.");
  if(!sceneAccess(db,guild,{observer_type:"character",observer_key:pc.id,target_type:"character",target_key:target.id,sense:"sight"}))fail("Attack needs actual line of sight.");
  const actualRange=actorPresence.data.zone===targetPresence.data.zone?"Melee":targetPresence.data.range;
  const {range,damage,damage_type,evasion}=calculatePvpAttackTerms(input,pc,target,actualRange);
  // Reuse the native modifier inventory/authority checks without entering the adversary attack path.
  const breakdown=rollTraitBreakdown(db,guild,{trait:input.trait,kind:"attack",adjudication:ruling?.ruling||proposal?.explanation||'',
    modifier_keys:input.modifier_keys,source_event:ctx.accepted.source_event,accepted_intent:ctx.accepted.record_key},pc);
  if(breakdown.unresolved.length)fail("Current attack trait unresolved.");
  if([...(pc.data.conditions||[]),...(target.data.conditions||[])].some(c=>c?.active!==false))
    fail("Active conditions require native attack/defense applicability review; never assume vanilla bonuses.");
  // An incoming interrupt may lawfully change the attacker's HP without changing attack mechanics.
  // Current eligibility is checked separately; target state remains exact for Armor/damage CAS.
  const snapshot={actor:campaign?campaignAttackActorHash(pc):hash(pc.data),target:hash(target.data),actor_owner:pc.owner_user_id,target_owner:target.owner_user_id,
    actor_principal:ctx.participants.find(p=>p.character===pc.id).principal_revision,
    target_principal:ctx.participants.find(p=>p.character===target.id).principal_revision,
    actor_presence:hash(actorPresence),target_presence:hash(targetPresence),ruling:hash(campaign?nativeBasis:ruling),breakdown,
    ...(campaign?{native_proposal_hash:hash(proposal)}:{})};
  return {...ctx,pc,target,snapshot,range,damage,damage_type,evasion,breakdown,
    ...(campaign?{native_rule_basis:nativeBasis}:{})};
}
function inventory(db,guild){
  const rows=[];for(let offset=0;offset<10000;offset+=100){const page=db.listCityRecords(guild,{kind:"pvp_attack_request",includeGM:true,limit:100,offset});rows.push(...page);if(page.length<100)return rows;}
  fail("Attack inventory exceeds bounded recovery coverage.");
}
function sourceProof(db,guild,key,{committed=false}={}){
  const row=db.getCityRecord(guild,"pvp_attack_request",key),o=row?.data.offer,s=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.visibility!=="gm"||row.subject_key!==o?.actor||row.data.version!==1||row.data.offer_hash!==hash(o)
    ||key!==`pvp-attack:${hash([guild,o?.input.attack])}`||s?.status!=="active"||s.kind!=="pvp_attack_mechanics_review"
    ||hash(s.details)!==hash(o)||s.subject_key!==null||s.visibility!=="gm"
    ||s.session_id!==o.session||s.scene!==o.scene||!attackReviewAuthority(db,guild,s,o))fail("Exact native attack review source changed/retracted.");
  const ctx=validateDamageAttackIntent(db,guild,o.input.attack,{committed});
  if(o.native_preparation){
    const n=o.native_preparation,board=db.getCityRecord(guild,'scene_intent_board',n.board_ref),
      entry=board?.data.entries?.find(e=>e.intent_ref===ctx.accepted.record_key),origin=db.getWorldEvent(guild,n.origin?.source);
    if(o.authority!=='native_campaign'||!entry||hash(entry)!==n.entry_hash||hash(board.data.origin)!==hash(n.origin)
      ||origin?.status!=='active'||hash(origin.details)!==n.origin.source_hash)
      fail('Campaign native arbitration source or accepted entry changed.');
  }
  if(o.actor!==ctx.row.data.actor||o.target!==ctx.row.data.target||o.terms_hash!==ctx.contract.data.terms_hash
    ||o.session!==ctx.row.data.session_id||o.scene!==ctx.row.data.scene||row.source_event!==`${key}:source`)fail("Attack source/target/terms changed.");
  verifyBrawlAttack(db,guild,row,{committed:!!row.data.roll});
  return {...ctx,row,o,attackIntent:ctx.row};
}
function attackReviewAuthority(db,guild,source,offer){
  if(offer.authority!=='native_campaign')return source.source_id===`gm:${offer.reviewer}`&&db.ownerAuthoredSource(guild,source.event_key,offer.reviewer);
  const m=source.source_kind==='mutation'&&db.getMutation(guild,source.source_id);
  let saved;try{saved=JSON.parse(m?.after_json||'null');}catch{return false;}
  return db.getCityRecord(guild,'pvp_encounter_contract',offer.contract)?.data.version===4&&offer.reviewer==='native:campaign_pvp'
    &&m?.actor_type==='system'&&m.actor_id==='campaign_pvp'&&m.source_layer==='pvp_campaign'&&m.mutation_type==='campaign_attack_review'
    &&m.entity_key===offer.input.attack&&m.session_id===offer.session&&m.visibility==='gm'&&hash(saved)===hash(offer);
}
function live(db,guild,key){
  const proof=sourceProof(db,guild,key),actual=mechanics(db,guild,proof.o.input,
    {campaign:!!proof.o.native_rule_basis,nativePreparation:proof.o.native_preparation||null});
  brawlAdmission(db,guild,actual,key);
  if(hash(actual.snapshot)!==hash(proof.o.snapshot)||actual.damage!==proof.o.damage||actual.evasion!==proof.o.evasion)
    fail("Attack equipment, target Evasion, source or sheet compare-and-set is stale; refresh review without dice/cost.");
  return {...actual,request:proof.row,o:proof.o};
}
/** Native current/saved request adapter; no owner approval, dice or effect granted. */
function inspectPvpAttackRequest(db,guild,key,{historical=false}={}){
  const proof=historical?sourceProof(db,guild,key,{committed:true}):live(db,guild,key);
  return {request:proof.request||proof.row,accepted:proof.accepted,owner:proof.o.snapshot.actor_owner,character:proof.o.actor,
    session:proof.o.session,scene:proof.o.scene};
}
function owner(db,guild,user,o){
  const character=o.snapshot.actor_owner===user?o.actor:o.snapshot.target_owner===user?o.target:null;
  if(!character)fail("Only current affected owner participants may inspect this private attack.");
  personalCharacter(db,guild,user,character);return character;
}
function preparePvpAttack(db,guild,user,input,{gm=false,interactionId,nativePreparation=null}={}){
  if(!gm||!user||!interactionId)fail("Authenticated GM source/rules review required; models cannot prepare attack mechanics.");
  closed(input,["attack","kind","weapon","trait","modifier_keys","ruling"]);
  return db.transaction(()=>{
    const c=mechanics(db,guild,input,{campaign:gm===CAMPAIGN_PREPARATION,
      nativePreparation:gm===CAMPAIGN_PREPARATION?nativePreparation:null}),key=`pvp-attack:${hash([guild,input.attack])}`,prior=db.getCityRecord(guild,"pvp_attack_request",key);
    if(prior){live(db,guild,key);if(hash(prior.data.offer.input)!==hash(input))fail("Native attack replay cannot change mechanics.");return prior;}
    assertPvpSafety(db,guild,[c.pc.id,c.target.id]);
    if(pendingPvpFear(db,guild,c.contract).length)fail("Immediate Fear consequence pending; no next attack.");
    const brawl=brawlAdmission(db,guild,c,key);
    if(c.terms.interaction_scope==="duel"&&!blazeActionAuthorization(db,guild,c.pc.id,c.accepted.record_key)
      &&inventory(db,guild).some(r=>(r.data.offer?.contract===c.contract.record_key
        ||c.contract.data.version===4&&r.data.offer?.scene===c.row.data.scene&&r.data.offer?.actor===c.pc.id)
        &&!["missed","resolved","cancelled"].includes(r.status)))
      fail("An unfinished attack must reach its native terminal path before another elective attack.");
    if(gm===CAMPAIGN_PREPARATION&&c.contract.data.version!==4)fail('Native campaign preparation cannot upgrade a bilateral contract.');
    const offer={version:1,input,reviewer:user,...(gm===CAMPAIGN_PREPARATION?{authority:'native_campaign',native_rule_basis:c.native_rule_basis,
      ...(nativePreparation?{native_preparation:nativePreparation}:{})}:{}),actor:c.pc.id,target:c.target.id,contract:c.contract.record_key,terms_hash:c.contract.data.terms_hash,
      session:c.row.data.session_id,scene:c.row.data.scene,snapshot:c.snapshot,trait:input.trait,damage:c.damage,damage_type:c.damage_type,
      range:c.range,evasion:c.evasion,breakdown:c.breakdown,...(brawl?{brawl}:{})};
    const mutation=gm===CAMPAIGN_PREPARATION&&db.recordMutation(guild,{sessionId:offer.session,actorType:'system',actorId:'campaign_pvp',
      sourceLayer:'pvp_campaign',mutationType:'campaign_attack_review',entityKey:input.attack,visibility:'gm',after:offer});
    const s=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"pvp_attack_mechanics_review",title:"Native PC attack awaiting independent owner review",
      ...(mutation?{source_kind:'mutation',source_id:mutation.id}:{source_id:`gm:${user}`}),session_id:offer.session,scene:offer.scene,visibility:"gm",subject_key:offer.actor,details:offer},user);
    if(s.status!=="active"||hash(s.details)!==hash(offer))fail("Attack review source changed.");
    const row=db.saveCityRecord(guild,{kind:"pvp_attack_request",key,status:"awaiting_players",source_event:s.event_key,visibility:"gm",subject_key:offer.actor,
      data:{version:1,offer,offer_hash:hash(offer)}});
    if(c.contract.data.version===4)db.saveCityRecord(guild,{kind:'pvp_defense_option_receipt',key:`${key}:defense`,status:'confirmed',
      source_event:s.event_key,visibility:'character',subject_key:offer.target,
      data:{version:4,attack:key,offer_hash:row.data.offer_hash,evasion:offer.evasion,owner:offer.snapshot.target_owner,mode:'native_base_evasion_no_owner_choice'}});
    return reserveBrawlAttack(db,guild,c,row);
  });
}
/** Reuse the accepted turn's untrusted proposal; native metadata and owner confirmation remain mandatory. No provider or dice. */
function prepareCampaignPvpAttack(db,guild,staged){
  const ctx=validateDamageAttackIntent(db,guild,staged.record_key);
  if(ctx.contract.data.version!==4)return null;
  if(db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual')
    fail('Campaign native mechanics preparation is held by explicit manual GM policy.');
  const a=ctx.accepted.data.native_adjudication;
  if(!a||a.kind!=='attack')fail('Campaign attack needs an exact source-grounded native mechanics proposal.');
  const unarmed=ctx.accepted.data.operation==='unarmed_attack'||a.attack_source==='unarmed';
  return preparePvpAttack(db,guild,'native:campaign_pvp',{attack:staged.record_key,kind:unarmed?'unarmed':'weapon',
    weapon:unarmed?null:a.attack_source,trait:a.trait,modifier_keys:a.modifier_keys,ruling:a.saved_ruling_key},
  {gm:CAMPAIGN_PREPARATION,interactionId:`native:${staged.record_key}`});
}
/** Same-request unified producer. A serialized origin or model's native marker cannot call this as authority. */
function prepareCampaignPvpFromBoard(db,guild,origin,board,entry,p){
  const o=inspectArbitrationOrigin(db,guild,origin),accepted=consentAction(db,guild,entry.intent_ref).row;
  if(entry.actor.type!=='character'||entry.actor.key!==accepted.data.actor||entry.source_ref!==accepted.source_event
    ||entry.source_hash!==accepted.data.source_hash||entry.target_refs.length!==1
    ||entry.target_refs[0]!==accepted.data.target_key||board.kind!=='scene_intent_board'
    ||hash(db.getCityRecord(guild,board.kind,board.record_key)?.data)!==hash(board.data)||hash(board.data.origin)!==hash(o.binding)
    ||!board.data.entries.some(e=>hash(e)===hash(entry))||p.disposition!=='request_pc_action_roll'||p.stakes_kind!=='native_attack'
    ||!['unarmed_attack','equipped_attack'].includes(p.feature_ref)||p.experience_ref||p.advantage||p.disadvantage
    ||!p.rule_basis_refs.includes('srd:attack-rolls')||!p.stakes.trim()||!p.difficulty_reason.trim()
    ||accepted.data.scene!==o.binding.scene||accepted.data.session_id!==o.binding.session)
    fail('Exact native campaign arbitration entry and source rules required.');
  const staged=stageDamagePvp(db,guild,accepted);if(!staged||staged.data.version!==4)fail('Explicit enabled native campaign scope required.');
  const pc=db.getCharacter(accepted.data.actor),unarmed=p.feature_ref==='unarmed_attack',
    weapons=(pc.data.inventory||[]).filter(w=>w?.equipped===true&&w.trait===p.trait);
  if(!unarmed&&weapons.length!==1)fail('Choose an exact equipped weapon privately; no ambiguous equipment selection.');
  if(p.difficulty!==null&&p.difficulty!==db.getCharacter(staged.data.target).data.evasion)
    fail('Native PC attack uses actual target Evasion, not an invented Difficulty.');
  const mechanics={kind:'attack',trait:p.trait,modifier_keys:[],saved_ruling_key:'',raw_refs:p.rule_basis_refs,
    override_refs:[],house_refs:[],homebrew_refs:[],explanation:p.reason,attack_source:unarmed?'unarmed':weapons[0].name};
  const nativePreparation={origin:o.binding,board_ref:board.record_key,entry_hash:hash(entry),mechanics};
  return preparePvpAttack(db,guild,'native:campaign_pvp',{attack:staged.record_key,kind:unarmed?'unarmed':'weapon',
    weapon:unarmed?null:weapons[0].name,trait:p.trait,modifier_keys:[],ruling:''},
    {gm:CAMPAIGN_PREPARATION,interactionId:`native:${staged.record_key}`,nativePreparation});
}
/** Read-only owner projection. Rendering or receiving it never authorizes dice, costs or a reaction. */
function pvpAttackOwnerStatus(db,guild,user,key){
  const row=db.getCityRecord(guild,'pvp_attack_request',key),proof=row?.data.roll?sourceProof(db,guild,key,{committed:true}):live(db,guild,key),
    o=proof.o,character=owner(db,guild,user,o),role=character===o.actor?'attacker':'defender';
  return {attack:key,status:(proof.request||proof.row).status,offer_hash:hash(o),role,character,
    campaign:proof.contract.data.version===4,
    ...(role==='attacker'?{trait:o.trait,trait_bonus:o.breakdown.trait_bonus,modifiers:o.breakdown.modifiers,damage:o.damage,
      damage_type:o.damage_type,range:o.range,
      ...((proof.request||proof.row).data.roll?{own_roll:(()=>{const r=validatePvpAttackRoll(db,guild,(proof.request||proof.row).data.roll).receipt.data.result;
        return {total:r.total,duality:r.duality,hit:r.hit};})()}:{})}:{evasion:o.evasion}),
    authority:'Owner-private status only; no signature, optional choice, dice, cost or disclosure.'};
}
function reviewPvpAttack(db,guild,user,key){
  return db.transaction(()=>{
    const {request:row,o}=live(db,guild,key),character=owner(db,guild,user,o),role=character===o.actor?"attacker":"defender";
    db.saveCityRecord(guild,{kind:"pvp_attack_review",key:`${key}:${character}`,status:"reviewed",source_event:row.source_event,
      visibility:"character",subject_key:character,data:{user,offer_hash:hash(o),role}});
    return {attack:key,status:row.status,offer_hash:hash(o),role,character,
      ...(role==="attacker"?{trait:o.trait,trait_bonus:o.breakdown.trait_bonus,modifiers:o.breakdown.modifiers,damage:o.damage,damage_type:o.damage_type,range:o.range}
        :{evasion:o.evasion}),
      instruction:"Review your own current mechanics. Standard attack uses current Evasion, no free defender roll. Unsupported optional features hold for native ruling. No Hope/critical Stress; Fear requires an immediate native move. Armor and death choices remain affected-owner decisions."};
  });
}
function choice(db,guild,row,character){
  const o=row.data.offer,key=`${row.record_key}:authorize:${character}`,s=db.getWorldEvent(guild,key),user=character===o.actor?o.snapshot.actor_owner:o.snapshot.target_owner;
  if(character===o.target&&db.getCityRecord(guild,'pvp_encounter_contract',o.contract)?.data.version===4){
    const defense=db.getCityRecord(guild,'pvp_defense_option_receipt',`${row.record_key}:defense`),source=db.getWorldEvent(guild,row.source_event);
    if(defense?.status!=='confirmed'||defense.visibility!=='character'||defense.subject_key!==o.target||defense.source_event!==row.source_event
      ||hash(defense.data)!==hash({version:4,attack:row.record_key,offer_hash:row.data.offer_hash,evasion:o.evasion,owner:o.snapshot.target_owner,mode:'native_base_evasion_no_owner_choice'})
      ||source?.status!=='active'||hash(source.details)!==hash(o))fail('Native campaign base Evasion proof changed; no defender consent implied.');
    return source;
  }
  if(!s)return null;
  if(s.status!=="active"||s.kind!=="pvp_attack_owner_authorization"||s.source_id!==`player:${user}`||s.subject_key!==character
    ||s.visibility!=="character"||s.scene!==o.scene||s.session_id!==o.session||s.details.author!==user
    ||s.details.attack!==row.record_key||s.details.offer_hash!==row.data.offer_hash||s.details.character!==character
    ||!db.ownerAuthoredSource(guild,key,user))fail("Exact current owner attack/defense authorization source revoked or changed.");
  return s;
}
function authorizePvpAttack(db,guild,user,input,{interactionId}={}){
  closed(input,["attack","expected_revision"]);if(!interactionId)fail("Authenticated owner interaction required.");
  return db.transaction(()=>{
    const {request:row,o}=live(db,guild,input.attack),character=owner(db,guild,user,o);
    if(character===o.target&&db.getCityRecord(guild,'pvp_encounter_contract',o.contract)?.data.version===4)
      fail('Campaign base Evasion is native, not a voluntary defender approval. Use only your own optional reaction, Armor or safety controls.');
    assertPvpSafety(db,guild,[o.actor,o.target]);
    if(input.expected_revision!==row.data.offer_hash)fail("Owner mechanics revision changed; private review required.");
    const review=db.getCityRecord(guild,"pvp_attack_review",`${input.attack}:${character}`);
    if(review?.status!=="reviewed"||review.data.user!==user||review.data.offer_hash!==row.data.offer_hash||review.source_event!==row.source_event
      ||review.visibility!=="character"||review.subject_key!==character)fail("Privately review exact own attack/defense mechanics before authorization.");
    if(row.data.roll)fail("Dice already saved; no new authorization or reroll.");
    if(!choice(db,guild,row,character))indexWorldEvent(db,guild,{key:`${input.attack}:authorize:${character}`,kind:"pvp_attack_owner_authorization",
      title:"Owner-authorized native PC attack mechanics",source_id:`player:${user}`,session_id:o.session,scene:o.scene,visibility:"character",subject_key:character,
      details:{author:user,character,attack:input.attack,offer_hash:row.data.offer_hash,interaction:interactionId}},user);
    const ready=[o.actor,o.target].every(c=>choice(db,guild,row,c));
    const defense=choice(db,guild,row,o.target);
    if(defense&&db.getCityRecord(guild,'pvp_encounter_contract',o.contract)?.data.version!==4)db.saveCityRecord(guild,{kind:"pvp_defense_option_receipt",key:`${input.attack}:defense`,status:"confirmed",source_event:defense.event_key,
      visibility:"character",subject_key:o.target,data:{version:1,attack:input.attack,offer_hash:row.data.offer_hash,evasion:o.evasion,owner:o.snapshot.target_owner,mode:"base_evasion_no_extra_roll"}});
    return db.saveCityRecord(guild,{...row,key:row.record_key,status:ready?"ready":"awaiting_players"});
  });
}
/** Read-only saved native ancestry. It never rolls or changes character resources. */
function validatePvpAttackRoll(db,guild,key){
  const row=db.getCityRecord(guild,"pvp_attack_roll_receipt",key),d=row?.data,request=d&&db.getCityRecord(guild,"pvp_attack_request",d.attack),o=request?.data.offer;
  if(row?.status!=="resolved"||!o||key!==`${d.attack}:roll`||request.data.roll!==key||row.visibility!=="gm"||row.subject_key!==o.actor
    ||row.source_event!==`${d.attack}:authorize:${o.actor}`||d.result.attack!==d.attack||d.result.terms_hash!==o.terms_hash
    ||d.result.roll_type!=="damage_pvp_attack"||d.result.evasion!==o.evasion||d.result.target_character_id!==o.target
    ||d.result.hit!==(d.result.duality==="Critical"||d.result.total>=o.evasion))fail("Exact native PC attack roll receipt required.");
  const {contract}=sourceProof(db,guild,d.attack,{committed:true});
  if(!Number.isSafeInteger(row.minute)||row.minute<0||row.minute>=contract.data.snapshot.terms.expires_minute)
    fail("Native attack must have committed before signed consent expiry; history cannot authorize late dice.");
  choice(db,guild,request,o.actor);choice(db,guild,request,o.target);
  const saved=db.getSavedRoll(guild,d.roll_id),defense=db.getCityRecord(guild,"pvp_defense_option_receipt",`${d.attack}:defense`);
  if(saved?.payload.auto_critical){const blaze=validateBlazeSavedRoll(db,guild,saved.id),staged=db.getCityRecord(guild,"pvp_attack_intent",o.input.attack);
    if(blaze.data.action!==staged.data.accepted_intent)fail("Blaze Critical belongs to a different native attack.");}
  if(saved?.roll_type!=="damage_pvp_attack"||saved.session_id!==o.session||saved.character_id!==o.actor||saved.discord_user_id!==o.snapshot.actor_owner
    ||hash(saved.payload)!==hash(d.result)||defense?.status!=="confirmed"||defense.subject_key!==o.target
    ||hash(defense.data)!==hash(contract.data.version===4
      ?{version:4,attack:d.attack,offer_hash:request.data.offer_hash,evasion:o.evasion,owner:o.snapshot.target_owner,mode:'native_base_evasion_no_owner_choice'}
      :{version:1,attack:d.attack,offer_hash:request.data.offer_hash,evasion:o.evasion,owner:o.snapshot.target_owner,mode:"base_evasion_no_extra_roll"})
    ||defense.source_event!==choice(db,guild,request,o.target).event_key)fail("Saved dice and independent native defender receipt required.");
  return {receipt:row,request,offer:o,contract:db.getCityRecord(guild,"pvp_encounter_contract",o.contract)};
}
function rollPvpAttack(db,guild,user,input,{rng=d}={}){
  closed(input,["attack","expected_revision"]);
  const receipt=db.transaction(()=>{
    const proof=sourceProof(db,guild,input.attack,{committed:true}),row=proof.row,o=proof.o;
    if(user!==o.snapshot.actor_owner)fail("Only the authenticated current attacker owner may roll.");
    personalCharacter(db,guild,user,o.actor);
    if(input.expected_revision!==row.data.offer_hash)fail("Attack mechanics revision changed.");
    if(row.data.roll)return validatePvpAttackRoll(db,guild,row.data.roll).receipt;
    const c=live(db,guild,input.attack);
    assertPreRollFearRollAllowed(db,guild,row);
    assertPvpSafety(db,guild,[c.pc.id,c.target.id]);
    if(row.status!=="ready"||![o.actor,o.target].every(character=>choice(db,guild,row,character)))fail("Independent owner attack/defense approvals required; attack not ready.");
    const due=pendingPvpFear(db,guild,c.contract);
    if(due.length&&!brawlBatchMayFinish(db,guild,row,due))fail("Immediate Fear pending; no dice outside the exact pre-reserved simultaneous batch.");
    const result={...(blazeCriticalResult(db,guild,o.actor,c.accepted.record_key)
      ||dualityRoll({modifier:o.breakdown.subtotal,advantage:o.breakdown.advantage,disadvantage:o.breakdown.disadvantage},rng)),
      roll_type:"damage_pvp_attack",attack:input.attack,terms_hash:o.terms_hash,character_id:o.actor,target_character_id:o.target,evasion:o.evasion};
    result.hit=result.duality==="Critical"||result.total>=o.evasion;
    const rollId=db.addRoll(guild,o.session,user,o.actor,"damage_pvp_attack",result),authorization=choice(db,guild,row,o.actor);
    const receipt=db.saveCityRecord(guild,{kind:"pvp_attack_roll_receipt",key:`${input.attack}:roll`,status:"resolved",source_event:authorization.event_key,
      visibility:"gm",subject_key:o.actor,data:{version:1,attack:input.attack,roll_id:rollId,result}});
    db.saveCityRecord(guild,{...row,key:row.record_key,status:result.hit?"awaiting_damage":"missed",data:{...row.data,roll:receipt.record_key}});
    consumeBrawlAttack(db,guild,row,receipt);
    captureAttackFear(db,guild,c.contract,receipt);
    return receipt;
  });
  const request=db.getCityRecord(guild,'pvp_attack_request',receipt.data.attack);
  if(db.getCityRecord(guild,'pvp_encounter_contract',request.data.offer.contract)?.data.version===4)
    reserveCampaignAttackNotices(db,guild,request.record_key);
  if(db.getCityCalendar(guild).flags.autonomous_pvp_fear!==false){
    const fear=db.listCityRecords(guild,{kind:"pvp_fear_trigger",includeGM:true,limit:100})
      .find(t=>t.data.version===2&&t.data.attack_receipt===receipt.record_key&&t.status==="awaiting_move");
    if(fear)resolveAutonomousPvpFear(db,guild,fear.record_key);
  }
  if(!receipt.data.result.hit)settlePvpDamageAction(db,guild,receipt.data.attack);
  return receipt;
}

return Object.freeze({campaignAttackActorHash,attackReviewAuthority,inspectPvpAttackRequest,preparePvpAttack,prepareCampaignPvpAttack,prepareCampaignPvpFromBoard,pvpAttackOwnerStatus,reviewPvpAttack,authorizePvpAttack,validatePvpAttackRoll,rollPvpAttack});
}
