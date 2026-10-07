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

  const chunks = [];
  let offset = 0;
  while (offset < text.length) {
    const remaining = text.length - offset;
    if (remaining <= limit) {
      chunks.push(text.slice(offset));
      break;
    }

    const window = text.slice(offset, offset + limit);
    let cut = window.lastIndexOf("\n");
    if (cut >= Math.floor(limit * 0.5)) {
      cut += 1; // Preserve the newline in the preceding chunk.
    } else {
      cut = window.lastIndexOf(" ");
      if (cut >= Math.floor(limit * 0.5)) cut += 1;
      else cut = limit;
    }

    chunks.push(text.slice(offset, offset + cut));
    offset += cut;
  }
  return chunks;
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
