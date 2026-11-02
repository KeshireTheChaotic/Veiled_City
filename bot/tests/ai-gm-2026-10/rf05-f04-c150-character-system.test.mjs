import assert from 'node:assert/strict';
import test from 'node:test';
import * as legacy from '../../src/character-system.js';
import * as character from '../../src/frameworks/character/public.js';

test('Character public and compatibility exports preserve the creation vocabulary and native validation port',()=>{
  const names=['ADVANCEMENTS','CLASS_DOMAINS','CUSTOM_DOMAINS','TRAITS','normalizeClassName','validateConceptDraft',
    'validateDomainAccess','validateTraitSpread'];
  for(const name of names)assert.equal(legacy[name],character[name]);
  assert.deepEqual(character.CLASS_DOMAINS.Bard,['Codex','Grace']);
  assert.equal(character.CUSTOM_DOMAINS.has('Veil'),true);
  assert.deepEqual(character.TRAITS,['Agility','Strength','Finesse','Instinct','Presence','Knowledge']);
  assert.deepEqual(character.ADVANCEMENTS,['traits','hp','stress','experience','domain','evasion','subclass','proficiency','multiclass']);
  assert.equal(character.normalizeClassName(' bArD '),'Bard');

  const calls=[];
  character.characterCreationConsumer.bind({
    validateDomainAccess(className,domains){calls.push(['domain',className,domains]);return {ok:true,className:'Bard'};},
    validateTraitSpread(traits){calls.push(['traits',traits]);return {ok:true};},
    validateStartingLoadout(draft){calls.push(['loadout',draft]);return [];}
  });
  const draft={name:'Neri',class:'bArD',domains:['Codex','Grace'],traits:{Presence:2},
    hook_proposals:[{classification:'open_question'}]};
  assert.deepEqual(character.characterCreationConsumer.sourceCapabilities(),{
    classDomains:character.CLASS_DOMAINS,customDomains:character.CUSTOM_DOMAINS,traits:character.TRAITS,
    normalizeClassName:character.normalizeClassName
  });
  assert.deepEqual(character.validateConceptDraft(draft),{ok:true,errors:[],normalizedClass:'Bard'});
  draft.hook_proposals[0].classification='unsupported';
  assert.deepEqual(character.validateConceptDraft(draft),{
    ok:false,errors:['hook proposal classification is invalid'],normalizedClass:'Bard'
  });
  assert.deepEqual(calls.map(([kind])=>kind),['domain','traits','loadout','domain','traits','loadout']);
});
