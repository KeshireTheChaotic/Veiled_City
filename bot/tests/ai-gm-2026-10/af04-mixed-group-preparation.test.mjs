import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createGroupFeatureExecutionRules} from '../../src/frameworks/daggerheart/group-feature-execution-rules.js';
import {createGmExecutionRules} from '../../src/frameworks/daggerheart/gm-execution-rules.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

function fixture({area=true,ordinary=false}={}){
  const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key));');
  const put=(kind,key,v)=>{sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(kind,key,JSON.stringify(v));return v;},
    get=(kind,key)=>{const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key);return r?JSON.parse(r.body):null;};
  const template={name:'Ritual Enforcement Team',features:['exact source'],experiences:[]},pc={id:'pc',owner_user_id:'owner',data:{resources:{hope:2}}},
    actor={source_event:'actor-source',location_key:'room',data:{state:'actually_present',scene:'scene',session_id:'session'}},presence={source_event:'pc-source',location_key:'room',data:{state:'actually_present'}},
    origin={session:'session',scene:'scene',location:'room'},scope={mode:'party'},entry={intent_ref:'intent',actor:{type:'npc',key:'caster'},operation:'feature',target_refs:['area']},
    proposal={disposition:'native_feature_resolution',stakes_kind:'native_feature',trait:'Agility',difficulty:14,rule_basis_refs:['srd:reaction-rolls']},
    feature={feature_key:'adversary:ritual-enforcement-team:null-foam',source_hash:'exact-feature-source',template_hash:hash(template),costs:[{resource:'npc_stress',amount:1}]},library={findAdversary:()=>template};
  put('combatant','npc',{id:'npc',base_name:template.name,status:'active',hp_current:3,stress_current:0,stress_max:2});
  put('character','pc',pc);
  put('profile','caster',{guild_id:'guild',npc_key:'caster',name:'Caster'});
  if(ordinary)put('profile','bystander',{guild_id:'guild',npc_key:'bystander',name:'Bystander',data:{capabilities:['agile +99']}});
  let nesting=0,fail=false,rolls=0,mutationId=0,conditionFail=false,pcEffectFail=false,clearFail=false,proxy=false,currentClearRevoked=false;
  const db={transaction:fn=>{const id=`t${++nesting}`;sql.exec(`SAVEPOINT ${id}`);try{const r=fn();sql.exec(`RELEASE ${id}`);return r;}catch(e){sql.exec(`ROLLBACK TO ${id}; RELEASE ${id}`);throw e;}},
    getCityRecord:(_g,kind,key)=>kind==='encounter_binding'?{status:'active',source_event:'binding-source',data:{combatants:[{actor:'caster',id:'npc'}]}}:get(kind,key),
    getMutation:(_g,id)=>get('mutation',id),
    getNpcProfile:(_g,key)=>get('profile',key),
    saveCityRecord:(_g,r)=>{if(fail&&r.kind==='gm_group_feature_execution')throw Error('injected execution storage failure');
      if(pcEffectFail&&r.kind==='gm_group_feature_effect')throw Error('injected owner effect failure');
      if(clearFail&&r.kind==='native_mixed_condition_clear')throw Error('injected clear failure');
      if(conditionFail&&r.kind==='native_mixed_condition')throw Error('injected condition storage failure');return put(r.kind,r.key,{...r,record_key:r.key});},
    listCityRecords:(_g,{kind,actor,limit,offset})=>sql.prepare('SELECT body FROM records WHERE kind=? LIMIT ? OFFSET ?').all(kind,limit,offset).map(r=>JSON.parse(r.body)).filter(r=>r.actor_key===actor),
    updateCombatant:(_id,patch)=>put('combatant','npc',{...get('combatant','npc'),...patch}),
    recordMutation:(_g,v)=>{const id=`mutation-${++mutationId}`;return put('mutation',id,{id,actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,
      mutation_type:v.mutationType,entity_key:v.entityKey,session_id:v.sessionId,visibility:v.visibility,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)});},
    getCurrentEncounter:()=>({id:'encounter',status:'active'}),listCombatants:()=>[get('combatant','npc')],getCampaign:()=>({fear:2}),
    getWorldEvent:(_g,key)=>get('event',key)||{event_key:key,status:'active'},getCharacter:()=>get('character','pc'),
    updateCharacterData:(_key,fn)=>{const c=get('character','pc');fn(c.data);put('character','pc',c);},
    getSavedRoll:(_g,key)=>get('saved_roll',key),ownerAuthoredSource:(_g,key,user)=>get('event',key)?.source_id===`player:${user}`,
    roster:()=>[{character_id:'pc',presence:'present'}]};
  const names=['narrativeSourceVisible','compileNativeFeatures','inspectNativeGmDecision','inspectCommittedGmDecision','nativeReactionTarget','commitGmActionCost',
    'currentScene','scenePresence','sceneAccess','activeCityProxy','conversationPrincipal','personalCharacter','indexWorldEvent','typedRollProof','EncounterLibrary',
    'reserveGmArbitrationNotice','applyNativeStressPassive','inspectNativeConditionClearAncestry'];
  const caps=Object.fromEntries(names.map(n=>[n,()=>{throw Error(`unexpected ${n}`);} ]));
  Object.assign(caps,{currentScene:()=>({session_id:'session',key:'scene'}),scenePresence:(_d,_g,kind)=>kind==='npc'?actor:presence,activeCityProxy:()=>proxy,
    nativeActorControl:()=>({owner_control_type:proxy?'player_proxy':'ai_world'}),
    personalCharacter:()=>get('character','pc'),conversationPrincipal:()=>({kind:'owner',revision:'principal'}),compileNativeFeatures:()=>[feature],
    typedRollProof:(_d,_g,request)=>({difficulty:request.data.breakdown.difficulty,outcome:request.data.result.total>=request.data.breakdown.difficulty?'success':'failure'}),
    reserveGmArbitrationNotice:()=>{},
    narrativeSourceVisible:()=>true,sceneAccess:()=>true,nativeReactionTarget:()=>({principal:'principal',target:hash(presence)}),
    inspectNativeGmDecision:(_d,_g,key)=>{if(key==='clear-decision'&&currentClearRevoked)throw Error('current clear source unavailable');return {row:get('decision',key),entry:get('clear_entry',key)||entry};},
    inspectCommittedGmDecision:(_d,_g,key)=>({row:get('decision',key),entry:get('clear_entry',key)||entry}),
    commitGmActionCost:(_d,_g,key)=>{if(key==='clear-decision'){
      const cost=put('gm_action_cost_receipt','clear-cost',{record_key:'clear-cost',status:'committed',source_event:'clear-source',
        data:{decision:key,opportunity:'clear-opportunity',spotlight:{actor:get('decision',key).data.native.actor,scene:'scene',cost:'clear-cost',index:2}}});
      put('event','clear-cost:spotlight',{event_key:'clear-cost:spotlight',status:'active',kind:'native_gm_spotlight',source_id:'native:unified-gm',visibility:'gm',details:{payload_hash:hash(cost.data.spotlight),cost_hash:hash(cost)}});
      return cost;
    }const c=get('combatant','npc');c.stress_current++;put('combatant','npc',c);return put('gm_action_cost_receipt','cost',
      {record_key:'cost',status:'committed',source_event:'parent-source',data:{decision:'decision'}});},
    planNativeAreaCohort:()=>({area_hash:'area-hash',targets:[{kind:'character',key:'pc',owner:'owner',presence_hash:hash(presence)},
      {kind:'npc',key:'caster',presence_hash:hash(actor),control_hash:'gm-control'},
      ...(ordinary?[{kind:'npc',key:'bystander',presence_hash:'bystander-presence',control_hash:'bystander-control'}]:[])]}),
    indexWorldEvent:(_d,_g,event)=>put('event',event.key,{...event,event_key:event.key,status:'active'}),
    RANGE_BANDS:['Melee','Very Close','Close','Far','Very Far']});
  if(!area){feature.feature_key='adversary:aster-vale-contractor:flashbang';proposal.trait='Instinct';proposal.difficulty=12;entry.target_refs=['pc'];}
  const rules=createGroupFeatureExecutionRules({capabilities:caps}),native=rules.planGroupFeature(db,'guild',{binding:origin,scope},entry,proposal,feature,{library});
  put('decision','decision',{record_key:'decision',source_event:'parent-source',data:{native,origin,scope,proposal,board:'board'}});
  function ownerRequest(execution,total){
    const child=get('gm_arbitration_decision',execution.data.children[0].decision),source_event='owner-roll-source';
    put('event',source_event,{event_key:source_event,status:'active',source_id:'player:owner',details:{author:'owner'}});
    put('saved_roll','owner-roll',{id:'owner-roll',total});
    const request=put('roll_request','owner-request',{kind:'roll_request',record_key:'owner-request',status:'resolved',subject_key:'pc',source_event,
      data:{kind:'reaction',owner_user_id:'owner',roll_id:'owner-roll',input:{gm_invitation:child.record_key},breakdown:{trait:'Agility',difficulty:14},result:{total,duality:'Hope'}}});
    const key=`gm-reaction-submit:${hash([child.record_key,'owner'])}`;
    put('gm_reaction_submission',key,{record_key:key,status:'resolved',visibility:'character',subject_key:'pc',source_event,
      data:{owner:'owner',invitation:child.record_key,invitation_hash:hash(child.data),request:request.record_key}});
    return {child,request};
  }
  function planClear(key='caster'){
    const clearEntry={actor:{type:'npc',key},operation:'prepare',target_refs:[key],dependencies:[]},
      p={disposition:'npc_no_roll',feature_ref:'srd:clear-condition',stakes_kind:'native_feature',trait:null,difficulty:null,
        advantage:false,disadvantage:false,experience_ref:'',rule_basis_refs:['srd:conditions','srd:gm-moves'],reason:'Pull the foam loose and free itself.'};
    const native=rules.planNativeNpcConditionClear(db,'guild',{binding:origin},clearEntry,p,{opportunity:{key:'clear-opportunity'}});
    put('clear_entry','clear-decision',clearEntry);
    put('decision','clear-decision',{record_key:'clear-decision',status:'gm_action_ready',source_event:'clear-source',data:{origin,native}});
    put('gm_arbitration_decision','clear-decision',get('decision','clear-decision'));
    return native;
  }
  const gmNames=['inspectNativeGmDecision','commitGmActionCost','prepareArbitratedIncomingAttack','prepareArbitratedVolley','inspectVolley','EncounterLibrary',
    'personalCharacter','conversationPrincipal','captureWorldInput','persistPlayerIntents','adjudicateAcceptedIntent','contributeRoll','rollRevision',
    'consentAction','historicalActionSource','typedRollProof','indexWorldEvent','commitFeatureChoice','commitFeatureReactionCost','applyFeatureReactionOutcome',
    'validateFeatureInvitation','featureReactionStakes','cancelFeatureReaction','commitNativeNpcAlliance','prepareGroupFeature','inspectGroupFeature',
    'groupReactionState','groupReactionDetails','groupReactionOptions','professionalEntryRollState','commitProfessionalEntryUse','inspectProfessionalEntryUse'];
  const gm=createGmExecutionRules({capabilities:{...Object.fromEntries(gmNames.map(name=>[name,()=>{throw Error(`unexpected GM ${name}`);} ])),
    inspectNativeGmDecision:caps.inspectNativeGmDecision,inspectGroupFeature:rules.inspectGroupFeature,
    commitNativeNpcConditionClear:rules.commitNativeNpcConditionClear,PROFESSIONAL_ENTRY:'adversary:aster-vale-contractor:professional-entry'}});
  return {sql,db,rules,get,put,prepare:()=>rules.prepareGroupFeature(db,'guild','decision',{library,rng:()=>{rolls++;return 2;}}),
    planClear,clear:()=>rules.commitNativeNpcConditionClear(db,'guild','clear-decision'),setClearFailure:v=>clearFail=v,setProxy:v=>proxy=v,
    executeClear:()=>gm.executeUnifiedGmActions(db,'guild',[get('gm_arbitration_decision','clear-decision')],{library})[0],
    revokeCurrentClear:()=>currentClearRevoked=true,
    ownerRequest,setOwnerEffectFailure:v=>pcEffectFail=v,setFailure:v=>fail=v,setConditionFailure:v=>conditionFail=v,rolls:()=>rolls,close:()=>sql.close()};
}

