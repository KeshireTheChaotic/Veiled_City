/** Lightweight structured logger with environment-configured severity filtering. */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level = "info") {
  const normalized = String(level || "info").toLowerCase();
  const threshold = LEVELS[normalized];
  if (threshold == null) throw new Error(`LOG_LEVEL must be one of: ${Object.keys(LEVELS).join(", ")}.`);
  const write = (name, args) => { if (LEVELS[name] >= threshold) console[name === "debug" ? "debug" : name](...args); };
  return { debug: (...a) => write("debug", a), info: (...a) => write("info", a), warn: (...a) => write("warn", a), error: (...a) => write("error", a) };
}
