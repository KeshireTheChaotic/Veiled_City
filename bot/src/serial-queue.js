export class KeyedSerialQueue {
  constructor(){ this.tails=new Map(); }

  enqueue(key,job){
    const queueKey=String(key);
    const previous=this.tails.get(queueKey)||Promise.resolve();
    const run=previous.catch(()=>{}).then(()=>job());
    let tail;
    tail=run.finally(()=>{
      if(this.tails.get(queueKey)===tail) this.tails.delete(queueKey);
    });
    this.tails.set(queueKey,tail);
    return run;
  }

  pending(key){ return this.tails.has(String(key)); }
}
