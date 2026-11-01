/** Read-only feature roll identity. This grants no activation, payment, dice or effect. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
const SRD='https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf';
const VERSION='2.0 (2026-08-25)';
// Explicit subclass sources: class alone is insufficient (notably Assassin and Witch).
const subclasses=[
  ['Assassin','Executioners Guild','Agility',8],['Assassin','Poisoners Guild','Knowledge',9],
  ['Bard','Troubadour','Presence',10],['Bard','Wordsmith','Presence',10],
  ['Druid','Warden of the Elements','Instinct',13],['Druid','Warden of Renewal','Instinct',14],
  ['Ranger','Beastbound','Agility',19],['Ranger','Wayfinder','Agility',20],
  ['Rogue','Nightwalker','Finesse',22],['Rogue','Syndicate','Finesse',22],
  ['Seraph','Divine Wielder','Strength',23],['Seraph','Winged Sentinel','Strength',23],
  ['Sorcerer','Elemental Origin','Instinct',24],['Sorcerer','Primal Origin','Instinct',24],
  ['Warlock','Pact of the Endless','Presence',26],['Warlock','Pact of the Wrathful','Presence',26],
  ['Witch','Hedge','Knowledge',28],['Witch','Moon','Instinct',29],
  ['Wizard','School of Knowledge','Knowledge',30],['Wizard','School of War','Knowledge',30]
];
const normalize=s=>typeof s==='string'?s.trim().toLowerCase():'';

/** Source lookup only; the owner/native roll workflow still owns trait selection and use. */
export function spellcastTraitSource(data,{slot='base'}={}){
  if(!['base','multiclass'].includes(slot))throw fail('spellcast_subclass_slot');
  const role=slot==='base'?data:data?.multiclass,
    source=subclasses.find(([cls,sub])=>normalize(cls)===normalize(role?.class)&&normalize(sub)===normalize(role?.subclass));
  if(!source)throw fail('spellcast_subclass_source_unavailable');
  return Object.freeze({slot,class:source[0],subclass:source[1],trait:source[2],authority:'RAW',version:VERSION,source_ref:`${SRD}#page=${source[3]+1}`});
}

/** Qualify a current packaged domain card and its explicit roll clause, never a sheet's prose claims. */
export function featureRollSource(library,pc,input){
  if(!input||Object.keys(input).sort().join()!=='feature,slot,source_hash'||typeof input.feature!=='string'
    ||typeof library?.findDomainCard!=='function')throw fail('feature_roll_source_locators');
  if(!Array.isArray(pc?.data?.domain_cards)||!Array.isArray(pc.data.domains))throw fail('feature_roll_current_owned_source');
  let source;
  try{source=library.findDomainCard(input.feature);}catch{throw fail('feature_roll_source_unavailable');}
  const card=source?.card,owned=pc.data.domain_cards.filter(c=>c&&typeof c==='object'&&c.name===card?.name&&c.active===true);
  if(!source||source.feature!==input.feature||hash(card)!==source.source_hash||source.source_hash!==input.source_hash
    ||owned.length!==1||!Array.isArray(pc.data.domains)||!pc.data.domains.some(d=>normalize(d)===normalize(source.domain))
    ||!Number.isSafeInteger(pc.data.level)||!Number.isSafeInteger(card.level)||card.level>pc.data.level
    ||typeof card.text!=='string')throw fail('feature_roll_current_owned_source');
  // Only the authoritative printed rule is inspected. A Spell type, matching trait,
  // reference to a previous Spellcast result, or free-text declaration is insufficient.
  const clauses=[...card.text.matchAll(/\bmake (?:a|an) Spellcast Roll\b/gi)];
  if(clauses.length!==1)throw fail('feature_roll_explicit_spellcast_clause');
  const subclass=spellcastTraitSource(pc.data,{slot:input.slot}),clause=clauses[0],data={version:1,classification:'spellcast',
    feature:source.feature,source_ref:source.source_ref,source_hash:source.source_hash,subclass,trait:subclass.trait,
    clause:{start:clause.index,end:clause.index+clause[0].length,hash:hash(clause[0])},
    execution_authorized:false,authority:'Roll identity only. Native source/owner/trigger/cost/effect gates remain required.'};
  return Object.freeze({...data,identity_hash:hash(data)});
}
