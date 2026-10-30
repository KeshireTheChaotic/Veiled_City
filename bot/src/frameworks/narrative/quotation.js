/** Escape formatting and wrap quoted lines so Discord chunking cannot turn continuation text into objective prose. */
export function quoteNpcWords(words){
  const escaped=words.replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu,
    char=>`[U+${char.codePointAt(0).toString(16)}]`).replace(/[\\`*_\[\]<>#~|]/g,'\\$&'),lines=[];
  for(const paragraph of escaped.split(/\r?\n/u)){
    let line='';for(const char of paragraph){line+=char;if(line.length>=160){lines.push(`> ${line}`);line='';}}
    if(line||!paragraph)lines.push(`> ${line}`);
  }
  return lines.join('\n');
}