test('existing group transaction pays once, retains owner dice pending and saves native NPC reactions with replay ancestry',()=>{
  const f=fixture();try{
    const first=f.prepare();assert.equal(first.data.children.length,1);assert.equal(first.data.mixed.reactions.length,2);
    assert.equal(first.data.mixed.reactions[0].kind,'character');assert.equal(first.data.mixed.reactions[1].receipt.result.success,false);
    assert.equal(f.get('combatant','npc').stress_current,1);assert.equal(f.rolls(),1);
    assert.deepEqual(f.get('combatant','npc').conditions,['Restrained']);
    const conditions=f.rules.activeNativeConditions(f.db,'guild','caster',{kind:'npc'});assert.equal(conditions.length,1);
    assert.equal(conditions[0].data.cause.spellcast_disadvantage,true);
    assert.equal(f.rules.nativeMovementConditionIssue(f.db,'guild','caster',{kind:'npc',range:'Melee'}),'NATIVE_MOVEMENT_RESTRAINED');
    const invitation=f.get('gm_arbitration_decision',first.data.children[0].decision);assert.equal(invitation.status,'pending_pc_reaction');
    assert.equal(invitation.data.native.owner,'owner');assert.equal(invitation.data.result,undefined);
    assert.deepEqual(f.prepare(),first);assert.equal(f.get('combatant','npc').stress_current,1);assert.equal(f.rolls(),1);
    assert.equal(f.rules.settleGroupFeature(f.db,'guild',first.record_key).status,'awaiting_owners');
  }finally{f.close();}
});

