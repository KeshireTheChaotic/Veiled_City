import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readdirSync,readFileSync,lstatSync,statSync,realpathSync} from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
const hash=value=>createHash('sha256').update(value).digest('hex');
const stores=['actions.sqlite','cost-prompts.sqlite','decisions.sqlite','interactions.sqlite','knowledge.sqlite','prompts.sqlite','scenes.sqlite','sources.sqlite','turns.sqlite'];
const STATE='runtime.sqlite',FORMAT='veilkeeper2-native-v1';
function sourceIdentity(filename){
  const path=realpathSync(filename);if(!statSync(path).isFile())throw new Error('Existing read-only legacy source file required');return {path,sha256:hash(readFileSync(path)),walHash:existsSync(path+'-wal')?hash(readFileSync(path+'-wal')):null,journalHash:existsSync(path+'-journal')?hash(readFileSync(path+'-journal')):null};
}
function storeSnapshot(directory){
  return stores.filter(name=>existsSync(join(directory,name))).map(name=>{
    const file=join(directory,name),stat=statSync(file,{bigint:true});if(!stat.isFile()||stat.ino===0n)throw new Error('Stable native store identity required');
    const db=new DatabaseSync(file,{readOnly:true});try{const schema=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();return {name,device:stat.dev.toString(),inode:stat.ino.toString(),schemaHash:hash(JSON.stringify(schema))};}finally{db.close();}
  });
}
function entries(directory){
  for(const name of readdirSync(directory)){
    const valid=[STATE,...stores].includes(name)||[STATE,...stores].some(base=>['-journal','-wal','-shm'].some(suffix=>name===base+suffix));
    if(!valid||lstatSync(join(directory,name)).isSymbolicLink()||!lstatSync(join(directory,name)).isFile())throw new Error('Unknown native directory content requires review');
  }
}
/** Startup boundary only. No campaign import, state repair, gameplay capability or source backfill.
 * SQLite owns the process-lifetime lock, including release after a crash. Schema changes require
 * a reviewed manifest version/migration; missing/foreign stores are not replaced with empty state.
 */
export function prepareRuntimeDirectory({directory,legacyDb,guildId,resume=false}){
  const target=resolve(directory),source=sourceIdentity(legacyDb),rel=relative(target,source.path);
  if(rel===''||!rel.startsWith('..')&&!isAbsolute(rel))throw new Error('Legacy source must be separate from native stores');
  if(existsSync(target)&&readdirSync(target).length&&!resume)throw new Error('Native stores need a new or empty directory, or explicit VK2_RESUME=1');
  mkdirSync(target,{recursive:true});entries(target);
  if(resume&&!existsSync(join(target,STATE)))throw new Error('Historical native stores require reviewed manifest adoption');
  const mutex=new DatabaseSync(join(target,STATE));let manifest,closed=false;
  function save(value){mutex.prepare("INSERT OR REPLACE INTO vk2_runtime_manifest VALUES('runtime',?)").run(JSON.stringify(value));mutex.exec('COMMIT; BEGIN EXCLUSIVE');}
  try{
    mutex.exec('PRAGMA busy_timeout=0; PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE');
    if(mutex.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(t=>t.name!=='vk2_runtime_manifest'))throw new Error('Dedicated native runtime manifest required');
    if(resume){
      const row=mutex.prepare("SELECT data FROM vk2_runtime_manifest WHERE id='runtime'").get();if(!row)throw new Error('Native runtime manifest requires review');manifest=JSON.parse(row.data);
      if(manifest.format!==FORMAT||typeof manifest.runId!=='string'||manifest.guildId!==guildId||JSON.stringify(manifest.source)!==JSON.stringify(source)||!Array.isArray(manifest.stores)||!['initializing','ready'].includes(manifest.phase))throw new Error('Native manifest source, guild or version mismatch');
      const actual=storeSnapshot(target);
      if(manifest.phase==='initializing'&&actual.length||manifest.phase==='ready'&&manifest.stores.some(expected=>!actual.some(current=>JSON.stringify(current)===JSON.stringify(expected)))||actual.some(current=>!manifest.stores.some(expected=>expected.name===current.name)))throw new Error('Native store identity/schema changed; explicit migration required');
    }else{
      mutex.exec('CREATE TABLE vk2_runtime_manifest(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
      manifest={format:FORMAT,runId:randomUUID(),guildId,source,phase:'initializing',stores:[]};save(manifest);
    }
  }catch(error){try{mutex.exec('ROLLBACK');}catch{}mutex.close();throw error;}
  return Object.freeze({directory:target,runId:manifest.runId,seal(){
    if(closed||JSON.stringify(sourceIdentity(legacyDb))!==JSON.stringify(source))throw new Error('Native runtime source changed during startup');
    entries(target);const actual=storeSnapshot(target);
    if(manifest.stores.some(expected=>!actual.some(current=>JSON.stringify(current)===JSON.stringify(expected))))throw new Error('Native startup changed an existing store schema or identity');
    manifest={...manifest,phase:'ready',stores:actual};save(manifest);
  },close(){if(closed)return;closed=true;try{mutex.exec('ROLLBACK');}finally{mutex.close();}}});
}
