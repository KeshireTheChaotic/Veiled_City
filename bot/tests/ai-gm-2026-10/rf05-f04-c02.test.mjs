import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {GMService} from '../../src/gm.js';
import {conversationPrincipal as publicPrincipal} from '../../src/frameworks/session/public.js';
import {conversationPrincipal as compatibilityPrincipal} from '../../src/conversation-principal.js';

test('GM imports the Session public principal without changing identity or authenticated owner result',t=>{
  assert.equal(typeof GMService,'function');
  assert.equal(publicPrincipal,compatibilityPrincipal);
  const source=readFileSync(new URL('../../src/gm.js',import.meta.url),'utf8');
  assert.match(source,/import\s*\{\s*conversationPrincipal\s*\}\s*from\s*["']\.\/frameworks\/session\/public\.js["']/);
  assert.doesNotMatch(source,/import\s*\{\s*conversationPrincipal\s*\}\s*from\s*["']\.\/conversation-principal\.js["']/);

  const dir=mkdtempSync(join(tmpdir(),'rf05-f04-c02-'));
  const db=new VeiledDB(join(dir,'session.sqlite'),fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)));
  t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
  db.ensureCampaign('rf05-f04-c02');
  db.upsertPlayer('rf05-f04-c02','owner','Owner');
  const pc=db.createCharacter('rf05-f04-c02','owner','Mira');
  const session=db.startSession('rf05-f04-c02','Current Session');
  db.assignCharacter(session.id,'owner',pc.id);
  db.setPresence(session.id,'owner','present');
  const principal=publicPrincipal(db,'rf05-f04-c02','owner',pc.id);
  assert.equal(principal.kind,'owner');
  assert.equal(principal.character_id,pc.id);
  assert.equal(principal.session_id,session.id);
  assert.match(principal.revision,/^[a-f0-9]{24}$/);
  assert.match(principal.authority,/no owner-private memory/);
});
