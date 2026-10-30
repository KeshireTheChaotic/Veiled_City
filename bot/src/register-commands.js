/** Discord application-command registration entry point. */
import 'dotenv/config';
import { registerCommands } from './frameworks/discord/public.js';

await registerCommands();
