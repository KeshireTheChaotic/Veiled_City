/** Non-authoritative Discord voice narration service with serialized synthesis/playback and bounded queueing. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel
} from "@discordjs/voice";

const BUILTIN_VOICES=new Set(["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse","marin","cedar"]);

function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }

function splitSpeechText(input,max=3900){
  const text=String(input||"").trim();
  if(!text) return [];
  const out=[];
  let rest=text;
  while(rest.length>max){
    let cut=rest.lastIndexOf("\n\n",max);
    if(cut<max*0.45) cut=rest.lastIndexOf(". ",max);
    if(cut<max*0.45) cut=rest.lastIndexOf(" ",max);
    if(cut<1) cut=max;
    out.push(rest.slice(0,cut+1).trim());
    rest=rest.slice(cut+1).trim();
  }
  if(rest) out.push(rest);
  return out;
}

export function speechSafeText(input){
  return String(input||"")
    .replace(/```[\s\S]*?```/g," ")
    .replace(/`([^`]+)`/g,"$1")
    .replace(/https?:\/\/\S+/g,"link")
    .replace(/<@!?\d+>/g,"someone")
    .replace(/<#[0-9]+>/g,"a channel")
    .replace(/[*_~>#|]/g," ")
    .replace(/\[(.*?)\]\([^)]*\)/g,"$1")
    .replace(/\s+/g," ")
    .trim();
}

function voiceParam(name){
  const v=String(name||"cedar").trim();
  return v.startsWith("voice_")?{id:v}:v;
}

export class VoiceNarrator {
  constructor(config,{getConnection=getVoiceConnection}={}){
    this.config=config;
    this.guilds=new Map();
    this.getConnection=getConnection;
    this.ffmpegAvailable=this.checkFfmpeg();
  }

  checkFfmpeg(){
    try{
      const r=spawnSync("ffmpeg",["-version"],{stdio:"ignore"});
      return r.status===0;
    }catch{return false;}
  }

  _state(guildId){
    if(!this.guilds.has(guildId)){
      const player=createAudioPlayer({behaviors:{noSubscriber:NoSubscriberBehavior.Pause}});
      const state={
        player,queue:[],playing:false,reserved:0,speechTail:Promise.resolve(),repeatUsers:new Map(),generation:0,
        lastBuffers:[],lastText:"",lastAt:null,mode:this.config.voiceMode,voice:this.config.voiceName,
        instructions:this.config.voiceInstructions,speed:this.config.voiceSpeed,channelId:null,currentTemp:null
      };
      player.on(AudioPlayerStatus.Idle,()=>this._advance(guildId));
      player.on("error",err=>{ console.error("Voice playback error",err); this._advance(guildId); });
      this.guilds.set(guildId,state);
    }
    return this.guilds.get(guildId);
  }

  _usedSlots(state){ return state.queue.length+(state.playing?1:0)+state.reserved; }
  _availableSlots(state){ return Math.max(0,this.config.voiceMaxQueue-this._usedSlots(state)); }

  async join(guild,channel,{allowMove=false}={}){
    if(!this.config.voiceEnabled) throw new Error("Voice narration is disabled. Set VOICE_ENABLED=true and restart Veilkeeper.");
    if(!channel?.isVoiceBased?.()) throw new Error("Join a Discord voice channel first.");
    const state=this._state(guild.id);
    const existing=this.getConnection(guild.id);
    const existingChannel=state.channelId||existing?.joinConfig?.channelId||null;
    if(existing&&existingChannel&&existingChannel!==channel.id&&!allowMove){
      throw new Error("Veilkeeper is already connected to another voice channel. A GM/admin must move an existing voice connection.");
    }
    if(existing&&existingChannel===channel.id){
      existing.subscribe(state.player);
      state.channelId=channel.id;
      return this.status(guild.id);
    }
    if(existing) existing.destroy();
    const connection=joinVoiceChannel({
      channelId:channel.id,
      guildId:guild.id,
      adapterCreator:guild.voiceAdapterCreator,
      selfDeaf:true,
      selfMute:false
    });
    await entersState(connection,VoiceConnectionStatus.Ready,15_000);
    connection.subscribe(state.player);
    state.channelId=channel.id;
    return this.status(guild.id);
  }

  leave(guildId){
    const state=this._state(guildId);
    state.generation+=1;
    state.queue=[];
    state.player.stop(true);
    const c=this.getConnection(guildId);
    if(c) c.destroy();
    state.channelId=null;
    return true;
  }

  pause(guildId){ return this._state(guildId).player.pause(true); }
  resume(guildId){ return this._state(guildId).player.unpause(); }

  setMode(guildId,mode){
    if(!["off","narrative","full"].includes(mode)) throw new Error("Voice mode must be off, narrative, or full.");
    this._state(guildId).mode=mode;
    return this.status(guildId);
  }

  setVoice(guildId,name){
    const v=String(name||"").trim();
    if(!v) throw new Error("Voice name or custom voice ID is required.");
    if(!BUILTIN_VOICES.has(v)&&!v.startsWith("voice_")) throw new Error("Use a supported built-in voice name or an OpenAI custom voice ID beginning with voice_.");
    this._state(guildId).voice=v;
    return this.status(guildId);
  }

  setInstructions(guildId,instructions){
    this._state(guildId).instructions=String(instructions||"").trim().slice(0,4096);
    return this.status(guildId);
  }

  setSpeed(guildId,speed){
    this._state(guildId).speed=clamp(Number(speed)||1,0.25,4);
    return this.status(guildId);
  }

  status(guildId){
    const state=this._state(guildId);
    const connection=this.getConnection(guildId);
    return {
      enabled:this.config.voiceEnabled,
      connected:!!connection,
      channelId:state.channelId||connection?.joinConfig?.channelId||null,
      mode:state.mode,
      voice:state.voice,
      model:this.config.voiceModel,
      speed:state.speed,
      queued:state.queue.length+(state.playing?1:0)+state.reserved,
      paused:state.player.state.status===AudioPlayerStatus.Paused||state.player.state.status===AudioPlayerStatus.AutoPaused,
      ffmpeg:this.ffmpegAvailable,
      hasLast:state.lastBuffers.length>0,
      lastAt:state.lastAt
    };
  }

  async _synthesize(text,state){
    const body={
      model:this.config.voiceModel,
      voice:voiceParam(state.voice),
      input:text,
      response_format:"mp3",
      speed:state.speed
    };
    if(state.instructions) body.instructions=state.instructions;
    const res=await fetch("https://api.openai.com/v1/audio/speech",{
      method:"POST",
      headers:{"Authorization":`Bearer ${this.config.openaiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    if(!res.ok){
      const detail=(await res.text()).slice(0,800);
      throw new Error(`OpenAI speech request failed (${res.status}): ${detail}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  narrate(guild,text,{force=false}={}){
    const state=this._state(guild.id);
    if(!this.config.voiceEnabled||(!force&&state.mode==="off")) return Promise.resolve({ok:false,reason:"disabled"});
    if(!this.getConnection(guild.id)) return Promise.resolve({ok:false,reason:"not_connected"});
    if(!this.ffmpegAvailable) return Promise.reject(new Error("FFmpeg was not found in PATH. Voice playback requires FFmpeg."));
    const clean=speechSafeText(text).slice(0,this.config.voiceMaxCharsPerTurn);
    if(!clean) return Promise.resolve({ok:false,reason:"empty"});
    const parts=splitSpeechText(clean,3900);
    if(parts.length>this._availableSlots(state)) return Promise.resolve({ok:false,reason:"queue_full",needed:parts.length,available:this._availableSlots(state)});

    // Reserve capacity before any paid TTS call. The per-guild synthesis chain preserves invocation order.
    state.reserved+=parts.length;
    const generation=state.generation;
    const job=async()=>{
      try{
        if(generation!==state.generation||!this.getConnection(guild.id)){
          state.reserved=Math.max(0,state.reserved-parts.length);
          return {ok:false,reason:"cancelled"};
        }
        const buffers=[];
        for(const part of parts){
          if(generation!==state.generation||!this.getConnection(guild.id)){
            state.reserved=Math.max(0,state.reserved-parts.length);
            return {ok:false,reason:"cancelled"};
          }
          buffers.push(await this._synthesize(part,state));
        }
        state.reserved=Math.max(0,state.reserved-parts.length);
        if(generation!==state.generation||!this.getConnection(guild.id)) return {ok:false,reason:"cancelled"};
        state.lastBuffers=buffers;
        state.lastText=clean;
        state.lastAt=new Date().toISOString();
        this._enqueueReserved(guild.id,buffers);
        return {ok:true,segments:buffers.length,characters:clean.length};
      }catch(err){
        state.reserved=Math.max(0,state.reserved-parts.length);
        throw err;
      }
    };
    const run=state.speechTail.then(job,job);
    state.speechTail=run.catch(()=>{});
    return run;
  }

  repeat(guildId,{requesterUserId=null,requesterChannelId=null}={}){
    const state=this._state(guildId);
    const connection=this.getConnection(guildId);
    if(!connection) throw new Error("Veilkeeper is not connected to a voice channel.");
    const activeChannel=state.channelId||connection?.joinConfig?.channelId||null;
    if(requesterUserId&&!requesterChannelId) throw new Error("Join Veilkeeper's current voice channel before using repeat.");
    if(requesterChannelId&&activeChannel&&requesterChannelId!==activeChannel) throw new Error("Join Veilkeeper's current voice channel before using repeat.");
    if(!state.lastBuffers.length) throw new Error("There is no previously narrated line to repeat.");
    const now=Date.now();
    if(requesterUserId){
      const prior=state.repeatUsers.get(requesterUserId)||0;
      const remaining=this.config.voiceRepeatCooldownMs-(now-prior);
      if(remaining>0) throw new Error(`Repeat is on cooldown for ${Math.ceil(remaining/1000)} more second(s).`);
    }
    if(state.lastBuffers.length>this._availableSlots(state)) throw new Error("Voice queue is full; wait for current narration to finish before repeating.");
    if(requesterUserId) state.repeatUsers.set(requesterUserId,now);
    this._enqueue(guildId,state.lastBuffers);
    return {segments:state.lastBuffers.length};
  }

  _enqueueReserved(guildId,buffers){
    const state=this._state(guildId);
    for(const b of buffers) state.queue.push(Buffer.from(b));
    if(!state.playing) this._advance(guildId);
  }

  _enqueue(guildId,buffers){
    const state=this._state(guildId);
    const room=this._availableSlots(state);
    if(buffers.length>room) return false;
    for(const b of buffers) state.queue.push(Buffer.from(b));
    if(!state.playing) this._advance(guildId);
    return true;
  }

  _advance(guildId){
    const state=this._state(guildId);
    if(state.currentTemp){
      try{fs.unlinkSync(state.currentTemp);}catch{ /* Temp cleanup is best-effort during voice teardown. */ }
      state.currentTemp=null;
    }
    const next=state.queue.shift();
    if(!next){ state.playing=false; return; }
    state.playing=true;
    const dir=path.join(os.tmpdir(),"veiled-city-voice");
    fs.mkdirSync(dir,{recursive:true});
    const file=path.join(dir,`${guildId}-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`);
    fs.writeFileSync(file,next);
    state.currentTemp=file;
    try{
      state.player.play(createAudioResource(file));
    }catch(err){
      console.error("Could not create voice audio resource",err);
      this._advance(guildId);
    }
  }

  destroy(){
    for(const guildId of this.guilds.keys()) this.leave(guildId);
  }
}

export const VOICE_BUILTINS=[...BUILTIN_VOICES];