test('failure after NPC dice rolls rolls back costs, invitations and NPC receipts; retry saves once',()=>{
  const f=fixture();try{
    f.setFailure(true);assert.throws(f.prepare,/injected execution storage failure/);
    assert.equal(f.get('combatant','npc').stress_current,0);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM records WHERE kind IN ('gm_action_cost_receipt','gm_arbitration_decision','native_npc_reaction','event')").get().n,0);
    f.setFailure(false);const saved=f.prepare();assert.equal(f.rolls(),2);assert.equal(f.get('combatant','npc').stress_current,1);
    assert.deepEqual(f.prepare(),saved);assert.equal(f.rolls(),2);
  }finally{f.close();}
});

test('saved NPC receipt drift blocks replay without another cost or RNG call',()=>{
  const f=fixture();try{
    f.prepare();const stored=JSON.parse(f.sql.prepare("SELECT body FROM records WHERE kind='native_npc_reaction'").get().body);
    stored.data.result.total=100;f.put(stored.kind,stored.record_key,stored);
    assert.throws(f.prepare);assert.equal(f.rolls(),1);assert.equal(f.get('combatant','npc').stress_current,1);
  }finally{f.close();}
});

test('original group feature preparation keeps its child contract and never rolls NPC dice',()=>{
  const f=fixture({area:false});try{
    const saved=f.prepare();assert.equal(saved.data.children.length,1);assert.equal(saved.data.mixed,undefined);
    const child=f.get('gm_arbitration_decision',saved.data.children[0].decision);
    assert.equal(child.data.native.operation,'request_group_feature_reaction');assert.equal(child.data.native.feature,'adversary:aster-vale-contractor:flashbang');
    assert.equal(child.data.native.owner,'owner');assert.equal(f.rolls(),0);
    assert.deepEqual(f.prepare(),saved);assert.equal(f.get('combatant','npc').stress_current,1);assert.equal(f.rolls(),0);
  }finally{f.close();}
});

