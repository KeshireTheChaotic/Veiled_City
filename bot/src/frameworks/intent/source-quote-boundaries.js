/** Source-attribution tripwire, not an English action classifier. Apostrophes inside words are not quotes. */
export function sourceSpanInsideQuote(text,start){
  let quote=null;
  for(let i=0;i<start;i++){
    const c=text[i];if(c==='\\'){i++;continue;}
    if((c==="'"||c==='’')&&/[\p{L}\p{N}]/u.test(text[i-1]||'')&&/[\p{L}\p{N}]/u.test(text[i+1]||''))continue;
    if(quote){if(c===quote)quote=null;}
    else if(c==='"'||c==="'")quote=c;else if(c==='“')quote='”';else if(c==='‘')quote='’';
  }return quote!==null;
}
import {intentAuthoredTurnSource} from './contracts/turn-language-sources.js';
intentAuthoredTurnSource.bind({sourceSpanInsideQuote});
