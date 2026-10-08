/** Git-compatible portable manifest bytes: normalize UTF-8 text line endings, preserve binary bytes. */
export function manifestBytes(bytes){
  if(bytes.includes(0)) return bytes;
  try{
    new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    return Buffer.from(bytes.toString("utf8").replace(/\r\n/g,"\n"));
  }catch{return bytes;}
}
