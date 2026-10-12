/** Bounded, process-lifetime, tenant-scoped telemetry. Closed fields only; never retain content or raw references. */
import {createHmac,randomBytes} from 'node:crypto';
const stages=new Set(['model_request','structured_retry','validation_retry','router','gm','validate','commit','discord',
  'narrative_projection','narrative_quarantine','neutral_fallback','optional_quarantine','safe_recovery',
  'interaction_failure','interaction_ack','native_replay','runtime_failure',
  'party_turn_envelope','private_turn_envelope','turn_capture','turn_generate','turn_validate','turn_commit','turn_publish']);
const codes=new Set(['AI_GENERATION_DEADLINE','PROVIDER_ERROR','STRUCTURED_JSON_RETRY_FAILED','NARRATIVE_PVP',
  'NARRATIVE_INTEGRITY','STATE_CONFLICT','DISCORD_EXPIRED','DISCORD_ERROR','NOT_SENT','UNCERTAIN','UNCLASSIFIED']);
const categories=new Set(['model','interaction','publication','narrative','runtime']);
const bound=(n,f,max)=>Number.isInteger(n)&&n>0?Math.min(n,max):f;
const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
const duration=n=>Number.isFinite(n)&&n>=0?Math.min(n,86400000):null;
const percentile=(v,p)=>v.length?v[Math.max(0,Math.ceil(v.length*p)-1)]:null;
export function parseModelPricing(raw='{}'){
  let prices;try{prices=typeof raw==='string'?JSON.parse(raw):raw;}catch{throw new Error('MODEL_PRICING_JSON must be valid JSON.');}
  if(!prices||Array.isArray(prices)||typeof prices!=='object'||Object.keys(prices).length>32)
    throw new Error('MODEL_PRICING_JSON needs at most 32 model rate objects.');
  const result=Object.create(null);
  for(const [model,rate] of Object.entries(prices)){
    if(!/^[a-zA-Z0-9._:-]{1,80}$/.test(model)||!rate||typeof rate!=='object'
      ||Object.keys(rate).some(k=>!['input','output','cached_input'].includes(k))
      ||!['input','output'].every(k=>Number.isFinite(rate[k])&&rate[k]>=0&&rate[k]<=1e9)
      ||rate.cached_input!==undefined&&(!Number.isFinite(rate.cached_input)||rate.cached_input<0||rate.cached_input>1e9))
      throw new Error('MODEL_PRICING_JSON rates must be nonnegative USD per million tokens (input, output, optional cached_input).');
    result[model]={input:rate.input,output:rate.output,...(rate.cached_input===undefined?{}:{cached_input:rate.cached_input})};
  }
  return result;
}
export class OperationalMetrics{
  constructor({sampleLimit=500,guildLimit=100,incidentLimit=50,pricing={}}={}){
    this.sampleLimit=bound(sampleLimit,500,500);this.guildLimit=bound(guildLimit,100,100);
    this.incidentLimit=bound(incidentLimit,50,100);this.tenants=new Map();this.salt=randomBytes(32);
    this.pricing=parseModelPricing(pricing);this.evictions=0;
  }
  configurePricing(pricing){this.pricing=parseModelPricing(pricing);}
  reference(guildId,kind,value){
    return createHmac('sha256',this.salt).update(JSON.stringify([guildId||'',kind,String(value)])).digest('hex').slice(0,24);
  }
  tenant(guildId,create=false){
    const key=this.reference(guildId,'tenant','');let row=this.tenants.get(key);
    if(!row&&create){
      if(this.tenants.size>=this.guildLimit){this.tenants.delete(this.tenants.keys().next().value);this.evictions++;}
      row={stages:new Map(),incidents:new Map()};this.tenants.set(key,row);
    }
    return row;
  }
  record(stage,fields={}){
    if(!stages.has(stage))return;
    const {guildId,durationMs,status='ok',errorCode,inputTokens,outputTokens,cachedInputTokens,retries=0,model}=fields;
    const tenant=this.tenant(guildId,true),row=tenant.stages.get(stage)||{count:0,failures:0,retries:0,
      input_tokens:0,output_tokens:0,usage_reported:0,usage_unknown:0,durations:[],error_codes:{},
      cost_estimate_usd:0,unpriced_requests:0,models:Object.create(null)};
    row.count++;row.failures+=status==='ok'?0:1;row.retries+=count(retries)??0;
    const ms=duration(durationMs);if(ms!==null){row.durations.push(ms);if(row.durations.length>this.sampleLimit)row.durations.shift();}
    if(errorCode){const safe=codes.has(errorCode)?errorCode:'UNCLASSIFIED';row.error_codes[safe]=(row.error_codes[safe]||0)+1;}
    if(stage==='model_request'){
      const input=count(inputTokens),output=count(outputTokens),cached=count(cachedInputTokens);
      const rate=Object.hasOwn(this.pricing,model)?this.pricing[model]:null;
      const modelSlots=Object.keys(row.models).filter(key=>key!=='@unpriced').length;
      const key=rate&&(Object.hasOwn(row.models,model)||modelSlots<32)?model:'@unpriced';
      const bucket=row.models[key]||{requests:0,input_tokens:0,output_tokens:0,usage_unknown:0,cost_estimate_usd:0};
      bucket.requests++;bucket.input_tokens+=input??0;bucket.output_tokens+=output??0;
      row.input_tokens+=input??0;row.output_tokens+=output??0;
      if(input!==null&&output!==null){
        row.usage_reported++;
        if(rate){const cache=rate.cached_input!==undefined&&cached!==null&&cached<=input?cached:0;
          const cost=((input-cache)*rate.input+cache*(rate.cached_input??rate.input)+output*rate.output)/1000000;
          row.cost_estimate_usd+=cost;bucket.cost_estimate_usd+=cost;
        }else row.unpriced_requests++;
      }else{row.usage_unknown++;bucket.usage_unknown++;}
      row.models[key]=bucket;
    }
    tenant.stages.set(stage,row);
  }
  incident(category,{guildId,reference='',code='UNCLASSIFIED'}={}){
    if(!categories.has(category))return;
    const rows=this.tenant(guildId,true).incidents,key=this.reference(guildId,category,reference);
    const prior=rows.get(key);rows.delete(key);
    rows.set(key,{reference:key,category,code:codes.has(code)?code:'UNCLASSIFIED',occurrences:(prior?.occurrences||0)+1});
    if(rows.size>this.incidentLimit)rows.delete(rows.keys().next().value);
  }
  incidents(guildId){return [...(this.tenant(guildId)?.incidents.values()||[])].map(row=>({...row}));}
  snapshot(guildId){
    return {privacy:'Aggregate counts, timing and reported usage only; no prompts, narration, IDs or campaign text.',
      retention:'Process lifetime; bounded guild eviction; restart resets samples and opaque references.',sample_limit:this.sampleLimit,
      guild_limit:this.guildLimit,incident_limit:this.incidentLimit,
      narrative_ratios:{basis:'Output preparation attempts (including rolled-back previews), NOT unique committed turns.',
        quarantine:(this.tenant(guildId)?.stages.get('narrative_projection')?.count||0)?
          (this.tenant(guildId)?.stages.get('narrative_quarantine')?.count||0)/this.tenant(guildId).stages.get('narrative_projection').count:null,
        neutral_fallback:(this.tenant(guildId)?.stages.get('narrative_projection')?.count||0)?
          (this.tenant(guildId)?.stages.get('neutral_fallback')?.count||0)/this.tenant(guildId).stages.get('narrative_projection').count:null},
      latency_method:'Nearest-rank p50/p95/p99 over most recent bounded measured samples, not all-time.',
      costs:'Operator-configured USD estimates for reported usage only, NOT billed charges. Unpriced/unknown usage excluded.',
      stages:Object.fromEntries([...(this.tenant(guildId)?.stages||[])].map(([stage,row])=>{
        const {durations,...counts}=row,sorted=[...durations].sort((a,b)=>a-b);
        return [stage,{...counts,models:structuredClone(row.models),error_codes:{...row.error_codes},latency_ms:{samples:sorted.length,
          p50:percentile(sorted,.5),p95:percentile(sorted,.95),p99:percentile(sorted,.99)}}];
      }))};
  }
}
export const operationalMetrics=new OperationalMetrics();
export async function measureStage(metrics,stage,operation,{guildId}={}){
  const started=performance.now();
  try{const result=await operation();metrics.record(stage,{guildId,durationMs:performance.now()-started});return result;}
  catch(error){metrics.record(stage,{guildId,durationMs:performance.now()-started,status:'error',errorCode:error?.code});throw error;}
}
export function measureNative(stage,guildId,operation,metrics=operationalMetrics){
  const started=performance.now();
  try{const result=operation();metrics.record(stage,{guildId,durationMs:performance.now()-started});return result;}
  catch(error){metrics.record(stage,{guildId,durationMs:performance.now()-started,status:'error',errorCode:error?.code});throw error;}
}
