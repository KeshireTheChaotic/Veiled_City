/** Async-local operational trace only. No source, game authority or sensitive payload is retained. */
import {AsyncLocalStorage} from 'node:async_hooks';
const context=new AsyncLocalStorage();
export const currentTurnTrace=()=>context.getStore()||null;
export const turnTraceFor=guild=>{const trace=currentTurnTrace();return trace&&trace.guild===guild?trace:null;};
export const withTurnTrace=(trace,job)=>context.run(trace,job);
export function instrumentSqlReads(connection){
  return new Proxy(connection,{get(target,key){
    if(key==='prepare')return sql=>{
      const statement=target.prepare(sql),read=/^\s*(?:SELECT|WITH|PRAGMA\s+(?:table_info|user_version))/i.test(sql);
      return new Proxy(statement,{get(s,k){const value=Reflect.get(s,k,s);
        if(typeof value!=='function')return value;
        return (...args)=>{const trace=currentTurnTrace(),start=trace?.clock();
          try{return value.apply(s,args);}finally{if(trace&&read&&['get','all'].includes(k))trace.sqlRead(trace.clock()-start);}};
      }});
    };
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
}
