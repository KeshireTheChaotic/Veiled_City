import {AttachmentBuilder} from 'discord.js';
/** Original transport attachment wrapping only; caller retains content/audience authorization. */
export function exportAttachments(files){
  return files.map(f=>new AttachmentBuilder(f.buffer,{name:f.name}));
}
