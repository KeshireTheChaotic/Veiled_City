/** Thin dependency-injected turn pipeline; domain validators and commit/outbox services retain authority. */
import { measureStage } from "./operational-metrics.js";
export class TurnPipeline{
  constructor({metrics,stages}){this.metrics=metrics;this.stages=stages;}
  async execute(input){
    let value=input;
    for(const name of ["capture","generate","validate","commit","publish"]){
      const operation=this.stages[name];if(!operation)continue;
      value=await measureStage(this.metrics,`turn_${name}`,()=>operation(value));
    }
    return value;
  }
}
