/** Required validation cannot reach external services, even with credentials inherited from a shell. */
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import dgram from "node:dgram";
let attempts=0;
const deny=()=>{attempts++;throw new Error("OFFLINE_NETWORK_FORBIDDEN: required tests cannot make outbound requests.");};
process.on("exit",()=>{if(attempts){console.error(`OFFLINE_NETWORK_FORBIDDEN: ${attempts} denied attempt(s); caught errors cannot pass required validation.`);process.exitCode=1;}});
globalThis.fetch=async()=>deny();
for(const module of [http,https]){module.request=deny;module.get=deny;}
net.Socket.prototype.connect=deny;net.connect=deny;net.createConnection=deny;tls.connect=deny;
dgram.Socket.prototype.send=deny;dgram.Socket.prototype.connect=deny;
process.env.OPENAI_API_KEY="offline-dummy-not-a-credential";
process.env.DISCORD_TOKEN="offline-dummy-not-a-credential";
