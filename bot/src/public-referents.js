/** Read-only matching of complete native public identities/descriptors, not action interpretation. */
export function mentionsPublicIdentity(text,name){
  if(typeof name!=='string'||name.trim().length<3)return false;
  const hay=String(text).toLocaleLowerCase(),needle=name.trim().toLocaleLowerCase();
  let from=0;
  while(from<hay.length){
    const at=hay.indexOf(needle,from);if(at<0)return false;
    const word=c=>!!c&&/[\p{L}\p{N}_]/u.test(c);
    if(!word(hay[at-1])&&!word(hay[at+needle.length]))return true;
    from=at+needle.length;
  }
  return false;
}
