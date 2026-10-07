/**
 * Stable application-domain errors used at Discord/API boundaries.
 *
 * Error codes keep expected user failures separate from unexpected runtime
 * defects without coupling behavior to human-readable message wording.
 */

export class VeiledError extends Error {
  constructor(message, { code = "VEILED_ERROR", expected = false, cause } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.code = code;
    this.expected = expected;
  }
}

export class UserInputError extends VeiledError {
  constructor(message, options = {}) { super(message, { ...options, code: options.code ?? "INVALID_INPUT", expected: true }); }
}

export class PermissionError extends VeiledError {
  constructor(message = "Permission denied.", options = {}) { super(message, { ...options, code: options.code ?? "PERMISSION_DENIED", expected: true }); }
}

export class NotFoundError extends VeiledError {
  constructor(message = "Not found.", options = {}) { super(message, { ...options, code: options.code ?? "NOT_FOUND", expected: true }); }
}

export class StateConflictError extends VeiledError {
  constructor(message, options = {}) { super(message, { ...options, code: options.code ?? "STATE_CONFLICT", expected: true }); }
}

const LEGACY_EXPECTED = /required|not found|unavailable|no active session|already active|already accepted|already rejected|canon proposal|only a gm|gm\/admin permission|manage server|choose another player|requires a proxy|must include|import requires|could not download|no active owned character|at least two present|manual assembly|already in established-party|invalid assembly|npc proxy|offered to another player|not releasable|already connected to another voice channel|join veilkeeper's current voice channel|repeat is on cooldown|voice narration queue is full/i;

/**
 * Return true for safe, user-facing failures that should not be treated as an
 * internal incident. Legacy message matching remains temporarily centralized
 * here while older handlers migrate to typed errors.
 */
export function isExpectedError(error) {
  if (error?.expected === true) return true;
  return LEGACY_EXPECTED.test(String(error?.message ?? error ?? ""));
}
