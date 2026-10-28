/**
 * Discord message chunking utilities.
 *
 * This module is the single source of truth for splitting text that will be
 * sent as Discord messages. Splitting is lossless: concatenating the returned
 * chunks reconstructs the original input exactly. Prefer natural newline or
 * whitespace boundaries, but hard-cut when a single token exceeds the limit.
 */

/**
 * Split arbitrary text into Discord-safe chunks without dropping characters.
 *
 * @param {unknown} value Text-like value to split.
 * @param {number} [limit=1900] Maximum characters per chunk.
 * @returns {string[]} Ordered chunks whose concatenation equals the input.
 */
export function splitDiscordText(value, limit = 1900) {
  const text = String(value ?? "");
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Discord chunk limit must be a positive integer.");
  }
  if (text.length <= limit) return [text];

  const fenced = text.includes("```");
  const payloadLimit = fenced ? Math.max(1, limit - 48) : limit;
  const rawChunks = [];
  let offset = 0;
  while (offset < text.length) {
    const remaining = text.length - offset;
    if (remaining <= payloadLimit) {
      rawChunks.push(text.slice(offset));
      break;
    }

    const window = text.slice(offset, offset + payloadLimit);
    let cut = window.lastIndexOf("\n");
    if (cut >= Math.floor(payloadLimit * 0.5)) {
      cut += 1; // Preserve the newline in the preceding chunk.
    } else {
      cut = window.lastIndexOf(" ");
      if (cut >= Math.floor(payloadLimit * 0.5)) cut += 1;
      else cut = payloadLimit;
    }
    const candidate=text.slice(offset,offset+cut),openMention=candidate.lastIndexOf("<"),closedMention=candidate.lastIndexOf(">");
    if(openMention>closedMention&&/^<[@#&!]?[0-9]+>/.test(text.slice(offset+openMention))&&openMention>0)cut=openMention;
    const last=text.charCodeAt(offset+cut-1);
    if(last>=0xd800&&last<=0xdbff)cut--;

    rawChunks.push(text.slice(offset, offset + cut));
    offset += cut;
  }
  if(!fenced)return rawChunks;
  let openLanguage=null;
  return rawChunks.map(raw=>{
    const prefix=openLanguage===null?"":`\`\`\`${openLanguage}\n`;
    const markers=[...raw.matchAll(/```([^\n`]*)/g)];
    for(const marker of markers){
      if(openLanguage===null)openLanguage=String(marker[1]||"").trim().slice(0,32);
      else openLanguage=null;
    }
    const suffix=openLanguage===null?"":"\n```";
    const chunk=prefix+raw+suffix;
    if(chunk.length>limit)throw new RangeError("Markdown-safe Discord chunk exceeded its configured limit.");
    return chunk;
  });
}

/**
 * Join logical lines and split them with the same lossless Discord policy.
 *
 * @param {Array<unknown>|unknown} lines Lines or one scalar value.
 * @param {number} [limit=1900] Maximum characters per chunk.
 * @returns {string[]} Discord-safe chunks.
 */
export function chunkDiscordLines(lines, limit = 1900) {
  const values = Array.isArray(lines) ? lines : [lines];
  return splitDiscordText(values.map((x) => String(x ?? "")).join("\n"), limit);
}
