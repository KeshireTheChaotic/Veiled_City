/** Provider-free consistent SQLite online backup + disposable restore drill. Never opens VeiledDB or runs migrations. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync,backup as sqliteBackup} from 'node:sqlite';
function inspect(file){
  const db=new DatabaseSync(file,{readOnly:true});
  try{
    const integrity=db.prepare('PRAGMA integrity_check').all().map(row=>Object.values(row)[0]),foreignKeys=db.prepare('PRAGMA foreign_key_check').all();
    if(integrity.length!==1||integrity[0]!=='ok'||foreignKeys.length)throw new Error(`SQLite verification failed: integrity=${integrity[0]==='ok'?'ok':'failed'}; foreign_key_failures=${foreignKeys.length}`);
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name),counts={};
    for(const name of ['characters','saved_rolls','rolls','mutation_ledger','publication_outbox','world_events','city_records'])
      if(tables.includes(name))counts[name]=db.prepare(`SELECT COUNT(*) n FROM "${name}"`).get().n;
    return {integrity:'ok',foreign_key_failures:0,user_version:db.prepare('PRAGMA user_version').get().user_version,journal_mode:db.prepare('PRAGMA journal_mode').get().journal_mode,counts};
  }finally{db.close();}
}
export async function verifiedBackup(sourceFile,destinationFile){
  const source=fs.realpathSync(sourceFile),destination=path.resolve(destinationFile);
  if(!fs.statSync(source).isFile()||fs.existsSync(destination)||!fs.existsSync(path.dirname(destination))
    ||path.dirname(source)===path.dirname(destination))throw new Error('Explicit existing source, separate backup directory and unused destination required.');
  const before=inspect(source),db=new DatabaseSync(source,{readOnly:true});
  try{await sqliteBackup(db,destination);}finally{db.close();}
  const backup=inspect(destination),sha256=createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
  const drill=fs.mkdtempSync(path.join(os.tmpdir(),'veiled-restore-drill-'));
  let restored;
  try{
    const copy=path.join(drill,'restored.sqlite');fs.copyFileSync(destination,copy);restored=inspect(copy);
    if(JSON.stringify(restored.counts)!==JSON.stringify(backup.counts)||restored.user_version!==backup.user_version)
      throw new Error('Disposable restore does not preserve schema/receipt/outbox counts.');
  }finally{
    const absolute=path.resolve(drill),temporary=path.resolve(os.tmpdir())+path.sep;
    if(!absolute.startsWith(temporary)||!path.basename(absolute).startsWith('veiled-restore-drill-'))throw new Error('Unsafe restore cleanup path.');
    fs.rmSync(absolute,{recursive:true,force:true});
  }
  return {version:1,source,backup_file:destination,sha256,size_bytes:fs.statSync(destination).size,before,backup,restore:restored,
    restore_drill:'passed; disposable restore removed; no bot, migrations, effects or network invoked'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==4)throw new Error('Usage: node scripts/production-backup.mjs <exact-source.sqlite> <new-outside-repository-backup.sqlite>');
  console.log(JSON.stringify(await verifiedBackup(process.argv[2],process.argv[3]),null,2));
}
