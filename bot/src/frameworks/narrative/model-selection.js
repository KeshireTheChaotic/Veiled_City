/** Select the configured model for an existing narrative lane. */
export function narrativeModel(config,packet,lane='combined'){
  const lightweight=lane==='observation'&&!packet.protected_scene;
  return (lightweight&&config.narrativeFastModel)||config.narrativeModel
    ||(lane==='combined'?(config.routineGmModel||config.gmModel):lane==='downtime'?(config.downtimeModel||config.gmModel):config.gmModel);
}
