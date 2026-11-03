import {openRollStore} from '../../../src/v2/rules/roll-store.js';
const store=openRollStore(process.argv[2]),operation=process.argv[3];
process.once('message',message=>{
  if(message!=='run')throw new Error('Expected native test barrier release');
  let result;
  try{
    const value=operation==='hold'
      ?store.holdForFear('c','q','decision',{check:()=>{}})
      :store.recordOwnerRoll('c','q',{id:'dice',ownerUserId:'u',hope:9,fear:3},{check:()=>{}});
    result={ok:true,operation,value};
  }catch(error){result={ok:false,operation,error:error.message};}
  finally{store.close();}
  process.send(result,()=>process.disconnect());
});
process.send('ready');
