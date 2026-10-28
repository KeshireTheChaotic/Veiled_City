import fs from 'node:fs';
import path from 'node:path';
import {randomInt} from 'node:crypto';

function pick(a){ return a.length?a[randomInt(a.length)]:null; }
function slug(s){ return String(s||"").trim().toLowerCase(); }

export class EncounterLibrary{
  constructor(contentRoot){
    this.contentRoot=contentRoot;
    this.adversaries=JSON.parse(fs.readFileSync(path.join(contentRoot,"GM_PRIVATE/ADVERSARIES/adversaries.json"),"utf8"));
    this.environments=JSON.parse(fs.readFileSync(path.join(contentRoot,"GM_PRIVATE/ENVIRONMENTS/environments.json"),"utf8"));
  }
  findAdversary(q){
    const s=slug(q); if(!s) return null;
    return this.adversaries.find(x=>slug(x.name)===s)||this.adversaries.find(x=>slug(x.name).includes(s))||null;
  }
  findEnvironment(q,tier=null){
    const s=slug(q);
    let pool=tier?this.environments.filter(x=>Number(x.tier)===Number(tier)):this.environments;
    if(!s) return pick(pool);
    return pool.find(x=>slug(x.name)===s)||pool.find(x=>slug(x.name).includes(s))||null;
  }
}
