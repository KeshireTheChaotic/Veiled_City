import test from 'node:test';
import assert from 'node:assert/strict';
import {EncounterLibrary} from '../../src/frameworks/daggerheart/encounter-library.js';
import {featureRollSource,spellcastTraitSource} from '../../src/frameworks/daggerheart/feature-roll-source-rules.js';

test('SRD Spellcast trait follows the exact subclass and explicit multiclass source',()=>{
  assert.equal(spellcastTraitSource({class:'Assassin',subclass:'Executioners Guild'}).trait,'Agility');
  assert.equal(spellcastTraitSource({class:'Assassin',subclass:'Poisoners Guild'}).trait,'Knowledge');
  assert.equal(spellcastTraitSource({class:'Witch',subclass:'Hedge'}).trait,'Knowledge');
  assert.equal(spellcastTraitSource({class:'Witch',subclass:'Moon'}).trait,'Instinct');
  assert.equal(spellcastTraitSource({class:'Wizard',subclass:'School of War',multiclass:{class:'Bard',subclass:'Wordsmith'}},{slot:'multiclass'}).trait,'Presence');
  assert.throws(()=>spellcastTraitSource({class:'Witch',subclass:'invented',spellcast_trait:'Agility'}));
  assert.throws(()=>spellcastTraitSource({class:'Wizard',subclass:'School of War'},{slot:'unowned'}));
});

test('packaged roll clause supplies source identity without granting Jinx activation or effect',()=>{
  const library=new EncounterLibrary('../content'),source=library.findDomainCard('domain:hex:jinx'),
    pc={data:{class:'Witch',subclass:'Hedge',level:1,domains:['Hex','Sage'],domain_cards:[{name:'Jinx',active:true}]}},
    input={feature:source.feature,slot:'base',source_hash:source.source_hash};
  const identity=featureRollSource(library,pc,input);
  assert.equal(identity.classification,'spellcast');assert.equal(identity.trait,'Knowledge');assert.equal(identity.execution_authorized,false);
  assert.equal(source.card.text.slice(identity.clause.start,identity.clause.end),'Make a Spellcast Roll');
  assert.deepEqual(featureRollSource(library,pc,input),identity);
  assert.throws(()=>featureRollSource(library,pc,{...input,source_hash:'stale'}));
  pc.data.domain_cards[0].active=false;assert.throws(()=>featureRollSource(library,pc,input));
  pc.data.domain_cards[0]={name:'Other',active:true,text:source.card.text};assert.throws(()=>featureRollSource(library,pc,input));
});

test('Spell type and references to a Spellcast result do not manufacture a Spellcast Roll',()=>{
  const library=new EncounterLibrary('../content'),source=library.findDomainCard('domain:hex:salt-circle'),
    pc={data:{class:'Witch',subclass:'Hedge',level:1,domains:['Hex','Sage'],domain_cards:[{name:'Salt Circle',active:true}]}},
    input={feature:source.feature,slot:'base',source_hash:source.source_hash};
  assert.equal(source.card.type,'Spell');assert.match(source.card.text,/Spellcast result/);
  assert.throws(()=>featureRollSource(library,pc,input),/explicit_spellcast_clause/);
  assert.equal(library.findDomainCard('jinx'),null);assert.equal(library.findDomainCard('domain:hex:not-a-card'),null);
});

test('a malformed, wrong-domain or under-level loadout cannot supply native roll identity',()=>{
  const library=new EncounterLibrary('../content'),source=library.findDomainCard('domain:hex:pin-the-shadow'),
    input={feature:source.feature,slot:'base',source_hash:source.source_hash},
    pc={data:{class:'Witch',subclass:'Hedge',level:1,domains:['Hex','Sage'],domain_cards:[{name:'Pin the Shadow',active:true}]}};
  const held=()=>assert.throws(()=>featureRollSource(library,pc,input),error=>error.code==='GM_ARBITRATION');
  held();pc.data.level=3;pc.data.domains=['Veil','Sage'];held();
  pc.data.domains=['Hex','Sage'];pc.data.domain_cards='Pin the Shadow';held();
});
