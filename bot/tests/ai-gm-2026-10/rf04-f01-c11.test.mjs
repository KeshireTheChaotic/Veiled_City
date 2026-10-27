import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from '../../node_modules/acorn/dist/acorn.mjs';
import {normalizeEntityKey} from '../../src/kernel/entity-key.js';
import {normalizeEntityKey as normalizeNpcKey} from '../../src/kernel/entity-key.js';
import {VeiledDB} from '../../src/db.js';
import {resolvePlaceReference,preflightPlaceIdentity} from '../../src/location-language.js';

const consumers=['autonomous-world','city-depth','db','location-language','seed-data','seed-drafts','simulation-commands','simulation','state','world-authoring'];

test('shared formatter preserves established byte semantics across entity names and accented source keys',()=>{
 for(const [input,expected] of [['  Café d’Argent  ','cafe-d-argent'],['THE West / Gate','the-west-gate'],['--Window___7 --','window-7'],['Straße','stra-e'],['東京',''],['mémô.once','memo-once'],[null,''],[undefined,''],[false,''],[0,''],[{},'object-object'],['e\u0301','e']])assert.equal(normalizeEntityKey(input),expected,String(input));
 const error=Error('unsupported external coercion');assert.throws(()=>normalizeEntityKey({toString(){throw error;}}),e=>e===error);
});

test('original NPC export retains the same function identity and reflected function name',()=>{
 assert.equal(normalizeNpcKey,normalizeEntityKey);assert.equal(normalizeNpcKey.name,'normalizeNpcKey');assert.equal(normalizeNpcKey('Café Gate'),normalizeEntityKey('Café Gate'));
});

test('all eleven modified consumers use the same kernel binding and mixed cognitive imports remain intact',()=>{
 for(const name of consumers){const source=readFileSync(new URL('../../src/'+name+'.js',import.meta.url),'utf8'),tree=parse(source,{ecmaVersion:'latest',sourceType:'module'}),imports=tree.body.filter(n=>n.type==='ImportDeclaration');
 const kernel=imports.find(n=>n.source.value==='./kernel/entity-key.js');
 assert.ok(!imports.some(n=>n.source.value==='./npc-cognition.js'&&n.specifiers.some(s=>s.imported?.name==='normalizeNpcKey')),name);
 if(name==='npc-cognition')assert.ok(!tree.body.some(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='normalizeNpcKey'));
 }
});

test('actual SQLite collision reader retains accent equivalence and campaign isolation after reopen',t=>{
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-keys-')),file=join(dir,'keys.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});db.ensureCampaign('g');db.upsertNpcProfile('g',{npcKey:'cafe-d-argent',displayName:'Café d’Argent'});
 assert.equal(db.cityNpcNameInUse('g','CAFE d Argent'),true);assert.equal(db.cityNpcNameInUse('g','different'),false);assert.equal(db.cityNpcNameInUse('another-campaign','CAFE d Argent'),false);db.close();db=new VeiledDB(file,schema);assert.equal(db.cityNpcNameInUse('g','cafe-d-argent'),true);assert.equal(db.getNpcProfile('g','cafe-d-argent').display_name,'Café d’Argent');
});

test('actual World reference consumer resolves normalized existing place without movement or fabricated reference',()=>{
 const rows=[{entity_key:'cafe-gate',state:{name:'Café Gate'}},{entity_key:'market',state:{name:'Market'}}],pc={guild_id:'g',data:{location:'market'}};
 const db={getCharacter:()=>pc,listSimulationEntities:()=>rows,characterContinuity:()=>[]};
 assert.equal(resolvePlaceReference(db,'g','pc','the CAFE GATE').location.entity_key,'cafe-gate');assert.equal(resolvePlaceReference(db,'g','pc','inside').location.entity_key,'market');assert.equal(resolvePlaceReference(db,'g','pc','unestablished').status,'unknown');assert.equal(pc.data.location,'market');assert.equal(rows.length,2);
});

test('protected name preflight retains zero-secret collision output under shared normalization',()=>{
 const db={listSimulationEntities:()=>[{entity_key:'hidden-gate',state:{name:'Café Gate',secret:'never return'}}],getReference:()=>({visibility:'gm'}),listCanon:()=>[]};
 assert.deepEqual(preflightPlaceIdentity(db,'g',{key:'new',name:'CAFE GATE',scope:{mode:'party'}}),{status:'protected_collision',matches:[]});
});