test('NPC condition storage failure rolls back the parent, dice receipts and cost, and replay never resurrects a missing condition',()=>{
  const f=fixture();try{
    f.setConditionFailure(true);assert.throws(f.prepare,/injected condition storage failure/);
    assert.equal(f.get('combatant','npc').stress_current,0);assert.equal(f.get('combatant','npc').conditions,undefined);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM records WHERE kind IN ('gm_group_feature_execution','native_npc_reaction','native_mixed_condition')").get().n,0);
    f.setConditionFailure(false);const saved=f.prepare(),priorRolls=f.rolls();
    f.sql.exec("DELETE FROM records WHERE kind='native_mixed_condition'");assert.throws(f.prepare);
    assert.throws(()=>f.rules.inspectGroupFeature(f.db,'guild',saved.record_key));
    assert.equal(f.rolls(),priorRolls);assert.equal(f.get('combatant','npc').stress_current,1);
  }finally{f.close();}
});

for(const total of [8,18])test(`actual inspected owner ${total<14?'failure':'success'} settles its own effect and terminal mixed progress`,()=>{
  const f=fixture();try{
    const parent=f.prepare(),{child,request}=f.ownerRequest(parent,total);
    const effect=f.rules.applyGroupReactionOutcome(f.db,'guild',child,request);
    assert.equal(effect.data.version,4);assert.equal(effect.data.success,total>=14);
    assert.equal(f.get('gm_group_feature_execution',parent.record_key).status,'resolved');
    assert.equal(f.rules.activeNativeConditions(f.db,'guild','pc').length,total<14?1:0);
    assert.equal(f.rules.nativeMovementConditionIssue(f.db,'guild','pc',{range:'Melee'}),total<14?'NATIVE_MOVEMENT_RESTRAINED':null);
    assert.deepEqual(f.rules.validateGroupReactionEffect(f.db,'guild',effect.record_key,{historical:true}),effect);
    assert.deepEqual(f.rules.applyGroupReactionOutcome(f.db,'guild',child,request),effect);
    assert.equal(f.rolls(),1);assert.equal(f.get('combatant','npc').stress_current,1);
  }finally{f.close();}
});

