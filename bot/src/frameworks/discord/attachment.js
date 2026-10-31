import {AttachmentBuilder} from 'discord.js';
/** Original SDK construction only; caller retains content/name/options and all authority. */
export function createAttachment(buffer,options){
  return new AttachmentBuilder(buffer,options);
}
