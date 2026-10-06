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
  constructor(config){
    this.config=config;
    this.guilds=new Map();
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
      const state={player,queue:[],playing:false,lastBuffers:[],lastText:"",lastAt:null,mode:this.config.voiceMode,voice:this.config.voiceName,instructions:this.config.voiceInstructions,speed:this.config.voiceSpeed,channelId:null,currentTemp:null};
      player.on(AudioPlayerStatus.Idle,()=>this._advance(guildId));
      player.on("error",err=>{ console.error("Voice playback error",err); this._advance(guildId); });
      this.guilds.set(guildId,state);
    }
    return this.guilds.get(guildId);
  }

  async join(guild,channel){
    if(!this.config.voiceEnabled) throw new Error("Voice narration is disabled. Set VOICE_ENABLED=true and restart Veilkeeper.");
    if(!channel?.isVoiceBased?.()) throw new Error("Join a Discord voice channel first.");
    const state=this._state(guild.id);
    const existing=getVoiceConnection(guild.id);
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
    state.queue=[];
    state.player.stop(true);
    const c=getVoiceConnection(guildId);
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
    const connection=getVoiceConnection(guildId);
    return {
      enabled:this.config.voiceEnabled,
      connected:!!connection,
      channelId:state.channelId,
      mode:state.mode,
      voice:state.voice,
      model:this.config.voiceModel,
      speed:state.speed,
      queued:state.queue.length+(state.playing?1:0),
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

  async narrate(guild,text,{force=false}={}){
    const state=this._state(guild.id);
    if(!this.config.voiceEnabled||(!force&&state.mode==="off")) return {ok:false,reason:"disabled"};
    if(!getVoiceConnection(guild.id)) return {ok:false,reason:"not_connected"};
    if(!this.ffmpegAvailable) throw new Error("FFmpeg was not found in PATH. Voice playback requires FFmpeg.");
    const clean=speechSafeText(text).slice(0,this.config.voiceMaxCharsPerTurn);
    if(!clean) return {ok:false,reason:"empty"};
    const parts=splitSpeechText(clean,3900);
    const buffers=[];
    for(const part of parts) buffers.push(await this._synthesize(part,state));
    state.lastBuffers=buffers;
    state.lastText=clean;
    state.lastAt=new Date().toISOString();
    this._enqueue(guild.id,buffers);
    return {ok:true,segments:buffers.length,characters:clean.length};
  }

  repeat(guildId){
    const state=this._state(guildId);
    if(!getVoiceConnection(guildId)) throw new Error("Veilkeeper is not connected to a voice channel.");
    if(!state.lastBuffers.length) throw new Error("There is no previously narrated line to repeat.");
    this._enqueue(guildId,state.lastBuffers);
    return {segments:state.lastBuffers.length};
  }

  _enqueue(guildId,buffers){
    const state=this._state(guildId);
    const room=Math.max(0,this.config.voiceMaxQueue-state.queue.length-(state.playing?1:0));
    if(room<=0) return;
    for(const b of buffers.slice(0,room)) state.queue.push(Buffer.from(b));
    if(!state.playing) this._advance(guildId);
  }

  _advance(guildId){
    const state=this._state(guildId);
    if(state.currentTemp){
      try{fs.unlinkSync(state.currentTemp);}catch{}
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
