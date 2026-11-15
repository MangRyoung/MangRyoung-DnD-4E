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
  /* 이름 번역: 「한국어 (English)」. 번역표에 없으면 영어 그대로. */
  var koName = function (type, name) { var K = window.D4E_KO || {}, m = /Ability Increase|Race Ability Bonus|Ability Score/.test(type || '') ? K['Race Ability Bonus'] : K[type]; return m && m[name] ? m[name] : ''; };

  /* 선행 조건(Prereqs 글)을 풀어 본다. 반환: 'ok' 맞음 · 'no' 안 맞음 · 'unk' 풀지 못함(직접 확인). */
  var AB_SHORT = { str: 'strength', con: 'constitution', dex: 'dexterity', int: 'intelligence', wis: 'wisdom', cha: 'charisma' };
  function prereq(e, r, level) {
    var text = e && e.pre; if (!text) return 'ok';
    if (!r._names) { r._names = {}; for (var k in r.owned) { var o = r.owned[k]; r._names[lc(o.n)] = 1; r._names[lc(o.n + ' ' + o.t)] = 1; r._names[lc(k)] = 1; } }
    var has = function (n) { return !!r._names[lc(n)]; };
    function one(c) {
      c = lc(c).replace(/^\(|\)$/g, '').trim(); if (!c || c.charAt(0) === '~') return 'ok';
      if (/unselectable|not selectable/.test(c)) return 'no';
      var neg = false; while (c.charAt(0) === '!') { neg = !neg; c = c.slice(1).trim(); }
      var res, m;
      if ((m = /^(\d+)(?:st|nd|rd|th)?[- ]level$/.exec(c)) || (m = /^level (\d+)$/.exec(c))) res = level >= +m[1];
      else if ((m = /^(heroic|paragon|epic)(?: tier)?$/.exec(c))) res = level >= { heroic: 1, paragon: 11, epic: 21 }[m[1]];
      else if ((m = /^(str|strength|con|constitution|dex|dexterity|int|intelligence|wis|wisdom|cha|charisma) (\d+)$/.exec(c))) res = (r.stats[AB_SHORT[m[1]] || m[1]] || 10) >= +m[2];
      else if ((m = /^(?:trained in|training in) (.+)$/.exec(c))) { var sk = m[1].replace(/ skill$/, ''); if (db.byName[sk]) res = (r.stats[sk + ' trained'] || 0) > 0; }
      else {
        var names = [c, c.replace(/^any /, ''), c.replace(/ (class feature|racial trait|class|race|power|feat|feature|theme|background)$/, ''), c.replace(/^any (.+) class$/, '$1')];
        for (var i = 0; i < names.length && res === undefined; i++) { if (has(names[i])) res = true; }
        if (res === undefined) for (var j = 0; j < names.length && res === undefined; j++) { if (db.byName[names[j]]) res = false; }
      }
      if (res === undefined) return 'unk';
      return (res !== neg) ? 'ok' : 'no';
    }
    var out = 'ok', parts = String(text).split(/[;,]/);
    for (var p = 0; p < parts.length; p++) {
      var ors = parts[p].split(/ or /i), best = 'no';
      for (var q = 0; q < ors.length; q++) { var v = one(ors[q]); if (v === 'ok') { best = 'ok'; break; } if (v === 'unk') best = 'unk'; }
      if (best === 'no') return 'no'; if (best === 'unk') out = 'unk';
    }
    return out;
  }
  var PRE_BADGE = { no: '<span class="badge bad">조건 미달</span>', unk: '<span class="badge unk">조건 확인</span>', ok: '' };

  /* 접고 펴는 구역. 접은 상태는 이 브라우저에 기억한다. */
  var secState = {}; try { secState = JSON.parse(localStorage.getItem('d4e_sec') || '{}'); } catch (e) {}
  function sec(key, title, body, defOpen) {
    var open = key in secState ? secState[key] : defOpen !== false;
    return '<details class="sec" data-sec="' + key + '"' + (open ? ' open' : '') + '><summary>' + title + '</summary><div class="secb">' + body + '</div></details>';
  }
  document.addEventListener('toggle', function (ev) { var d = ev.target; if (d && d.classList && d.classList.contains('sec')) { secState[d.getAttribute('data-sec')] = d.open; localStorage.setItem('d4e_sec', JSON.stringify(secState)); } }, true);
  var nm = function (e) { if (!e) return ''; var k = koName(e.t, e.n); return k ? k + ' (' + e.n + ')' : e.n; };
  var status = function (t) { $('status').textContent = t || ''; };

  /* ---------- 보관 ---------- */
  function loadChars() { try { chars = JSON.parse(localStorage.getItem('d4e_chars') || '{}'); } catch (e) { chars = {}; } }
  function saveChars() { localStorage.setItem('d4e_chars', JSON.stringify(chars)); if (cur) localStorage.setItem('d4e_cur', cur.id); }
  function newChar() {
    var id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var ch = { id: id, name: '새 캐릭터', level: 1, choices: {}, abilities: { Strength: 10, Constitution: 10, Dexterity: 10, Intelligence: 10, Wisdom: 10, Charisma: 8 } };
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

  /* ---------- 내 번역 ----------
   * 캐릭터마다 자기 시트의 파워 · 물품에 번역을 적어 둘 수 있다(ch.tr[id] = {n 이름, t 내용}). 카드에서 원문 / 번역을 바꿔 본다. */
  var trCtx = { map: {}, edit: false };
  function trParts(e) {
    var t = trCtx.map[e.id], h = { cls: t ? ' has-tr' : '', name: t && t.n ? esc(t.n) + ' <small class="on">' + esc(e.n) + '</small>' : null, body: '', bar: '' };
    if (t) h.body = '<div class="pb trt"><div class="pr"><span>' + esc(t.t || '').replace(/\n/g, '<br>') + '</span></div></div>';
    if (t || trCtx.edit) h.bar = '<div class="trb" data-id="' + esc(e.id) + '">' + (t ? '<button class="mini ghost" data-tr="toggle">원문 보기</button>' : '') + (trCtx.edit ? '<button class="mini ghost" data-tr="edit">' + (t ? '번역 고치기' : '번역 쓰기') + '</button>' : '') + '</div>';
    return h;
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-tr]'); if (!b) return; ev.preventDefault(); ev.stopPropagation();
    var bar = b.closest('.trb'), id = bar.getAttribute('data-id'), card = bar.closest('.pc,.gc'), act = b.getAttribute('data-tr'), e = db.byId[id];
    if (act === 'toggle') { var on = card.classList.toggle('show-orig'); b.textContent = on ? '번역 보기' : '원문 보기'; return; }
    var redraw = function () { var inModal = !!bar.closest('#mDetail'); rebuild(); if (inModal && e) $('mDetail').innerHTML = fields(e); else { var d = $('sheet').querySelector('details.pc[data-pc="' + id + '"]'); if (d) d.open = true; } };
    if (act === 'edit') { var t = (cur.tr || {})[id] || {};
      bar.innerHTML = '<input type="text" class="trn" placeholder="번역한 이름 (비워도 돼요)"><textarea class="trx" placeholder="번역한 내용을 적어 주세요. 줄바꿈은 그대로 보여요."></textarea><button class="mini" data-tr="save">저장</button> ' + (t.t || t.n ? '<button class="mini ghost" data-tr="del">번역 지우기</button> ' : '') + '<button class="mini ghost" data-tr="cancel">그만두기</button>';
      bar.querySelector('.trn').value = t.n || ''; bar.querySelector('.trx').value = t.t || ''; bar.querySelector('.trx').focus(); return; }
    if (act === 'save') { var n = bar.querySelector('.trn').value.trim(), x = bar.querySelector('.trx').value.trim(); cur.tr = cur.tr || {}; if (n || x) cur.tr[id] = { n: n, t: x }; else delete cur.tr[id]; redraw(); return; }
    if (act === 'del') { if (cur.tr) delete cur.tr[id]; redraw(); return; }
    if (act === 'cancel') redraw();
  });

  /* ---------- 파워 카드 ---------- */
  var USE_KO = { 'at-will': '무한', 'encounter': '조우', 'daily': '일일' };
  var ACT_KO = { 'standard action': '표준 행동', 'move action': '이동 행동', 'minor action': '부속 행동', 'free action': '자유 행동', 'immediate interrupt': '즉시 방해',
    'immediate reaction': '즉시 반응', 'opportunity action': '기회 행동', 'no action': '행동 없음' };
  var ROW_KO = { 'Trigger': '발동 조건', 'Requirement': '요구 조건', 'Prerequisite': '선행 조건', 'Target': '대상', 'Primary Target': '1차 대상', 'Secondary Target': '2차 대상',
    'Attack': '공격', 'Primary Attack': '1차 공격', 'Secondary Attack': '2차 공격', 'Hit': '명중', 'Miss': '빗나감', 'Effect': '효과', 'Special': '특수', 'Sustain': '유지',
    'Sustain Minor': '유지 (부속)', 'Sustain Standard': '유지 (표준)', 'Sustain Move': '유지 (이동)', 'Augment': '증강', 'Aftereffect': '후속 효과', 'Level': '레벨' };
  var ROW_ORDER = ['Trigger', 'Requirement', 'Prerequisite', 'Target', 'Primary Target', 'Attack', 'Primary Attack', 'Hit', 'Miss', 'Effect', 'Secondary Target', 'Secondary Attack', 'Aftereffect', 'Sustain', 'Sustain Minor', 'Sustain Move', 'Sustain Standard', 'Special'];
  var PC_SKIP = { 'Power Usage': 1, 'Display': 1, 'Keywords': 1, 'Action Type': 1, 'Attack Type': 1, 'Power Type': 1, 'Class': 1, 'Level': 1, 'type': 1, 'Full Text': 1 };
  /* 주사위 · [W] · 방어 이름을 굵게 */
  var rich = function (t) { return esc(t).replace(/(\d+d\d+|\d+\[W\]|\b(?:AC|Fortitude|Reflex|Will)\b)/g, '<b>$1</b>').replace(/\n\s*/g, '<br>'); };
  function usageKo(p) { var u = lc(p.sp && p.sp['Power Usage']); for (var k in USE_KO) if (u.indexOf(k) >= 0) return USE_KO[k] + (u.replace(k, '').trim() ? ' ' + (p.sp['Power Usage'].replace(new RegExp(k, 'i'), '').trim()) : ''); return (p.sp && p.sp['Power Usage']) || ''; }
  function powerCard(p, open) {
    var sp = p.sp || {}, cls = usageClass(p), act = sp['Action Type'] || '', rows = [], seen = {}, tr = trParts(p);
    var add = function (k) { if (sp[k] == null || seen[k] || PC_SKIP[k] || k.charAt(0) === '_') return; seen[k] = 1; rows.push('<div class="pr"><b>' + esc(ROW_KO[k.trim()] || k) + '</b><span>' + rich(sp[k]) + '</span></div>'); };
    ROW_ORDER.forEach(add); Object.keys(sp).forEach(add);
    var h = '<details class="pc ' + cls + tr.cls + '"' + (open ? ' open' : '') + ' data-pc="' + esc(p.id) + '"><summary><span class="pn">' + (tr.name || esc(p.n)) + '</span><span class="pd">' + esc(sp['Display'] || '') + '</span></summary>';
    h += '<div class="pm"><span><i class="dot"></i>' + esc(usageKo(p)) + (sp['Keywords'] ? ' ✦ ' + esc(sp['Keywords']) : '') + '</span><span>' + esc(ACT_KO[lc(act)] || act) + (sp['Attack Type'] ? ' · ' + esc(sp['Attack Type']) : '') + '</span></div>';
    h += '<div class="pb">' + (p.fl ? '<p class="pfl">' + esc(p.fl) + '</p>' : '') + rows.join('') + (p.body && !rows.length ? '<div class="pr"><span>' + rich(p.body) + '</span></div>' : '') +
      (p.src ? '<p class="psrc">' + esc(p.src.join(', ')) + '</p>' : '') + '</div>' + tr.body + tr.bar + '</details>';
    return h;
  }

  /* ---------- 시트 ---------- */
  function usageClass(p) { var u = lc(p.sp && p.sp['Power Usage']); var isU = /utility/i.test((p.sp && p.sp['Display']) || ''); return isU ? 'util' : u.indexOf('daily') >= 0 ? 'day' : u.indexOf('encounter') >= 0 ? 'enc' : 'at'; }
  function sheetHtml(ch, r, who) {
    trCtx = { map: ch.tr || {}, edit: ch === cur };
    var s = r.stats, hp = s['hit points'] || 0, half = Math.floor(ch.level / 2);
    var race = ownedOf(r, 'Race')[0], cls = ownedOf(r, 'Class')[0];
    var st = function (k, label) { return '<div data-why="' + esc(k) + '"><small>' + label + '</small><b>' + (s[k] || 0) + '</b></div>'; };
    var h = '<div class="shead">' + (ch.port ? '<img class="port" src="' + esc(ch.port) + '" alt="">' : '') + '<div class="sh2"><h2>' + esc(ch.name || '이름 없음') + ' <span class="hint">' + esc(race ? nm(race) : '종족 미정') + ' ' + esc(cls ? nm(cls) : '클래스 미정') + ' · ' + ch.level + '레벨' + (who ? ' · ' + esc(who) : '') + '</span></h2>';
    h += '<div class="vit">' + st('hit points', 'HP') + '<div><small>중상</small><b>' + Math.floor(hp / 2) + '</b></div><div><small>서지 회복량</small><b>' + Math.floor(hp / 4) + '</b></div>' +
      st('healing surges', '힐링 서지') + st('speed', '이동') + st('initiative', '우선권') + '</div>';
    h += '<div class="vit def">' + st('ac', 'AC') + st('fortitude defense', '인내') + st('reflex defense', '반사') + st('will defense', '의지') + '</div></div></div>';
    h += '<div class="why" id="why" hidden></div>';
    var ab = '<table class="tbl"><tr><th></th><th class="n">값</th><th class="n">수정치</th><th class="n">+½레벨</th></tr>';
    E.ABILITIES.forEach(function (a) { var v = s[lc(a)] || 10, m = Math.floor((v - 10) / 2);
      ab += '<tr data-why="' + lc(a) + '"><td>' + AB_KO[a] + ' <span class="hint">' + a.slice(0, 3) + '</span></td><td class="n">' + v + '</td><td class="n">' + (m >= 0 ? '+' : '') + m + '</td><td class="n">' + (m + half >= 0 ? '+' : '') + (m + half) + '</td></tr>'; });
    ab += '</table>';
    var skl = '<div class="skills">';
    (db.byType['Skill'] || []).slice().sort(function (a, b) { return a.n < b.n ? -1 : 1; }).forEach(function (sk) {
      var v = s[lc(sk.n)] || 0, tr = (s[lc(sk.n + ' trained')] || 0) > 0;
      var kn = koName('Skill', sk.n);
      skl += '<div class="skl' + (tr ? ' tr' : '') + '" data-why="' + esc(lc(sk.n)) + '"><span>' + esc(kn || sk.n) + (kn ? ' <small>' + esc(sk.n) + '</small>' : '') + '</span><b>' + (v >= 0 ? '+' : '') + v + '</b></div>'; });
    skl += '</div>';
    h += '<div class="two">' + sec('abil', '능력치', ab) + sec('skill', '기술 <span class="hint">● 숙련</span>', skl) + '</div>';
    var pws = ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage']; }), pb = '';
    [['at', '무한'], ['enc', '조우'], ['day', '일일'], ['util', '범용']].forEach(function (g) {
      var list = pws.filter(function (p) { return usageClass(p) === g[0]; }).sort(function (a, b) { return a.n < b.n ? -1 : 1; });
      if (!list.length) return;
      pb += '<div class="pgh ' + g[0] + '"><i></i>' + g[1] + ' <span class="hint">' + list.length + '</span></div><div class="pcards">' + list.map(function (p) { return powerCard(p, false); }).join('') + '</div>';
    });
    h += sec('power', '파워 <span class="hint">' + pws.length + '개 · 이름을 누르면 펼쳐져요</span> <button class="mini ghost" data-pcall="1">모두 펼치기 / 접기</button>', pb || '<p class="hint">아직 없어요.</p>');
    if (r.worn && r.worn.length) { var eq = '<table class="tbl">';
      r.worn.forEach(function (e) { eq += '<tr data-el="' + esc(e.id) + '" style="cursor:pointer"><td>' + ((ch.tr || {})[e.id] && ch.tr[e.id].n ? esc(ch.tr[e.id].n) + ' <span class="hint">' + esc(e.n) + '</span>' : esc(e.n)) + '</td><td class="hint">' + esc(eqLine(e)) + '</td></tr>'; });
      h += sec('gear', '장비 <span class="hint">' + r.worn.length + '</span>', eq + '</table>'); }
    var tags = function (key, title, type, filt, defOpen) { var a = ownedOf(r, type).filter(filt || function () { return true; }); if (!a.length) return '';
      return sec(key, title + ' <span class="hint">' + a.length + '</span>', '<div class="tags">' + a.map(function (e) { return '<span data-el="' + esc(e.id) + '">' + esc(nm(e)) + (prereq(e, r, ch.level) === 'no' ? PRE_BADGE.no : '') + '</span>'; }).join('') + '</div>', defOpen); };
    h += tags('feat', '재주', 'Feat') + tags('cf', '클래스 특성', 'Class Feature') + tags('rt', '종족 특성', 'Racial Trait') + tags('lang', '언어', 'Language') +
      tags('prof', '숙련', 'Proficiency', function (e) { return e.n !== 'Choose Nothing'; }, false);
    if (r.warnings.length) h += '<p class="hint">확인 필요: ' + esc(r.warnings.slice(0, 5).join(' / ')) + '</p>';
    return h;
  }
  function wireSheet(box, r) {
    box.onclick = function (ev) {
      if (ev.target.closest('[data-pcall]')) { ev.preventDefault(); var all = box.querySelectorAll('details.pc'), any = false; all.forEach(function (d) { if (!d.open) any = true; }); all.forEach(function (d) { d.open = any; }); return; }
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
    trCtx = { map: cur.tr || {}, edit: true };
    res = E.build(db, cur);
    cur.sum = summary(cur, res);
    saveChars(); renderSelects();
    $('abil').querySelectorAll('.ab').forEach(function (el, i) { var a = E.ABILITIES[i], v = cur.abilities[a], fin = res.stats[lc(a)] || v, f = el.querySelector('.fin'); if (fin !== v) { if (!f) { f = document.createElement('span'); f.className = 'fin'; el.appendChild(f); } f.textContent = '→ ' + fin; } else if (f) f.remove(); });
    $('sheet').innerHTML = sheetHtml(cur, res); wireSheet($('sheet'), res);
  }
  /* 능력치: 포인트 구매(캠페인에서 정한 포인트) 또는 직접 입력.
   * 4판 방식: 하나는 8, 나머지는 10 에서 시작. 8 기준 값별 비용은 아래 표, 기본 배열(8 하나 + 10 다섯)이 0포인트. */
  var COST8 = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9, 16: 11, 17: 14, 18: 18 };
  var campaign = { points: 22 };
  function pointsUsed(ab) { var t = 0, low = 0, bad = false; E.ABILITIES.forEach(function (a) { var v = ab[a]; if (!(v in COST8)) bad = true; else t += COST8[v]; if (v < 10) low++; }); return { used: t - 10, low: low, bad: bad }; }
  function renderAbil() {
    var box = $('abil'), free = cur.abMode === 'free', u = pointsUsed(cur.abilities), left = campaign.points - u.used; box.innerHTML = '';
    $('abilHead').innerHTML = free ? '<span class="hint">직접 입력 중</span> <button class="mini ghost" id="abMode">포인트 구매로</button>'
      : '<span class="pts' + (left < 0 || u.bad || u.low > 1 ? ' bad' : left === 0 ? ' ok' : '') + '">포인트 ' + campaign.points + ' 중 <b>' + (u.bad ? '?' : left) + '</b> 남음</span>' +
        (u.low > 1 ? ' <span class="hint bad">10 미만은 하나만 돼요</span>' : u.bad ? ' <span class="hint bad">8~18 사이로 맞춰 주세요</span>' : '') +
        ' <button class="mini ghost" id="abReset">처음으로</button> <button class="mini ghost" id="abMode">직접 입력</button>';
    $('abMode').onclick = function () { cur.abMode = free ? 'buy' : 'free'; saveChars(); renderAbil(); };
    if ($('abReset')) $('abReset').onclick = function () { cur.abilities = { Strength: 10, Constitution: 10, Dexterity: 10, Intelligence: 10, Wisdom: 10, Charisma: 8 }; rebuild(); renderAbil(); };
    E.ABILITIES.forEach(function (a) {
      var v = cur.abilities[a], fin = res ? (res.stats[lc(a)] || v) : v, l = document.createElement('div'); l.className = 'ab';
      l.innerHTML = '<span class="an">' + AB_KO[a] + ' <span class="hint">' + a.slice(0, 3) + '</span></span>';
      if (free) {
        var i = document.createElement('input'); i.type = 'number'; i.min = 3; i.max = 20; i.value = v;
        i.oninput = function () { var nv = Math.round(+i.value); if (!(nv >= 1 && nv <= 30) || nv === cur.abilities[a]) return; cur.abilities[a] = nv; rebuild(); };
        l.appendChild(i);
      } else {
        var mk = function (txt, nv, ok) { var b = document.createElement('button'); b.className = 'step'; b.textContent = txt; b.disabled = !ok; b.onclick = function () { cur.abilities[a] = nv; rebuild(); renderAbil(); }; return b; };
        var up = (COST8[v + 1] - COST8[v]) || 0;
        l.appendChild(mk('−', v - 1, v > 8)); var val = document.createElement('b'); val.className = 'av'; val.textContent = v; l.appendChild(val);
        l.appendChild(mk('+', v + 1, v < 18 && up <= left));
        var c = document.createElement('span'); c.className = 'hint ac'; c.textContent = v < 18 ? '다음 ' + up + '점' : '최대'; l.appendChild(c);
      }
      if (fin !== v) { var f = document.createElement('span'); f.className = 'fin'; f.textContent = '→ ' + fin; f.title = '종족 · 레벨 보너스를 더한 값'; l.appendChild(f); }
      box.appendChild(l);
    });
  }
  function useSet() {
    var ids = D4EHouse.setIds(); if (!cur.set || !D4EHouse.sets()[cur.set]) cur.set = (localStorage.getItem('d4e_set') && D4EHouse.sets()[localStorage.getItem('d4e_set')]) ? localStorage.getItem('d4e_set') : ids[0];
    var st = D4EHouse.setOf(cur.set); campaign.points = st.points != null ? +st.points : 22; D4EHouse.apply(db, cur.set);
    var sel = $('chSet'); sel.innerHTML = ''; ids.forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = D4EHouse.sets()[id].name; if (id === cur.set) o.selected = true; sel.appendChild(o); });
    $('setNote').hidden = !st.memo; $('setNoteBody').textContent = st.memo || ''; $('setNoteTitle').textContent = st.name + ' 메이킹 룰' + (st.level > 1 ? ' · 시작 ' + st.level + '레벨' : '');
  }
  function renderEdit() {
    useSet();
    var sel = $('chSel'); sel.innerHTML = '';
    Object.keys(chars).forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = chars[id].name || id; if (id === cur.id) o.selected = true; sel.appendChild(o); });
    $('chName').value = cur.name || ''; $('chLevel').value = cur.level;
    rebuild(); renderAbil();
  }
  var buildTab = localStorage.getItem('d4e_btab') || 'g0';
  var SEL_GROUPS = [
    ['기본', /^(Race|Class|Hybrid Class|Build|Theme|Background|Background Choice|Deity|Gender|Alignment|Paragon Path|Epic Destiny|Domain)$/],
    ['능력 · 기술', /^(Race Ability Bonus|Skill Training|Language|.*Ability Increase.*)$/],
    ['파워', /^Power$/], ['재주', /^Feat$/], ['특성', /./]
  ];
  function renderSelects() {
    var box = $('selects'), hide = $('hideOpt').checked, todo = 0, groups = SEL_GROUPS.map(function () { return []; }); box.innerHTML = '';
    res.selects.forEach(function (s) {
      var need = !s.optional && s.picked.length < s.number; if (need) todo++;
      if (hide && s.optional && !s.picked.length) return;
      for (var g = 0; g < SEL_GROUPS.length; g++) if (SEL_GROUPS[g][1].test(s.type)) { groups[g].push([s, need]); break; }
    });
    var tabs = [];
    groups.forEach(function (list, g) { if (list.length) tabs.push({ key: 'g' + g, label: SEL_GROUPS[g][0], list: list, left: list.filter(function (x) { return x[1]; }).length }); });
    tabs.push({ key: 'eq', label: '장비', left: 0, n: (cur.equip || []).length });
    if (!tabs.some(function (t) { return t.key === buildTab; })) buildTab = tabs[0].key;
    var bar = document.createElement('div'); bar.className = 'btabs';
    tabs.forEach(function (t) { var b = document.createElement('button'); b.className = t.key === buildTab ? 'on' : ''; b.setAttribute('data-btab', t.label);
      b.innerHTML = esc(t.label) + (t.left ? '<i>' + t.left + '</i>' : '') + (t.key === 'eq' && t.n ? '<em>' + t.n + '</em>' : '');
      b.onclick = function () { buildTab = t.key; localStorage.setItem('d4e_btab', buildTab); renderSelects(); }; bar.appendChild(b); });
    box.appendChild(bar); $('equip').hidden = buildTab !== 'eq';
    tabs.forEach(function (t) {
      if (t.key !== buildTab || !t.list) return;
      var list = t.list, grid = document.createElement('div'); grid.className = 'sgrid'; box.appendChild(grid);
      list.forEach(function (x) {
        var s = x[0], need = x[1], d = document.createElement('div'); d.className = 'sel tile' + (need ? ' todo' : '') + (s.picked.length ? ' has' : '');
        var small = null;
        if (!/^(Feat|Power|Background|Theme|Paragon Path|Epic Destiny|Race|Class|Deity|Language|Skill Training)$/.test(s.type)) {
          small = E.options(db, s, res.vars).filter(function (e) { return !/Unselectable|Not Selectable/i.test(e.pre || ''); });
          if (small.length > 9 || !small.length) small = null;
        }
        if (s.type === 'Power') { var m = /encounter|daily|utility|at-will/i.exec((s.name || '') + ' ' + (s.category || '')); d.className += ' pwt ' + ({ encounter: 'enc', daily: 'day', utility: 'util', 'at-will': 'at' }[m ? lc(m[0]) : 'at']); }
        var from = db.byId[s.from], lab = document.createElement('div'); lab.className = 'lab';
        lab.innerHTML = '<strong>' + esc(selLabel(s)) + '</strong>' + (s.number > 1 ? ' <span class="hint">' + s.picked.length + ' / ' + s.number + '</span>' : '') + (s.optional ? ' <span class="hint">선택 사항</span>' : '') +
          '<small>' + esc(from ? (from.t === 'Level' ? from.n + '레벨' : /^(Level1Rules|Internal)$/.test(from.t) ? '1레벨' : nm(from)) : '') + '</small>';
        var chips = document.createElement('div'); chips.className = 'chips';
        if (small) {
          d.className += ' inline'; d.style.cursor = 'default';
          small.forEach(function (e) { var on = s.picked.indexOf(e.id) >= 0 || s.picked.indexOf(e.n) >= 0, o = document.createElement('button'); o.className = 'opt' + (on ? ' on' : ''); o.textContent = koName(e.t, e.n) || e.n; o.title = e.n;
            o.onclick = function (ev) { ev.stopPropagation(); var c = (cur.choices[s.key] || []).slice();
              if (on) c = c.filter(function (x) { return x !== e.id; }); else if (s.number === 1) c = [e.id]; else if (c.length < s.number) c.push(e.id); else { alert(s.number + '개까지만 고를 수 있어요.'); return; }
              cur.choices[s.key] = c; rebuild(); };
            chips.appendChild(o); });
          d.appendChild(lab); d.appendChild(chips); grid.appendChild(d); return;
        }
        s.picked.forEach(function (id) { var e = db.get(id, s.type), c = document.createElement('span'); c.className = 'chip';
          c.innerHTML = esc(e ? nm(e) : id) + (e ? PRE_BADGE[prereq(e, res, cur.level)].replace('조건 확인', '?') : '') + '<b title="빼기">×</b>';
          c.onclick = function (ev) { ev.stopPropagation(); if (ev.target.tagName === 'B') { cur.choices[s.key] = (cur.choices[s.key] || []).filter(function (x) { return x !== id; }); rebuild(); } else if (e) openDetail(e); };
          chips.appendChild(c); });
        var b = document.createElement('button'); b.className = 'mini' + (need ? '' : ' ghost'); b.textContent = s.picked.length >= s.number ? '바꾸기' : '고르기';
        b.onclick = function (ev) { ev.stopPropagation(); openPicker(s); };
        d.onclick = function () { openPicker(s); };
        d.appendChild(lab); d.appendChild(chips); d.appendChild(b); grid.appendChild(d);
      });
    });
    $('selCount').textContent = todo ? '남은 필수 칸 ' + todo + '개' : '필수 칸을 다 골랐어요';
    renderEquip();
  }

  /* ---------- 장비 ---------- */
  var mit = function (e) { return (e.sp && e.sp['Magic Item Type']) || ''; }, slotOf = function (e) { return lc(e.sp && e.sp['Item Slot']); };
  var IMPL = /^(Holy Symbol|Staff|Rod|Orb|Wand|Totem|Ki Focus|Tome|Implement)$/i;
  var EQ_SLOTS = [
    ['body', '갑옷', function (e) { return e.t === 'Armor' && lc(e.sp && e.sp['Armor Type']) !== 'shield'; }],
    ['bodyM', '갑옷 마법', function (e) { return e.t === 'Magic Item' && mit(e) === 'Armor'; }],
    ['main', '주 무기', function (e) { return e.t === 'Weapon'; }],
    ['mainM', '주 무기 마법', function (e) { return e.t === 'Magic Item' && mit(e) === 'Weapon'; }],
    ['off', '방패 · 보조 손', function (e) { return (e.t === 'Armor' && lc(e.sp && e.sp['Armor Type']) === 'shield') || e.t === 'Weapon' || (e.t === 'Magic Item' && slotOf(e) === 'off-hand'); }],
    ['impl', '도구', function (e) { return e.t === 'Superior Implement' || (e.t === 'Magic Item' && IMPL.test(mit(e))); }],
    ['head', '머리', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'head'; }],
    ['neck', '목', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'neck'; }],
    ['arms', '팔', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'arms'; }],
    ['hands', '손', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'hands'; }],
    ['waist', '허리', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'waist'; }],
    ['feet', '발', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'feet'; }],
    ['ring1', '반지 1', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'ring'; }],
    ['ring2', '반지 2', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'ring'; }]
  ];
  function eqLine(e) { var sp = e.sp || {}, a = [];
    if (e.t === 'Weapon') { a.push(sp['Damage'] || ''); if (sp['Proficiency Bonus']) a.push('숙련 +' + sp['Proficiency Bonus']); a.push(sp['Group'] || ''); if (sp['Range']) a.push('사거리 ' + sp['Range']); if (sp['Properties']) a.push(sp['Properties']); }
    else if (e.t === 'Armor') { a.push((sp['Armor Type'] || '') + ' ' + (sp['Armor Category'] || '')); if (sp['Armor Bonus']) a.push('방어 +' + sp['Armor Bonus']); if (sp['Check'] && sp['Check'] !== '-') a.push('판정 ' + sp['Check']); if (sp['Speed'] && sp['Speed'] !== '-') a.push('이동 ' + sp['Speed']); }
    else { if (sp['Level']) a.push(sp['Level'] + '레벨'); a.push(sp['Enhancement'] || mit(e) || ''); }
    return a.filter(Boolean).join(' · '); }
  function syncEquip() { var q = cur.eq || {}, ids = []; EQ_SLOTS.forEach(function (sl) { if (q[sl[0]]) ids.push(q[sl[0]]); }); (q.other || []).forEach(function (id) { ids.push(id); }); cur.equip = ids; }
  var FIGURE = '<svg viewBox="0 0 120 260" class="fig" aria-hidden="true"><g fill="currentColor" opacity=".16"><circle cx="60" cy="26" r="18"/><rect x="52" y="42" width="16" height="12" rx="4"/>' +
    '<path d="M30 56h60a10 10 0 0 1 10 10v8H20v-8a10 10 0 0 1 10-10z"/><rect x="34" y="70" width="52" height="66" rx="8"/><rect x="14" y="68" width="16" height="78" rx="8"/><rect x="90" y="68" width="16" height="78" rx="8"/>' +
    '<circle cx="22" cy="154" r="9"/><circle cx="98" cy="154" r="9"/><rect x="36" y="132" width="48" height="16" rx="6"/><rect x="36" y="146" width="21" height="92" rx="9"/><rect x="63" y="146" width="21" height="92" rx="9"/>' +
    '<rect x="30" y="236" width="28" height="14" rx="6"/><rect x="62" y="236" width="28" height="14" rx="6"/></g></svg>';
  var EQ_SIDE = { L: ['head', 'neck', 'body', 'bodyM', 'arms', 'hands', 'waist', 'feet'], R: ['main', 'mainM', 'off', 'impl', 'ring1', 'ring2'] };
  function renderEquip() {
    var box = $('equip'); if (!box) return; box.innerHTML = ''; var q = cur.eq = cur.eq || {};
    var doll = document.createElement('div'); doll.className = 'doll';
    var colL = document.createElement('div'), mid = document.createElement('div'), colR = document.createElement('div');
    colL.className = 'dcol'; colR.className = 'dcol'; mid.className = 'dmid'; mid.innerHTML = FIGURE;
    var byKey = {}; EQ_SLOTS.forEach(function (sl) { byKey[sl[0]] = sl; });
    function slot(key) {
      var sl = byKey[key], e = db.byId[q[key]], d = document.createElement('div'); d.className = 'slot' + (e ? ' has' : ''); d.setAttribute('data-slot', key);
      d.innerHTML = '<small>' + sl[1] + '</small>' + (e ? '<b>' + esc(e.n) + '</b><i>' + esc(eqLine(e)) + '</i><u title="빼기">×</u>' : '<em>비어 있음</em>');
      d.onclick = function (ev) {
        if (ev.target.tagName === 'U') { delete q[key]; syncEquip(); rebuild(); return; }
        openSearch(sl[1] + ' 고르기', function (x) { return [{ label: '이걸로 차기', fn: function () { q[key] = x.id; syncEquip(); rebuild(); } }]; }, eqList(sl[2]));
      };
      return d;
    }
    EQ_SIDE.L.forEach(function (k) { colL.appendChild(slot(k)); }); EQ_SIDE.R.forEach(function (k) { colR.appendChild(slot(k)); });
    var o = document.createElement('div'); o.className = 'slot other' + ((q.other || []).length ? ' has' : '');
    o.innerHTML = '<small>그 밖의 물품</small>' + ((q.other || []).length ? '' : '<em>신비한 물건 · 소모품 · 일반 장비</em>');
    (q.other || []).forEach(function (id) { var e = db.byId[id]; if (!e) return; var c = document.createElement('span'); c.className = 'chip'; c.innerHTML = esc(e.n) + '<b title="빼기">×</b>';
      c.onclick = function (ev) { ev.stopPropagation(); if (ev.target.tagName === 'B') { q.other = q.other.filter(function (x) { return x !== id; }); syncEquip(); rebuild(); } else openDetail(e); }; o.appendChild(c); });
    o.onclick = function () { openSearch('그 밖의 물품 더하기', function (x) { return [{ label: '더하기', fn: function () { (q.other = q.other || []).push(x.id); syncEquip(); rebuild(); } }]; },
      eqList(function (e) { return e.t === 'Gear' || (e.t === 'Magic Item' && !slotOf(e) && !/^(Armor|Weapon)$/.test(mit(e)) && !IMPL.test(mit(e))); })); };
    colR.appendChild(o);
    doll.appendChild(colL); doll.appendChild(mid); doll.appendChild(colR); box.appendChild(doll);
  }
  function eqList(pred) { var out = []; ['Armor', 'Weapon', 'Gear', 'Superior Implement', 'Magic Item'].forEach(function (t) { (db.byType[t] || []).forEach(function (e) { if (pred(e)) out.push(e); }); });
    out.sort(function (a, b) { var la = +((a.sp || {})['Level'] || 0), lb = +((b.sp || {})['Level'] || 0); var ga = +((a.sp || {})['Gold'] || 0), gb = +((b.sp || {})['Gold'] || 0); return la - lb || ga - gb || (a.n < b.n ? -1 : 1); }); return out; }

  /* ---------- 고르기 창 ---------- */
  /* 클래스 · 종족 · 패러곤 경로 등: 수치와 주는 것(특성 · 파워)을 먼저, 설정 글은 접어서 뒤에. */
  var MECH = {
    'Class': ['Role', 'Power Source', 'Key Abilities', 'Hit Points at 1st Level', 'Hit Points per Level Gained', 'Healing Surges', 'Bonus to Defense', 'Armor Proficiencies', 'Weapon Proficiencies', 'Implements', 'Trained Skills', 'Class Skills', 'Build Options'],
    'Race': ['Ability Scores', 'Size', 'Speed', 'Vision', 'Languages', 'Skill Bonuses']
  };
  MECH['Hybrid Class'] = MECH['Class'];
  var MECH_KO = { 'Role': '역할', 'Power Source': '파워 원천', 'Key Abilities': '주요 능력치', 'Hit Points at 1st Level': '1레벨 HP', 'Hit Points per Level Gained': '레벨당 HP', 'Healing Surges': '힐링 서지',
    'Bonus to Defense': '방어 보너스', 'Armor Proficiencies': '갑옷 숙련', 'Weapon Proficiencies': '무기 숙련', 'Implements': '도구', 'Trained Skills': '숙련 기술', 'Class Skills': '클래스 기술', 'Build Options': '빌드',
    'Ability Scores': '능력치', 'Size': '크기', 'Speed': '이동', 'Vision': '시야', 'Languages': '언어', 'Skill Bonuses': '기술 보너스' };
  var RICH_TYPES = /^(Class|Hybrid Class|Race|Paragon Path|Epic Destiny|Theme|Build)$/;
  function gives(e) {
    var out = [], seen = {};
    var push = function (el, lv) { if (!el || seen[el.id]) return; seen[el.id] = 1; out.push({ el: el, lv: lv || 0 }); };
    (function walk(x, depth, lv0) {
      (x.r || []).forEach(function (rule) { var a = rule[1];
        if (rule[0] !== 'grant') return;
        var t = db.get(a.name, a.type), lv = +a.level || lv0 || 0; if (!t) return;
        if (/^(Grants|Internal|Trait Package)$/.test(t.t)) { if (depth < 3) walk(t, depth + 1, lv); }
        else if (/^(Power|Class Feature|Racial Trait|Feat)$/.test(t.t)) { push(t, lv); if (depth < 3 && t.t !== 'Power') walk(t, depth + 1, lv); }
      });
    })(e, 0, 0);
    ['Class Features', 'Powers', '_DisplayPowers', 'Racial Traits', '_PARSED_SUB_FEATURES', '_PARSED_CLASS_FEATURE'].forEach(function (k) {
      String((e.sp || {})[k] || '').split(',').forEach(function (tok) { tok = tok.trim(); if (!tok) return; var t = db.byId[tok] || (/^ID_/.test(tok) ? null : (db.get(tok, 'Class Feature') || db.get(tok, 'Racial Trait') || db.get(tok, 'Power'))); if (t && t.sp && t.sp['Level']) push(t, +t.sp['Level'] || 0); else push(t, 0); });
    });
    out.sort(function (a, b) { return a.lv - b.lv; });
    return out;
  }
  function richDetail(e) {
    var sp = e.sp || {}, used = {}, h = '<h3>' + esc(nm(e)) + ' <span class="hint">' + esc(typeKo(e.t)) + (e.src ? ' · ' + esc(e.src.join(', ')) : '') + '</span></h3>';
    if (sp['Short Description']) { h += '<p><b>' + esc(sp['Short Description']) + '</b></p>'; used['Short Description'] = 1; }
    if (e.pre || e.pp) h += '<p><b>선행 조건</b> ' + esc(e.pp || e.pre) + '</p>';
    var mech = (MECH[e.t] || []).filter(function (k) { return sp[k]; });
    if (mech.length) { h += '<div class="mech">'; mech.forEach(function (k) { used[k] = 1; var v = sp[k]; if (k === 'Role' || k === 'Power Source') v = v.split('.')[0]; h += '<div><small>' + MECH_KO[k] + '</small><span>' + esc(v) + '</span></div>'; }); h += '</div>'; }
    var g = gives(e), feats = g.filter(function (x) { return x.el.t !== 'Power'; }), pws = g.filter(function (x) { return x.el.t === 'Power' && x.el.sp && x.el.sp['Power Usage']; });
    if (feats.length) { h += '<h4>특성</h4>'; feats.forEach(function (x) { var t = x.el;
      h += '<details class="ft"><summary>' + esc(t.n) + (x.lv > 1 ? ' <span class="badge">' + x.lv + '레벨</span>' : '') + (t.sp && t.sp['Short Description'] ? ' <span class="hint">' + esc(t.sp['Short Description']) + '</span>' : '') + '</summary><p>' + rich(t.body || '') + '</p></details>'; }); }
    if (pws.length) { h += '<h4>주는 파워</h4><div class="pcards one">' + pws.map(function (x) { return powerCard(x.el, false); }).join('') + '</div>'; }
    if (e.t === 'Class' || e.t === 'Hybrid Class') {
      var mine = (db.byType['Power'] || []).filter(function (p) { return (p.cat || []).indexOf(e.id) >= 0 && p.sp && p.sp['Power Usage'] && (p.cat || []).indexOf('1') >= 0; });
      [['at', '1레벨 무한 파워'], ['enc', '1레벨 조우 파워'], ['day', '1레벨 일일 파워']].forEach(function (u) {
        var list = mine.filter(function (p) { return usageClass(p) === u[0]; }).sort(function (a, b) { return a.n < b.n ? -1 : 1; });
        if (list.length) h += '<details class="ft pg ' + u[0] + '"><summary>' + u[1] + ' <span class="hint">' + list.length + '개 · 눌러서 보기</span></summary><div class="pcards one">' + list.map(function (p) { return powerCard(p, false); }).join('') + '</div></details>';
      });
    }
    var sels = (e.r || []).filter(function (r) { return r[0] === 'select'; });
    if (sels.length) h += '<p class="hint">고르는 것: ' + sels.map(function (r) { return esc(typeKo(r[1].type) + ' ' + (r[1].number || 1) + '개'); }).join(' · ') + '</p>';
    var lore = (e.fl ? '<p class="fl">' + esc(e.fl) + '</p>' : '');
    Object.keys(sp).forEach(function (k) { if (used[k] || k.charAt(0) === '_' || /^(type|Full Text|Class Features|Powers|Power Name|Racial Traits|Trait Package)$/i.test(k)) return; lore += '<p><b>' + esc(k) + '</b> ' + esc(sp[k]) + '</p>'; });
    if (e.body) lore += '<p>' + esc(e.body) + '</p>';
    if (lore) h += '<details class="ft lore"><summary>설정 · 소개 글 <span class="hint">눌러서 보기</span></summary>' + lore + '</details>';
    return h;
  }
  var F_KO = { 'Weight': '무게', 'Armor Bonus': '방어 보너스', 'Minimum Enhancement Bonus': '최소 강화', 'Check': '판정 벌점', 'Speed': '이동 벌점', 'Gold': '가격', 'Silver': '가격(은)', 'Special': '특수',
    'Armor Type': '갑옷 분류', 'Item Slot': '부위', 'Armor Category': '종류', 'Damage': '피해', 'Proficiency Bonus': '숙련 보너스', 'Weapon Category': '무기 분류', 'Hands Required': '손', 'Group': '무기군',
    'Properties': '속성', 'Range': '사거리', 'Level': '레벨', 'Rarity': '희귀도', 'Magic Item Type': '물품 종류', 'Enhancement': '강화', 'Critical': '치명타', 'Property': '특성', 'Power': '파워',
    'Requirement': '요구 조건', 'Tier': '티어', 'Short Description': '요약', 'Prerequisite': '선행 조건', 'Weapon': '무기', 'Armor': '갑옷', 'Size': '크기', 'Key Ability': '주 능력치', 'Benefit': '혜택',
    'Associated Skills': '관련 기술', 'Associated Languages': '관련 언어', 'Campaign': '캠페인', 'Key Skill': '주 기술', 'Component Cost': '재료비', 'Market Price': '시세', 'Time': '시간', 'Duration': '지속', 'Category': '분류',
    'Alignment': '성향', 'Domains': '권역', 'Granted Powers': '주는 파워' };
  var TIER_KO = { heroic: '영웅', paragon: '패러곤', epic: '에픽' }, RAR_KO = { common: '일반', uncommon: '비범', rare: '희귀', mundane: '평범' };
  var readablePre = function (e) { if (e.pp) return e.pp; return String(e.pre || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^[~!]/.test(x) && !/unselectable|not selectable/i.test(x); }).join(', '); };
  var idNames = function (t) { return String(t).replace(/ID_[A-Z0-9_()\-]+/g, function (id) { return db.byId[id] ? db.byId[id].n : id; }); };
  function cardHtml(e, preState) {
    var sp = e.sp || {}, isItem = /^(Armor|Weapon|Gear|Magic Item|Superior Implement|Item Set|Ritual|Ritual Scroll)$/.test(e.t), isFeat = e.t === 'Feat';
    var tier = lc(sp['Tier']), rar = lc(sp['Rarity']) || (isItem && e.t !== 'Magic Item' ? 'mundane' : '');
    var cls = isFeat ? 'feat t-' + (tier || 'heroic') : isItem ? 'item r-' + (rar || 'common') : 'misc';
    var right = isFeat ? (TIER_KO[tier] || sp['Tier'] || '') + ' 재주' : isItem ? [typeKo(e.t === 'Magic Item' ? (sp['Magic Item Type'] || '마법 물품') : e.t), sp['Level'] ? sp['Level'] + '레벨' : '', RAR_KO[rar] || ''].filter(Boolean).join(' · ') : typeKo(e.t);
    var tr = trParts(e);
    var h = '<div class="gc ' + cls + tr.cls + '"><div class="gh"><span class="pn">' + (tr.name || esc(nm(e))) + '</span><span class="pd">' + esc(right) + '</span></div>';
    if (sp['Short Description']) h += '<div class="gm">' + esc(sp['Short Description']) + '</div>';
    var chips = '', rows = '', skip = { 'Tier': 1, 'Rarity': 1, 'Short Description': 1, 'Level': isItem, 'Magic Item Type': 1, 'type': 1, 'Type': 1, 'Full Text': 1, 'Associated Power Info': 1, 'Associated Powers': 1, 'Container': 1 };
    Object.keys(sp).forEach(function (k) {
      var v = String(sp[k]).trim(); if (!v || v === '-' || skip[k] || k.charAt(0) === '_') return;
      v = idNames(v); if (k === 'Gold') v = Number(v).toLocaleString() + ' gp'; if (k === 'Weight') v = v + ' lb'; if (k === 'Proficiency Bonus' || k === 'Armor Bonus') v = '+' + v.replace(/^\+/, '');
      if (v.length <= 30 && v.indexOf('\n') < 0) chips += '<div><small>' + esc(F_KO[k] || k) + '</small><span>' + esc(v) + '</span></div>';
      else rows += '<div class="pr"><b>' + esc(F_KO[k] || k) + '</b><span>' + rich(v) + '</span></div>';
    });
    var pre = readablePre(e);
    if (pre) rows = '<div class="pr pre ' + (preState || '') + '"><b>선행 조건</b><span>' + esc(pre) + (preState ? ' ' + PRE_BADGE[preState] : '') + '</span></div>' + rows;
    if (chips) h += '<div class="gs">' + chips + '</div>';
    h += '<div class="pb">' + (e.fl ? '<p class="pfl">' + esc(e.fl) + '</p>' : '') + rows + (e.body ? '<div class="pr"><span>' + rich(e.body) + '</span></div>' : '') + (e.src ? '<p class="psrc">' + esc(e.src.join(', ')) + '</p>' : '') + '</div>' + tr.body + tr.bar + '</div>';
    return h;
  }
  function fields(e, preState) {
    if (RICH_TYPES.test(e.t)) return richDetail(e);
    if (!(e.t === 'Power' && e.sp && e.sp['Power Usage'])) return cardHtml(e, preState);
    if (e.t === 'Power' && e.sp && e.sp['Power Usage']) return '<div class="pcards one">' + powerCard(e, true) + '</div>' + (e.pre ? '<p class="hint">선행 조건: ' + esc(e.pp || e.pre) + '</p>' : '');
    var h = '<h3>' + esc(nm(e)) + ' <span class="hint">' + esc(typeKo(e.t)) + (e.src ? ' · ' + esc(e.src.join(', ')) : '') + '</span></h3>';
    if (e.fl) h += '<p class="fl">' + esc(e.fl) + '</p>';
    if (e.pre || e.pp) h += '<p><b>선행 조건</b> ' + esc(e.pp || e.pre) + '</p>';
    var sp = e.sp || {};
    Object.keys(sp).forEach(function (k) { if (k.charAt(0) === '_' || /^(type|Full Text)$/i.test(k)) return; h += '<p><b>' + esc(k) + '</b> ' + esc(String(sp[k]).replace(/ID_[A-Z0-9_()\-]+/g, function (id) { return db.byId[id] ? db.byId[id].n : id; })) + '</p>'; });
    if (e.body) h += '<p>' + esc(e.body) + '</p>';
    return h;
  }
  function short(e) { var sp = e.sp || {}; return sp['Display'] || sp['Short Description'] || (sp['Tier'] ? sp['Tier'] : '') || (e.src ? e.src[0] : ''); }
  function openDetail(e) {
    if (!e) return; $('mOpt').hidden = true;
    $('mTitle').textContent = e.n; $('mSearch').hidden = true; $('mList').hidden = true; $('mDetail').innerHTML = fields(e);
    $('modal').querySelector('.mbody').style.gridTemplateColumns = 'minmax(0,1fr)'; $('modal').querySelector('.box').classList.add('fit'); $('modal').hidden = false;
  }
  function openPicker(s) {
    trCtx = { map: {}, edit: false };
    var all = E.options(db, s, res.vars).filter(function (e) { return !/Unselectable|Not Selectable/i.test(e.pre || '') ; });
    var pre = {}; all.forEach(function (e) { pre[e.id] = prereq(e, res, cur.level); });
    var rank = { ok: 0, unk: 1, no: 2 };
    all.sort(function (a, b) { return rank[pre[a.id]] - rank[pre[b.id]] || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0); });
    var chosen = (cur.choices[s.key] || []).slice(), active = null, nNo = all.filter(function (e) { return pre[e.id] === 'no'; }).length;
    var onlyOk = localStorage.getItem('d4e_onlyok') !== '0';
    $('mOpt').hidden = !nNo; $('mOnly').checked = onlyOk; $('mOnlyN').textContent = '(조건 미달 ' + nNo + '개)';
    $('mOnly').onchange = function () { onlyOk = $('mOnly').checked; localStorage.setItem('d4e_onlyok', onlyOk ? '1' : '0'); list(); };
    $('modal').querySelector('.box').classList.toggle('few', all.length <= 12);
    $('mTitle').textContent = selLabel(s) + ' — 후보 ' + all.length + '개'; $('mSearch').hidden = false; $('mSearch').value = ''; $('mList').hidden = false;
    $('modal').querySelector('.mbody').style.gridTemplateColumns = ''; $('mDetail').innerHTML = '<p class="hint">왼쪽에서 하나를 누르면 내용이 보여요.</p>';
    function show(e) {
      active = e; var on = chosen.indexOf(e.id) >= 0, owned = !!res.owned[e.id] && !on;
      $('mDetail').innerHTML = fields(e, e.pre ? pre[e.id] : '') + '<div class="pick"><button id="mPick">' + (on ? '빼기' : owned ? '이미 가지고 있어요' : '이걸로 고르기') + '</button>' +
        (pre[e.id] === 'no' ? ' <span class="hint bad">선행 조건에 맞지 않아요.</span>' : pre[e.id] === 'unk' ? ' <span class="hint">선행 조건을 자동으로 풀지 못했어요. 직접 확인해 주세요.</span>' : '') + '</div>';
      $('mPick').disabled = owned;
      $('mPick').onclick = function () {
        if (!on && pre[e.id] === 'no' && !confirm('선행 조건(' + (e.pp || e.pre) + ')에 맞지 않아요. 그래도 고를까요?')) return;
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
        if (q && lc(nm(e)).indexOf(q) < 0 && lc(short(e)).indexOf(q) < 0 && lc(e.pre).indexOf(q) < 0) continue;
        if (onlyOk && pre[e.id] === 'no' && chosen.indexOf(e.id) < 0) continue;
        var d = document.createElement('div'); n++;
        d.className = (active === e ? 'on ' : '') + ((res.owned[e.id] && chosen.indexOf(e.id) < 0) || pre[e.id] === 'no' ? 'dim' : '') + (e.t === 'Power' ? ' pl ' + usageClass(e) : e.t === 'Feat' ? ' fl t-' + (lc((e.sp || {})['Tier']) || 'heroic') : '');
        d.innerHTML = (chosen.indexOf(e.id) >= 0 ? '✔ ' : '') + esc(nm(e)) + PRE_BADGE[pre[e.id]] + '<small>' + esc(short(e)) + (e.pre ? ' · 조건: ' + esc(e.pp || e.pre) : '') + '</small>';
        d.onclick = (function (e) { return function () { show(e); }; })(e);
        box.appendChild(d);
      }
      if (n >= 300) { var m = document.createElement('div'); m.className = 'dim'; m.textContent = '300개까지만 보여요. 검색으로 좁혀 주세요.'; box.appendChild(m); }
      if (!n) box.innerHTML = '<div class="dim">맞는 후보가 없어요.</div>';
    }
    $('mSearch').oninput = list; list(); $('modal').hidden = false;
  }
  /* 모든 요소에서 찾기 (하우스룰용). actions(e) → [{label, fn, ghost}] */
  function openSearch(title, actions, given, needQuery) {
    trCtx = { map: {}, edit: false };
    $('mOpt').hidden = true; $('modal').querySelector('.box').classList.remove('few');
    var all = given || Object.keys(db.byId).map(function (k) { return db.byId[k]; });
    $('mTitle').textContent = title; $('mSearch').hidden = false; $('mSearch').value = ''; $('mList').hidden = false;
    $('modal').querySelector('.mbody').style.gridTemplateColumns = ''; $('mDetail').innerHTML = '<p class="hint">찾아서 하나를 누르면 내용이 보여요.</p>';
    function show(e) {
      $('mDetail').innerHTML = fields(e) + '<div class="pick" id="mActs"></div>';
      actions(e).forEach(function (a) { var b = document.createElement('button'); b.textContent = a.label; if (a.ghost) b.className = 'ghost'; b.style.marginRight = '6px';
        b.onclick = function () { closeModal(); a.fn(); }; $('mActs').appendChild(b); });
    }
    function list() {
      var q = lc($('mSearch').value), box = $('mList'), n = 0; box.innerHTML = '';
      if ((!given || needQuery) && q.length < 2) { box.innerHTML = '<div class="dim">이름을 두 글자 넘게 적어 주세요.</div>'; return; }
      for (var i = 0; i < all.length && n < 200; i++) {
        var e = all[i]; if (q && lc(nm(e)).indexOf(q) < 0 && lc(given && !needQuery ? eqLine(e) : '').indexOf(q) < 0) continue;
        var d = document.createElement('div'); n++;
        if (needQuery && e.t === 'Power') d.className = 'pl ' + usageClass(e); else if (given && e.t === 'Magic Item') d.className = 'il r-' + (lc((e.sp || {})['Rarity']) || 'common'); else if (given) d.className = 'il r-mundane';
        d.innerHTML = esc(nm(e)) + '<small>' + esc(given && !needQuery ? eqLine(e) + ((e.sp || {})['Gold'] ? ' · ' + Number(e.sp['Gold']).toLocaleString() + ' gp' : '') : typeKo(e.t) + ' · ' + short(e)) + '</small>';
        d.onclick = (function (e) { return function () { show(e); }; })(e); box.appendChild(d);
      }
      if (n >= 200) { var m = document.createElement('div'); m.className = 'dim'; m.textContent = '200개까지만 보여요. 검색으로 좁혀 주세요.'; box.appendChild(m); }
      if (!n) box.innerHTML = '<div class="dim">맞는 요소가 없어요.</div>';
    }
    $('mSearch').oninput = list; list(); $('modal').hidden = false; $('mSearch').focus();
  }
  function closeModal() { $('modal').hidden = true; $('modal').querySelector('.box').classList.remove('fit', 'few'); }

  /* ---------- 팀 시트 ---------- */
  async function shareCur() {
    var me = $('me').value.trim();
    if (!me) { alert('먼저 「내 이름」을 적어 주세요. 팀 시트에 누구 캐릭터인지 표시돼요.'); $('me').focus(); return; }
    cur.owner = me; saveChars(); status('올리는 중…');
    try {
      await D4EShare.put(cur.id, { name: cur.name, owner: me, set: cur.set || '', port: cur.port || '', level: cur.level, abilities: cur.abilities, choices: cur.choices, eq: cur.eq || {}, equip: cur.equip || [], tr: cur.tr || {}, sum: summary(cur, res), at: Date.now() });
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
      c.innerHTML = (d.port ? '<img class="port sm" src="' + esc(d.port) + '" alt="">' : '') + '<h3>' + esc(d.name || '이름 없음') + '</h3><p>' + esc(d.owner || '?') + ' · ' + esc(koName('Race', s.race) || s.race || '') + ' ' + esc(koName('Class', s.cls) || s.cls || '') + ' · ' + (d.level || 1) + '레벨</p>' +
        '<p>HP ' + (s.hp || 0) + ' · AC ' + (s.ac || 0) + ' · 인내 ' + (s.fort || 0) + ' · 반사 ' + (s.ref || 0) + ' · 의지 ' + (s.will || 0) + '</p>' +
        '<p>' + esc((s.powers || []).slice(0, 8).join(', ')) + '</p>';
      var b1 = document.createElement('button'); b1.className = 'mini'; b1.textContent = '시트 보기';
      b1.onclick = function () {
        if (!db) { alert('전체 시트는 룰 데이터를 불러온 뒤에 볼 수 있어요. 「데이터」 탭을 확인해 주세요.'); return; }
        if (d.set) D4EHouse.apply(db, d.set);
        var ch = { id: row.id, name: d.name, port: d.port || '', level: d.level || 1, abilities: d.abilities || {}, choices: d.choices || {}, equip: d.equip || [], tr: d.tr || {} }, r = E.build(db, ch);
        var ts = $('teamSheet'); ts.hidden = false; ts.innerHTML = sheetHtml(ch, r, d.owner); wireSheet(ts, r); ts.scrollIntoView({ behavior: 'smooth' });
      };
      var b2 = document.createElement('button'); b2.className = 'mini ghost'; b2.textContent = '복제해서 내 것으로';
      b2.onclick = function () { var n = newChar(); n.name = (d.name || '') + ' (복제)'; n.level = d.level || 1; n.port = d.port || ''; n.abilities = Object.assign(n.abilities, d.abilities || {}); n.choices = JSON.parse(JSON.stringify(d.choices || {})); n.eq = JSON.parse(JSON.stringify(d.eq || {})); n.equip = (d.equip || []).slice(); n.tr = JSON.parse(JSON.stringify(d.tr || {})); cur = n; saveChars(); tab('edit'); };
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
    if ((name === 'edit' || name === 'house') && !db) name = 'data';
    ['edit', 'team', 'house', 'data'].forEach(function (t) { $('tab-' + t).hidden = t !== name; });
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === name); });
    if (name === 'edit') renderEdit();
    if (name === 'team') renderTeam();
    if (name === 'house') D4EHouse.refresh();
  }
  function useData(d) {
    db = new E.Db(); Object.keys(d.groups).forEach(function (g) { db.add(d.groups[g]); });
    $('dataState').textContent = '룰 요소 ' + d.total.toLocaleString() + '개를 쓰고 있어요' + (d.meta && d.meta.site ? ' (사이트의 data 폴더).' : ' (이 브라우저에 보관).');
    status('룰 요소 ' + d.total.toLocaleString() + '개');
  }
  async function loadHouse() {
    try { var n = await D4EHouse.load(db); if (n) status('룰 요소 ' + Object.keys(db.byId).length.toLocaleString() + '개 · 하우스룰 ' + n + '개'); }
    catch (e) { status('하우스룰을 읽지 못했어요'); }
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
    $('chName').oninput = function () { cur.name = $('chName').value.trim(); saveChars(); var o = $('chSel').selectedOptions[0]; if (o) o.textContent = cur.name || cur.id; var h = $('sheet').querySelector('h2'); if (h && h.firstChild && h.firstChild.nodeType === 3) h.firstChild.nodeValue = (cur.name || '이름 없음') + ' '; };
    $('chLevel').onchange = function () { cur.level = +$('chLevel').value; rebuild(); };
    $('hideOpt').onchange = renderSelects;
    $('chSet').onchange = function () { cur.set = $('chSet').value; var st = D4EHouse.setOf(cur.set); if (st.level > cur.level) cur.level = st.level; saveChars(); renderEdit(); };
    /* 포트: 고른 그림을 세로 480 안으로 줄여 캐릭터에 함께 보관한다(팀 시트에도 같이 올라간다). */
    var setPort = function (f) {
      if (!f || !/^image\//.test(f.type)) { alert('그림 파일을 놓아 주세요.'); return; }
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () {
        var k = Math.min(1, 480 / img.height, 480 / img.width), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var out = c.toDataURL('image/webp', 0.82); if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/jpeg', 0.82);
        URL.revokeObjectURL(url); cur.port = out; $('portFile').value = ''; rebuild();
      };
      img.onerror = function () { URL.revokeObjectURL(url); alert('그림 파일을 읽지 못했어요.'); };
      img.src = url;
    };
    $('portFile').onchange = function () { setPort($('portFile').files[0]); };
    $('portDrop').onclick = function () { $('portFile').click(); };
    ['portDrop', 'sheet'].forEach(function (id) { var z = $(id);
      z.addEventListener('dragover', function (ev) { if (ev.dataTransfer && [].indexOf.call(ev.dataTransfer.types, 'Files') >= 0) { ev.preventDefault(); z.classList.add('drag'); } });
      z.addEventListener('dragleave', function () { z.classList.remove('drag'); });
      z.addEventListener('drop', function (ev) { ev.preventDefault(); z.classList.remove('drag'); setPort(ev.dataTransfer.files[0]); }); });
    $('portDel').onclick = function () { if (cur.port) { delete cur.port; rebuild(); } };
    $('chShare').onclick = shareCur; $('teamRefresh').onclick = renderTeam;
    $('xmlFile').onchange = async function () {
      var f = $('xmlFile').files[0]; if (!f) return;
      $('dataProg').textContent = '파일을 읽는 중이에요. 잠시만 기다려 주세요.';
      try {
        var d = await D4EData.importAny(f, function (n, p) { $('dataProg').textContent = '바꾸는 중… ' + n.toLocaleString() + '개 (' + Math.round(p * 100) + '%)'; });
        $('dataProg').textContent = '끝났어요. ' + d.total.toLocaleString() + '개를 보관했어요.' + (d.bad ? ' 읽지 못한 요소 ' + d.bad + '개.' : '');
        useData({ groups: d.groups, total: d.total }); await loadHouse(); tab('edit');
      } catch (e) { $('dataProg').textContent = '불러오지 못했어요: ' + e.message; }
    };
    $('dataClear').onclick = async function () { if (!confirm('이 브라우저에 보관한 룰 데이터를 지울까요? 캐릭터는 남아요.')) return; await D4EData.clear(); location.reload(); };
    $('dataExport').onclick = async function () {
      $('dataExportMsg').textContent = '만드는 중이에요.';
      try { var size = await D4EData.exportPack(); $('dataExportMsg').textContent = '내보냈어요 (' + (size / 1048576).toFixed(1) + 'MB).'; }
      catch (e) { $('dataExportMsg').textContent = e.message; }
    };
    window.D4EApp = { card: function (e) { return fields(e); }, db: function () { return db; }, esc: esc, nm: nm, typeKo: typeKo, openSearch: openSearch, status: status,
      houseChanged: function () { if (!$('tab-edit').hidden) renderEdit(); status('룰 요소 ' + Object.keys(db.byId).length.toLocaleString() + '개 · 하우스룰 ' + D4EHouse.count() + '개'); } };
    D4EHouse.start();
    status('데이터를 찾는 중…');
    var d = (await D4EData.loadStored()) || (await D4EData.loadSite());
    if (d) { useData(d); await loadHouse(); tab('edit'); }
    else { $('dataState').textContent = '아직 룰 데이터가 없어요. 아래에서 파일을 한 번 불러와 주세요.'; status('룰 데이터 없음'); tab('data'); }
  }
  start();
})();