test('owner effect storage failure rolls back its condition, and wrong owner proof cannot mutate PC state',()=>{
  const f=fixture();try{
    const parent=f.prepare(),{child,request}=f.ownerRequest(parent,8);
    f.setOwnerEffectFailure(true);assert.throws(()=>f.rules.applyGroupReactionOutcome(f.db,'guild',child,request),/injected owner effect failure/);
    assert.equal(f.get('character','pc').data.conditions,undefined);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM records WHERE kind='pc_native_condition'").get().n,0);
    f.setOwnerEffectFailure(false);const terminal=f.sql.prepare("SELECT body FROM records WHERE kind='gm_reaction_submission'").get();
    const bad=JSON.parse(terminal.body);bad.data.owner='other';f.put('gm_reaction_submission',bad.record_key,bad);
    assert.throws(()=>f.rules.applyGroupReactionOutcome(f.db,'guild',child,request));
    assert.equal(f.get('character','pc').data.conditions,undefined);
  }finally{f.close();}
});

test('ordinary profile NPC uses native d20 at zero and persisted conditions without inventing a combatant or editing the profile',()=>{
  const f=fixture({ordinary:true});try{
    const profile=f.get('profile','bystander'),parent=f.prepare(),reaction=parent.data.mixed.reactions[2].receipt;
    assert.equal(reaction.version,2);assert.equal(reaction.result.modifier,0);assert.equal(reaction.result.total,2);
    assert.equal(reaction.combatant_hash,null);assert.deepEqual(reaction.profile,{key:'bystander',hash:hash(profile)});
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM records WHERE kind='combatant'").get().n,1);
    assert.deepEqual(f.get('profile','bystander'),profile);
    const conditions=f.rules.activeNativeConditions(f.db,'guild','bystander',{kind:'npc'});
    assert.equal(conditions.length,1);assert.equal(conditions[0].data.cause.condition,'Restrained');
    assert.equal(f.rules.nativeMovementConditionIssue(f.db,'guild','bystander',{kind:'npc',range:'Melee'}),'NATIVE_MOVEMENT_RESTRAINED');
    assert.deepEqual(f.prepare(),parent);assert.equal(f.rolls(),2);assert.equal(f.get('combatant','npc').stress_current,1);
    // A later profile edit cannot invalidate already committed immutable history.
    f.put('profile','bystander',{...profile,name:'Renamed bystander'});
    assert.deepEqual(f.prepare(),parent);assert.equal(f.rolls(),2);
    assert.equal(f.rules.activeNativeConditions(f.db,'guild','bystander',{kind:'npc'}).length,1);
  }finally{f.close();}
});

