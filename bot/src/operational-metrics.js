/** Privacy-safe in-memory operational metrics: no prompts, narration, IDs or source text are retained. */
const percentile=(values,p)=>values.length?values[Math.min(values.length-1,Math.floor((values.length-1)*p))]:0;
export class OperationalMetrics{
  constructor({sampleLimit=500}={}){this.sampleLimit=sampleLimit;this.stages=new Map();}
  record(stage,{durationMs=0,status="ok",errorCode="",inputChars=0,inputTokens=0,outputTokens=0,retries=0}={}){
    const row=this.stages.get(stage)||{count:0,failures:0,retries:0,input_chars:0,input_tokens:0,output_tokens:0,durations:[],error_codes:{}};
    row.count++;row.failures+=status==="ok"?0:1;row.retries+=Math.max(0,Number(retries)||0);row.input_chars+=Math.max(0,Number(inputChars)||0);
    row.input_tokens+=Math.max(0,Number(inputTokens)||0);row.output_tokens+=Math.max(0,Number(outputTokens)||0);
    row.durations.push(Math.max(0,Number(durationMs)||0));if(row.durations.length>this.sampleLimit)row.durations.shift();
    if(errorCode)row.error_codes[errorCode]=(row.error_codes[errorCode]||0)+1;this.stages.set(stage,row);
  }
  snapshot(){
    return {privacy:"Aggregate counts, timing and token usage only; no prompts, narration, Discord IDs or campaign text.",sample_limit:this.sampleLimit,
      stages:Object.fromEntries([...this.stages].map(([stage,row])=>{const sorted=[...row.durations].sort((a,b)=>a-b);return [stage,{...row,durations:undefined,
        latency_ms:{p50:percentile(sorted,.5),p95:percentile(sorted,.95),p99:percentile(sorted,.99)}}];}))};
  }
}
export const operationalMetrics=new OperationalMetrics();
export async function measureStage(metrics,stage,operation){
  const started=performance.now();try{const result=await operation();metrics.record(stage,{durationMs:performance.now()-started});return result;}
  catch(error){metrics.record(stage,{durationMs:performance.now()-started,status:"error",errorCode:error?.code||"UNCLASSIFIED"});throw error;}
}
