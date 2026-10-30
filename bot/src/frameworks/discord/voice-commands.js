/** Original Discord voice command transport; authoritative text and caller permission/receipt boundaries stay unchanged. */
export async function handleVoiceCommand(interaction,{sub,voice,isGm}){
  if(!voice) throw new Error("Voice subsystem is unavailable in this runtime.");
  if(sub==="status"){
    const st=voice.status(interaction.guildId);
    const where=st.channelId?`<#${st.channelId}>`:"not connected";
    await interaction.reply({content:[
      `**Veilkeeper Voice** — ${st.enabled?"enabled":"disabled"}`,
      `Connection: ${where} • Mode: **${st.mode}**`,
      `Model: **${st.model}** • Voice: **${st.voice}** • Speed: **${st.speed}×**`,
      `Playback: ${st.paused?"paused":"ready"} • Queue: ${st.queued} • Last narration cached: ${st.hasLast?"yes":"no"}`,
      `FFmpeg: ${st.ffmpeg?"detected":"NOT FOUND"}`,
      `Voice output is AI-generated.`
    ].join("\n"),ephemeral:true});
    return true;
  }
  if(sub==="join"){
    const ch=interaction.member?.voice?.channel;
    if(!ch) throw new Error("Join the voice channel you want Veilkeeper to use, then run this command again.");
    await interaction.deferReply({ephemeral:true});
    const st=await voice.join(interaction.guild,ch,{allowMove:isGm()});
    await interaction.editReply(`Veilkeeper joined **${ch.name}** for AI-generated narration. Mode: **${st.mode}** • Voice: **${st.voice}**. Discord text remains the authoritative campaign record.`);
    return true;
  }
  if(sub==="repeat"){
    const r=voice.repeat(interaction.guildId,{requesterUserId:interaction.user.id,requesterChannelId:interaction.member?.voice?.channelId||null});
    await interaction.reply({content:`Replaying the last narration (${r.segments} audio segment${r.segments===1?"":"s"}) from cache; no new speech-generation request was made.`,ephemeral:true});
    return true;
  }
  if(!isGm()) throw new Error("GM/admin permission required for this voice control.");
  if(sub==="leave"){ voice.leave(interaction.guildId); await interaction.reply({content:"Veilkeeper disconnected from voice.",ephemeral:true}); return true; }
  if(sub==="pause"){ voice.pause(interaction.guildId); await interaction.reply({content:"Voice narration paused.",ephemeral:true}); return true; }
  if(sub==="resume"){ voice.resume(interaction.guildId); await interaction.reply({content:"Voice narration resumed.",ephemeral:true}); return true; }
  if(sub==="configure"){
    const mode=interaction.options.getString("mode");
    const voiceName=interaction.options.getString("voice");
    const speed=interaction.options.getNumber("speed");
    const instructions=interaction.options.getString("instructions");
    if(mode) voice.setMode(interaction.guildId,mode);
    if(voiceName) voice.setVoice(interaction.guildId,voiceName);
    if(speed!=null) voice.setSpeed(interaction.guildId,speed);
    if(instructions!=null) voice.setInstructions(interaction.guildId,instructions);
    const st=voice.status(interaction.guildId);
    await interaction.reply({content:`Runtime voice settings updated: mode **${st.mode}**, voice **${st.voice}**, speed **${st.speed}×**. These runtime overrides reset when Veilkeeper restarts; set the matching .env values for permanent defaults.`,ephemeral:true});
    return true;
  }
  if(sub==="narrate"){
    await interaction.deferReply({ephemeral:true});
    const r=await voice.narrate(interaction.guild,interaction.options.getString("text",true),
      {force:true,visibility:"party",npcKey:interaction.options.getString("npc")||null});
    if(!r.ok){
      const reason={not_connected:"Veilkeeper is not connected to voice. Use /vc-voice join first.",queue_full:"Voice narration queue is full. Wait for current narration to finish.",cancelled:"Voice narration was cancelled because the voice connection changed.",disabled:"Voice narration is disabled.",empty:"Narration text was empty after speech-safe cleanup."}[r.reason]||`Voice narration unavailable (${r.reason||"unknown"}).`;
      throw new Error(reason);
    }
    await interaction.editReply(`Queued one-off AI narration (${r.segments} segment${r.segments===1?"":"s"}).`);
    return true;
  }

  return false;
}
