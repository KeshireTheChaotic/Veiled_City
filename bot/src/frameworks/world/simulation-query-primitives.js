/** Original neutral query helpers shared with remaining World orchestration. */
export const keyOf=(type,key)=>`${type}:${key}`;
export const text=(value)=>String(value||"").trim();
export const tokens=value=>new Set(text(value).toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
export const intersects=(a,b)=>[...tokens(a)].some(word=>tokens(b).has(word));
