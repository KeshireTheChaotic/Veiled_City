export function safeText(v){
  return v==null?"":String(v);
}
export function safeStem(name){
  const s=safeText(name).normalize("NFKD").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  return s||"Character";
}
