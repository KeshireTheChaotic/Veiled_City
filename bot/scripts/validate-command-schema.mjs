import { buildCommands } from '../src/commands.js';
import { validateCommandSchema } from '../src/command-schema.js';

const commands=buildCommands();
const errors=validateCommandSchema(commands);
if(errors.length){
  console.error('Discord command schema validation failed:');
  for(const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`Discord command schema OK (${commands.length} root command${commands.length===1?'':'s'}).`);
