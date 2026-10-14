/** Bounded aggregate receive-to-authorized-publication timing. Synthetic clocks do not establish live performance. */
import {randomUUID} from 'node:crypto';
import {operationalMetrics} from './operational-metrics.js';
const stages=new Set(['turn_capture','pre_director','router','context','gm','validate','commit','discord','native_span','npc_writer']);
const categories=new Set(['unknown','observation','mechanical','assembly','transition','conversation']);
const quantile=(values,p)=>values.length?values[Math.ceil(values.length*p)-1]:null;
export class TurnLatency{
  constructor({clock=()=>performance.now(),metrics=operationalMetrics,sampleLimit=500}={}){
    this.clock=clock;this.metrics=metrics;this.limit=Math.max(1,Math.min(500,sampleLimit));this.tenants=new Map();this.bindings=new Map();
  }
  begin(guild){
    const owner=this,start=this.clock(),key=this.metrics.reference(guild,'latency','');
    const trace={key:randomUUID(),guild,clock:this.clock,category:'unknown',first:null,queue_ms:null,queue_depth:0,calls:0,
      progress_notices:0,stages_ms:{},sql_reads:0,sql_read_ms:0,reported_tokens:{input:0,output:0,cached:0,reasoning:0},usage_unknown:0,
      requests:[],retries:{provider:0,structured:0,validation:0},errors:{},
      publications:0,private_publications:0,pending_director:false,
      queueStarted(depth){this.queue_ms=Math.max(0,this.clock()-start);this.queue_depth=Math.max(0,depth||0);},
      stage(name,ms){if(stages.has(name))this.stages_ms[name]=(this.stages_ms[name]||0)+Math.max(0,ms);},
      sqlRead(ms){this.sql_reads++;this.sql_read_ms+=Math.max(0,ms);},
      model(usage,{purpose='other',model='other',ms=0,retry=false,error=null}={}){this.calls++;if(!usage)this.usage_unknown++;
        if(retry)this.retries.provider++;
        const safePurpose=['router','gm','npc_writer','director','assembly','decisions','other'].includes(purpose)?purpose:'other';
        const safeModel=['gpt-6-luna','gpt-6.1-sol','gpt-5.6-sol'].includes(model)?model:'other';
        if(this.requests.length<32)this.requests.push({purpose:safePurpose,model:safeModel,ms:Math.max(0,ms),failed:!!error});
        if(error){const code=['PROVIDER_ERROR','AI_GENERATION_DEADLINE'].includes(error)?error:'OTHER';this.errors[code]=(this.errors[code]||0)+1;}
        for(const [k,v] of Object.entries({input:usage?.input_tokens,output:usage?.output_tokens,
          cached:usage?.input_tokens_details?.cached_tokens,reasoning:usage?.output_tokens_details?.reasoning_tokens}))
          if(Number.isSafeInteger(v)&&v>=0)this.reported_tokens[k]+=v;},
      progress(){this.progress_notices++;},
      publication(substantive){if(substantive&&this.first===null)this.first=Math.max(0,this.clock()-start);},
      finish(status){
        if(this.finished)return;this.finished=true;
        const sample={category:categories.has(this.category)?this.category:'unknown',status:['delivered','no_response','needs_recovery'].includes(status)?status:'failed',
          first_ms:this.first,queue_ms:this.queue_ms,queue_depth:this.queue_depth,calls:this.calls,progress_notices:this.progress_notices,
          stages_ms:{...this.stages_ms},sql_reads:this.sql_reads,sql_read_ms:this.sql_read_ms,
          reported_tokens:{...this.reported_tokens},usage_unknown:this.usage_unknown,requests:structuredClone(this.requests),
          retries:{...this.retries},errors:{...this.errors}};
        Object.assign(sample,{publications:this.publications,private_publications:this.private_publications,pending_director:this.pending_director});
        let row=owner.tenants.get(key);if(!row){if(owner.tenants.size>=100)owner.tenants.delete(owner.tenants.keys().next().value);
          row={completed:0,samples:[]};owner.tenants.set(key,row);}row.completed++;row.samples.push(sample);
        if(row.samples.length>owner.limit)row.samples.shift();
      }};
    return trace;
  }
  bind(guild,turn,trace){
    if(!trace||trace.guild!==guild)return;
    const key=this.metrics.reference(guild,'latency-turn',turn);this.bindings.set(key,trace);
    if(this.bindings.size>500)this.bindings.delete(this.bindings.keys().next().value);
  }
  publication(guild,turn,substantive){this.bindings.get(this.metrics.reference(guild,'latency-turn',turn))?.publication(substantive);}
  snapshot(guild){
    const row=this.tenants.get(this.metrics.reference(guild,'latency',''))||{completed:0,samples:[]},samples=structuredClone(row.samples),
      times=samples.map(r=>r.first_ms).filter(v=>v!==null).sort((a,b)=>a-b);
    const distribution=rows=>{
      const values=rows.map(r=>r.first_ms).filter(v=>v!==null).sort((a,b)=>a-b);
      return {turns:rows.length,measured:values.length,p50:quantile(values,.5),p90:quantile(values,.9),p95:quantile(values,.95),p99:quantile(values,.99),
        over_10s_percent:values.length?100*values.filter(v=>v>10000).length/values.length:null,
        over_20s_percent:values.length?100*values.filter(v=>v>20000).length/values.length:null,
        over_30s_percent:values.length?100*values.filter(v=>v>30000).length/values.length:null};
    };
    return {completed:row.completed,sample_basis:'Recent bounded logical turns; first substantive acknowledged GM outbox publication, excludes progress/typing/voice.',
      categories:Object.fromEntries([...categories].map(category=>[category,distribution(samples.filter(r=>r.category===category))])),
      first_substantive_ms:{p50:quantile(times,.5),p90:quantile(times,.9),p95:quantile(times,.95),p99:quantile(times,.99)},
      over_10s:times.filter(t=>t>10000).length,over_20s:times.filter(t=>t>20000).length,over_30s:times.filter(t=>t>30000).length,
      no_substantive:samples.filter(r=>r.first_ms===null).length,samples};
  }
}
export const turnLatency=new TurnLatency();
