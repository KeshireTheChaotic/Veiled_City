import {DatabaseSync} from 'node:sqlite';
import {existsSync,lstatSync,mkdirSync,readFileSync,realpathSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';import {fileURLToPath} from 'node:url';
/** All worktrees of one non-bare checkout share the main checkout's lock path.
 * Packaged/custom Git layouts must explicitly configure the same lease directory
 * for every native launcher. This is a local native-process fence, not a Discord
 * or cross-machine ownership claim and not a lock honored by legacy launchers.
 */
export function defaultGuildLeaseDirectory(repositoryRoot=fileURLToPath(new URL('../../../',import.meta.url))){
 try{
 const marker=join(resolve(repositoryRoot),'.git');let gitDirectory;
 if(lstatSync(marker).isDirectory())gitDirectory=realpathSync(marker);
 else{const match=/^gitdir: ([^\r\n]+)\r?\n?$/.exec(readFileSync(marker,'utf8'));if(!match)throw new Error('Explicit VK2_GUILD_LEASE_DIR required for this Git layout');gitDirectory=realpathSync(resolve(repositoryRoot,match[1]));}
 const commonFile=join(gitDirectory,'commondir'),common=existsSync(commonFile)?realpathSync(resolve(gitDirectory,readFileSync(commonFile,'utf8').trim())):gitDirectory;
 if(basename(common)!=='.git')throw new Error('Explicit VK2_GUILD_LEASE_DIR required for this Git layout');return join(dirname(common),'.vk2-runtime-leases');
 }catch(error){if(['ENOENT','ENOTDIR','EISDIR'].includes(error.code))throw new Error('Explicit VK2_GUILD_LEASE_DIR required outside a supported Git checkout');throw error;}
}
/** SQLite's exclusive process-lifetime lock is shared across data directories.
 * No token, source body or campaign state is stored. Do not move/delete active
 * lease files, or configure competing launchers with different lease paths.
 */
export function acquireGuildRuntimeLease({guildId,directory}){
 if(!/^\d{5,25}$/.test(guildId??'')||typeof directory!=='string'||!directory)throw new TypeError('Exact native guild lease scope required');
 mkdirSync(resolve(directory),{recursive:true});const folder=realpathSync(directory),file=join(folder,`guild-${guildId}.sqlite`),db=new DatabaseSync(file);let closed=false;
 try{
  db.exec('PRAGMA busy_timeout=0; PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE');
  if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>r.name!=='vk2_guild_runtime_lease'))throw new Error('Dedicated guild runtime lease required');
  db.exec('CREATE TABLE IF NOT EXISTS vk2_guild_runtime_lease(id INTEGER PRIMARY KEY,guild TEXT NOT NULL,version INTEGER NOT NULL)');
  const rows=db.prepare('SELECT * FROM vk2_guild_runtime_lease').all();if(rows.length>1||rows.length===1&&(rows[0].id!==1||rows[0].guild!==guildId||rows[0].version!==1))throw new Error('Guild runtime lease identity/version requires review');
  if(!rows.length)db.prepare('INSERT INTO vk2_guild_runtime_lease VALUES(1,?,1)').run(guildId);
  db.exec('COMMIT; BEGIN EXCLUSIVE');
 }catch(error){try{db.exec('ROLLBACK');}catch{}db.close();throw error;}
 return Object.freeze({guildId,directory:folder,close(){if(closed)return;closed=true;try{db.exec('ROLLBACK');}finally{db.close();}}});
}
