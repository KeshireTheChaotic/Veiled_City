/** Original player handout projection; presentation grants no canon or PC agency. */
export function handoutPlayerView(h){return {id:h.id,title:h.title,kind:h.kind,authority:h.authority,visibility:h.visibility,content:h.content,
  epistemic:h.metadata?.epistemic||{kind:"testimony",perspective:"legacy artifact; reliability is not truth",source_refs:[]},
  interpretation_limits:"Presentation is not canon. PC feelings, agreement and obligations require independent authority.",
  case_key:h.case_key||"",npc_key:h.npc_key||"",location_key:h.location_key||"",created_at:h.created_at};}
