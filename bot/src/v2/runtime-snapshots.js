import {createHash} from 'node:crypto';
import {copyFileSync,existsSync,mkdirSync,readFileSync,readdirSync,realpathSync,lstatSync,writeFileSync,openSync,readSync,closeSync} from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {acquireGuildRuntimeLease,defaultGuildLeaseDirectory} from './guild-runtime-lease.js';
import {prepareRuntimeDirectory} from './runtime-directory.js';
const FORMAT='veilkeeper2-offline-snapshot-v1',sealName='snapshot.json',sha=b=>createHash('sha256').update(b).digest('hex');
const dataNames=new Set(['actions.sqlite','cost-prompts.sqlite','decisions.sqlite','interactions.sqlite','knowledge.sqlite','recall.sqlite','prompts.sqlite','scenes.sqlite','sources.sqlite','turns.sqlite','private-hooks.sqlite']);
const allowed=name=>[...dataNames,'legacy-source.sqlite'].some(base=>name===base||name===base+'-wal'||name===base+'-journal');
function digestFile(file){const handle=openSync(file,'r'),hash=createHash('sha256'),buffer=Buffer.allocUnsafe(1024*1024);let bytes=0;try{for(;;){const count=readSync(handle,buffer,0,buffer.length,null);if(!count)break;hash.update(buffer.subarray(0,count));bytes+=count;}return {bytes,sha256:hash.digest('hex')};}finally{closeSync(handle);}}
function emptyDirectory(path){const target=resolve(path);if(existsSync(target)){if(lstatSync(target).isSymbolicLink()||!lstatSync(target).isDirectory()||readdirSync(target).length)throw new Error('New or empty snapshot destination required');}else mkdirSync(target,{recursive:true});return realpathSync(target);}
function separate(a,b){const rel=relative(resolve(a),resolve(b));if(rel===''||!rel.startsWith('..')&&!isAbsolute(rel))throw new Error('Snapshot source and destination must be separate');}
function fileRecord(folder,name){const file=join(folder,name);if(!allowed(name)||lstatSync(file).isSymbolicLink()||!lstatSync(file).isFile())throw new Error('Closed snapshot file set required');return {name,...digestFile(file)};}
function copyExact(source,target){if(existsSync(target))throw new Error('Snapshot files must not overwrite existing data');copyFileSync(source,target);}
/** Native operator API only. Contains private campaign data; never an AI tool or
 * Discord attachment. No live writer may bypass the local guild/runtime locks.
 * SHM is transient SQLite coordination; durable main/WAL/journal bytes are kept.
 */
