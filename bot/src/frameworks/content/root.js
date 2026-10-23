import path from 'node:path';

/** Preserve the bootstrap CONTENT_ROOT contract independently of this module's physical location. */
export function resolveContentRoot({cwd=process.cwd(),root=process.env.CONTENT_ROOT}={}){
  return path.resolve(cwd,root||'../content');
}
