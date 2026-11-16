/* 시트 공유: Supabase docs 표(kind, id, data)에 캐릭터 한 명 = 문서 하나.
 * 문서에는 고른 것의 id · 이름과 계산된 수치만 들어간다(룰 본문은 넣지 않는다). */
(function () {
  'use strict';
  var cfg = window.D4E_CONFIG || {}, client = null;
  function cl() {
    if (client) return client;
    if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase) return null;
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    return client;
  }
  /* ownerHash 를 주면 그 서명의 시트만 가져온다(내 시트 맞추기용 — 남의 초상까지 내려받지 않게) */
  async function list(kind, ownerHash) {
    var c = cl(); if (!c) throw new Error('공유 DB 설정이 없어요.');
    var q = c.from(cfg.table).select('id,data,updated_at').eq('kind', kind || cfg.kind); if (ownerHash) q = q.eq('data->>ownerHash', ownerHash);
    var r = await q.order('updated_at', { ascending: false }).limit(2000);
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  }
  async function put(id, data, kind) {
    var c = cl(); if (!c) throw new Error('공유 DB 설정이 없어요.');
    var r = await c.from(cfg.table).upsert({ kind: kind || cfg.kind, id: id, data: data }, { onConflict: 'kind,id' });
    if (r.error) throw new Error(r.error.message);
  }
  async function del(id, kind) {
    var c = cl(); if (!c) throw new Error('공유 DB 설정이 없어요.');
    var r = await c.from(cfg.table).delete().eq('kind', kind || cfg.kind).eq('id', id);
    if (r.error) throw new Error(r.error.message);
  }
  window.D4EShare = { list: list, put: put, del: del, ready: function () { return !!cl(); }, client: cl };
})();