export function createRuntimeSnapshot({directory,legacyDb,guildId,leaseDirectory=defaultGuildLeaseDirectory(),destination}){
 separate(directory,destination);separate(destination,directory);separate(destination,legacyDb);
 const lease=acquireGuildRuntimeLease({guildId,directory:leaseDirectory});let runtime;
 try{
  runtime=prepareRuntimeDirectory({directory,legacyDb,guildId,resume:true});const manifest=runtime.inspectManifest();if(manifest.phase!=='ready')throw new Error('Ready native runtime required for offline snapshot');
  const output=emptyDirectory(destination),entries=[];
  for(const store of manifest.stores){if(!dataNames.has(store.name))throw new Error('Known native snapshot store required');for(const suffix of ['','-wal','-journal']){const name=store.name+suffix,file=join(runtime.directory,name);if(existsSync(file))entries.push({name,file});}}
  for(const suffix of ['','-wal','-journal'])if(existsSync(legacyDb+suffix))entries.push({name:'legacy-source.sqlite'+suffix,file:legacyDb+suffix});
  const expected=entries.map(({name,file})=>{if(lstatSync(file).isSymbolicLink()||!lstatSync(file).isFile())throw new Error('Regular snapshot source required');return {name,...digestFile(file)};}).sort((a,b)=>a.name.localeCompare(b.name));
  for(const {name,file} of entries)copyExact(file,join(output,name));
  for(const {name,file} of entries){const original=expected.find(r=>r.name===name),copied=fileRecord(output,name),current=digestFile(file);if(JSON.stringify(copied)!==JSON.stringify(original)||current.sha256!==original.sha256||current.bytes!==original.bytes)throw new Error('Snapshot source changed during capture');}
  if(JSON.stringify(runtime.inspectManifest())!==JSON.stringify(manifest))throw new Error('Native manifest changed during snapshot');
  const content={format:FORMAT,guildId,manifest,files:expected},snapshotHash=sha(JSON.stringify(content));writeFileSync(join(output,sealName),JSON.stringify({...content,snapshotHash},null,2)+'\n',{flag:'wx'});
  return Object.freeze({directory:output,snapshotHash,files:expected.length,guildId,runId:manifest.runId});
 }finally{try{runtime?.close();}finally{lease.close();}}
}
export function inspectRuntimeSnapshot(directory,{expectedHash}={}){
 const folder=realpathSync(directory),bytes=readFileSync(join(folder,sealName));if(bytes.length>2_000_000)throw new Error('Bounded offline snapshot seal required');
 const value=JSON.parse(bytes),{snapshotHash,...content}=value;
 if(value.format!==FORMAT||!/^\d{5,25}$/.test(value.guildId??'')||!Array.isArray(value.files)||!value.files.length||value.files.length>36||new Set(value.files.map(f=>f.name)).size!==value.files.length||typeof snapshotHash!=='string'||sha(JSON.stringify(content))!==snapshotHash||expectedHash!==undefined&&expectedHash!==snapshotHash)throw new Error('Exact sealed offline snapshot required');
 const names=new Set(value.files.map(f=>f.name));if(readdirSync(folder).some(n=>n!==sealName&&!names.has(n))||!names.has('legacy-source.sqlite'))throw new Error('Closed offline snapshot file set required');
 for(const f of value.files)if(!allowed(f.name)||Object.keys(f).sort().join(',')!=='bytes,name,sha256'||JSON.stringify(fileRecord(folder,f.name))!==JSON.stringify(f))throw new Error('Offline snapshot file hash mismatch');
 if(value.manifest?.guildId!==value.guildId||value.manifest.phase!=='ready'||!Array.isArray(value.manifest.stores)||value.manifest.stores.some(s=>!dataNames.has(s.name)||!names.has(s.name))||[...names].some(n=>!n.startsWith('legacy-source.sqlite')&&!value.manifest.stores.some(s=>n===s.name||n===s.name+'-wal'||n===s.name+'-journal')))throw new Error('Snapshot manifest file set requires review');
 return Object.freeze({directory:folder,snapshotHash,guildId:value.guildId,manifest:structuredClone(value.manifest),files:structuredClone(value.files)});
}
/** Restore only to a new bundle. Original runtime, source, IDs and receipts are
 * never overwritten; only exact source path and new file inode metadata rebind.
 */
export function restoreRuntimeSnapshot({snapshotDirectory,expectedHash,destination,leaseDirectory=defaultGuildLeaseDirectory()}){
 if(typeof expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(expectedHash))throw new Error('Explicit reviewed snapshot hash required');
 separate(snapshotDirectory,destination);separate(destination,snapshotDirectory);const snapshot=inspectRuntimeSnapshot(snapshotDirectory,{expectedHash}),lease=acquireGuildRuntimeLease({guildId:snapshot.guildId,directory:leaseDirectory});let runtime;
 try{
  const bundle=emptyDirectory(destination),legacyDir=join(bundle,'legacy'),directory=join(bundle,'native');mkdirSync(legacyDir);const legacyDb=join(legacyDir,'legacy.sqlite');
  for(const f of snapshot.files.filter(f=>f.name.startsWith('legacy-source.sqlite')))copyExact(join(snapshot.directory,f.name),legacyDb+f.name.slice('legacy-source.sqlite'.length));
  runtime=prepareRuntimeDirectory({directory,legacyDb,guildId:snapshot.guildId,restoreSnapshotHash:expectedHash});
  for(const f of snapshot.files.filter(f=>!f.name.startsWith('legacy-source.sqlite'))){copyExact(join(snapshot.directory,f.name),join(directory,f.name));if(JSON.stringify(fileRecord(directory,f.name))!==JSON.stringify(f))throw new Error('Restored native file hash mismatch');}
  inspectRuntimeSnapshot(snapshot.directory,{expectedHash});const adopted=runtime.adoptOfflineSnapshot(snapshot.manifest,{snapshotHash:expectedHash});runtime.seal();
  const result={format:'veilkeeper2-offline-restore-v1',snapshotHash:expectedHash,guildId:snapshot.guildId,runId:adopted.runId,directory,legacyDb};writeFileSync(join(bundle,'restore.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});return Object.freeze(result);
 }finally{try{runtime?.close();}finally{lease.close();}}
}
