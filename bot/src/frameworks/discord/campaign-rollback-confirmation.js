/** Original private confirmation after a successful campaign rollback. */
export function campaignRollbackConfirmationText(snapshot){
  return `Restored snapshot \`${snapshot.id.slice(0,8)}\` **${snapshot.label}**. A pre-rollback safety snapshot was created automatically.`;
}
