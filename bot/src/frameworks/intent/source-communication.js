/** Exact formatting boundaries only. Being IC is necessary, never sufficient authority for an action. */
import {sourceSpanInsideQuote} from './source-quote-boundaries.js';
export function characterSourceRanges(value){
  const text=String(value||''),ranges=[];let ic=true,depth=0,offset=0;
  const append=(start,end)=>{
    if(start>=end)return;
    if(ranges.at(-1)?.end===start)ranges.at(-1).end=end;else ranges.push({start,end});
  };
  for(const line of text.match(/[^\n]*(?:\n|$)/g)||[]){
    if(!line)continue;
    let start=0;
    if(!depth&&!sourceSpanInsideQuote(text,offset)){
      if(/^\s*OOC\b/i.test(line))ic=false;
      const marker=/^\s*IC\s*:\s*/i.exec(line);
      if(marker){ic=true;start=marker[0].length;}
      if(/^\s*\/\//.test(line)){offset+=line.length;continue;}
    }
    if(!ic){offset+=line.length;continue;}
    let segment=start;
    for(let i=start;i<line.length;i++){
      if(line.startsWith('((',i)&&(depth||!sourceSpanInsideQuote(text,offset+i))){
        if(!depth)append(offset+segment,offset+i);
        depth++;i++;continue;
      }
      if(depth&&line.startsWith('))',i)){depth--;i++;if(!depth)segment=i+1;}
    }
    if(!depth)append(offset+segment,offset+line.length);
    offset+=line.length;
  }
  return ranges;
}
export function isCharacterSourceSpan(text,start,end){
  return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&end>start
    &&characterSourceRanges(text).some(range=>start>=range.start&&end<=range.end);
}

import {intentCommunicationSource} from './contracts/communication-source.js';
intentCommunicationSource.bind({characterSourceRanges});
