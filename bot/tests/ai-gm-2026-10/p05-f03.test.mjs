import test from 'node:test';import assert from 'node:assert/strict';
import {beginGenerationFeedback} from '../../src/generation-feedback.js';
import {loadConfig} from '../../src/config.js';
function setup(config={}){let typing=0,replies=0;const timers=[];const stop=beginGenerationFeedback({channel:{sendTyping:async()=>{typing++;}},reply:async()=>{replies++;}},config,{schedule:f=>{timers.push(f);return 1;},repeat:()=>2,cancel(){},cancelRepeat(){}});return {stop,timers,counts:()=>({typing,replies})};}
test('typing is default, routine progress is opt-in, queued notices stop with completion',async()=>{
 const s=setup();await Promise.resolve();assert.equal(s.timers.length,0);assert.equal(s.counts().typing,1);s.stop();
 const enabled=setup({gmProgressEnabled:true});enabled.timers[0]();enabled.stop();await Promise.resolve();assert.equal(enabled.counts().replies,0);
});
test('explicit progress announces at most once with a fake timer',async()=>{
 const s=setup({gmProgressEnabled:true});s.timers[0]();s.timers[0]();await Promise.resolve();await Promise.resolve();assert.equal(s.counts().replies,1);s.stop();
});
test('configuration defaults progress off without changing configured models',()=>{
 const prior={...process.env};try{for(const k of ['DISCORD_TOKEN','DISCORD_CLIENT_ID','OPENAI_API_KEY'])process.env[k]='offline-placeholder';delete process.env.GM_PROGRESS_ENABLED;assert.equal(loadConfig().gmProgressEnabled,false);}
 finally{for(const k of Object.keys(process.env))if(!(k in prior))delete process.env[k];Object.assign(process.env,prior);}
});
