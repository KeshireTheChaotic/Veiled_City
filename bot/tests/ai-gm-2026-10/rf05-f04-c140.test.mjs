import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewInbox,reviewWorkflow} from '../../src/frameworks/operations/public.js';
import * as implementation from '../../src/frameworks/operations/ai-review.js';
import {handleStoryCommand} from '../../src/story-commands.js';
import {connectOperationsIntentReview} from '../../src/framework-to-framework/intent--operations/public.js';
import {intentWorldPrimitives} from '../../src/frameworks/intent/public.js';
import {stateRevision} from '../../src/kernel/state-revision.js';

intentWorldPrimitives.bind({requireCitySource(){},cityObject(){},cityInteger(){},indexWorldEvent(){},cityAudit(){}});
connectOperationsIntentReview();
test('Operations public retains original review implementation and bodies after physical move',async()=>{
 assert.equal(reviewInbox,implementation.reviewInbox);assert.equal(reviewWorkflow,implementation.reviewWorkflow);
 const text=await readFile(new URL('../../src/frameworks/operations/ai-review.js',import.meta.url),'utf8');
 const body=text.slice(text.indexOf('const REVIEW_KINDS')).replace(/\r\n/g,'\n');
 assert.equal(createHash('sha256').update(body).digest('hex'),'f4a786d72f5945348c5a44fdb1d59af70eda8c431c7e57006a75c332ecb1afcd');
 assert.equal(existsSync(new URL('../../src/ai-review.js',import.meta.url)),false);
});
test('actual GM story review uses relocated Operations and delivers the original private attachment',async()=>{
 let row={kind:'ai_intent',record_key:'review',status:'pending',visibility:'gm',data:{intent:null,history:[]}};const replies=[];let transactions=0;
 const db={getCityRecord(guild,kind,key){assert.deepEqual([guild,kind,key],['g','ai_intent','review']);return row;},
 transaction(fn){transactions++;return fn();},saveCityRecord(guild,{key,...next}){assert.equal(guild,'g');row={...next,record_key:key};return row;}};
 const input={kind:'ai_intent',key:'review',decision:'defer',expected_revision:stateRevision(row)};
 const interaction={guildId:'g',user:{id:'gm'},memberPermissions:{has:()=>true},options:{getSubcommand:()=> 'ai-review',getString:()=>JSON.stringify(input)},async reply(value){replies.push(value);}};
 await handleStoryCommand(interaction,{db});assert.equal(transactions,1);assert.equal(row.status,'deferred');
 assert.equal(replies.length,1);assert.equal(replies[0].ephemeral,true);assert.deepEqual(replies[0].allowedMentions,{parse:[]});
 assert.equal(replies[0].files[0].name,'story-result.json');const packet=JSON.parse(replies[0].files[0].attachment.toString());assert.equal(packet.visibility,'gm');assert.equal(packet.status,'deferred');assert.equal(packet.data.reviewed_by,'gm');
 await assert.rejects(()=>handleStoryCommand({...interaction,memberPermissions:{has:()=>false}},{db:{getCampaign:()=>({gm_role_id:'role'})}}),/GM\/admin permission required/);
});
