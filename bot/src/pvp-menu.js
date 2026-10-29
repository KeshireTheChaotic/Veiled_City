/** Owner-private UI only. Accepted typed intents are canonical adjudication inputs;
 * human declarations own intent; native receipts own outcomes. No UI flag grants GM authority. */
import {createHash,randomUUID} from 'node:crypto';
import {ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,AttachmentBuilder} from 'discord.js';
import {discordSessionPrincipal} from './frameworks/discord/public.js';
function conversationPrincipal(...args){return discordSessionPrincipal.conversationPrincipal(...args);}
import {currentScene} from './scene-continuity.js';
import {discordWorldEvents} from './frameworks/discord/public.js';
const {indexWorldEvent}=discordWorldEvents;
import {consentAction} from './action-consent.js';
import {pvpTarget} from './pvp-authority.js';
import {TRAITS} from './character-system.js';
import {proposePvp,reviewPvp,revisePvp,respondPvp,pvpOwnerContext,progressPvp,choosePvp,rollPvp,continuePvp} from './narrative-pvp.js';
import {proposeDamagePvp,reviewDamagePvp,reviseDamagePvp,respondDamagePvp,validateDamagePvp,damagePvpOwnerContext} from './pvp-profiles.js';
import {reviewPvpAttack,authorizePvpAttack,rollPvpAttack,validatePvpAttackRoll} from './pvp-attacks.js';
import {rollPvpDamage,reviewPvpDamage,resolvePvpDamage,refreshCampaignPvpDamage} from './pvp-damage.js';
import {reviewPvpReaction,rollPvpReaction} from './pvp-reactions.js';
import {reviewPcDeathMove,choosePcDeathMove,allocatePcDeathRecovery} from './pc-death.js';
import {reviewIncomingAttack,confirmIncomingDefense,resolveIncomingDamage} from './pc-incoming.js';
import {reviewBrawlOpportunity,passBrawlOpportunity,verifyBrawlAttack} from './pvp-brawl.js';
import {authorPvpNarrative,draftPvpNarrative,reviewPvpNarrative,sharePvpNarrative} from './pvp-authorship.js';
import {resumeAutonomousPvpFear} from './pvp-fear-moves.js';
import {KeyedSerialQueue} from "./kernel/serial-queue.js";
import {splitDiscordText} from './discord/chunking.js';
import {reservePvpNotices} from './native-publications.js';
import {PermissionError,StateConflictError,UserInputError} from "./kernel/errors.js";
import {setPvpSafetyStop} from './pvp-campaign-policy.js';

