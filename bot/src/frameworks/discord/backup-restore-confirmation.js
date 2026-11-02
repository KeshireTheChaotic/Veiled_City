/** Original private confirmation after a successful backup restore. */
export function backupRestoreConfirmationText(row){
  return `Restored backup \`${row.id.slice(0,8)}\` **${row.label}**. A pre-restore safety snapshot was created automatically.`;
}
