/** Original case-insensitive exact/prefix selection in source order; no authorization or ambiguity-policy change. */
export function byPrefix(rows,id){
  const q=String(id||"").trim().toLowerCase();
  return rows.find(r=>String(r.id).toLowerCase()===q)||rows.find(r=>String(r.id).toLowerCase().startsWith(q));
}
