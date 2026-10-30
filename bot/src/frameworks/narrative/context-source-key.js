import {createHash} from 'node:crypto';
export const contextSourceKey=(messageId,character)=>`context:${createHash("sha256").update(JSON.stringify([messageId,character])).digest("hex").slice(0,40)}`;
