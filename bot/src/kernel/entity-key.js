/** Domain-neutral stable ASCII entity keys; byte-compatible with the original shared normalizer. */
function normalizeNpcKey(value){
  return String(value||"")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}
export {normalizeNpcKey as normalizeEntityKey};