for(const change of ['drift','wrong-guild','missing'])test(`ordinary profile ${change} before preparation blocks before cost or dice`,()=>{
  const f=fixture({ordinary:true});try{
    const profile=f.get('profile','bystander');
    if(change==='missing')f.sql.exec("DELETE FROM records WHERE kind='profile'");
    else f.put('profile','bystander',{...profile,...(change==='wrong-guild'?{guild_id:'other'}:{name:'Changed'})});
    assert.throws(f.prepare);assert.equal(f.rolls(),0);assert.equal(f.get('combatant','npc').stress_current,0);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM records WHERE kind='native_mixed_condition'").get().n,0);
  }finally{f.close();}
});

test('dead bound NPC never falls back to an ordinary profile',()=>{
  const f=fixture();try{
    f.put('profile','caster',{guild_id:'guild',npc_key:'caster'});
    f.put('combatant','npc',{...f.get('combatant','npc'),hp_current:0});
    assert.throws(f.prepare);assert.equal(f.rolls(),0);assert.equal(f.get('combatant','npc').stress_current,0);
  }finally{f.close();}
});

for(const ordinary of [false,true])test(`native ${ordinary?'ordinary profile':'bound'} NPC release uses a sealed spotlight and preserves reaction history`,()=>{
  const f=fixture({ordinary});try{
    const parent=f.prepare(),key=ordinary?'bystander':'caster',profile=f.get('profile',key),rolls=f.rolls();
    f.planClear(key);const receipt=f.executeClear();assert.equal(receipt.kind,'native_mixed_condition_clear');
    assert.equal(f.rules.activeNativeConditions(f.db,'guild',key,{kind:'npc'}).length,0);
    assert.equal(f.rules.nativeMovementConditionIssue(f.db,'guild',key,{kind:'npc',range:'Melee'}),null);
    assert.deepEqual(f.get('profile',key),profile);f.revokeCurrentClear();assert.deepEqual(f.executeClear(),receipt);assert.equal(f.rolls(),rolls);
    assert.deepEqual(f.prepare(),parent);assert.equal(f.get('combatant','npc').stress_current,1);
    f.sql.exec("DELETE FROM records WHERE kind='native_mixed_condition_clear'");
    assert.throws(()=>f.rules.inspectGroupFeature(f.db,'guild',parent.record_key));
  }finally{f.close();}
});

test('NPC release failure rolls back the marker, spotlight and release record together',()=>{
  const f=fixture();try{
    f.prepare();f.planClear();f.setClearFailure(true);assert.throws(f.clear,/injected clear failure/);
    assert.deepEqual(f.get('combatant','npc').conditions,['Restrained']);assert.equal(f.get('gm_action_cost_receipt','clear-cost'),null);
    assert.equal(f.get('event','clear-cost:spotlight'),null);assert.equal(f.rules.activeNativeConditions(f.db,'guild','caster',{kind:'npc'}).length,1);
    f.setClearFailure(false);assert.equal(f.clear().status,'resolved');
  }finally{f.close();}
});

test('proxy control and changed actor state cannot buy an NPC release spotlight',()=>{
  const f=fixture();try{
    f.prepare();f.setProxy(true);assert.throws(f.planClear);f.setProxy(false);f.planClear();
    f.put('profile','caster',{...f.get('profile','caster'),name:'Changed'});assert.throws(f.clear);
    assert.equal(f.get('gm_action_cost_receipt','clear-cost'),null);assert.deepEqual(f.get('combatant','npc').conditions,['Restrained']);
  }finally{f.close();}
});
