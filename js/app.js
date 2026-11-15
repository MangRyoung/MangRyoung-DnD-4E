/* 4판 캐릭터 제작기 화면. 룰 데이터 글은 영어 그대로 보여 주고, 화면 글은 한국어. */
(function () {
  'use strict';
  var E = window.D4E, $ = function (id) { return document.getElementById(id); };
  var lc = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var db = null, chars = {}, cur = null, res = null, viewing = null;

  var TYPE_KO = { 'Race': '종족', 'Class': '클래스', 'Feat': '재주', 'Power': '파워', 'Skill Training': '기술 숙련', 'Class Feature': '클래스 특성',
    'Racial Trait': '종족 특성', 'Race Ability Bonus': '종족 능력치 보너스', 'Language': '언어', 'Deity': '신앙', 'Background': '배경',
    'Background Choice': '배경 혜택', 'Theme': '테마', 'Build': '빌드', 'Gender': '성별', 'Alignment': '성향', 'Paragon Path': '패러곤 경로',
    'Epic Destiny': '에픽 운명', 'Proficiency': '숙련', 'Hybrid Class': '하이브리드 클래스', 'Familiar': '패밀리어', 'Companion': '동료', 'Domain': '권역' };
  var AB_KO = { Strength: '힘', Constitution: '건강', Dexterity: '민첩', Intelligence: '지능', Wisdom: '지혜', Charisma: '매력' };
  var typeKo = function (t) {
    var m = /^(Companion )?Ability Increase \(Level (\d+)\)$/.exec(t);
    if (m) return (m[1] ? '동료 ' : '') + '능력치 올리기 (' + m[2] + '레벨)';
    return TYPE_KO[t] || t;
  };
  var selLabel = function (s) {
    var m = /^Power (Encounter|Daily|Utility|At-Will) (\d+)$/.exec(s.name || '');
    if (m) return ({ Encounter: '조우', Daily: '일일', Utility: '범용', 'At-Will': '무한' })[m[1]] + ' 파워 (' + m[2] + '레벨)';
    return typeKo(s.type) + (s.name ? ' · ' + s.name : '');
  };
  var status = function (t) { $('status').textContent = t || ''; };

  /* ---------- 보관 ---------- */
  function loadChars() { try { chars = JSON.parse(localStorage.getItem('d4e_chars') || '{}'); } catch (e) { chars = {}; } }
  function saveChars() { localStorage.setItem('d4e_chars', JSON.stringify(chars)); if (cur) localStorage.setItem('d4e_cur', cur.id); }
  function newChar() {
    var id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var ch = { id: id, name: '새 캐릭터', level: 1, choices: {}, abilities: { Strength: 10, Constitution: 10, Dexterity: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 } };
    chars[id] = ch; return ch;
  }

  /* ---------- 요약 (공유 문서 · 목록용) ---------- */
  function ownedOf(r, type) { var o = []; for (var k in r.owned) if (r.owned[k].t === type) o.push(r.owned[k]); return o; }
  function summary(ch, r) {
    var one = function (t) { var a = ownedOf(r, t); return a.length ? a[0].n : ''; };
    var s = r.stats;
    return { race: one('Race'), cls: one('Class'), level: ch.level, hp: s['hit points'] || 0, surges: s['healing surges'] || 0,
      ac: s['ac'] || 0, fort: s['fortitude defense'] || 0, ref: s['reflex defense'] || 0, will: s['will defense'] || 0,
      speed: s['speed'] || 0, init: s['initiative'] || 0,
      powers: ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && !/^ID_INTERNAL/.test(p.id); }).map(function (p) { return p.n; }),
      feats: ownedOf(r, 'Feat').map(function (f) { return f.n; }) };
  }

  /* ---------- 시트 ---------- */
  function usageClass(p) { var u = lc(p.sp && p.sp['Power Usage']); var isU = /utility/i.test((p.sp && p.sp['Display']) || ''); return isU ? 'util' : u.indexOf('daily') >= 0 ? 'day' : u.indexOf('encounter') >= 0 ? 'enc' : 'at'; }
  function sheetHtml(ch, r, who) {
    var s = r.stats, hp = s['hit points'] || 0, half = Math.floor(ch.level / 2);
    var race = ownedOf(r, 'Race')[0], cls = ownedOf(r, 'Class')[0];
    var st = function (k, label) { return '<div data-why="' + esc(k) + '"><small>' + label + '</small><b>' + (s[k] || 0) + '</b></div>'; };
    var h = '<h2>' + esc(ch.name || '이름 없음') + ' <span class="hint">' + esc(race ? race.n : '종족 미정') + ' ' + esc(cls ? cls.n : '클래스 미정') + ' · ' + ch.level + '레벨' + (who ? ' · ' + esc(who) : '') + '</span></h2>';
    h += '<div class="vit">' + st('hit points', 'HP') + '<div><small>빈사</small><b>' + Math.floor(hp / 2) + '</b></div><div><small>회복량</small><b>' + Math.floor(hp / 4) + '</b></div>' +
      st('healing surges', '회복력 / 일') + st('speed', '이동') + st('initiative', '우선권') + '</div>';
    h += '<h3>방어</h3><div class="vit">' + st('ac', 'AC') + st('fortitude defense', '포티튜드') + st('reflex defense', '리플렉스') + st('will defense', '윌') + '</div>';
    h += '<div class="why" id="why" hidden></div>';
    h += '<div class="two"><div><h3>능력치</h3><table class="tbl"><tr><th></th><th class="n">값</th><th class="n">수정치</th><th class="n">+½레벨</th></tr>';
    E.ABILITIES.forEach(function (ab) { var v = s[lc(ab)] || 10, m = Math.floor((v - 10) / 2);
      h += '<tr><td>' + AB_KO[ab] + ' <span class="hint">' + ab.slice(0, 3) + '</span></td><td class="n">' + v + '</td><td class="n">' + (m >= 0 ? '+' : '') + m + '</td><td class="n">' + (m + half >= 0 ? '+' : '') + (m + half) + '</td></tr>'; });
    h += '</table></div><div><h3>기술 <span class="hint">● 숙련</span></h3><table class="tbl">';
    (db.byType['Skill'] || []).slice().sort(function (a, b) { return a.n < b.n ? -1 : 1; }).forEach(function (sk) {
      var v = s[lc(sk.n)] || 0, tr = (s[lc(sk.n + ' trained')] || 0) > 0;
      h += '<tr class="' + (tr ? 'tr' : '') + '" data-why="' + esc(lc(sk.n)) + '"><td>' + esc(sk.n) + '</td><td class="n">' + (v >= 0 ? '+' : '') + v + '</td></tr>'; });
    h += '</table></div></div>';
    var pws = ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage']; });
    var order = { at: 0, enc: 1, day: 2, util: 3 };
    pws.sort(function (a, b) { return order[usageClass(a)] - order[usageClass(b)] || (a.n < b.n ? -1 : 1); });
    h += '<h3>파워 <span class="hint">누르면 내용</span></h3><div class="two">';
    pws.forEach(function (p) { h += '<button class="pw ' + usageClass(p) + '" data-el="' + esc(p.id) + '">' + esc(p.n) + '<small>' + esc((p.sp['Display'] || p.sp['Power Usage'] || '')) + '</small></button>'; });
    h += '</div>';
    var tags = function (title, type, filt) { var a = ownedOf(r, type).filter(filt || function () { return true; }); if (!a.length) return '';
      return '<h3>' + title + '</h3><div class="tags">' + a.map(function (e) { return '<span data-el="' + esc(e.id) + '">' + esc(e.n) + '</span>'; }).join('') + '</div>'; };
    h += tags('재주', 'Feat') + tags('클래스 특성', 'Class Feature') + tags('종족 특성', 'Racial Trait') + tags('언어', 'Language') +
      tags('숙련', 'Proficiency', function (e) { return e.n !== 'Choose Nothing'; });
    if (r.warnings.length) h += '<p class="hint">확인 필요: ' + esc(r.warnings.slice(0, 5).join(' / ')) + '</p>';
    return h;
  }
  function wireSheet(box, r) {
    box.onclick = function (ev) {
      var w = ev.target.closest('[data-why]'), e = ev.target.closest('[data-el]');
      if (e) { openDetail(db.byId[e.getAttribute('data-el')]); return; }
      if (!w) return;
      var k = w.getAttribute('data-why'), rows = r.breakdown[k] || [], why = box.querySelector('#why');
      why.hidden = false;
      why.innerHTML = '<b>' + esc(k) + ' = ' + (r.stats[k] || 0) + '</b><br>' + rows.map(function (x) {
        var se = db.byId[x.src], src = !se ? x.src : se.t === 'Level' ? se.n + '레벨 기본 규칙' : se.n + ' (' + typeKo(se.t) + ')';
        return '<span class="' + (x.off ? 'off' : '') + '">' + (x.v >= 0 ? '+' : '') + x.v + ' ' + esc(src) + (x.type ? ' [' + esc(x.type) + ']' : '') + (x.cond ? ' — ' + esc(x.cond) : '') + '</span>';
      }).join('<br>') + '<br><span class="hint">줄 그어진 것은 겹치지 않아 빠졌거나 조건부 보너스예요.</span>';
    };
  }

  /* ---------- 만들기 ---------- */
  function rebuild() {
    res = E.build(db, cur);
    cur.sum = summary(cur, res);
    saveChars(); renderSelects();
    $('sheet').innerHTML = sheetHtml(cur, res); wireSheet($('sheet'), res);
  }
  function renderEdit() {
    var sel = $('chSel'); sel.innerHTML = '';
    Object.keys(chars).forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = chars[id].name || id; if (id === cur.id) o.selected = true; sel.appendChild(o); });
    $('chName').value = cur.name || ''; $('chLevel').value = cur.level;
    var ab = $('abil'); ab.innerHTML = '';
    E.ABILITIES.forEach(function (a) {
      var l = document.createElement('label'); l.innerHTML = '<span>' + AB_KO[a] + ' <span class="hint">' + a.slice(0, 3) + '</span></span>';
      var i = document.createElement('input'); i.type = 'number'; i.min = 3; i.max = 20; i.value = cur.abilities[a];
      /* 입력하는 대로 반영한다. change(포커스가 빠질 때)에서 다시 그리면 바로 누른 버튼의 클릭이 사라진다. */
      i.oninput = function () { var v = Math.round(+i.value); if (!(v >= 1 && v <= 30) || v === cur.abilities[a]) return; cur.abilities[a] = v; rebuild(); };
      l.appendChild(i); ab.appendChild(l);
    });
    rebuild();
  }
  function renderSelects() {
    var box = $('selects'), hide = $('hideOpt').checked, todo = 0; box.innerHTML = '';
    res.selects.forEach(function (s) {
      var need = !s.optional && s.picked.length < s.number; if (need) todo++;
      if (hide && s.optional && !s.picked.length) return;
      var d = document.createElement('div'); d.className = 'sel' + (need ? ' todo' : '');
      var from = db.byId[s.from], lab = document.createElement('div'); lab.className = 'lab';
      lab.innerHTML = '<strong>' + esc(selLabel(s)) + '</strong>' + (s.number > 1 ? ' <span class="hint">' + s.picked.length + ' / ' + s.number + '</span>' : '') + (s.optional ? ' <span class="hint">선택 사항</span>' : '') +
        '<small>' + esc(from ? (from.t === 'Level' ? from.n + '레벨' : /^(Level1Rules|Internal)$/.test(from.t) ? '1레벨' : from.n) : '') + '</small>';
      s.picked.forEach(function (id) { var e = db.get(id, s.type), c = document.createElement('span'); c.className = 'chip';
        c.innerHTML = esc(e ? e.n : id) + '<b title="빼기">×</b>';
        c.onclick = function (ev) { if (ev.target.tagName === 'B') { cur.choices[s.key] = (cur.choices[s.key] || []).filter(function (x) { return x !== id; }); rebuild(); } else if (e) openDetail(e); };
        lab.appendChild(c); });
      var b = document.createElement('button'); b.className = 'mini' + (need ? '' : ' ghost'); b.textContent = s.picked.length >= s.number ? '바꾸기' : '고르기';
      b.onclick = function () { openPicker(s); };
      d.appendChild(lab); d.appendChild(b); box.appendChild(d);
    });
    $('selCount').textContent = todo ? '남은 필수 칸 ' + todo + '개' : '필수 칸을 다 골랐어요';
  }

  /* ---------- 고르기 창 ---------- */
  function fields(e) {
    var h = '<h3>' + esc(e.n) + ' <span class="hint">' + esc(typeKo(e.t)) + (e.src ? ' · ' + esc(e.src.join(', ')) : '') + '</span></h3>';
    if (e.fl) h += '<p class="fl">' + esc(e.fl) + '</p>';
    if (e.pre || e.pp) h += '<p><b>선행 조건</b> ' + esc(e.pp || e.pre) + '</p>';
    var sp = e.sp || {};
    Object.keys(sp).forEach(function (k) { if (k.charAt(0) === '_' || /^(type|Full Text)$/i.test(k)) return; h += '<p><b>' + esc(k) + '</b> ' + esc(sp[k]) + '</p>'; });
    if (e.body) h += '<p>' + esc(e.body) + '</p>';
    return h;
  }
  function short(e) { var sp = e.sp || {}; return sp['Display'] || sp['Short Description'] || (sp['Tier'] ? sp['Tier'] : '') || (e.src ? e.src[0] : ''); }
  function openDetail(e) {
    if (!e) return;
    $('mTitle').textContent = e.n; $('mSearch').hidden = true; $('mList').hidden = true; $('mDetail').innerHTML = fields(e);
    $('modal').querySelector('.mbody').style.gridTemplateColumns = 'minmax(0,1fr)'; $('modal').hidden = false;
  }
  function openPicker(s) {
    var all = E.options(db, s, res.vars).filter(function (e) { return !/Unselectable|Not Selectable/i.test(e.pre || '') ; });
    all.sort(function (a, b) { return a.n < b.n ? -1 : a.n > b.n ? 1 : 0; });
    var chosen = (cur.choices[s.key] || []).slice(), active = null;
    $('mTitle').textContent = selLabel(s) + ' — 후보 ' + all.length + '개'; $('mSearch').hidden = false; $('mSearch').value = ''; $('mList').hidden = false;
    $('modal').querySelector('.mbody').style.gridTemplateColumns = ''; $('mDetail').innerHTML = '<p class="hint">왼쪽에서 하나를 누르면 내용이 보여요.</p>';
    function show(e) {
      active = e; var on = chosen.indexOf(e.id) >= 0, owned = !!res.owned[e.id] && !on;
      $('mDetail').innerHTML = fields(e) + '<div class="pick"><button id="mPick">' + (on ? '빼기' : owned ? '이미 가지고 있어요' : '이걸로 고르기') + '</button>' +
        (e.pre ? ' <span class="hint">선행 조건은 아직 자동으로 확인하지 않아요.</span>' : '') + '</div>';
      $('mPick').disabled = owned;
      $('mPick').onclick = function () {
        if (on) chosen = chosen.filter(function (x) { return x !== e.id; });
        else { if (s.number === 1) chosen = [e.id]; else if (chosen.length < s.number) chosen.push(e.id); else { alert(s.number + '개까지만 고를 수 있어요. 먼저 하나를 빼 주세요.'); return; } }
        cur.choices[s.key] = chosen; rebuild();
        if (chosen.length >= s.number) closeModal(); else { s = res.selects.filter(function (x) { return x.key === s.key; })[0] || s; list(); show(e); }
      };
      list();
    }
    function list() {
      var q = lc($('mSearch').value), box = $('mList'), n = 0; box.innerHTML = '';
      for (var i = 0; i < all.length && n < 300; i++) {
        var e = all[i];
        if (q && lc(e.n).indexOf(q) < 0 && lc(short(e)).indexOf(q) < 0 && lc(e.pre).indexOf(q) < 0) continue;
        var d = document.createElement('div'); n++;
        d.className = (active === e ? 'on ' : '') + (res.owned[e.id] && chosen.indexOf(e.id) < 0 ? 'dim' : '');
        d.innerHTML = (chosen.indexOf(e.id) >= 0 ? '✔ ' : '') + esc(e.n) + '<small>' + esc(short(e)) + '</small>';
        d.onclick = (function (e) { return function () { show(e); }; })(e);
        box.appendChild(d);
      }
      if (n >= 300) { var m = document.createElement('div'); m.className = 'dim'; m.textContent = '300개까지만 보여요. 검색으로 좁혀 주세요.'; box.appendChild(m); }
      if (!n) box.innerHTML = '<div class="dim">맞는 후보가 없어요.</div>';
    }
    $('mSearch').oninput = list; list(); $('modal').hidden = false;
  }
  function closeModal() { $('modal').hidden = true; }

  /* ---------- 팀 시트 ---------- */
  async function shareCur() {
    var me = $('me').value.trim();
    if (!me) { alert('먼저 「내 이름」을 적어 주세요. 팀 시트에 누구 캐릭터인지 표시돼요.'); $('me').focus(); return; }
    cur.owner = me; saveChars(); status('올리는 중…');
    try {
      await D4EShare.put(cur.id, { name: cur.name, owner: me, level: cur.level, abilities: cur.abilities, choices: cur.choices, sum: summary(cur, res), at: Date.now() });
      status('팀 시트에 올렸어요 (' + new Date().toLocaleTimeString() + ')');
    } catch (e) { status(''); alert('올리지 못했어요: ' + e.message); }
  }
  async function renderTeam() {
    var box = $('teamList'); box.innerHTML = '<p class="hint">읽는 중이에요.</p>'; $('teamSheet').hidden = true;
    var rows;
    try { rows = await D4EShare.list(); } catch (e) { box.innerHTML = '<p class="hint">읽지 못했어요: ' + esc(e.message) + '</p>'; return; }
    box.innerHTML = rows.length ? '' : '<p class="hint">아직 올라온 시트가 없어요. 「내 캐릭터」에서 「팀에 올리기」를 눌러 보세요.</p>';
    rows.forEach(function (row) {
      var d = row.data || {}, s = d.sum || {}, c = document.createElement('section'); c.className = 'card';
      c.innerHTML = '<h3>' + esc(d.name || '이름 없음') + '</h3><p>' + esc(d.owner || '?') + ' · ' + esc(s.race || '') + ' ' + esc(s.cls || '') + ' · ' + (d.level || 1) + '레벨</p>' +
        '<p>HP ' + (s.hp || 0) + ' · AC ' + (s.ac || 0) + ' · 포티 ' + (s.fort || 0) + ' · 리플 ' + (s.ref || 0) + ' · 윌 ' + (s.will || 0) + '</p>' +
        '<p>' + esc((s.powers || []).slice(0, 8).join(', ')) + '</p>';
      var b1 = document.createElement('button'); b1.className = 'mini'; b1.textContent = '시트 보기';
      b1.onclick = function () {
        if (!db) { alert('전체 시트는 룰 데이터를 불러온 뒤에 볼 수 있어요. 「데이터」 탭을 확인해 주세요.'); return; }
        var ch = { id: row.id, name: d.name, level: d.level || 1, abilities: d.abilities || {}, choices: d.choices || {} }, r = E.build(db, ch);
        var ts = $('teamSheet'); ts.hidden = false; ts.innerHTML = sheetHtml(ch, r, d.owner); wireSheet(ts, r); ts.scrollIntoView({ behavior: 'smooth' });
      };
      var b2 = document.createElement('button'); b2.className = 'mini ghost'; b2.textContent = '복제해서 내 것으로';
      b2.onclick = function () { var n = newChar(); n.name = (d.name || '') + ' (복제)'; n.level = d.level || 1; n.abilities = Object.assign(n.abilities, d.abilities || {}); n.choices = JSON.parse(JSON.stringify(d.choices || {})); cur = n; saveChars(); tab('edit'); };
      c.appendChild(b1); c.appendChild(document.createTextNode(' ')); c.appendChild(b2);
      if (chars[row.id] || (d.owner && d.owner === $('me').value.trim())) {
        var b3 = document.createElement('button'); b3.className = 'mini ghost'; b3.textContent = '내리기';
        b3.onclick = async function () { if (!confirm('팀 시트에서 내릴까요? 내 브라우저의 캐릭터는 남아요.')) return; try { await D4EShare.del(row.id); renderTeam(); } catch (e) { alert(e.message); } };
        c.appendChild(document.createTextNode(' ')); c.appendChild(b3);
      }
      box.appendChild(c);
    });
  }

  /* ---------- 탭 · 시작 ---------- */
  function tab(name) {
    if (name === 'edit' && !db) name = 'data';
    ['edit', 'team', 'data'].forEach(function (t) { $('tab-' + t).hidden = t !== name; });
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === name); });
    if (name === 'edit') renderEdit();
    if (name === 'team') renderTeam();
  }
  function useData(d) {
    db = new E.Db(); Object.keys(d.groups).forEach(function (g) { db.add(d.groups[g]); });
    $('dataState').textContent = '룰 요소 ' + d.total.toLocaleString() + '개를 쓰고 있어요' + (d.meta && d.meta.site ? ' (사이트의 data 폴더).' : ' (이 브라우저에 보관).');
    status('룰 요소 ' + d.total.toLocaleString() + '개');
  }
  async function start() {
    loadChars();
    for (var L = 1; L <= 30; L++) { var o = document.createElement('option'); o.value = L; o.textContent = L; $('chLevel').appendChild(o); }
    $('me').value = localStorage.getItem('d4e_me') || '';
    var id = localStorage.getItem('d4e_cur'); cur = chars[id] || chars[Object.keys(chars)[0]] || newChar();
    document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-tab')); }; });
    $('mClose').onclick = closeModal; $('modal').onclick = function (ev) { if (ev.target === $('modal')) closeModal(); };
    $('me').onchange = function () { localStorage.setItem('d4e_me', $('me').value.trim()); };
    $('chSel').onchange = function () { cur = chars[$('chSel').value]; saveChars(); renderEdit(); };
    $('chNew').onclick = function () { cur = newChar(); saveChars(); renderEdit(); };
    $('chDel').onclick = function () { if (!confirm('「' + (cur.name || '') + '」을(를) 이 브라우저에서 지울까요?')) return; delete chars[cur.id]; cur = chars[Object.keys(chars)[0]] || newChar(); saveChars(); renderEdit(); };
    $('chName').oninput = function () { cur.name = $('chName').value.trim(); saveChars(); var o = $('chSel').selectedOptions[0]; if (o) o.textContent = cur.name || cur.id; var h = $('sheet').querySelector('h2'); if (h && h.firstChild) h.firstChild.nodeValue = (cur.name || '이름 없음') + ' '; };
    $('chLevel').onchange = function () { cur.level = +$('chLevel').value; rebuild(); };
    $('hideOpt').onchange = renderSelects;
    $('chShare').onclick = shareCur; $('teamRefresh').onclick = renderTeam;
    $('xmlFile').onchange = async function () {
      var f = $('xmlFile').files[0]; if (!f) return;
      $('dataProg').textContent = '파일을 읽는 중이에요. 잠시만 기다려 주세요.';
      try {
        var d = await D4EData.importXml(f, function (n, p) { $('dataProg').textContent = '바꾸는 중… ' + n.toLocaleString() + '개 (' + Math.round(p * 100) + '%)'; });
        $('dataProg').textContent = '끝났어요. ' + d.total.toLocaleString() + '개를 보관했어요.' + (d.bad ? ' 읽지 못한 요소 ' + d.bad + '개.' : '');
        useData({ groups: d.groups, total: d.total }); tab('edit');
      } catch (e) { $('dataProg').textContent = '불러오지 못했어요: ' + e.message; }
    };
    $('dataClear').onclick = async function () { if (!confirm('이 브라우저에 보관한 룰 데이터를 지울까요? 캐릭터는 남아요.')) return; await D4EData.clear(); location.reload(); };
    status('데이터를 찾는 중…');
    var d = (await D4EData.loadStored()) || (await D4EData.loadSite());
    if (d) { useData(d); tab('edit'); }
    else { $('dataState').textContent = '아직 룰 데이터가 없어요. 아래에서 파일을 한 번 불러와 주세요.'; status('룰 데이터 없음'); tab('data'); }
  }
  start();
})();
