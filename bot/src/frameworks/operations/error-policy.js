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
