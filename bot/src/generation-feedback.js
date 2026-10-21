/** Status-only feedback. Timers never infer commit state, issue model calls or count as a substantive answer. */
import {currentTurnTrace} from './turn-trace-context.js';
export function beginGenerationFeedback(message,config,{schedule=setTimeout,repeat=setInterval,cancel=clearTimeout,cancelRepeat=clearInterval}={}){
  let stopped=false,announced=false;const trace=currentTurnTrace();
  const typing=()=>{if(!stopped)void Promise.resolve().then(()=>{if(!stopped)return message.channel.sendTyping();}).catch(()=>{});};
  typing();const typingTimer=repeat(typing,config.typingRefreshMs||8000);
  const progressTimer=config.gmProgressEnabled!==true?null:schedule(()=>{
    if(stopped||announced)return;announced=true;
    void Promise.resolve().then(async()=>{
      if(stopped)return;
      await message.reply('Veilkeeper is still processing this turn. Generation or delivery may be in progress; do not resend the action.');
      trace?.progress();
    }).catch(()=>{});
  },config.gmProgressAfterMs||20000);
  typingTimer?.unref?.();progressTimer?.unref?.();
  return ()=>{stopped=true;cancelRepeat(typingTimer);if(progressTimer!==null)cancel(progressTimer);};
}
