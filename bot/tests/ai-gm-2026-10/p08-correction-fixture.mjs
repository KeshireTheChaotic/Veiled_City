import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function disposableCampaign(){
  const dir=mkdtempSync(path.join(tmpdir(),'vc-p08-correction-'));
  const db=new VeiledDB(path.join(dir,'campaign.sqlite'),path.join(root,'sql/schema.sql'));
  db.ensureCampaign('guild-correction');
  return {db,close(){db.close();rmSync(dir,{recursive:true,force:true});}};
}
