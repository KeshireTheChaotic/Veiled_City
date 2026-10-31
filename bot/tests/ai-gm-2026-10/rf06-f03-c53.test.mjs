import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {AttachmentBuilder} from 'discord.js';
import {createAttachment} from '../../src/frameworks/discord/public.js';
import {connectPublicationDiscordAttachments} from '../../src/framework-to-framework/discord--publication/public.js';
import {publicationDiscordAttachments,publicationDiscordChannels} from '../../src/frameworks/publication/public.js';
import {initializePublicationDiscord} from '../../src/application/composition/publication-discord.js';
const createPublicationAttachment=(...args)=>publicationDiscordAttachments.createAttachment(...args);
import {handoutFiles} from '../../src/handout.js';
const require=createRequire(import.meta.url),acorn=require('acorn');
const source=readFileSync(new URL('../../src/publishing.js',import.meta.url),'utf8');
const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'}),helper=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='handoutAttachments');
const wrap=files=>new Function('handoutFiles','createPublicationAttachment',source.slice(helper.start,helper.end)+';return handoutAttachments;')(files,createPublicationAttachment);

test('fixed constructor consumer fails uncomposed, startup preserves return and rejects replacement',()=>{
  assert.throws(()=>publicationDiscordAttachments.createAttachment(Buffer.from('synthetic')),e=>e.code==='PUBLICATION_DISCORD_ATTACHMENTS_COMPOSITION');
  assert.throws(()=>publicationDiscordAttachments.bind({}),TypeError);
  assert.equal(initializePublicationDiscord(),publicationDiscordChannels);
  assert.equal(connectPublicationDiscordAttachments(),publicationDiscordAttachments);
  assert.doesNotThrow(()=>publicationDiscordAttachments.bind({createAttachment}));
  assert.throws(()=>publicationDiscordAttachments.bind({createAttachment:()=>null}),/replacement forbidden/);
});
test('fixed consumer forwards original SDK type/buffer/name without changing caller options',()=>{
  const buffer=Buffer.from([0,255,10]),options={name:'秘密.bin',description:'Evidence'},before={...options},result=createPublicationAttachment(buffer,options);
  assert.ok(result instanceof AttachmentBuilder);assert.equal(result.attachment,buffer);assert.equal(result.name,options.name);assert.equal(result.description,options.description);assert.deepEqual(options,before);
});
test('actual unchanged handout wrapper preserves file mapping order, buffer identities and defaults',()=>{
  const files=[{buffer:Buffer.from('one'),name:'one.md'},{buffer:Buffer.from('two'),name:'two.json'}],handout={},events=[];
  const build=wrap((h,format)=>{assert.equal(h,handout);events.push(format);return files;});
  for(const format of [undefined,'all']){const result=build(handout,format);assert.deepEqual(result.map(x=>x.name),['one.md','two.json']);for(let n=0;n<2;n++)assert.equal(result[n].attachment,files[n].buffer);}
  assert.deepEqual(events,['markdown','all']);
});
test('original file getter/serialization errors retain identity and abort before later mapping',()=>{
  const error=new Error('serialize');assert.throws(()=>wrap(()=>{throw error;})({},'all'),e=>e===error);
  const events=[],files=[{get buffer(){events.push('buffer');throw error;},get name(){events.push('name');return 'unused';}},{get buffer(){events.push('later');return Buffer.from('later');}}];
  assert.throws(()=>wrap(()=>files)({}),e=>e===error);assert.deepEqual(events,['buffer']);
  assert.throws(()=>wrap(()=>[null])({}),TypeError);assert.deepEqual(wrap(()=>[])({}),[]);
});
test('actual handout formats preserve original filenames/player data and binary DOCX without sends',()=>{
  const handout={id:'1234567890',title:'Archive Note',kind:'letter',authority:'partial',visibility:'party',content:'Synthetic player-facing clue',canonical_facts:[],gm_notes:'Private GM note'},before=structuredClone(handout),result=wrap(handoutFiles)(handout,'all');
  assert.deepEqual(result.map(x=>x.name),['EVIDENCE_Archive_Note_12345678.json','EVIDENCE_Archive_Note_12345678.md','EVIDENCE_Archive_Note_12345678.docx']);
  assert.ok(result.every(x=>x instanceof AttachmentBuilder&&Buffer.isBuffer(x.attachment)));
  assert.ok(result[1].attachment.toString().includes('Synthetic player-facing clue'));assert.ok(!result[0].attachment.toString().includes('Private GM note'));assert.ok(!result[1].attachment.toString().includes('Private GM note'));assert.equal(result[2].attachment.subarray(0,2).toString(),'PK');assert.deepEqual(handout,before);
});
test('root removes sole SDK dependency while retaining handout revision and uncertain delivery safeguards',()=>{
  assert.ok(!source.includes('from "discord.js"'));assert.ok(!source.includes('new AttachmentBuilder('));
  assert.ok(source.includes('handoutFiles(handout,format).map(f=>createPublicationAttachment(f.buffer,{name:f.name}))'));
  for(const text of ["prior.status!=='not_sent'","save('sending'","save('needs_review'",'HANDOUT_AUTHORITY','revalidateOutputPublication'])assert.ok(source.includes(text),text);
});
