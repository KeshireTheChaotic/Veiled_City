import test from 'node:test';import assert from 'node:assert/strict';
import {adversaryHpState,wouldMarkLastAdversaryHp,hpMarksForDamage,buildCombatants,recomputeBudget,derivedAdjustments,battlePointCost,baseBattlePoints,tierForLevel} from '../../src/frameworks/daggerheart/public.js';
import {combatantLine} from '../../src/frameworks/discord/combatant-text.js';
test('adversary remaining HP stays distinct from PC marked HP',()=>{
 const actor={hp_current:3,hp_max:7};assert.deepEqual(adversaryHpState(actor),{remaining:3,max:7,marked:4,marked_half_or_more:true});assert.equal(wouldMarkLastAdversaryHp(actor,3),true);assert.equal(wouldMarkLastAdversaryHp(actor,2),false);assert.throws(()=>adversaryHpState({hp_current:8,hp_max:7}));assert.throws(()=>wouldMarkLastAdversaryHp(actor,-1));
});
test('damage thresholds and minion marks preserve exact native arithmetic',()=>{
 const c={role:'Standard',major_threshold:9,severe_threshold:18};assert.deepEqual([0,8,9,17,18].map(d=>hpMarksForDamage(c,d)),[0,1,2,2,3]);assert.equal(hpMarksForDamage({...c,role:'Minion'},99),1);assert.equal(hpMarksForDamage(c,-3),0);
});
test('combat drafts consume supplied library without creating actors or persistent state',()=>{
 const lib={findAdversary:n=>n==='Offline Sentry'?{name:n,type:'Standard',tier:2,difficulty:13,thresholds:'10 / 20',hp:6,stress:2,standard:'native note'}:null};const e={composition:[{name:'Offline Sentry',quantity:2},{name:'Unknown',quantity:2}]};const snapshot=structuredClone(e);const rows=buildCombatants(e,lib);assert.equal(rows.length,2);assert.equal(rows[1].display_name,'Offline Sentry 2');assert.equal(rows[0].severe_threshold,20);assert.equal(rows[0].hp_max,6);assert.deepEqual(e,snapshot);
});
test('battle point math uses explicit native costs and tier bands',()=>{assert.equal(baseBattlePoints(3),11);assert.equal(battlePointCost('Solo'),5);assert.throws(()=>battlePointCost('Imagined'));assert.deepEqual([1,2,4,5,7,8,10].map(tierForLevel),[1,2,2,3,3,4,4]);});
test('composition adjustments preserve concurrent modifiers and persisted JSON reader',()=>{
 const composition=[{type:'Solo',tier:1,quantity:2,spent_bp:10}];const e={composition_json:JSON.stringify(composition),tier:2,base_bp:11,difficulty:'hard',custom_adjustment_bp:1,damage_boosted:true};const a=recomputeBudget(e);assert.deepEqual(a,{budget:11,spent:10,derived:[{key:'two_plus_solos',delta:-2,label:'2+ Solo adversaries'},{key:'boosted_damage',delta:-2,label:'boosted all adversary damage'},{key:'lower_tier',delta:1,label:'lower-tier adversary present'}],difficultyAdjustment:2,remaining:1});assert.deepEqual(derivedAdjustments([{type:'Standard',tier:2}],{tier:2}),[{key:'no_heavy',delta:1,label:'no Bruiser/Horde/Leader/Solo'}]);
});
test('Discord formatting renders resolved state without changing mechanics',()=>{const c={id:'abcde123456',display_name:'Sentry',role:'Standard',hp_current:2,hp_max:6,stress_max:2,stress_current:1,status:'active',conditions:['Vulnerable']};const before=structuredClone(c);assert.equal(combatantLine(c),'`abcde123` **Sentry** [Standard] — HP 2/6 • Stress 1/2 • active • Vulnerable');assert.deepEqual(c,before);});
