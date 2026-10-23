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

