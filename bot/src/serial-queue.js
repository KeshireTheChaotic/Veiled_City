/** Per-key promise serialization used to prevent concurrent authoritative GM turns. */
export class KeyedSerialQueue {
  constructor(){ this.tails=new Map();this.depths=new Map(); }

  enqueue(key,job){
    const queueKey=String(key);
    this.depths.set(queueKey,this.depth(queueKey)+1);
    const previous=this.tails.get(queueKey)||Promise.resolve();
    const run=previous.catch(()=>{}).then(()=>job());
    let tail;
    // The caller owns the job error; the internal tail must always settle safely.
    tail=run.catch(()=>{}).finally(()=>{
      const depth=this.depth(queueKey)-1;if(depth>0)this.depths.set(queueKey,depth);else this.depths.delete(queueKey);
      if(this.tails.get(queueKey)===tail) this.tails.delete(queueKey);
    });
    this.tails.set(queueKey,tail);
    return run;
  }

  pending(key){ return this.tails.has(String(key)); }
  depth(key){return this.depths.get(String(key))||0;}
}
