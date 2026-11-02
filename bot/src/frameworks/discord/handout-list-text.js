/** Original Discord presentation for the audience-filtered handout list. */
export function handoutListText(rows){
  return rows.length
    ?rows.map(handout=>`• \`${handout.id.slice(0,8)}\` **${handout.title}** — ${handout.kind} / ${handout.authority} / ${handout.visibility}`).join("\n").slice(0,1950)
    :"No visible handouts/evidence are recorded.";
}
