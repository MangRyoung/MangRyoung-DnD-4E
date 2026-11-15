/* 지금 접속 중인 사람 — Supabase Realtime 의 presence. DB 에는 아무것도 남기지 않는다.
 * 서명한 사람은 이름으로, 안 한 사람은 「손님」으로 보인다. 같은 사람이 탭을 여럿 열면 한 번만 센다. */
(function () {
  'use strict';
  var chan = null, key = 'p' + Math.random().toString(36).slice(2, 10), last = '', esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function mine() { var A = window.D4EApp, me = A && A.me ? A.me() : {}, c = A && A.curName ? A.curName() : ''; return { name: me.hash ? (me.name || '이름 없음') : '손님', gm: !!me.gm, signed: !!me.hash, hash: me.hash || '', char: c || '' }; }
  function draw() {
    var box = document.getElementById('online'); if (!box || !chan) return; var st = chan.presenceState(), seen = {}, list = [];
    Object.keys(st).forEach(function (k) { (st[k] || []).forEach(function (p) { var id = p.signed ? 'n:' + p.name : 'g:' + k; if (seen[id]) return; seen[id] = 1; list.push(p); }); });
    list.sort(function (a, b) { return (b.gm - a.gm) || (b.signed - a.signed) || (a.name < b.name ? -1 : 1); });
    var guests = list.filter(function (p) { return !p.signed; }).length, named = list.filter(function (p) { return p.signed; });
    box.innerHTML = '<span class="on-n" title="지금 이 사이트를 열어 둔 사람">접속 ' + list.length + '</span>' + named.map(function (p) { return '<span class="on-p' + (p.gm ? ' gm' : '') + '" title="' + esc(p.char ? '보고 있는 캐릭터: ' + p.char : '') + '"><i></i>' + esc(p.name) + (p.gm ? ' <b>GM</b>' : '') + '</span>'; }).join('') + (guests ? '<span class="on-p guest"><i></i>손님' + (guests > 1 ? ' ' + guests : '') + '</span>' : '');
  }
  function track() { if (!chan) return; var m = mine(), sig = m.name + '|' + m.gm + '|' + m.char; if (sig === last) return; last = sig; chan.track(m).catch(function () {}); }
  function start() {
    var c = window.D4EShare && window.D4EShare.client && window.D4EShare.client(); if (!c || !c.channel) return;
    try { chan = c.channel('d4e-online', { config: { presence: { key: key } } });
      chan.on('presence', { event: 'sync' }, draw).subscribe(function (status) { if (status === 'SUBSCRIBED') { last = ''; track(); } });
      setInterval(track, 4000); } catch (e) { chan = null; }
  }
  window.D4EPresence = { refresh: function () { last = ''; track(); }, signed: function () { if (!chan) return []; var st = chan.presenceState(), seen = {}, out = []; Object.keys(st).forEach(function (k) { (st[k] || []).forEach(function (p) { if (p.signed && p.hash && !seen[p.hash]) { seen[p.hash] = 1; out.push({ name: p.name, hash: p.hash }); } }); }); return out; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 600); }); else setTimeout(start, 600);
})();
