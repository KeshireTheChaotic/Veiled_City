import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function disposableCampaign(){
  const dir=mkdtempSync(path.join(tmpdir(),'vc-p08-correction-'));
  const dbPath=path.join(dir,'campaign.sqlite'),schemaPath=path.join(root,'sql/schema.sql');
  const db=new VeiledDB(dbPath,schemaPath);
  db.ensureCampaign('guild-correction');
  let closed=false;
  return {db,dbPath,schemaPath,openPeer(){return new VeiledDB(dbPath,schemaPath);},close(){if(!closed){closed=true;try{db.close();}catch{}}rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});}};
}
