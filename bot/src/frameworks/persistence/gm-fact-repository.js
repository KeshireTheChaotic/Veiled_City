/** Original GM-fact query on caller connection; filters/normalization/limits remain unchanged. */
export function listFactsForGM(connection,guildId,{visibility="all",category="",subjectUserId="",search="",limit=50}={}){
    const capped=Math.max(1,Math.min(100,Number(limit)||50));
    const vis=String(visibility||"all").trim().toLowerCase();
    const cat=String(category||"").trim().toLowerCase();
    const user=String(subjectUserId||"").trim();
    const q=String(search||"").trim().toLowerCase();
    return connection.prepare(`
      SELECT rowid AS _rowid,* FROM facts
      WHERE guild_id=? AND archived=0
        AND (?='all' OR visibility=?)
        AND (?='' OR lower(category)=?)
        AND (?='' OR subject_user_id=?)
        AND (?='' OR lower(fact_key) LIKE '%' || ? || '%' OR lower(content) LIKE '%' || ? || '%')
      ORDER BY created_at DESC,_rowid DESC
      LIMIT ?
    `).all(guildId,vis,vis,cat,cat,user,user,q,q,q,capped);
  }
