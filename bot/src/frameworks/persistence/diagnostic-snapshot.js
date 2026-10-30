/** Original rollback-journal snapshot opening sequence; returns only a read-only/query-only native handle. */
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
export function openDiagnosticSnapshot(file){
    const fd=fs.openSync(file,'r'),header=Buffer.alloc(20);
    try{fs.readSync(fd,header,0,20,0);}finally{fs.closeSync(fd);}
    if(header[18]!==1||header[19]!==1)throw new Error('Use a separately prepared rollback-journal diagnostic snapshot, never open unsafe WAL sources.');
    const connection=new DatabaseSync(file,{readOnly:true});connection.exec('PRAGMA query_only=ON;');
    return connection;
}
