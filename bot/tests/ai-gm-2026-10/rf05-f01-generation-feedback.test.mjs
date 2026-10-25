import test from 'node:test';
import assert from 'node:assert/strict';
import {beginGenerationFeedback} from '../../src/frameworks/ai-provider/public.js';

function fixture(config={gmProgressEnabled:true}){
  const state={typing:0,replies:0,progress:0,scheduled:null,repeat:null,canceled:[],repeatCanceled:[]};
  const message={channel:{sendTyping:async()=>{state.typing++;}},reply:async text=>{state.replies++;state.text=text;}};
  const stop=beginGenerationFeedback(message,config,{
    schedule:(fn,delay)=>{state.scheduled=fn;state.delay=delay;return {unref(){}};},
    repeat:(fn,delay)=>{state.repeat=fn;state.repeatDelay=delay;return {unref(){}};},
    cancel:timer=>state.canceled.push(timer),cancelRepeat:timer=>state.repeatCanceled.push(timer),
    onProgress:()=>{state.progress++;}
  });
  return {state,stop};
}

test('provider feedback sends typing and reports one completed progress notice through its injected callback',async()=>{
  const {state,stop}=fixture({gmProgressEnabled:true,gmProgressAfterMs:1234,typingRefreshMs:5678});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(state.typing,1);
  assert.equal(state.delay,1234);
  assert.equal(state.repeatDelay,5678);
  state.scheduled();state.scheduled();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(state.replies,1);
  assert.equal(state.progress,1);
  assert.match(state.text,/do not resend the action/u);
  stop();
  assert.equal(state.canceled.length,1);
  assert.equal(state.repeatCanceled.length,1);
});

test('disabled progress never schedules or invokes the application callback',async()=>{
  const {state,stop}=fixture({gmProgressEnabled:false});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(state.scheduled,null);
  assert.equal(state.typing,1);
  assert.equal(state.progress,0);
  stop();
  assert.equal(state.canceled.length,0);
  assert.equal(state.repeatCanceled.length,1);
});

test('enabled progress remains safe when the optional callback is omitted',async()=>{
  let scheduled,replies=0;
  const stop=beginGenerationFeedback({channel:{sendTyping:async()=>{}},reply:async()=>{replies++;}},{gmProgressEnabled:true},{
    schedule:fn=>(scheduled=fn,1),repeat:()=>2,cancel(){},cancelRepeat(){}
  });
  scheduled();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(replies,1);
  stop();
});

test('stopping before delayed progress prevents a stale notice and trace callback',async()=>{
  const {state,stop}=fixture();
  stop();
  state.scheduled();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(state.replies,0);
  assert.equal(state.progress,0);
  assert.equal(state.canceled.length,1);
});
