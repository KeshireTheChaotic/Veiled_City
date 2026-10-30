/** Original Director-history query only, preserving current method/connection and existing SQL bounds. */
export function createDirectorHistoryStore(db){
  if(typeof db?.listDirectorHistory!=='function')throw new TypeError('Director history requires the original history reader.');
  return Object.freeze({listDirectorHistory:(...args)=>db.listDirectorHistory(...args)});
}