const queue=new KeyedSerialQueue(),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const kinds=['pvp_proposal','pvp_encounter_contract','pvp_attack_request','pvp_damage_offer','pvp_reaction_offer','pc_death_move_request','pc_incoming_attack','typed_intent'];
const parse=id=>{const [p,key,action,proof,...rest]=String(id||'').split(':');return p==='vcp'&&key&&action&&proof&&!rest.length?{key,action,proof}:null;};
export const isPvpMenuInteraction=i=>!!parse(i?.customId);
const cid=(r,a)=>`vcp:${r.record_key}:${a}:${hash([r.data,a]).slice(0,16)}`;
function inventory(db,guild,kind){
  const rows=[];
  for(let offset=0;offset<10000;offset+=100){
    const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});rows.push(...page);
    if(page.length<100)return rows;
  }
  throw new StateConflictError('Private inbox exceeds its safe recovery bound. Use an exact native reference; no options silently omitted.');
}
const nativeOptions=i=>({interactionId:i.id});
function enabled(db,guild){if(db.getCityCalendar(guild).flags.pvp_private_ui!==true)throw new UserInputError('Guided PvP is disabled. Use /vc-roll pvp or /vc-roll effect JSON; no rules changed.');}
function owned(db,guild,user){const p=conversationPrincipal(db,guild,user);if(p.kind!=='owner')throw new PermissionError('Only the current controlled owner may use this private menu.');return p;}
function locate(db,guild,ref){return kinds.map(k=>db.getCityRecord(guild,k,ref)).find(Boolean);}
function terms(db,guild,r){return r.kind==='pvp_proposal'?db.getCityRecord(guild,'pvp_terms_revision',r.data.terms_revision)?.data.snapshot.terms:r.data.snapshot?.terms;}
function scope(db,guild,user,ref){
  const p=owned(db,guild,user),scene=currentScene(db,guild),r=ref&&locate(db,guild,ref);
  if(ref&&!r)throw new StateConflictError('Exact current native reference required.');
  if(r){
    if(r.kind==='typed_intent'){const a=consentAction(db,guild,ref);if(a.principal.user!==user)throw new PermissionError('Own accepted intent required.');}
    else if(['pvp_proposal','pvp_encounter_contract'].includes(r.kind)){
      if(!r.data.participants.some(w=>w.user===user&&w.character===p.character_id))throw new PermissionError('Not your consent scope.');
      if(r.data.scene!==scene.key||r.data.session_id!==scene.session_id)throw new StateConflictError('Stale scene.');
      if(r.kind==='pvp_proposal')pvpOwnerContext(db,guild,user,ref);
    }else{
      const d=r.data,o=d.offer,subjects=r.kind==='pvp_attack_request'?[o.actor,o.target]:r.kind==='pvp_reaction_offer'?[d.binding.character]
        :r.kind==='pvp_damage_offer'?[d.binding.target]:[r.subject_key];
      if(!subjects.includes(p.character_id))throw new PermissionError('Not your native mechanics or affected-owner choice.');
    }
    const s=db.getWorldEvent(guild,r.source_event);
    if(!s||s.status!=='active'||s.scene!==scene.key||s.session_id!==scene.session_id)
      throw new StateConflictError('Native source retracted or scene changed; no new choice or publication.');
  }
  return {p,r,scene,proof:hash([p.revision,p.character_id,scene,ref,r,r&&db.getWorldEvent(guild,r.source_event),
    db.getCharacter(p.character_id).data,r?.kind==='pvp_proposal'?progressPvp(db,guild,user,ref):null])};
}
function token(db,guild,user,ref,view={}){
  const c=scope(db,guild,user,ref),key=randomUUID().replaceAll('-','').slice(0,24);
  const source=c.r?.source_event||indexWorldEvent(db,guild,{key:`pvp-ui-checkpoint:${key}`,kind:'pvp_ui_checkpoint',
    title:'Noncanonical private UI checkpoint',source_id:'native:pvp_ui',scene:c.scene.key,session_id:c.scene.session_id,
    visibility:'character',subject_key:c.p.character_id,details:{user,principal:c.p.revision,canonical:false,authority:'UI navigation only; no intent, consent or effects.'}},'pvp_ui').event_key;
  return db.saveCityRecord(guild,{kind:'pvp_ui_token',key,status:'active',source_event:source,
    visibility:'character',subject_key:c.p.character_id,data:{version:1,guild,user,character:c.p.character_id,
      principal:c.p.revision,scene:c.scene.key,session:c.scene.session_id,reference:ref||null,
      source_digest:c.proof,role:c.r?.kind||'inbox',audience:'character',expires_at:Date.now()+15*60*1000,view}});
}
const button=(r,a,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(cid(r,a)).setLabel(label).setStyle(style);
function payload(db,guild,r,{library}={}){
  const {reference:ref,user,character,view:savedView}=r.data,view={...savedView},c=scope(db,guild,user,ref),native=c.r;
  // A cached UI review is never authority to redisclose revoked source material.
  if(view.reviewed)Object.assign(view,reviewed(db,guild,user,native,library));
  if(view.disclosure_reviewed)view.text=reviewPvpNarrative(db,guild,user,{proposal:ref,narrative:view.disclosure,expected_revision:native.data.terms_hash}).text;
  const title=native?native.kind==='pvp_proposal'?'Narrative only — NO HP damage':native.kind==='pvp_encounter_contract'?'DAMAGE — lethal risk / owner SRD death move':'Your native PvP decision':'Your private PvP inbox';
  const progress=native?.kind==='pvp_proposal'?progressPvp(db,guild,user,ref):null,fear=progress?.consequence_status;
  const text=[title,ref||'',...(native?[`Native status: ${native.status}`]:[]),
    view.text||'Review before authorizing. Closing this menu never withdraws or changes your character.',
    ...(progress?[JSON.stringify(progress,null,2)]:[]), // Native owner projection excludes opposing sealed choices/dice.
    ...(fear?[`Immediate Fear gate: ${fear}. Pending owner defense/Armor remains a separate private native choice.`]:[]),
    'No PvP Hope or Critical Stress award. Action Fear needs an immediate native consequence. No automatic defender reaction.',
    'Fallback: /vc-roll pvp JSON; /vc-roll effect JSON. No private output is sent publicly.'].join('\n');
  const actions=[['close','Close menu'],['safety-stop','Stop hostile PvP NOW']],choices=[];
  if(!native){
    const represented=new Set();
    for(const kind of ['pvp_proposal','pvp_encounter_contract'])for(const x of inventory(db,guild,kind)){
      if(x.data.scene===c.scene.key&&x.data.session_id===c.scene.session_id
        &&x.data.participants.some(p=>p.user===user&&p.character===character)){
        represented.add(x.data.accepted_intent);
        choices.push({label:`${x.status}: ${x.record_key.slice(0,65)}`,ref:x.record_key});
      }
    }
    for(const x of inventory(db,guild,'typed_intent').filter(x=>x.status==='accepted_for_adjudication'&&x.data.actor===character&&!represented.has(x.record_key))){
      try{
        consentAction(db,guild,x.record_key);
        if(pvpTarget(db,guild,x))choices.push({label:`Own attempt: ${x.data.source_span.replace(/\s+/g,' ').slice(0,75)}`,ref:x.record_key});
      }catch(error){if(!error.expected&&!['SCENE_ACTION_WINDOW','NARRATIVE_PVP'].includes(error.code))throw error;}
    }
    for(const k of kinds.slice(2,-1))for(const x of inventory(db,guild,k)){
      const source=db.getWorldEvent(guild,x.source_event);
      if(source?.status!=='active'||source.scene!==c.scene.key||source.session_id!==c.scene.session_id)continue;
      const o=x.data.offer;if(x.subject_key===character||k==='pvp_damage_offer'&&x.data.binding.target===character
        ||k==='pvp_reaction_offer'&&x.data.binding.character===character||k==='pvp_attack_request'&&[o.actor,o.target].includes(character))
        choices.push({label:`${k.replaceAll('_',' ')}: ${x.status}`,ref:x.record_key});
    }
  }else if(native.kind==='typed_intent')actions.push(['offer','Propose narrative stakes'],['offer-damage','Propose lethal-risk duel']);
  else if(['pvp_proposal','pvp_encounter_contract'].includes(native.kind)){
    const t=terms(db,guild,native),damage=native.kind==='pvp_encounter_contract';
    actions.push(['review','Review full terms']);
    if(native.data.version!==4&&['proposed','negotiating','awaiting_mutual_consent','awaiting_consent','locked'].includes(native.status)){
      if(view.reviewed&&native.status!=='locked')actions.push(['accept','Accept EXACT terms'],['decline','Decline privately']);
      actions.push(['counter','Counteroffer my stakes'],['withdraw','Withdraw neutrally']);
      if(!damage)actions.push(['mode-duel','Offer Single Roll Duel'],['mode-strikes','Offer Three Strikes'],
        ['audience-private','Offer private audience'],['audience-shared','Offer bounded party clauses']);
    }
    if(native.status==='locked'){
      if(damage){
        validateDamagePvp(db,guild,ref);
        if(native.data.version===4||t.interaction_scope!=='duel')actions.push(['opportunity','Review my opportunity']);
        for(const a of inventory(db,guild,'pvp_attack_request')){
          const o=a.data.offer;
          if(o.contract!==ref||![o.actor,o.target].includes(character)||!t.target_permissions.some(e=>e.actor===o.actor&&e.target===o.target))continue;
          try{verifyBrawlAttack(db,guild,a);}catch(error){if(error.code!=='NARRATIVE_PVP')throw error;continue;}
          choices.push({label:`${o.actor===character?'Attack':'Defense'}: ${db.getCharacter(o.target)?.name||'target'} — ${a.status}`,ref:a.record_key});
        }
      }else{
        const v=progressPvp(db,guild,user,ref);
        if(v.status==='awaiting_continuation')actions.push(['continue','Continue next exchange']);
        else if(!v.own){for(const trait of t.traits.find(x=>x.character===character).allowed)actions.push([`choose-${trait}`,`Choose ${trait} attempt`]);actions.push(['roll','Roll sealed choice']);}
      }
    }
    if(!damage&&native.data.resolution_receipt){
      const result=db.getCityRecord(guild,'pvp_resolution_receipt',native.data.resolution_receipt);
      if(result?.data.winner===character)actions.push(['success','Author ONLY own success']);
      actions.push(['withhold','Withhold my reaction'],['reaction','Choose: I glare.'],['draft','Private freeform draft']);
      for(const n of inventory(db,guild,'pvp_authored_narrative').filter(n=>n.status==='clauses_authorized'&&n.data.proposal===ref&&(n.subject_key===character
        ||inventory(db,guild,'pvp_narration_disclosure').some(d=>d.status==='accepted'&&d.data.narrative===n.record_key&&d.subject_key===n.subject_key))))
        choices.push({label:'Review my clause for separate disclosure',ref,disclosure:n.record_key});
    }
    if(view.opportunity)actions.push(['pass','Pass my elective opportunity']);
    if(view.disclosure&&!view.disclosure_reviewed)actions.push(['disclosure-review','Review exact clause']);
    if(view.disclosure&&view.disclosure_reviewed&&t.audience==='bilateral_author_projection')actions.push(['share','Confirm bounded disclosure']);
  }else{
    actions.push(['review','Review own mechanics']);
    if(native.kind==='pvp_damage_offer'&&native.status==='awaiting_owner'&&native.data.binding.native_authority==='native_campaign')
      actions.push(['refresh-damage','Reinspect pending defense']);
    if(view.reviewed){
      if(native.kind==='pvp_attack_request'){
        if(!native.data.roll&&(native.data.offer.actor===character
          ||db.getCityRecord(guild,'pvp_encounter_contract',native.data.offer.contract)?.data.version!==4))actions.push(['authorize','Confirm own mechanics']);
        if(native.data.offer.actor===character&&native.status==='ready')actions.push(['attack-roll','Roll authorized attack']);
        if(native.data.offer.actor===character&&native.data.roll&&!native.data.damage&&validatePvpAttackRoll(db,guild,native.data.roll).receipt.data.result.hit)
          actions.push(['damage-roll','Roll native damage']);
      }else if(native.kind==='pvp_damage_offer'&&native.status!=='applied')actions.push(['armor','Spend one Armor Slot'],['no-armor','Do not spend Armor']);
      else if(native.kind==='pvp_reaction_offer'&&native.status!=='resolved')actions.push(['reaction-roll','Roll reviewed reaction']);
      else if(native.kind==='pc_death_move_request'){
        if(native.status==='awaiting_owner')actions.push(['risk_it_all','Choose Risk It All'],['avoid_death','Choose Avoid Death'],['blaze_of_glory','Choose Blaze of Glory']);
        if(view.death?.status==='awaiting_allocation')actions.push(['allocate','Allocate native recovery']);
      }else if(native.kind==='pc_incoming_attack'){
        if(native.status==='awaiting_defense')actions.push(['defense','Confirm reviewed defenses']);
        if(native.status==='awaiting_armor')actions.push(['armor','Spend one Armor Slot'],['no-armor','Do not spend Armor']);
      }
    }
  }
  const pages=splitDiscordText(text,1400),page=Math.max(0,Math.min(view.page||0,pages.length-1)),components=[];
  if(choices.length){
    const offset=Math.min(Math.max(0,view.choice_page||0),Math.floor((choices.length-1)/20))*20,shown=choices.slice(offset,offset+20);
    components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(cid(r,'select')).setPlaceholder('Your current native decisions')
      .addOptions(shown.map((x,i)=>({label:x.label.slice(0,100),value:String(offset+i)})))));
    if(choices.length>20)actions.push(['choices-prev','Earlier choices'],['choices-next','More choices']);
  }
  if(pages.length>1)actions.splice(2,0,['prev','Earlier terms'],['next','More terms']);
  // Discord allows five rows. Action pages preserve every decision without truncation.
  const actionPage=Math.min(Math.max(0,view.action_page||0),Math.floor((actions.length-1)/12)),shownActions=actions.slice(actionPage*12,actionPage*12+12);
  if(actions.length>12)shownActions.push(['actions-prev','Earlier controls'],['actions-next','More controls']);
  for(let n=0;n<shownActions.length;n+=5)components.push(new ActionRowBuilder().addComponents(shownActions.slice(n,n+5).map(([a,l])=>button(r,a,l))));
  return {payload:{content:`**Private PvP — ${page+1}/${pages.length}**\n${pages[page]}`,ephemeral:true,allowedMentions:{parse:[]},components,
    files:[new AttachmentBuilder(Buffer.from(text),{name:'private-pvp-review.txt'})]},actions:shownActions.map(x=>x[0]),choices,
    pages:{page,choice_page:Math.min(Math.max(0,view.choice_page||0),Math.max(0,Math.floor((choices.length-1)/20))),action_page:actionPage},
    limits:{page:pages.length-1,choice_page:Math.max(0,Math.floor((choices.length-1)/20)),action_page:Math.floor((actions.length-1)/12)}};
}
export function openPvpMenu(db,guild,user,reference=null){enabled(db,guild);return payload(db,guild,token(db,guild,user,reference)).payload;}
function reviewed(db,guild,user,r,library){
  if(r.kind==='pvp_proposal')return {text:reviewPvp(db,guild,user,r.record_key).text};
  if(r.kind==='pvp_encounter_contract'){
    const v=reviewDamagePvp(db,guild,user,r.record_key),{contract}=damagePvpOwnerContext(db,guild,user,r.record_key);
    const participants=contract.data.snapshot.terms.participants.map(p=>`${db.getCharacter(p.character).name}: team ${p.team||'none'}`);
    return {text:[v.text,'Exact offered participants/teams:',...participants].join('\n')};
  }
  const v=r.kind==='pvp_attack_request'?reviewPvpAttack(db,guild,user,r.record_key):r.kind==='pvp_damage_offer'?reviewPvpDamage(db,guild,user,r.record_key)
    :r.kind==='pvp_reaction_offer'?reviewPvpReaction(db,guild,user,r.record_key):r.kind==='pc_incoming_attack'?reviewIncomingAttack(db,guild,user,r.record_key,{library})
      :reviewPcDeathMove(db,guild,user,r.record_key);
  return {text:JSON.stringify(v,null,2),...(r.kind==='pc_death_move_request'?{death:v}:{} )};
}
function current(db,i,id){
  enabled(db,i.guildId);const r=db.getCityRecord(i.guildId,'pvp_ui_token',id.key);
  if(!r||r.data.guild!==i.guildId||r.data.user!==i.user.id||r.visibility!=='character')throw new PermissionError('Not your private menu.');
  const c=scope(db,i.guildId,i.user.id,r.data.reference);
  if(c.p.character_id!==r.subject_key||c.p.revision!==r.data.principal)throw new PermissionError('Controlled owner changed.');
  if(cid(r,id.action)!==i.customId||Date.now()>r.data.expires_at||c.proof!==r.data.source_digest)throw new StateConflictError('Menu expired or native revision/source changed. Reopen privately.');
  if(r.status!=='active')throw new StateConflictError('Menu already used. Reopen privately; saved effects are not repeated.');
  return {r,c};
}
function modal(db,i,r,action){
  const next=token(db,i.guildId,i.user.id,r.data.reference,{...r.data.view,modal:action});
  const fields=action.startsWith('choose-')?[['attempt','Your attempted action (not success)',1200]]:action==='allocate'?[['hp','HP marks to clear',2],['stress','Stress marks to clear',2]]:
    action==='draft'?[['text','Your private draft — NOT canon or disclosure',1200]]:
      [['objective','Proposed objective',600],['best','Your proposed best stake',600],['worst','Your proposed worst stake',600]];
  const m=new ModalBuilder().setCustomId(cid(next,'submit')).setTitle('Your private PvP decision');
  for(const [id,label,max] of fields)m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label)
    .setStyle(max>20?TextInputStyle.Paragraph:TextInputStyle.Short).setMaxLength(max).setRequired(true)));
  return m;
}
function offerTerms(db,guild,r,pc,target,values,damage){
  const own=values('best'),worst=values('worst'),objective=values('objective'),expiry=db.getSimulationClock(guild).minute+120;
  const base={objective,stakes:[{character:pc,best:own,worst},{character:target,best:'Proposed: my own objective only.',worst:'Proposed: I do not achieve my objective; I own my response.'}],
    hope_policy:'no_pvp_hope_generation',fear_policy:'immediate_contextual_fear',audience:'private',expires_minute:expiry};
  if(damage)return {...base,version:3,profile:'damage_enabled',participants:[pc,target].map(character=>({character,team:null})),interaction_scope:'duel',
    target_permissions:[{actor:pc,target},{actor:target,target:pc}].map(e=>({...e,effect_class:'attack_damage',max_risk:'lethal'})),
    boundaries:['no_forced_player_dialogue','no_private_information_disclosure','no_forced_player_control','no_involuntary_item_loss','no_authored_permanent_scar'],
    allow_damage:true,lethality:'lethal',last_hp_policy:'owner_selected_srd_death_move',critical_stress_policy:'disabled',scoring_policy:'none',features:[],
    resource_spending:'owner_native_only',stop_policy:'neutral_withdrawal_preserve_committed_effects'};
  return {...base,version:2,mode:'single_roll_duel',stakes:base.stakes.map(s=>({...s,tie:'Neither achieves the objective.'})),
    boundaries:['no_death','no_permanent_maiming','no_involuntary_item_loss','no_HP_armor_stress_damage','no_forced_player_dialogue','no_private_information_disclosure','no_forced_player_control'],
    traits:[pc,target].map(character=>({character,allowed:TRAITS.filter(t=>Number.isSafeInteger(db.getCharacter(character).data.traits?.[t]))})),
    option_policy:'base_trait_only',authorship:'winner_own_success_loser_own_response',tie_policy:'stalemate',stop_policy:'neutral_withdrawal',stall_policy:'wait_no_forfeit'};
}
function execute(db,i,r,c,action,{library,rng}={}){
  const guild=i.guildId,user=i.user.id,ref=r.data.reference,n=c.r,v=r.data.view,who=c.p.character_id,opts={...nativeOptions(i),rng};
  const input={proposal:ref,expected_revision:n?.data.terms_hash,interaction_id:i.id};
  let view={},next=ref,projection=null;
  if(action==='review')view={...reviewed(db,guild,user,n,library),reviewed:true};
  else if(action==='refresh-damage'){
    next=refreshCampaignPvpDamage(db,guild,user,{damage:ref},opts).record_key;
    view={text:'Pending native defense reinspected. Review this exact offer before choosing Armor; no dice or resources changed.'};
  }
  else if(['accept','decline','withdraw'].includes(action)){
    if(n.kind==='pvp_proposal')respondPvp(db,guild,user,{...input,decision:action});
    else respondDamagePvp(db,guild,user,{contract:ref,expected_revision:n.data.terms_hash,decision:action},opts);
  }else if(action==='submit'){
    const values=k=>i.fields.getTextInputValue(k),op=v.modal;
    if(op.startsWith('choose-'))choosePvp(db,guild,user,{...input,...v.round,trait:op.slice(7),attempt:values('attempt')});
    else if(op==='allocate')allocatePcDeathRecovery(db,guild,user,{request:ref,expected_revision:v.death.revision,hp:Number(values('hp')),stress:Number(values('stress'))},opts);
    else if(op==='draft')draftPvpNarrative(db,guild,user,{...input,resolution:n.data.resolution_receipt,role:'reaction',subject_character:who,text:values('text')});
    else if(op==='counter'){
      const t=structuredClone(terms(db,guild,n));t.objective=values('objective');Object.assign(t.stakes.find(s=>s.character===who),{best:values('best'),worst:values('worst')});
      if(n.kind==='pvp_proposal')revisePvp(db,guild,user,{...input,terms:t});else reviseDamagePvp(db,guild,user,{contract:ref,expected_revision:n.data.terms_hash,terms:t},opts);
    }else{
      const a=consentAction(db,guild,ref).row,target=pvpTarget(db,guild,a)?.id;if(!target)throw new UserInputError('Exact sourced PC target required.');
      const t=offerTerms(db,guild,r,who,target,values,op==='offer-damage');
      next=(op==='offer-damage'?proposeDamagePvp(db,guild,user,{accepted_intent:ref,terms:t},opts):proposePvp(db,guild,user,{accepted_intent:ref,opponent:target,terms:t})).record_key;
    }
  }else if(action==='roll'||action==='continue'){
    const p=progressPvp(db,guild,user,ref),round={round:p.round,expected_window_revision:p.window_revision};
    (action==='roll'?rollPvp:continuePvp)(db,guild,user,{...input,...round},{rng});
  }else if(action.startsWith('mode-')||action.startsWith('audience-')){
    const t=structuredClone(terms(db,guild,n));
    if(action.startsWith('mode-'))t.mode=action==='mode-strikes'?'three_strikes':'single_roll_duel';
    else t.audience=action==='audience-shared'?'bilateral_author_projection':'private';
    revisePvp(db,guild,user,{...input,terms:t});
  }else if(action==='authorize')authorizePvpAttack(db,guild,user,{attack:ref,expected_revision:n.data.offer_hash},opts);
  else if(action==='attack-roll')rollPvpAttack(db,guild,user,{attack:ref,expected_revision:n.data.offer_hash},{rng});
  else if(action==='damage-roll')rollPvpDamage(db,guild,user,{attack_receipt:n.data.roll},{rng});
  else if(action==='reaction-roll')rollPvpReaction(db,guild,user,{offer:ref,expected_revision:n.data.digest},opts);
  else if(action==='defense'){confirmIncomingDefense(db,guild,user,ref);resumeAutonomousPvpFear(db,guild,{library,rng});}
  else if(['armor','no-armor'].includes(action)){
    if(n.kind==='pc_incoming_attack'){resolveIncomingDamage(db,guild,user,ref,{armor:action==='armor',library});resumeAutonomousPvpFear(db,guild,{library,rng});}
    else resolvePvpDamage(db,guild,user,{damage:ref,expected_revision:n.data.digest,armor:action==='armor'},opts);
  }else if(['risk_it_all','avoid_death','blaze_of_glory'].includes(action))choosePcDeathMove(db,guild,user,{request:ref,expected_revision:n.data.digest,move:action},opts);
  else if(action==='opportunity'){const x=reviewBrawlOpportunity(db,guild,user,ref);view={opportunity:x.revision,text:JSON.stringify(x,null,2)};}
  else if(action==='pass')passBrawlOpportunity(db,guild,user,{contract:ref,expected_revision:v.opportunity},opts);
  else if(['success','reaction','withhold'].includes(action)){
    const spec={success:['success','stake_success','I achieve only my agreed success.'],reaction:['reaction','reaction_glare','I glare.'],withhold:['withhold','withhold','']}[action];
    const a=authorPvpNarrative(db,guild,user,{...input,resolution:n.data.resolution_receipt,role:spec[0],template:spec[1],text:spec[2],subject_character:who});
    view={text:'Your clause is saved privately. Disclosure is a separate review/confirmation.',disclosure:a.record_key};
  }else if(action==='disclosure-review'){
    const x=reviewPvpNarrative(db,guild,user,{proposal:ref,narrative:v.disclosure,expected_revision:n.data.terms_hash});
    view={disclosure:v.disclosure,disclosure_reviewed:true,text:x.text};
  }else if(action==='share'){
    const shared=sharePvpNarrative(db,guild,user,{...input,narrative:v.disclosure});
    if(shared.kind==='pvp_public_projection'&&shared.status==='approved')projection=shared.record_key;
  }
  return {next,view,projection};
}
async function send(db,i,body,options){
  if(!claimDelivery(db,i))return;
  const data={interaction:i.id,user:i.user.id,audience:'character',uncertain:true};
  try{
    const target=body.components?.[0]?.toJSON().components[0]?.custom_id,parsed=parse(target);
    if(parsed){
      const {r}=current(db,{guildId:i.guildId,user:i.user,customId:target},parsed); // Discord properties can be prototype getters
      payload(db,i.guildId,r,options); // revalidate native review ancestry immediately before private transport
    }
    await (i.deferred||i.replied?i.editReply(body):i.reply(body));data.uncertain=false;
  }catch{throw new StateConflictError('Private UI delivery is uncertain. Reopen to inspect saved native state; do not blindly retry effects.');}
  finally{const t=db.getCityRecord(i.guildId,'pvp_ui_token',parse(i.customId)?.key);
    if(t&&t.data.user===i.user.id)db.saveCityRecord(i.guildId,{kind:'pvp_ui_delivery',key:`pvp-ui:${i.id}`,source_event:t.source_event,
      subject_key:t.subject_key,visibility:'character',status:data.uncertain?'uncertain':'delivered',data});}
}
function claimDelivery(db,i){
  return db.transaction(()=>{
    const prior=db.getCityRecord(i.guildId,'pvp_ui_delivery',`pvp-ui:${i.id}`);
    if(prior){if(prior.data.user!==i.user.id)throw new PermissionError('Interaction identity belongs to another owner.');return false;}
    const r=db.getCityRecord(i.guildId,'pvp_ui_token',parse(i.customId)?.key);
    if(!r||r.data.user!==i.user.id)return true; // generic unauthorized response only; no private native payload
    db.saveCityRecord(i.guildId,{kind:'pvp_ui_delivery',key:`pvp-ui:${i.id}`,source_event:r.source_event,
      subject_key:r.subject_key,visibility:'character',status:'delivering',data:{interaction:i.id,user:i.user.id,audience:'character',uncertain:true}});
    return true;
  });
}
export async function handlePvpMenuInteraction(db,i,options={}){
  const id=parse(i.customId);if(!id)return false;
  if(id.action==='safety-stop'){
    // Urgent control bypasses model/normal menu queues, expiry and stale scene snapshots, not actual ownership.
    const token=db.getCityRecord(i.guildId,'pvp_ui_token',id.key),pc=token&&db.getCharacter(token.subject_key);
    if(!token||token.visibility!=='character'||token.data.user!==i.user.id||pc?.guild_id!==i.guildId
      ||pc.owner_user_id!==i.user.id||cid(token,id.action)!==i.customId)throw new PermissionError('Only your own native safety control may stop your character.');
    setPvpSafetyStop(db,i.guildId,i.user.id,{character_id:pc.id},{interactionId:i.id});
    if((i.deferred||i.replied)&&i.ephemeral!==true)throw new PermissionError('Safety saved; private acknowledgement required.');
    // Save protection even on duplicate callbacks, but never retry an uncertain transport.
    if(!claimDelivery(db,i))return true;
    let uncertain=true;
    try{
      if(!i.deferred&&!i.replied)await i.deferReply({ephemeral:true});
      await i.editReply({content:'Safety stop saved. New and unfinished hostile effects involving your character are held. Committed outcomes remain recorded.',
        components:[],allowedMentions:{parse:[]}});
      uncertain=false;
    }catch{throw new StateConflictError('Safety stop saved; private acknowledgement is uncertain. Inspect saved status rather than retry delivery.');}
    finally{db.saveCityRecord(i.guildId,{kind:'pvp_ui_delivery',key:`pvp-ui:${i.id}`,source_event:token.source_event,
      subject_key:token.subject_key,visibility:'character',status:uncertain?'uncertain':'delivered',
      data:{interaction:i.id,user:i.user.id,audience:'character',uncertain}});}
    return true;
  }
  // Discord delivery identity is immutable. A duplicate callback cannot blindly repost an uncertain acknowledgment.
  const delivered=db.getCityRecord(i.guildId,'pvp_ui_delivery',`pvp-ui:${i.id}`);
  if(delivered){if(delivered.data.user!==i.user.id)throw new PermissionError('Interaction identity belongs to another owner.');return true;}
  const opening=['counter','draft','offer','offer-damage','allocate'].includes(id.action)||id.action.startsWith('choose-');
  if(!opening)await i.deferReply({ephemeral:true}); // before queued work or native effect
  const work=async()=>{
    let body;
    try{
      body=db.transaction(()=>{
        const {r,c}=current(db,i,id),display=payload(db,i.guildId,r,options);
        const allowed=r.data.view.modal?['submit']:display.actions.concat(display.choices.length?['select']:[],r.data.view.disclosure?['disclosure-review']:[]);
        if(!allowed.includes(id.action))throw new PermissionError('This action was not offered on your current private menu.');
        db.saveCityRecord(i.guildId,{...r,key:r.record_key,status:'used'});
        if(opening){
          if(id.action.startsWith('choose-')){const p=progressPvp(db,i.guildId,i.user.id,r.data.reference);r.data.view.round={round:p.round,expected_window_revision:p.window_revision};}
          return {modal:modal(db,i,r,id.action)};
        }
        if(id.action==='close')return {content:'Private menu closed. No withdrawal, consent or resource change.',components:[],ephemeral:true};
        let {reference:ref,view}=r.data,projection=null;
        if(id.action==='select'){
          const value=i.values?.[0];if(!/^\d+$/.test(value||''))throw new UserInputError('Select one current option.');
          const x=display.choices[Number(value)];if(!x||Math.floor(Number(value)/20)!==display.pages.choice_page)throw new UserInputError('Option is not on this menu page.');
          ref=x.ref;view=x.disclosure?{disclosure:x.disclosure}:{};
          if(x.disclosure){const n=locate(db,i.guildId,ref);const xreview=reviewPvpNarrative(db,i.guildId,i.user.id,{proposal:ref,narrative:x.disclosure,expected_revision:n.data.terms_hash});view={...view,disclosure_reviewed:true,text:xreview.text};}
        }else if(['prev','next','choices-prev','choices-next','actions-prev','actions-next'].includes(id.action)){
          const key=id.action.startsWith('choices')?'choice_page':id.action.startsWith('actions')?'action_page':'page';
          view={...view,[key]:Math.min(display.limits[key],Math.max(0,display.pages[key]+(id.action.endsWith('prev')?-1:1)))};
        }else{
          ({next:ref,view,projection}=execute(db,i,r,c,id.action,options));
          if(locate(db,i.guildId,ref)?.kind==='pvp_encounter_contract')reservePvpNotices(db,i.guildId,ref);
        }
        return {next:ref,view,projection};
      });
    }catch(error){
      body={content:'Private decision not applied: menu stale, unavailable or native review required. Reopen /vc-roll pvp-menu; JSON recovery remains available.',ephemeral:true,components:[],allowedMentions:{parse:[]}};
      if(!error.expected&&!['NARRATIVE_PVP','PC_EFFECT_AUTHORITY','PC_DEATH_MOVE','SCENE_ACTION_WINDOW'].includes(error.code))throw error;
    }
    if(body.modal){await sendModal(db,i,body.modal);return true;}
    if(Object.hasOwn(body,'next')){
      const native=locate(db,i.guildId,body.next);
      if(native?.kind==='pvp_attack_request'&&options.publishAttack){
        try{await options.publishAttack(native.record_key);}
        catch(error){
          if(error.code!=='STATE_CONFLICT')throw error;
          body.view={...body.view,text:'Native result saved; private delivery needs reviewed recovery. Do not reroll or blindly resend.'};
        }
      }
      if(['pvp_proposal','pvp_encounter_contract'].includes(native?.kind)&&options.publish){
        try{await options.publish(body.next,body.projection);}
        catch(error){
          if(error.code!=='STATE_CONFLICT')throw error;
          body.view={...body.view,text:'Native choice saved. Private/outbox delivery needs reviewed recovery; do not reroll or blindly resend. Reopen /vc-roll pending.'};
        }
      }
      // Rendering/transport failure cannot roll back an already committed native outcome (notably death).
      try{body=payload(db,i.guildId,token(db,i.guildId,i.user.id,body.next,body.view),options).payload;}
      catch(error){
        const original=db.getCityRecord(i.guildId,'pvp_ui_token',id.key),pc=db.getCharacter(original.subject_key);
        if(!error.expected&&!['NARRATIVE_PVP','PC_EFFECT_AUTHORITY','PC_DEATH_MOVE','SCENE_ACTION_WINDOW'].includes(error.code)
          &&!(pc?.owner_user_id===i.user.id&&pc.status==='dead'))throw error;
        body={content:'Native decision saved once. Reopen your private inbox or use /vc-roll pvp /vc-roll effect for the current receipt. No retry or disclosure was performed.',ephemeral:true,components:[],allowedMentions:{parse:[]}};
      }
    }
    await send(db,i,body,options);return true;
  };
  return opening?work():queue.enqueue(`${i.guildId}:${i.user.id}`,work);
}
async function sendModal(db,i,modal){
  if(!claimDelivery(db,i))return;
  const r=db.getCityRecord(i.guildId,'pvp_ui_token',parse(i.customId).key);let status='uncertain';
  try{current(db,{guildId:i.guildId,user:i.user,customId:modal.data.custom_id},parse(modal.data.custom_id));await i.showModal(modal);status='delivered';}
  catch{throw new StateConflictError('Private modal delivery is uncertain. Reopen the private menu; no native effect was authorized.');}
  finally{db.saveCityRecord(i.guildId,{kind:'pvp_ui_delivery',key:`pvp-ui:${i.id}`,source_event:r.source_event,
    subject_key:r.subject_key,visibility:'character',status,data:{interaction:i.id,user:i.user.id,audience:'character',uncertain:status==='uncertain'}});}
}
