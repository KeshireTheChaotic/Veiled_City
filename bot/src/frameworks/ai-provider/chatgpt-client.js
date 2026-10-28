import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENDPOINT='https://chatgpt.com/backend-api/codex/responses';

/** LOCAL TESTING ONLY: Responses-shaped client signed in through the Codex CLI's ChatGPT login (auth.json).
 * Not a supported OpenAI API; never use it for a live deployment. */
export function createChatGptClient({authPath=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'auth.json'),
  timeoutMs=60000,fetchImpl=globalThis.fetch,readFile=fs.readFileSync}={}){
  function credentials(){
    // Re-read per request so tokens refreshed by the Codex CLI are picked up without a restart.
    const tokens=JSON.parse(readFile(authPath,'utf8'))?.tokens;
    if(!tokens?.access_token||!tokens?.account_id)throw new Error(`No ChatGPT login in ${authPath}; run \`codex login\` and choose Sign in with ChatGPT.`);
    return tokens;
  }
  async function create(request,{signal}={}){
    const {access_token,account_id}=credentials();
    // The backend only serves streamed, unstored responses; output caps and missing instructions are accepted (probed 2026-10-28).
    const body={...request,stream:true,store:false,
      input:typeof request.input==='string'?[{role:'user',content:[{type:'input_text',text:request.input}]}]:request.input};
    const timeout=AbortSignal.timeout(timeoutMs);
    let res;
    try{
      res=await fetchImpl(ENDPOINT,{method:'POST',signal:signal?AbortSignal.any([signal,timeout]):timeout,body:JSON.stringify(body),
        headers:{authorization:`Bearer ${access_token}`,'chatgpt-account-id':account_id,'OpenAI-Beta':'responses=experimental',
          originator:'codex_cli_rs','content-type':'application/json',accept:'text/event-stream'}});
    }catch(error){
      if(signal?.aborted)throw error;
      throw Object.assign(new Error(`ChatGPT request failed: ${error.message}`),{name:timeout.aborted?'APIConnectionTimeoutError':'APIConnectionError'});
    }
    if(!res.ok){
      const detail=await res.text().catch(()=> '');
      const hint=res.status===401?' Run `codex login` to refresh the ChatGPT sign-in.':'';
      throw Object.assign(new Error(`ChatGPT request failed (${res.status}): ${detail.slice(0,500)}${hint}`),{status:res.status,headers:res.headers});
    }
    return readStream(await res.text());
  }
  return {responses:{create}};
}

/** Builds the final Response object (with the SDK's output_text convenience) from the server-sent event stream. */
export function readStream(raw){
  let response=null,deltas='';
  for(const line of raw.split('\n')){
    if(!line.startsWith('data:'))continue;
    let event;try{event=JSON.parse(line.slice(5));}catch{continue;}
    if(event.type==='response.output_text.delta')deltas+=event.delta||'';
    else if(event.type==='response.failed'||event.type==='error')
      throw Object.assign(new Error(`ChatGPT response failed: ${JSON.stringify(event.response?.error||event).slice(0,500)}`),{status:500});
    else if(/^response\.(completed|incomplete)$/.test(event.type))response=event.response;
  }
  if(!response)throw Object.assign(new Error('ChatGPT stream ended without a final response.'),{name:'APIConnectionError'});
  const text=(response.output||[]).flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text).join('');
  return {...response,output_text:text||deltas};
}
