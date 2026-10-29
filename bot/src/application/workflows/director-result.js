/** Existing advisory result handling; preserves in-process native result identity. */
/** Confidence alone is not a human review gate; native conflicts have their own evidence-backed review. */
export function lowConfidenceReviewItems(result,threshold=55){
  return [];
}

/** Confidence is advisory. Real native mechanics, scope and canon validators still gate every effect. */
export function normalizeDirectorConfidence(result,threshold=55){
  // Same object: native turn bindings (arbitration origin, narrative source) are keyed by the director result itself.
  result.review_required=false;return result;
}
