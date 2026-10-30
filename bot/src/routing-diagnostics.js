/** Exclusive channel routing and rate-limited inactive-session feedback. */
const notices=new Map();
import {validateChannelRouting} from './frameworks/operations/public.js';
export {validateChannelRouting};
export function shouldSendInactiveSessionNotice(guild,user,{now=Date.now(),cooldownMs=300000}={}){
  const key=`${guild}:${user}`,last=notices.get(key)||0;if(now-last<cooldownMs)return false;notices.set(key,now);return true;
}
