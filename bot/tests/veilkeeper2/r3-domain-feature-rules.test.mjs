import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createDomainCardCatalog} from '../../src/v2/rules/domain-card-catalog.js';
import {domainFeatureRule,domainFeatureOutcome} from '../../src/v2/rules/domain-feature-rules.js';
const catalogFile=new URL('../../../content/CARDS/domain_cards.json',import.meta.url);
function fixture(){const catalog=createDomainCardCatalog(catalogFile),locator={feature:'domain:hex:jinx',slot:'base',source_hash:catalog.findDomainCard('domain:hex:jinx').source_hash},pc={id:'pc',data:{class:'Witch',subclass:'Hedge',level:1,domains:['Hex'],domain_cards:[{name:'Jinx',active:true}],gm_private:'native-rule-only'}};return {catalog,locator,pc};}
test('actual Jinx source supplies target/range/frequency/roll/duration requirements without an activation grant',()=>{
  const f=fixture(),d=domainFeatureRule(f.catalog,f.pc,f.locator);assert.deepEqual(d.rule.target,{kind:'adversary',maximumRange:'Close'});assert.deepEqual(d.rule.limit,{scope:'actor_target_scene',uses:1,perTarget:true,perScene:true});assert.equal(d.rule.roll.trait,'Knowledge');assert.equal(d.rule.roll.difficultyFrom,'target_adversary');assert.equal(d.rule.success.condition,'Vulnerable');assert.equal(d.rule.success.duration.until,'target_action_success_against_caster_or_ally');assert.equal(d.activationAuthorized,false);assert.equal(d.effectsCommitted,false);assert.equal(d.baselineOnly,true);assert.ok(d.rule.requires.includes('complete_action_terms_owner_confirmation'));assert.ok(Object.isFrozen(d.rule.success.duration));assert.doesNotMatch(JSON.stringify(d),/native-rule-only/);
});
test('active-card recall cost is not silently charged as an activation cost',()=>{const f=fixture(),d=domainFeatureRule(f.catalog,f.pc,f.locator);assert.equal(d.rule.recallCost,1);assert.deepEqual(d.rule.printedActivationCosts,[]);assert.ok(d.rule.requires.includes('applicable_house_rules'));assert.ok(d.rule.requires.includes('current_native_execution_readiness'));});
test('success/failure plans preserve source-owned condition and duration without writes or inferred success',()=>{
  const f=fixture(),before=JSON.stringify(f.pc),success=domainFeatureOutcome(f.catalog,f.pc,f.locator,{success:true}),failure=domainFeatureOutcome(f.catalog,f.pc,f.locator,{success:false});assert.equal(success.condition,'Vulnerable');assert.equal(failure.condition,null);assert.equal(failure.duration,null);assert.equal(success.ruleHash,failure.ruleHash);assert.equal(success.effectsCommitted,false);assert.equal(success.activationAuthorized,false);assert.equal(JSON.stringify(f.pc),before);for(const value of [undefined,'success',1,null])assert.throws(()=>domainFeatureOutcome(f.catalog,f.pc,f.locator,{success:value}));
});
test('subclass trait uses the current owned card source and cannot be guessed from class alone',()=>{
  const f=fixture();f.pc.data.subclass='Moon';assert.equal(domainFeatureRule(f.catalog,f.pc,f.locator).rule.roll.trait,'Instinct');f.pc.data.subclass='Unknown';assert.throws(()=>domainFeatureRule(f.catalog,f.pc,f.locator));
});
test('inactive/unowned/stale/unknown card requirements hold instead of becoming generic state effects',()=>{
  for(const change of [f=>{f.pc.data.domain_cards=[];},f=>{f.pc.data.domain_cards[0].active=false;},f=>{f.locator.source_hash='stale';},f=>{f.locator.feature='domain:hex:invented';}]){const f=fixture();change(f);assert.throws(()=>domainFeatureRule(f.catalog,f.pc,f.locator));}
});
test('changed printed constraints cannot keep the prior implementation by supplying a refreshed self-hash',t=>{
  const dir=mkdtempSync(join(tmpdir(),'vk2-domain-rule-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const f=fixture(),file=join(dir,'cards.json'),data=JSON.parse(readFileSync(catalogFile,'utf8')),card=data[f.catalog.findDomainCard(f.locator.feature).domain].find(c=>c.name==='Jinx'),original=card.text;card.text=card.text.replace('Close range','Far range');writeFileSync(file,JSON.stringify(data));const changed=createDomainCardCatalog(file),locator={...f.locator,source_hash:changed.findDomainCard(f.locator.feature).source_hash};assert.throws(()=>domainFeatureRule(changed,f.pc,locator),/rule source/);
  card.text=original;card.activationCosts=[{resource:'hope',amount:3}];writeFileSync(file,JSON.stringify(data));assert.throws(()=>domainFeatureRule(changed,f.pc,{...f.locator,source_hash:changed.findDomainCard(f.locator.feature).source_hash}),/rule source/);
});
