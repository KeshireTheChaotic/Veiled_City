# bootstrap ownership

Explicit startup/configuration wiring only. Keep src/index.js and src/register-commands.js stable. Existing eager startup remains exact legacy debt until RF06; new modules must not open databases or clients on import.
