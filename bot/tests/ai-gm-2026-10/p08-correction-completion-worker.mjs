import {VeiledDB} from '../../src/db.js';

const [dbPath,schemaPath,publicationId]=process.argv.slice(2);
let db;
try{
  db=new VeiledDB(dbPath,schemaPath);
  process.send?.({ready:true});
  await new Promise((resolve,reject)=>{
    process.once('message',message=>message?.start?resolve():reject(new Error('Expected start signal.')));
  });
  const row=db.claimPublication(publicationId);
  if(!process.send)throw new Error('IPC channel unavailable');
  db.close();
  process.send({claimed:!!row,status:row?.status||null});
  process.exitCode=0;
}catch(error){
  try{process.send?.({error:String(error?.stack||error)});}catch{}
  try{db?.close();}catch{}
  process.exitCode=1;
}
