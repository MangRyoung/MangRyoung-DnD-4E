/* 4판 캐릭터 제작기 화면. 룰 데이터 글은 영어 그대로 보여 주고, 화면 글은 한국어. */
(function () {
  'use strict';
  var E = window.D4E, $ = function (id) { return document.getElementById(id); };
  var lc = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var db = null, chars = {}, cur = null, res = null, viewing = null;
  var vocabCache = {};

  var TYPE_KO = { 'Race': '종족', 'Class': '클래스', 'Feat': '재주', 'Power': '파워', 'Skill Training': '기술 숙련', 'Class Feature': '클래스 특성',
    'Racial Trait': '종족 특성', 'Homebrew Feature': '홈브류 특성', 'Race Ability Bonus': '종족 능력치 보너스', 'Language': '언어', 'Deity': '신앙', 'Background': '배경',
    'Background Choice': '배경 혜택', 'Theme': '테마', 'Build': '빌드', 'Gender': '성별', 'Alignment': '성향', 'Paragon Path': '패러곤 경로',
    'Epic Destiny': '에픽 운명', 'Proficiency': '숙련', 'Hybrid Class': '하이브리드 클래스', 'Familiar': '패밀리어', 'Companion': '동료', 'Domain': '권역', 'Skill Specialization': '기술 특화' };
  var AB_KO = { Strength: '근력', Constitution: '건강', Dexterity: '민첩', Intelligence: '지능', Wisdom: '지혜', Charisma: '매력' };
  var typeKo = function (t) {
    var m = /^(Companion )?Ability Increase \(Level (\d+)\)$/.exec(t);
    if (m) return (m[1] ? '동료 ' : '') + '능력치 올리기 (' + m[2] + '레벨)';
    return TYPE_KO[t] || t;
  };
  var selLabel = function (s) {
    var m = /^Power (Encounter|Daily|Utility|At-Will) (\d+)$/.exec(s.name || '');
    if (m) return ({ Encounter: '조우', Daily: '일일', Utility: '활용', 'At-Will': '무제한' })[m[1]] + ' 파워 (' + m[2] + '레벨)';
    return typeKo(s.type) + (s.name ? ' · ' + s.name : '');
  };
  var selLabel0 = selLabel; selLabel = function (s) { return selLabel0(s) + (s.swap ? ' 교체' : '');
  };
  /* 이름 번역: 「한국어 (English)」. 번역표에 없으면 영어 그대로. */
  /* 팀 용어집(영어 → 한국어). 클래스 · 기술 이름과 카드의 칸 이름에 먼저 쓴다. */
  var gloss = function (en) { var G = gloss.map; if (!G || gloss.src !== D4EHouse.glossary()) { G = gloss.map = {}; gloss.src = D4EHouse.glossary(); gloss.src.forEach(function (p) { G[lc(p[0])] = p[1]; }); } return G[lc(en)] || ''; };
  var koName0 = function (type, name) { if (/^(Class|Skill|Skill Training)$/.test(type || '')) { var g = gloss(name); if (g) return g; } return koName1(type, name); };
  var koName = function (type, name) { return koName0(type, name); };
  var koName1 = function (type, name) { var K = window.D4E_KO || {}, m = /Ability Increase|Race Ability Bonus|Ability Score/.test(type || '') ? K['Race Ability Bonus'] : K[type]; return m && m[name] ? m[name] : ''; };

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
  document.querySelectorAll('details.bsec').forEach(function (d) { var k = d.getAttribute('data-sec'); if (k in secState) d.open = secState[k]; });
  var nm = function (e) { if (!e) return ''; var k = koName(e.t, e.n); return k ? k + ' (' + e.n + ')' : e.n; };
  var status = function (t) { $('status').textContent = t || ''; };
  /* 화면 아래에 잠깐 뜨는 알림 — 머리의 상태 글은 화면을 내리면 안 보여서 */
  var toastT = 0, toast = function (t, bad) { var b = $('toast'); if (!b) { b = document.createElement('div'); b.id = 'toast'; document.body.appendChild(b); }
    b.textContent = t; b.className = 'toast on' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(function () { b.className = 'toast'; }, 3500); };

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
  function pwCount(list) { var c = { at: 0, enc: 0, day: 0, util: 0 }; list.forEach(function (p) { if (p && p.sp && p.sp['Power Usage'] && !/^ID_INTERNAL/.test(p.id) && p.n !== 'Second Wind') c[usageClass(p)]++; }); return c; }
  function summary(ch, r) {
    var one = function (t) { var a = ownedOf(r, t); return a.length ? a[0].n : ''; };
    var s = r.stats;
    return { race: one('Race'), cls: one('Class'), level: ch.level, hp: s['hit points'] || 0, surges: s['healing surges'] || 0,
      ac: s['ac'] || 0, fort: s['fortitude defense'] || 0, ref: s['reflex defense'] || 0, will: s['will defense'] || 0,
      speed: s['speed'] || 0, init: s['initiative'] || 0,
      powers: ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && !/^ID_INTERNAL/.test(p.id); }).map(function (p) { return p.n; }),
      feats: ownedOf(r, 'Feat').map(function (f) { return f.n; }), pw: pwCount(ownedOf(r, 'Power')), hsv: Math.floor((s['hit points'] || 0) / 4) + (s['healing surge value'] || 0),
      role: ((ownedOf(r, 'Class')[0] || {}).sp || {})['Role'] || '', path: one('Paragon Path'), epic: one('Epic Destiny') };
  }

  /* ---------- 번역 ----------
   * (1) 용어 자동 번역: 카드의 글에서 팀 용어집의 영어 용어를 한국어로 바꿔 보여 준다. 화면에서만 바꾸고 저장하지 않는다.
   * (2) 내 번역: 캐릭터마다 자기 시트의 파워 · 물품에 칸별로 번역을 적는다. ch.tr[id] = {n 이름, fl 플레이버, body 설명, f:{칸: 글}}.
   * 카드마다 「번역 | 원문」 탭으로 바꿔 본다. */
  var trCtx = { map: {}, edit: false }, teamCtx = null, trOrig = {}, glossAuto = localStorage.getItem('d4e_gauto') !== '0';
  function gsub(t) {
    if (!t) return ''; var G = D4EHouse.glossary();
    if (gsub.src !== G) { gsub.src = G; gsub.map = {}; var terms = G.map(function (p) { gsub.map[lc(p[0])] = p[1]; return p[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).sort(function (a, b) { return b.length - a.length; });
      gsub.re = terms.length ? new RegExp('(^|[^A-Za-z])(' + terms.join('|') + ')(?![A-Za-z])', 'gi') : null; }
    return gsub.re ? String(t).replace(gsub.re, function (m, pre, term) { return pre + (gsub.map[lc(term)] || term); }) : String(t);
  }
  function TR(e) { var t = trCtx.map[e.id]; if (t && t.t && !t.body) t.body = t.t; return t || null; }
  function tview(e) { return !trOrig[e.id] && (glossAuto || !!TR(e)); }
  /* 한 칸의 HTML: 내 번역이 있으면 그것, 없으면 용어 자동 번역, 원문 탭이면 원문 */
  function tx(e, k, orig) {
    if (tview(e)) { var t = TR(e), v = t && (k === '_fl' ? t.fl : k === '_body' ? t.body : (t.f || {})[k]); if (v) return '<span class="mine">' + esc(v).replace(/\n/g, '<br>') + '</span>'; if (glossAuto) return rich(gsub(orig)); }
    return rich(orig);
  }
  function tname(e, base) { var t = TR(e); return tview(e) && t && t.n ? esc(t.n) + ' <small class="on">' + esc(e.n) + '</small>' : esc(base || e.n); }
  /* 시트별 파워 성능 고침: ch.ed[id] = { f: { 칸: 글 } }. 빈 글은 그 칸을 뺀다는 뜻. 번역(tr)과 달리 계산에도 쓰인다 */
  var PED_FIELDS = ['Power Usage', 'Keywords', 'Action Type', 'Attack Type', 'Trigger', 'Requirement', 'Target', 'Attack', 'Hit', 'Miss', 'Effect', 'Sustain Minor', 'Special', '하우스룰'];
  var PED_KO = { 'Power Usage': '사용 (At-Will / Encounter / Daily)', 'Keywords': '키워드', 'Action Type': '행동', 'Attack Type': '공격 형태 · 사거리', '하우스룰': '하우스룰 메모' };
  function eff(p, ch) { var ed = p && !p._ed && ch && ch.ed && ch.ed[p.id]; if (!ed || !ed.f) return p;
    var sp = Object.assign({}, p.sp || {}); Object.keys(ed.f).forEach(function (k) { if (ed.f[k] === '') delete sp[k]; else sp[k] = ed.f[k]; });
    var c = Object.assign({}, p); c.sp = sp; c._ed = 1; return c; }
  function pedKeys(e) { var sp = e.sp || {}, keys = [], seen = {}, add = function (k) { if (!seen[k]) { seen[k] = 1; keys.push(k); } };
    PED_FIELDS.forEach(function (k) { if (k === 'Target' && sp['Targets'] != null && sp['Target'] == null) k = 'Targets'; add(k); });
    Object.keys(sp).forEach(function (k) { if (k.charAt(0) !== '_' && !/^(Display|Class|Level|Power Type|type|Full Text)$/.test(k)) add(k); }); return keys; }
  /* 성능 고치기 창: 자주 쓰는 값은 단추 · 목록으로 고르고, 글 칸은 그 결과를 담는다(직접 고쳐도 됨) */
  var PED_ACT = ['Standard Action', 'Move Action', 'Minor Action', 'Free Action', 'Immediate Interrupt', 'Immediate Reaction', 'Opportunity Action', 'No Action'];
  var PED_RANGE = [['Melee weapon', '근접 무기', 0], ['Melee touch', '근접 접촉', 0], ['Melee', '근접 N', 1], ['Ranged weapon', '원거리 무기', 0], ['Ranged', '원거리 N', 1], ['Close burst', '근거리 폭발 N', 1], ['Close blast', '근거리 분사 N', 1], ['Area burst', '범위 폭발 N (M칸 안)', 2], ['Area wall', '범위 벽 N (M칸 안)', 2], ['Personal', '자신', 0]];
  var vocabOf = function (k, n) { return window.D4EApp ? window.D4EApp.vocab(k, n) : []; };
  function pedForm(e) {
    var ed = ((cur.ed || {})[e.id] || {}).f || {}, sp = e.sp || {}, AB = E.ABILITIES, opt = function (v, l, on) { return '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + esc(l) + '</option>'; };
    var h = '<div class="gc misc trform pedform" data-id="' + esc(e.id) + '"><div class="gh"><span class="pn">' + esc(e.n) + ' · 성능 고치기</span><span class="pd">이 시트에서만 바뀌어요. 공격 · 피해 계산과 맵툴 내보내기에도 반영돼요</span></div><div class="tfs">';
    var chips = function (k, list, cur0, multi) { return '<div class="kwbox">' + list.map(function (w) { var on = multi ? cur0.split(',').map(function (x) { return lc(x.trim()); }).indexOf(lc(w)) >= 0 : lc(cur0) === lc(w), g = gsub(w);
      return '<button type="button" class="opt' + (on ? ' on' : '') + '" data-' + (multi ? 'ptog' : 'pset') + '="' + esc(k) + '" data-v="' + esc(w) + '" title="' + esc(w) + '">' + esc(g !== w ? g : (ACT_KO[lc(w)] || w)) + '</button>'; }).join('') + '</div>'; };
    pedKeys(e).forEach(function (k, n) { var o = sp[k] == null ? '' : String(sp[k]), v = ed[k] != null ? ed[k] : o, help = '', one = true, dl = '';
      if (k === 'Power Usage') help = chips(k, ['At-Will', 'Encounter', 'Daily'], /daily/i.test(v) ? 'Daily' : /encounter/i.test(v) ? 'Encounter' : 'At-Will');
      else if (k === 'Keywords') help = chips(k, vocabOf('Keywords', 48), v, true);
      else if (k === 'Action Type') help = chips(k, PED_ACT, v);
      else if (k === 'Attack Type') { var rm = /^(Melee weapon|Melee touch|Ranged weapon|Personal|Melee|Ranged|Close burst|Close blast|Area burst|Area wall)\s*(\d+)?(?:\s+within\s+(\d+))?/i.exec(v) || [];
        help = '<div class="pbld" data-pbuild="range"><select data-r="k">' + opt('', '직접 적기', !rm[1]) + PED_RANGE.map(function (r) { return opt(r[0], r[1], lc(rm[1] || '') === lc(r[0])); }).join('') + '</select><label>N <input type="number" min="1" max="30" data-r="n" value="' + esc(rm[2] || '') + '"></label><label>M칸 안 <input type="number" min="1" max="30" data-r="m" value="' + esc(rm[3] || '') + '"></label></div>'; }
      else if (k === 'Attack') { var am = /(Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma)(\s*[+-]\s*\d+)?\s+vs\.?\s+(AC|Fortitude|Reflex|Will)/i.exec(v) || [];
        help = '<div class="pbld" data-pbuild="atk"><select data-a="ab">' + opt('', '공격 굴림 없음', !am[1]) + AB.map(function (a) { return opt(a, a.slice(0, 3).toUpperCase() + ' ' + AB_KO[a], lc(am[1] || '') === lc(a)); }).join('') + '</select><label>보정 <input type="number" min="-10" max="10" data-a="mod" value="' + esc((am[2] || '').replace(/\s/g, '')) + '"></label><span>vs</span><select data-a="def">' + ['AC', 'Fortitude', 'Reflex', 'Will'].map(function (d) { return opt(d, d === 'AC' ? 'AC' : d.slice(0, 4).replace('Refl', 'Ref').replace('Will', 'Will'), lc(am[3] || 'AC') === lc(d)); }).join('') + '</select></div>'; }
      else if (k === 'Hit') { one = false; var hm = /^(\d+)\s*(\[W\]|d\d+)(?:\s*\+\s*(Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma) modifier)?\s*(\w+(?: and \w+)?)?\s*damage/i.exec(v) || [];
        help = '<div class="pbld" data-pbuild="hit"><label>피해 <input type="number" min="1" max="12" data-h="n" value="' + esc(hm[1] || '1') + '"></label><select data-h="die">' + ['[W]', 'd4', 'd6', 'd8', 'd10', 'd12'].map(function (d) { return opt(d, d === '[W]' ? '[W] 무기 주사위' : d, lc(hm[2] || '[W]') === lc(d)); }).join('') + '</select><span>+</span><select data-h="ab">' + opt('', '능력치 없음', !hm[3]) + AB.map(function (a) { return opt(a, a.slice(0, 3).toUpperCase() + ' ' + AB_KO[a], lc(hm[3] || '') === lc(a)); }).join('') + '</select>' +
          '<input type="text" data-h="type" list="pedDT" placeholder="피해 종류 (없어도 됨)" value="' + esc(hm[4] && !/^modifier$/i.test(hm[4]) ? hm[4] : '') + '"><datalist id="pedDT">' + ['fire', 'cold', 'lightning', 'thunder', 'radiant', 'necrotic', 'psychic', 'force', 'poison', 'acid'].map(function (d) { return '<option value="' + d + '" label="' + esc(gsub(d)) + '">'; }).join('') + '</datalist><button type="button" class="mini ghost" data-h="go">피해 줄에 넣기</button></div>'; }
      else if (k === 'Target' || k === 'Targets') help = chips(k, vocabOf(sp['Targets'] != null ? 'Targets' : 'Target', 10).concat(vocabOf('Target', 10)).filter(function (x, i2, a) { return a.indexOf(x) === i2; }).slice(0, 10), v);
      else if (k === 'Miss') { one = false; help = chips(k, vocabOf('Miss', 6), v); }
      else if (k === 'Trigger' || k === 'Requirement') { one = false; dl = 'pedL' + n; help = '<datalist id="' + dl + '">' + vocabOf(k, 40).map(function (w) { return '<option value="' + esc(w) + '">'; }).join('') + '</datalist>'; one = true; }
      else one = false;
      h += '<div class="tf' + (ed[k] != null ? ' chg' : '') + '"><b>' + esc(PED_KO[k] || gloss(k) || ROW_KO[k] || k) + '</b>' + (o && o !== v ? '<div class="to">원래: ' + esc(o) + '</div>' : '') + help +
        (one ? '<input type="text" data-pk="' + esc(k) + '" value="' + esc(v) + '"' + (dl ? ' list="' + dl + '" placeholder="적거나 목록에서 골라요"' : '') + '>' : '<textarea data-pk="' + esc(k) + '">' + esc(v) + '</textarea>') + '</div>'; });
    return h + '</div><p class="hint" style="margin:4px 10px">단추와 목록으로 고르면 아래 글 칸이 채워져요. 글 칸을 직접 고쳐도 되고, 비우면 그 줄이 빠져요. 공격과 명중의 피해 줄은 이 꼴이어야 수치가 다시 계산돼요.</p>' +
      '<div class="trb" data-id="' + esc(e.id) + '"><button class="mini" data-tr="pedsave">저장</button>' + ((cur.ed || {})[e.id] ? '<button class="mini ghost" data-tr="peddel">원래대로</button>' : '') + '<button class="mini ghost" data-tr="cancel">그만두기</button></div></div>';
  }
  /* 성능 고치기 창의 단추 · 목록 → 글 칸 */
  (function () {
    var fld = function (form, k) { return form.querySelector('[data-pk="' + k + '"]'); };
    var build = function (bx) { var form = bx.closest('.pedform'), kind = bx.getAttribute('data-pbuild'), g = function (a, k) { var x = bx.querySelector('[data-' + a + '="' + k + '"]'); return x ? x.value : ''; };
      if (kind === 'atk') { var ab = g('a', 'ab'), md = +g('a', 'mod') || 0; fld(form, 'Attack').value = ab ? ab + (md ? ' ' + (md > 0 ? '+ ' : '- ') + Math.abs(md) : '') + ' vs. ' + g('a', 'def') : ''; }
      if (kind === 'range') { var rk = g('r', 'k'), def = PED_RANGE.filter(function (r) { return r[0] === rk; })[0]; if (!def) return; var n = g('r', 'n') || '1', m = g('r', 'm') || '10';
        fld(form, 'Attack Type').value = def[2] === 0 ? rk : def[2] === 1 ? rk + ' ' + n : rk + ' ' + n + ' within ' + m + ' squares'; } };
    document.addEventListener('change', function (ev) { var bx = ev.target.closest && ev.target.closest('.pedform [data-pbuild]'); if (bx && bx.getAttribute('data-pbuild') !== 'hit') build(bx); });
    document.addEventListener('input', function (ev) { var bx = ev.target.closest && ev.target.closest('.pedform [data-pbuild]'); if (bx && bx.getAttribute('data-pbuild') !== 'hit' && ev.target.type === 'number') build(bx); });
    document.addEventListener('click', function (ev) { var t = ev.target; if (!t.closest || !t.closest('.pedform')) return; var form = t.closest('.pedform');
      if (t.hasAttribute('data-pset')) { ev.preventDefault(); var k = t.getAttribute('data-pset'), f = fld(form, k), was = t.classList.contains('on'); t.parentNode.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('on'); });
        if (was && k !== 'Power Usage' && k !== 'Action Type') f.value = ''; else { f.value = t.getAttribute('data-v'); t.classList.add('on'); } return; }
      if (t.hasAttribute('data-ptog')) { ev.preventDefault(); var f2 = fld(form, t.getAttribute('data-ptog')), v = t.getAttribute('data-v'), list = f2.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), i = list.map(lc).indexOf(lc(v));
        if (i >= 0) list.splice(i, 1); else list.push(v); f2.value = list.join(', '); t.classList.toggle('on', i < 0); return; }
      if (t.getAttribute('data-h') === 'go') { ev.preventDefault(); var bx = t.closest('[data-pbuild]'), g = function (k) { return bx.querySelector('[data-h="' + k + '"]').value; }, die = g('die'), ab = g('ab'), ty = g('type').trim();
        var line = g('n') + die + (ab ? ' + ' + ab + ' modifier' : '') + (ty ? ' ' + ty : '') + ' damage', f3 = fld(form, 'Hit'), old = f3.value, re = /^\d+\s*(\[W\]|d\d+)[^.,\n]*?damage/i;
        f3.value = re.test(old) ? old.replace(re, line) : line + (old ? (/^[,.]/.test(old) ? '' : '. ') + old : '.'); } });
  })();
  function trBar(e) {
    var has = glossAuto || !!TR(e), isP = e.t === 'Power' && e.sp && e.sp['Power Usage'], edd = isP && calcCtx && calcCtx.ch && calcCtx.ch.ed && calcCtx.ch.ed[e.id]; if (!has && !trCtx.edit && !edd) return '';
    return '<div class="trb" data-id="' + esc(e.id) + '">' + (has ? '<span class="trtab"><button data-tr="vtr" class="' + (trOrig[e.id] ? '' : 'on') + '">번역</button><button data-tr="vor" class="' + (trOrig[e.id] ? 'on' : '') + '">원문</button></span>' : '') +
      (trCtx.edit ? '<button class="mini ghost" data-tr="edit">' + (TR(e) ? '내 번역 고치기' : '내 번역 쓰기') + '</button>' + (isP ? '<button class="mini ghost" data-tr="ped">성능 고치기</button>' : '') : '') + (edd ? '<span class="pedb" title="이 시트에서 성능을 고친 파워예요">고침</span>' : '') + '</div>';
  }
  function trFields(e) {
    var sp = e.sp || {}, out = [{ k: '_n', label: '이름', orig: e.n, one: true }], seen = {};
    if (e.fl) out.push({ k: '_fl', label: '플레이버', orig: e.fl });
    var add = function (k) { if (sp[k] == null || seen[k] || k.charAt(0) === '_' || k === '하우스룰' || /^(type|Type|Full Text|Tier|Rarity|Level|Class|Power Type|Display|Power Usage|Action Type|Magic Item Type|Gold|Weight)$/.test(k)) return; seen[k] = 1;
      out.push({ k: k, label: { 'Keywords': '키워드', 'Attack Type': '공격 유형' }[k] || gloss(k.trim()) || ROW_KO[k.trim()] || F_KO[k] || k, orig: String(sp[k]) }); };
    if (e.t === 'Power') ROW_ORDER.forEach(add);
    Object.keys(sp).forEach(function (k) { if (e.t === 'Power' || String(sp[k]).length > 30 || k === 'Short Description' || k === 'Keywords') add(k); });
    if (e.body) out.push({ k: '_body', label: '설명', orig: e.body });
    return out;
  }
  function trForm(e) {
    var t = (cur.tr || {})[e.id] || {}, h = '<div class="gc misc trform" data-id="' + esc(e.id) + '"><div class="gh"><span class="pn">' + esc(e.n) + ' · 내 번역</span><span class="pd">칸마다 적어요. 비운 칸은 용어 자동 번역으로 보여요</span></div><div class="tfs">';
    trFields(e).forEach(function (f) { var v = f.k === '_n' ? t.n : f.k === '_fl' ? t.fl : f.k === '_body' ? (t.body || t.t) : (t.f || {})[f.k], g = gsub(f.orig);
      h += '<div class="tf"><b>' + esc(f.label) + '</b><div class="to">' + esc(f.orig) + '</div>' + (g !== f.orig ? '<div class="tg">' + esc(g) + '</div>' : '') +
        (f.one ? '<input type="text" data-k="' + esc(f.k) + '" value="' + esc(v || '') + '" placeholder="번역">' : '<textarea data-k="' + esc(f.k) + '" placeholder="번역">' + esc(v || '') + '</textarea>') + '</div>'; });
    return h + '</div><div class="trb" data-id="' + esc(e.id) + '"><button class="mini" data-tr="save">저장</button><button class="mini ghost" data-tr="sub" title="내가 적은 글 속의 영어 용어를 용어집의 한국어로 바꿔요">적은 글의 용어 치환</button>' +
      (Object.keys(t).length ? '<button class="mini ghost" data-tr="del">내 번역 지우기</button>' : '') + '<button class="mini ghost" data-tr="cancel">그만두기</button></div></div>';
  }
  function ctxFor(node) { if (node.closest('#teamSheet') && teamCtx) trCtx = teamCtx; else if (!node.closest('#mDetail')) trCtx = { map: cur.tr || {}, edit: true }; }
  function redrawCard(card, e) { ctxFor(card); var open = card.tagName !== 'DETAILS' || card.open || card.classList.contains('trform'), tmp = document.createElement('div');
    tmp.innerHTML = (e.t === 'Power' && e.sp && e.sp['Power Usage']) ? powerCard(e, open) : cardHtml(e); card.replaceWith(tmp.firstChild); }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-tr]'); if (!b) return; ev.preventDefault(); ev.stopPropagation();
    var bar = b.closest('.trb'), id = bar.getAttribute('data-id'), card = bar.closest('.pc,.gc'), act = b.getAttribute('data-tr'), e = db.byId[id]; if (!e) return;
    if (act === 'vtr' || act === 'vor') { if (act === 'vor') trOrig[id] = 1; else delete trOrig[id]; redrawCard(card, e); return; }
    if (act === 'edit') { var tmp = document.createElement('div'); tmp.innerHTML = trForm(e); card.replaceWith(tmp.firstChild); return; }
    if (act === 'ped') { var tp = document.createElement('div'); tp.innerHTML = pedForm(e); card.replaceWith(tp.firstChild); return; }
    if (act === 'pedsave') { var f = {}, sp0 = e.sp || {}; card.querySelectorAll('[data-pk]').forEach(function (x) { var k = x.getAttribute('data-pk'), v = x.value.trim(), o = sp0[k] == null ? '' : String(sp0[k]).trim(); if (v !== o) f[k] = v; });
      cur.ed = cur.ed || {}; if (Object.keys(f).length) cur.ed[id] = { f: f }; else delete cur.ed[id]; saveChars(); rebuild(); toast(Object.keys(f).length ? '「' + e.n + '」 성능을 고쳤어요' : '바뀐 칸이 없어요'); return; }
    if (act === 'peddel') { if (cur.ed) delete cur.ed[id]; saveChars(); rebuild(); toast('「' + e.n + '」 을(를) 원래대로 돌렸어요'); return; }
    if (act === 'sub') { card.querySelectorAll('[data-k]').forEach(function (x) { x.value = gsub(x.value); }); return; }
    if (act === 'save') { var o = { f: {} }; card.querySelectorAll('[data-k]').forEach(function (x) { var k = x.getAttribute('data-k'), v = x.value.trim(); if (!v) return; if (k === '_n') o.n = v; else if (k === '_fl') o.fl = v; else if (k === '_body') o.body = v; else o.f[k] = v; });
      cur.tr = cur.tr || {}; if (o.n || o.fl || o.body || Object.keys(o.f).length) cur.tr[id] = o; else delete cur.tr[id]; saveChars(); delete trOrig[id]; }
    if (act === 'del') { if (cur.tr) delete cur.tr[id]; saveChars(); }
    card.classList.add('trform'); redrawCard(card, e);
  });

  /* ---------- 공격 · 피해 계산 ----------
   * 공격 = 레벨 절반 + 능력 수정치 + 숙련(무기 파워, 숙련된 무기) + 강화(마법 무기 · 도구의 +N 과 내재 보너스 중 큰 쪽) + 범위가 맞는 보정.
   * 데이터의 보정은 "weapon,heavy blade group:attack" 처럼 꼬리표가 붙은 수치라, 파워 · 무기의 꼬리표가 다 맞을 때만 더한다.
   * 조건부 보정은 넣지 않는다. 서로 다른 수치에서 온 같은 종류 보너스가 겹치는 드문 경우는 가리지 못한다. */
  var calcCtx = null, teamCalc = null;
  function plusN(e) { var m = e && /\+(\d+)\s*$/.exec(e.n); return m ? +m[1] : 0; }
  var srcName = function (id) { var e = db.byId[id]; return !e ? String(id || '') : e.t === 'Level' ? e.n + '레벨 기본 규칙' : e.n; };
  /* 한 번의 공격 계산. W = 무기(없으면 null), I = 도구, enhItem = 강화를 주는 마법 물품 */
  function calcAttack(p, ctx, W, I, enhItem, atkText, hitText) {
    var r = ctx.r, ch = ctx.ch, sp = p.sp || {}, st = r.stats, wsp = (W && W.sp) || {};
    var am = /(Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma)\s+vs\.?\s+(AC|Fortitude|Reflex|Will)/i.exec(atkText || ''); if (!am) return null;
    var kws = String(sp['Keywords'] || '').split(',').map(lc).filter(Boolean), isW = kws.indexOf('weapon') >= 0, isI = kws.indexOf('implement') >= 0;
    var tags = {}; kws.forEach(function (k) { tags[k] = 1; }); var at = lc(sp['Attack Type']).split(' ')[0]; if (at) tags[at] = 1; tags[lc(p.id)] = 1; (p.cat || []).forEach(function (c) { tags[lc(c)] = 1; });
    if (W) { tags[lc(W.id)] = 1; tags[lc(W.n)] = 1; String(wsp['Group'] || '').split(',').forEach(function (g) { g = lc(g); if (g) { tags[g + ' group'] = 1; tags[g] = 1; } }); String(wsp['Properties'] || '').split(',').forEach(function (g) { if (lc(g)) tags[lc(g)] = 1; }); if (wsp['Hands Required']) tags[lc(wsp['Hands Required'])] = 1; }
    if (I) { tags[lc(I.id)] = 1; var it = lc((I.sp || {})['Magic Item Type'] || I.n); tags[it] = 1; tags[it + ' implement'] = 1; }
    /* 꼬리표가 맞는 수치의 낱줄을 모아, 종류가 같은 보너스는 수치 이름이 달라도 가장 큰 것만 남긴다 */
    var gather = function (suffix, plain) {
      var rows = [], cond = [];
      Object.keys(r.breakdown).forEach(function (k) { var i = k.lastIndexOf(':'), ok = plain.indexOf(k) >= 0;
        if (!ok && i > 0 && k.slice(i + 1) === suffix) ok = k.slice(0, i).split(',').every(function (x) { return tags[x.trim()]; });
        if (!ok) return;
        r.breakdown[k].forEach(function (x) { if (!x.v) return; var o = { v: x.v, type: x.type || '', label: srcName(x.src), scope: i > 0 ? k.slice(0, i) : '' }; if (x.cond) { o.cond = x.cond; cond.push(o); } else if (!x.off) rows.push(o); }); });
      var best = {}; rows.forEach(function (o) { var t = lc(o.type); if (t && o.v > 0) { if (!best[t] || o.v > best[t].v) { if (best[t]) best[t].off = true; best[t] = o; } else o.off = true; } });
      return { rows: rows, cond: cond, sum: rows.reduce(function (a, o) { return a + (o.off ? 0 : o.v); }, 0) };
    };
    var mod = function (a) { return Math.floor(((st[lc(a)] || 10) - 10) / 2); }, half = st['half-level'] || 0;
    var has = function (n) { for (var k in r.owned) if (lc(r.owned[k].n) === n) return true; return false; };
    var profOk = W && (has(lc(wsp['Weapon Category'])) || has('weapon proficiency (' + lc(W.n) + ')')), prof = isW && profOk ? +(wsp['Proficiency Bonus'] || 0) : 0;
    var inh = st['inherent attack'] || 0, itemEnh = (isW || isI) ? plusN(enhItem) : 0, enh = Math.max(inh, itemEnh);
    var ga = gather('attack', ['attack rolls']), gd = gather('damage', ['damage rolls', 'damage']);
    var A = [{ v: half, label: '레벨 절반' }, { v: mod(am[1]), label: am[1].slice(0, 3).toUpperCase() + ' 수정치' }];
    if (isW && W && !profOk) A.push({ v: 0, label: '숙련 없음 (' + W.n + ')', off: true }); else if (prof) A.push({ v: prof, label: '숙련 (' + W.n + ')' });
    if (enh) A.push({ v: enh, label: '강화 · ' + (itemEnh >= inh && itemEnh ? enhItem.n : '내재 보너스'), type: 'Enhancement' });
    A = A.concat(ga.rows);
    var atk = half + mod(am[1]) + prof + enh + ga.sum;
    var hit = hitText || '', dm = /(\d+)\[W\]/.exec(hit), dice = '', mm = /\+\s*(Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma) modifier/i.exec(hit), Dp = [];
    var die = /(\d+)d(\d+)/.exec(wsp['Damage'] || '1d4') || [0, 1, 4];
    var cut = hit.search(/damage/i), head = cut >= 0 ? hit.slice(0, cut) : hit, terms = [], maxDice = 0, tk, tre = /(\d+)\[W\]|(\d+)d(\d+)/g;
    var rawTerms = [];
    while ((tk = tre.exec(head))) { var cnt = tk[1] ? +tk[1] * +die[1] : +tk[2], size = tk[1] ? +die[2] : +tk[3]; terms.push(cnt + 'd' + size); maxDice += cnt * size; rawTerms.push(tk[1] ? { w: +tk[1] } : { n: +tk[2], d: +tk[3] }); }
    dice = terms.join('+');
    if (mm) Dp.push({ v: mod(mm[1]), label: mm[1].slice(0, 3).toUpperCase() + ' 수정치' });
    if (enh) Dp.push({ v: enh, label: '강화 · ' + (itemEnh >= inh && itemEnh ? enhItem.n : '내재 보너스'), type: 'Enhancement' });
    var two = isW && W && /versatile/i.test(wsp['Properties'] || '') && !(ch.eq || {}).off; if (two) Dp.push({ v: 1, label: '양손으로 쥠 (Versatile, 보조 손이 비어 있음)' });
    Dp = Dp.concat(gd.rows);
    var dbonus = Dp.reduce(function (a, o) { return a + (o.off ? 0 : o.v); }, 0), isDmg = /damage/i.test(hit);
    var dmg = dice ? dice + (dbonus ? (dbonus > 0 ? '+' : '') + dbonus : '') : (isDmg && dbonus ? (dbonus > 0 ? '+' : '') + dbonus : '');
    /* 치명타: 주사위 최댓값 + 보정, 그리고 강화 +N 마다 추가 주사위(마법 무기에 치명타 칸이 있으면 그 글), High Crit 무기는 [W] 추가 */
    var crit = '';
    if (dice) { var mx = maxDice + dbonus, ex = [];
      if (enh) ex.push(itemEnh >= inh && enhItem && (enhItem.sp || {})['Critical'] ? (enhItem.sp['Critical']) : '+' + enh + 'd6');
      if (isW && W && /high crit/i.test(wsp['Properties'] || '')) { var n = (r.stats['level'] || 1) >= 21 ? 3 : (r.stats['level'] || 1) >= 11 ? 2 : 1; ex.push('+' + (n * +die[1]) + 'd' + die[2] + ' (High Crit)'); }
      crit = mx + (ex.length ? ' ' + ex.join(' ') : ''); }
    return { terms: rawTerms, dbonus: dbonus, isW: isW, isI: isI, enh: enh, half: half, prof: prof, die: die[1] + 'd' + die[2], dieMax: +die[1] * +die[2], atk: atk, vs: am[2], dmg: dmg, crit: crit, tool: W ? W.n : I ? I.n : (isW ? '무기 없음' : ''), A: A, D: Dp, dice: dice, condA: ga.cond, condD: gd.cond };
  }
  function attackInfo(p, ctx) {
    p = eff(p, (ctx || calcCtx || {}).ch);
    ctx = ctx || calcCtx; if (!ctx) return null; var sp = p.sp || {}, q = ctx.ch.eq || {}, kws = lc(sp['Keywords']);
    var isW = /(^|,)\s*weapon/.test(kws), isI = /(^|,)\s*implement/.test(kws), W = isW ? db.byId[q.main] : null, I = isI ? db.byId[q.impl] || null : null;
    var main = calcAttack(p, ctx, W, I, isW ? db.byId[q.mainM] : I, sp['Attack'] || sp['Primary Attack'], sp['Hit']); if (!main) return null;
    var out = { main: main }, off = db.byId[q.off];
    if (isW && off && off.t === 'Weapon') out.off = calcAttack(p, ctx, off, null, db.byId[q.offM] || null, sp['Attack'] || sp['Primary Attack'], sp['Hit']);
    if (sp['Secondary Attack']) out.sec = calcAttack(p, ctx, W, I, isW ? db.byId[q.mainM] : I, sp['Secondary Attack'], '');
    return out;
  }
  function attackDetail(p, ctx) {
    var ai = attackInfo(p, ctx); if (!ai) return '';
    var line = function (o) { return '<div class="' + (o.off ? 'off' : '') + '"><b>' + (o.v >= 0 ? '+' : '') + o.v + '</b> ' + esc(o.label) + (o.type ? ' <i>[' + esc(gloss(o.type + ' Bonus') || o.type) + ']</i>' : '') + (o.scope ? ' <small>' + esc(o.scope) + '</small>' : '') + (o.cond ? ' <small>— ' + esc(glossAuto ? gsub(o.cond) : o.cond) + '</small>' : '') + '</div>'; };
    var block = function (x, title) { var h = '<div class="padc"><strong>' + title + ' · 공격 ' + (x.atk >= 0 ? '+' : '') + x.atk + ' vs ' + esc(gloss(x.vs === 'AC' ? 'Armor Class' : x.vs) || x.vs) + '</strong>' + x.A.map(line).join('');
      if (x.dmg) h += '<strong>피해 ' + esc(x.dmg) + '</strong>' + (x.dice ? '<div><b>' + esc(x.dice) + '</b> 주사위</div>' : '') + x.D.map(line).join('') + (x.crit ? '<div><b>치명타</b> ' + esc(x.crit) + '</div>' : '');
      if (x.condA.length || x.condD.length) h += '<strong class="cnh">조건부 (위 숫자에 넣지 않음)</strong>' + x.condA.map(function (o) { o = Object.assign({}, o, { label: '공격 · ' + o.label }); return line(o); }).join('') + x.condD.map(function (o) { o = Object.assign({}, o, { label: '피해 · ' + o.label }); return line(o); }).join('');
      return h + '</div>'; };
    return block(ai.main, ai.main.tool || '공격') + (ai.off ? block(ai.off, '보조 손 · ' + ai.off.tool) : '') + (ai.sec ? block(ai.sec, '2차 공격') : '') + '<p class="hint" style="margin:4px 0 0">줄 그어진 것은 같은 종류의 더 큰 보너스에 밀려 빠진 것이에요.</p>';
  }
  document.addEventListener('click', function (ev) {
    var pa = ev.target.closest('.pa'); if (!pa) return; var card = pa.closest('.pc'), e = card && db.byId[card.getAttribute('data-pc')]; if (!e) return;
    var nx = pa.nextElementSibling; if (nx && nx.classList.contains('pad')) { nx.remove(); return; }
    var ctx = pa.closest('#teamSheet') && teamCalc ? teamCalc : (res ? { r: res, ch: cur } : calcCtx), d = document.createElement('div'); d.className = 'pad'; d.innerHTML = attackDetail(e, ctx); pa.after(d);
  });

  /* ---------- 맵툴로 내보낼 자료 ----------
   * 4판 맵툴 캠페인(속성 종류 Basic, Lib:Initiative 의 set_ability)에 맞춘 꼴.
   * 공격은 1d20 + Amod + Hit(또는 Hit2) 로 굴리므로, 제작기가 셈한 합계에서 Hit 을 뺀 값을 Amod 로 준다(합계가 정확히 같아짐). */
  var MT_SKILL = { 'Acrobatics': ['곡예', 'Dex', 1], 'Arcana': ['비전학', 'Int', 0], 'Athletics': ['운동', 'Str', 1], 'Bluff': ['속임수', 'Cha', 0], 'Diplomacy': ['교섭', 'Cha', 0], 'Dungeoneering': ['던전학', 'Wis', 0],
    'Endurance': ['인내', 'Con', 1], 'Heal': ['치료', 'Wis', 0], 'History': ['역사학', 'Int', 0], 'Insight': ['통찰', 'Wis', 0], 'Intimidate': ['위협', 'Cha', 0], 'Nature': ['자연학', 'Wis', 0], 'Perception': ['지각', 'Wis', 0],
    'Religion': ['종교학', 'Int', 0], 'Stealth': ['은밀', 'Dex', 1], 'Streetwise': ['길거리 지식', 'Cha', 0], 'Thievery': ['도둑기술', 'Dex', 1] };
  var MT_ACT = { 'standard action': '일반', 'move action': '이동', 'minor action': '간략', 'immediate reaction': '즉각 반응', 'immediate interrupt': '즉각 개입', 'opportunity action': '기회 행동', 'free action': '자유 행동', 'no action': '-' };
  function mtData() {
    var ch = cur, r = res, st = r.stats, q = ch.eq || {}, ctx = { r: r, ch: ch }, T = ch.tr || {};
    var mod = function (a) { return Math.floor(((st[lc(a)] || 10) - 10) / 2); }, half = st['half-level'] || 0, hp = st['hit points'] || 0, inh = st['inherent attack'] || 0;
    var W = db.byId[q.main], Wm = db.byId[q.mainM], I = db.byId[q.impl], O = db.byId[q.off], Om = db.byId[q.offM];
    var has = function (n) { for (var k in r.owned) if (lc(r.owned[k].n) === n) return true; return false; };
    var wset = function (w, m) { var wsp = (w && w.sp) || {}, die = /(\d+)d(\d+)/.exec(wsp['Damage'] || '1d4') || [0, 1, 4], enh = Math.max(inh, plusN(m));
      var prof = w && (has(lc(wsp['Weapon Category'])) || has('weapon proficiency (' + lc(w.n) + ')')) ? +(wsp['Proficiency Bonus'] || 0) : 0;
      return { hit: half + prof + enh, W: die[1] + 'd' + die[2], WMax: +die[1] * +die[2], Dmg: enh, Crit: enh ? enh + 'd6' : '0' }; };
    var s1 = wset(W, Wm), s2 = I ? { hit: half + Math.max(inh, plusN(I)), W: '1d4', WMax: 4, Dmg: Math.max(inh, plusN(I)), Crit: Math.max(inh, plusN(I)) ? Math.max(inh, plusN(I)) + 'd6' : '0' } : (O && O.t === 'Weapon' ? wset(O, Om) : { hit: half + inh, W: '1d4', WMax: 4, Dmg: inh, Crit: inh ? inh + 'd6' : '0' });
    /* 캠페인 매크로는 Hit 과 Hit2 를 값으로 견주므로, 둘이 같으면 공격 줄이 두 번 찍힌다. 같을 때는 Hit2 를 1 낮추고 그만큼 능력 쪽 보정에 얹는다 */
    if (s2.hit === s1.hit) s2.hit -= 1;
    var P = { Level: ch.level, MaxHP: hp, HP: hp, Temp_HP: 0, AC: st['ac'] || 0, MaxAC: st['ac'] || 0, Fort: st['fortitude defense'] || 0, MaxFort: st['fortitude defense'] || 0, Reflex: st['reflex defense'] || 0, MaxReflex: st['reflex defense'] || 0,
      Will: st['will defense'] || 0, MaxWill: st['will defense'] || 0, DisplayNAD: (st['fortitude defense'] || 0) + '/' + (st['reflex defense'] || 0) + '/' + (st['will defense'] || 0), Mov: st['speed'] || 0, IniBonus: st['initiative'] || 0,
      HealingSurgeValue: Math.floor(hp / 4) + (st['healing surge value'] || 0), HealingSurge: st['healing surges'] || 0, MaxSurge: st['healing surges'] || 0, AP: 1, Save: st['saving throws'] || 0,
      hit: s1.hit, W: s1.W, WMax: s1.WMax, Dmg: s1.Dmg, CritRoll: s1.Crit, Hit2: s2.hit, W2: s2.W, WMax2: s2.WMax, Dmg2: s2.Dmg, CritRoll2: s2.Crit,
      PInsight: 10 + (st['insight'] || 0), PPerception: 10 + (st['perception'] || 0), ArmorCheckPenalty: st['armor penalty'] || 0 };
    E.ABILITIES.forEach(function (a) { P[a.slice(0, 3).toUpperCase()] = st[lc(a)] || 10; P[lc(a.slice(0, 3)) + 'mod'] = mod(a); });
    /* 글: 내 번역이 있으면 그것, 없으면 용어 자동 번역(켜져 있을 때), 아니면 원문. 매크로에서 [ ] { } 는 식으로 읽히므로 바꿔 둔다 */
    var safe = function (x) { return String(x || '').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/\r?\n/g, '<br>'); };
    var txt = function (p) { var t = T[p.id], f = (t && t.f) || {}, sp = p.sp || {}; for (var i = 1; i < arguments.length; i++) { var k = arguments[i]; if (f[k] || sp[k]) return safe(f[k] || (glossAuto ? gsub(sp[k]) : sp[k])); } return ''; };
    var skills = (db.byType['Skill'] || []).slice().sort(function (a, b) { return a.n < b.n ? -1 : 1; }).map(function (sk, i) { var m = MT_SKILL[sk.n] || [sk.n, 'Dex', 0], total = st[lc(sk.n)] || 0, tr = (st[lc(sk.n + ' trained')] || 0) > 0;
      return { name: m[0], abil: m[1], acp: m[2], trained: tr ? 1 : 0, total: total, misc: total - (mod({ Str: 'Strength', Con: 'Constitution', Dex: 'Dexterity', Int: 'Intelligence', Wis: 'Wisdom', Cha: 'Charisma' }[m[1]]) + half + (tr ? 5 : 0) + (m[2] ? P.ArmorCheckPenalty : 0)), sort: i + 1 }; });
    var powers = [];
    ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && p.n !== 'Second Wind'; }).forEach(function (p) {
      p = eff(p, ch); var sp = p.sp, u = usageClass(p), t = T[p.id] || {}, ai = attackInfo(p, ctx), m = ai && ai.main;
      var usage = u === 'day' ? '#404040' : u === 'enc' ? '#704040' : (lc(sp['Power Usage']).indexOf('daily') >= 0 ? '#404040' : lc(sp['Power Usage']).indexOf('encounter') >= 0 ? '#704040' : '#407040');
      var a = { group: '', pname: (t.n || p.n).replace(/["';]/g, ''), pkind: safe(sp['Display'] || ''), usage: usage, keyword: safe(t.f && t.f['Keywords'] || (glossAuto ? gsub(sp['Keywords'] || '') : sp['Keywords'] || '')), action: MT_ACT[lc(sp['Action Type'])] || '-',
        range: txt(p, 'Attack Type'), Trigger: txt(p, 'Trigger'), Target: txt(p, 'Target', 'Targets', 'Primary Target') || '-', Effect: txt(p, 'Effect'), Special: [txt(p, 'Special'), txt(p, 'Requirement', 'Requirements') ? '요구 조건: ' + txt(p, 'Requirement', 'Requirements') : '', sp['하우스룰'] ? '하우스룰: ' + safe(sp['하우스룰']) : ''].filter(Boolean).join('<br>'), A_Memo: '', submit: '' };
      if (!m) { powers.push({ nonatk: 1, args: a }); return; }
      var set = m.isW ? ['Hit', P.hit] : ['Hit2', P.Hit2], first = m.terms[0], rest = m.terms.slice(1), dmgStr = '', adm = [];
      if (first && first.w && first.w <= 9) dmgStr = first.w + (m.isW ? 'W' : 'W2'); else if (first && !first.w && first.n <= 9) dmgStr = first.n + 'd' + first.d; else if (first) rest = m.terms;
      rest.forEach(function (x) { adm.push(x.w ? (x.w * +m.die.split('d')[0]) + 'd' + m.die.split('d')[1] : x.n + 'd' + x.d); }); if (m.dbonus || !adm.length) adm.push(String(m.dbonus));
      a.AHit = set[0]; a.Attack = { AC: 'AC', Fortitude: 'Fort', Reflex: 'Ref', Will: 'Will' }[m.vs] || 'AC'; a.Amod = String(m.atk - set[1]); a.Damage = dmgStr; a.Dmod = 'None'; a.ADM = adm.join('+').replace(/\+-/g, '-');
      a.Description = txt(p, 'Hit'); a.Miss = txt(p, 'Miss');
      powers.push({ nonatk: 0, args: a });
    });
    return { name: ch.name || '이름 없음', port: ch.port || '', props: P, skills: skills, powers: powers };
  }

  /* ---------- 파워 카드 ---------- */
  var USE_KO = { 'at-will': '무제한', 'encounter': '조우', 'daily': '일일' };
  var ACT_KO = { 'standard action': '표준 행동', 'move action': '이동 행동', 'minor action': '보조 행동', 'free action': '자유 행동', 'immediate interrupt': '즉시 방해',
    'immediate reaction': '즉시 반응', 'opportunity action': '기회 행동', 'no action': '행동 없음' };
  var ROW_KO = { 'Trigger': '발동 조건', 'Requirement': '요구 조건', 'Prerequisite': '선행 조건', 'Target': '대상', 'Primary Target': '1차 대상', 'Secondary Target': '2차 대상',
    'Attack': '공격', 'Primary Attack': '1차 공격', 'Secondary Attack': '2차 공격', 'Hit': '명중', 'Miss': '빗나감', 'Effect': '효과', 'Special': '특수', 'Sustain': '유지',
    'Sustain Minor': '유지 (보조)', 'Sustain Standard': '유지 (표준)', 'Sustain Move': '유지 (이동)', 'Augment': '증강', 'Aftereffect': '후속 효과', 'Level': '레벨' };
  var ROW_ORDER = ['Trigger', 'Requirement', 'Prerequisite', 'Target', 'Primary Target', 'Attack', 'Primary Attack', 'Hit', 'Miss', 'Effect', 'Secondary Target', 'Secondary Attack', 'Aftereffect', 'Sustain', 'Sustain Minor', 'Sustain Move', 'Sustain Standard', 'Special'];
  var PC_SKIP = { 'Power Usage': 1, 'Display': 1, 'Keywords': 1, 'Action Type': 1, 'Attack Type': 1, 'Power Type': 1, 'Class': 1, 'Level': 1, 'type': 1, 'Full Text': 1 };
  /* 주사위 · [W] · 방어 이름을 굵게 */
  var rich = function (t) { return esc(t).replace(/(\d+d\d+|\d+\[W\]|\b(?:AC|Fortitude|Reflex|Will)\b)/g, '<b>$1</b>').replace(/\n\s*/g, '<br>'); };
  function usageKo(p) { var u = lc(p.sp && p.sp['Power Usage']); for (var k in USE_KO) if (u.indexOf(k) >= 0) return USE_KO[k] + (u.replace(k, '').trim() ? ' ' + (p.sp['Power Usage'].replace(new RegExp(k, 'i'), '').trim()) : ''); return (p.sp && p.sp['Power Usage']) || ''; }
  function powerCard(p, open) {
    p = eff(p, calcCtx && calcCtx.ch);
    var sp = p.sp || {}, cls = usageClass(p), act = sp['Action Type'] || '', rows = [], seen = {};
    var add = function (k) { if (sp[k] == null || seen[k] || PC_SKIP[k] || k.charAt(0) === '_') return; seen[k] = 1; rows.push('<div class="pr' + (k === '하우스룰' ? ' hr' : '') + '"><b>' + esc(k === '하우스룰' ? k : gloss(k.trim()) || ROW_KO[k.trim()] || k) + '</b><span>' + (k === '하우스룰' ? rich(sp[k]) : tx(p, k, sp[k])) + '</span></div>'); };
    add('하우스룰'); ROW_ORDER.forEach(add); Object.keys(sp).forEach(add);
    if (calcCtx && calcCtx.r.mods) calcCtx.r.mods.forEach(function (m) { if (m.name !== p.n || (m.type && m.type !== 'Power') || !String(m.value).trim() || /^[\d.+-]+$/.test(String(m.value).trim())) return;
      var se = db.byId[m.src]; rows.push('<div class="pr md"><b>' + esc(se ? se.n : m.field) + '</b><span>' + (tv && glossAuto ? rich(gsub(m.value)) : rich(m.value)) + '</span></div>'); });
    var tv = tview(p), sub = function (x) { return tv && glossAuto ? gsub(x) : x; };
    var h = '<details class="pc ' + cls + '"' + (open ? ' open' : '') + ' data-pc="' + esc(p.id) + '"><summary><span class="pn">' + tname(p) + '</span>' + (function () { var a0 = attackInfo(p), m0 = a0 && a0.main; return m0 ? '<span class="ps">' + (m0.atk >= 0 ? '+' : '') + m0.atk + (m0.dmg ? ' · ' + esc(m0.dmg) : '') + '</span>' : ''; })() + '<span class="pd">' + esc(sp['Display'] || '') + '</span></summary>';
    h += '<div class="pm"><span><i class="dot"></i>' + esc(usageKo(p)) + (sp['Keywords'] ? ' ✦ ' + (tv && TR(p) && (TR(p).f || {})['Keywords'] ? esc(TR(p).f['Keywords']) : esc(sub(sp['Keywords']))) : '') + '</span><span>' + esc(gloss(act) || ACT_KO[lc(act)] || act) + (sp['Attack Type'] ? ' · ' + (tv && TR(p) && (TR(p).f || {})['Attack Type'] ? esc(TR(p).f['Attack Type']) : esc(sub(sp['Attack Type']))) : '') + '</span></div>';
    var aiA = attackInfo(p), ai = aiA && aiA.main; if (ai) h += '<div class="pa" title="누르면 보정 내역"><span>공격 <b>' + (ai.atk >= 0 ? '+' : '') + ai.atk + '</b> vs ' + esc(gloss(ai.vs === 'AC' ? 'Armor Class' : ai.vs) || ai.vs) + '</span>' + (ai.dmg ? '<span>피해 <b>' + esc(ai.dmg) + '</b></span>' : '') + (ai.crit ? '<span class="cr">치명타 ' + esc(ai.crit) + '</span>' : '') + (aiA.off ? '<span class="cr">보조 손 ' + (aiA.off.atk >= 0 ? '+' : '') + aiA.off.atk + ' · ' + esc(aiA.off.dmg) + '</span>' : '') + (ai.tool ? '<small>' + esc(ai.tool) + ' ▾</small>' : '<small>▾</small>') + '</div>';
    h += '<div class="pb">' + (p.fl ? '<p class="pfl">' + (tv && TR(p) && TR(p).fl ? esc(TR(p).fl) : esc(p.fl)) + '</p>' : '') + rows.join('') + (p.body && !rows.length ? '<div class="pr"><span>' + tx(p, '_body', p.body) + '</span></div>' : '') +
      (p.src ? '<p class="psrc">' + esc(p.src.join(', ')) + '</p>' : '') + '</div>' + trBar(p) + '</details>';
    return h;
  }

  /* ---------- 시트 ---------- */
  function usageClass(p) { var u = lc(p.sp && p.sp['Power Usage']); var isU = /utility/i.test((p.sp && p.sp['Display']) || ''); return isU ? 'util' : u.indexOf('daily') >= 0 ? 'day' : u.indexOf('encounter') >= 0 ? 'enc' : 'at'; }
  /* 클래스 특성 · 종족 특성 · 숙련. 내 캐릭터에서는 만들기 칸의 고르기 아래에, 팀 시트에서는 시트 안에 나온다. */
  function extraHtml(ch, r) {
    var block = function (type) { return ownedOf(r, type).filter(function (e) { return e.body || (e.sp && Object.keys(e.sp).length); }).map(function (e) {
      return '<details class="ft cfd"><summary>' + esc(tview(e) && TR(e) && TR(e).n ? TR(e).n : nm(e)) + (e.sp && e.sp['하우스룰'] ? ' <span class="badge">하우스룰</span>' : '') + (e.sp && e.sp['Short Description'] ? ' <span class="hint">' + esc(glossAuto ? gsub(e.sp['Short Description']) : e.sp['Short Description']) + '</span>' : '') + '</summary>' + cardHtml(e) + '</details>'; }).join(''); };
    var cf = block('Class Feature'), rt = block('Racial Trait'), pf = ownedOf(r, 'Proficiency').filter(function (e) { return e.n !== 'Choose Nothing'; });
    /* 홈브류 특성: PC 마다 다르므로 시트에서 바로 적는다(ch.hbx). GM 이 만든 공용 홈브류(ch.hb)도 같은 칸에 섞여 나온다 */
    var mine = ch === cur, shared = (ch.hb || []).map(function (id) { return db.byId[id]; }).filter(Boolean), items = [];
    shared.forEach(function (e) { var inf = hbInfo(e); items.push({ id: e.id, n: (tview(e) && TR(e) && TR(e).n) || e.n, cat: inf.cat, step: inf.step, short: (e.sp && e.sp['Short Description']) || '', html: cardHtml(e), shared: 1 }); });
    (ch.hbx || []).forEach(function (x) { items.push({ id: x.id, n: x.n, cat: x.cat || '', step: x.step || '', short: '', html: '<div class="hx-body">' + esc(x.text || '').replace(/\n/g, '<br>') + '</div>', own: 1 }); });
    var cats = {}, order = []; items.forEach(function (it) { var c = it.cat || '그 밖'; if (!cats[c]) { cats[c] = []; order.push(c); } cats[c].push(it); });
    order.sort(function (a, b) { var x = HB_ORDER.indexOf(a), y = HB_ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || (a < b ? -1 : 1); });
    var hxForm = function (x) { x = x || { id: '', n: '', cat: '', step: '', text: '' };
      return '<div class="hxform" data-hxid="' + esc(x.id) + '"><div class="hx-r"><input type="text" data-hx="n" placeholder="이름" value="' + esc(x.n) + '"><input type="text" data-hx="step" placeholder="단계" value="' + esc(x.step) + '" title="예: 1, 2, 1-2"></div>' +
        '<div class="hx-r kwbox">' + HB_ORDER.map(function (c) { return '<button type="button" class="opt' + (x.cat === c ? ' on' : '') + '" data-hxcat="' + c + '">' + c + '</button>'; }).join('') + '<input type="text" data-hx="cat" placeholder="분류" value="' + esc(x.cat) + '"></div>' +
        '<textarea data-hx="text" placeholder="내용 (효과를 그대로 적어요)">' + esc(x.text) + '</textarea><div class="hx-r"><button class="mini" data-hxsave="1">저장</button>' + (x.id ? '<button class="mini ghost" data-hxdel="' + esc(x.id) + '">지우기</button>' : '') + '<button class="mini ghost" data-hxcancel="1">그만두기</button></div></div>'; };
    var hb = order.map(function (c) { return (order.length > 1 || c !== '그 밖' ? '<div class="hbcat">' + esc(c) + '</div>' : '') + cats[c].sort(function (a, b) { return a.step.localeCompare(b.step, 'ko', { numeric: true }) || (a.n < b.n ? -1 : 1); }).map(function (it) {
      if (mine && it.own && hbEditing === it.id) return hxForm((ch.hbx || []).filter(function (x) { return x.id === it.id; })[0]);
      return '<details class="ft cfd hbd"><summary>' + (it.step ? '<i class="hbs">' + esc(it.step) + '</i>' : '') + esc(it.n) + (it.shared ? ' <span class="badge hbb">공용</span>' : '') + (it.short ? ' <span class="hint">' + esc(it.short) + '</span>' : '') +
        (mine ? '<span class="hb-a">' + (it.own ? '<button class="mini ghost" data-hxedit="' + esc(it.id) + '">고치기</button>' : '<button class="mini ghost" data-hbdel="' + esc(it.id) + '" title="이 캐릭터에서 빼기">×</button>') + '</span>' : '') + '</summary>' + it.html + '</details>'; }).join(''); }).join('');
    var hasShared = mine && D4EHouse.custom(db).length > 0;
    var hbSec = (hb || mine) ? sec('hb', '홈브류 특성 <span class="hint">' + items.length + '</span>', (hb || (mine && hbEditing !== 'new' ? '<p class="hint">이 캐릭터만의 능력을 여기에 적어요.</p>' : '')) +
      (mine ? (hbEditing === 'new' ? hxForm() : '<div class="hb-bar"><button class="mini" data-hxadd="1">+ 추가</button>' + (hasShared ? '<button class="mini ghost" data-hbadd="1">공용에서 고르기</button>' : '') + '</div>') : '')) : '';
    return (cf ? sec('cf', '클래스 특성 <span class="hint">누르면 내용 · 번역 / 원문 탭</span>', cf) : '') + (rt ? sec('rt', '종족 특성', rt) : '') + hbSec +
      (pf.length ? sec('prof', '숙련 <span class="hint">' + pf.length + '</span>', '<div class="tags">' + pf.map(function (e) { return '<span data-el="' + esc(e.id) + '">' + esc(glossAuto ? gsub(e.n) : e.n) + '</span>'; }).join('') + '</div>', false) : '');
  }
  function sheetHtml(ch, r, who) {
    trCtx = { map: ch.tr || {}, edit: ch === cur }; calcCtx = { r: r, ch: ch };
    var s = r.stats, hp = s['hit points'] || 0, half = Math.floor(ch.level / 2);
    var race = ownedOf(r, 'Race')[0], cls = ownedOf(r, 'Class')[0];
    var st = function (k, label) { return '<div data-why="' + esc(k) + '"><small>' + label + '</small><b>' + (s[k] || 0) + '</b></div>'; };
    var h = '<div class="shead">' + (ch.port ? '<img class="port" src="' + esc(ch.port) + '" alt="">' : '') + '<div class="sh2"><h2>' + esc(ch.name || '이름 없음') + ' <span class="hint">' + esc(race ? nm(race) : '종족 미정') + ' ' + esc(cls ? nm(cls) : '클래스 미정') + ' · ' + ch.level + '레벨' + (who ? ' · ' + esc(who) : '') + '</span></h2>';
    var hsv = Math.floor(hp / 4) + (s['healing surge value'] || 0);
    h += '<div class="hpbar" data-why="hit points" title="눌러서 HP 내역 보기"><div class="hpfill"></div><div class="hpmid"></div><span class="hpl"><small>HP</small><b>' + hp + '</b></span><span class="hpb"><small>반죽음</small><b>' + Math.floor(hp / 2) + '</b></span></div>';
    h += '<div class="vrow"><div class="surge"><span class="sgt">원기 <small>Healing Surge</small></span><span data-why="healing surge value"><small>회복량</small><b>' + hsv + '</b></span><span data-why="healing surges"><small>횟수</small><b>' + (s['healing surges'] || 0) + '<i>회</i></b></span></div>' +
      '<div class="vit mv">' + (race ? st('speed', '이동 속도') : '<div title="이동 속도는 종족에서 와요. 종족을 고르면 채워져요"><small>이동 속도</small><b>—</b></div>') + st('initiative', '우선권') + '</div></div>';
    h += '<div class="vit def">' + st('ac', 'AC') + st('fortitude defense', 'Fort') + st('reflex defense', 'Ref') + st('will defense', 'Will') + '</div></div></div>';
    if (s['inherent attack'] || s['inherent defense']) h += '<p class="inh">내재 보너스 · 공격 굴림과 피해 굴림 +' + (s['inherent attack'] || 0) + ' (치명타 +' + (s['inherent attack'] || 0) + 'd6) · 방어 +' + (s['inherent defense'] || 0) + ' <span class="hint">강화 보너스라 마법 장비의 강화와는 큰 쪽만 적용돼요</span></p>';
    h += '<div class="why" id="why" hidden></div>';
    var ab = '<table class="tbl"><tr><th></th><th class="n">값</th><th class="n">수정치</th><th class="n">+½레벨</th></tr>';
    E.ABILITIES.forEach(function (a) { var v = s[lc(a)] || 10, m = Math.floor((v - 10) / 2);
      ab += '<tr data-why="' + lc(a) + '"><td><b>' + a.slice(0, 3).toUpperCase() + '</b> <span class="hint">' + AB_KO[a] + '</span></td><td class="n">' + v + '</td><td class="n">' + (m >= 0 ? '+' : '') + m + '</td><td class="n">' + (m + half >= 0 ? '+' : '') + (m + half) + '</td></tr>'; });
    ab += '</table>';
    var skl = '<div class="skills">';
    (db.byType['Skill'] || []).slice().sort(function (a, b) { return a.n < b.n ? -1 : 1; }).forEach(function (sk) {
      var v = s[lc(sk.n)] || 0, tr = (s[lc(sk.n + ' trained')] || 0) > 0;
      var kn = koName('Skill', sk.n);
      skl += '<div class="skl' + (tr ? ' tr' : '') + '" data-why="' + esc(lc(sk.n)) + '"><span>' + esc(kn || sk.n) + (kn ? ' <small>' + esc(sk.n) + '</small>' : '') + '</span><b>' + (v >= 0 ? '+' : '') + v + '</b></div>'; });
    skl += '</div>';
    var strip = '<div class="abstrip">' + E.ABILITIES.map(function (a) { var v = s[lc(a)] || 10, m = Math.floor((v - 10) / 2);
      return '<div data-why="' + lc(a) + '" title="' + AB_KO[a] + ' · 레벨 절반 더하면 ' + (m + half >= 0 ? '+' : '') + (m + half) + '"><small>' + a.slice(0, 3).toUpperCase() + '</small><b>' + v + '</b><i>' + (m >= 0 ? '+' : '') + m + '</i></div>'; }).join('') + '</div>';
    h += strip + sec('skill', '기술 <span class="hint">● 숙련</span>', skl);
    if (who) h += extraHtml(ch, r);
    var pws = ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage']; }).map(function (p) { return eff(p, ch); }), pb = '';
    [['at', '무제한'], ['enc', '조우'], ['day', '일일'], ['util', '활용']].forEach(function (g) {
      var list = pws.filter(function (p) { return usageClass(p) === g[0]; }).sort(function (a, b) { return a.n < b.n ? -1 : 1; });
      if (!list.length) return;
      pb += sec('pw_' + g[0], '<span class="pgh ' + g[0] + '"><i></i>' + g[1] + '</span> <span class="hint">' + list.length + '</span>', '<div class="pcards">' + list.map(function (p) { return powerCard(p, false); }).join('') + '</div>');
    });
    h += sec('power', '파워 <span class="hint">' + pws.length + '개 · 이름을 누르면 펼쳐져요</span> <button class="mini ghost" data-pcall="1">모두 펼치기 / 접기</button>', pb || '<p class="hint">아직 없어요.</p>');
    if (ch === cur || (r.worn && r.worn.length)) h += sec('gear', '장비 <span class="hint">' + (r.worn || []).length + (ch === cur ? ' · 줄을 누르면 고르거나 바꿀 수 있어요' : '') + '</span>', gearHtml(ch, r));
    var feats = ownedOf(r, 'Feat'), mine = ch === cur, fsel = {}, fopen = [];
    (r.selects || []).forEach(function (x) { if (x.type !== 'Feat' || x.swap) return; (x.picked || []).forEach(function (id) { fsel[id] = x; }); if ((x.picked || []).length < x.number && !x.optional) fopen.push(x); });
    var fwhere = function (x) { var se = db.byId[x.from]; return !se ? '' : se.t === 'Level' ? se.n + '레벨' : nm(se); };
    if (feats.length || (mine && fopen.length)) h += sec('feat', '재주 <span class="hint">' + feats.length + (mine ? ' · 「바꾸기」로 여기서 바로 고쳐요' : '') + '</span>', '<div class="ftiles">' + feats.map(function (e) { var t = (ch.tr || {})[e.id], d = (e.sp && e.sp['Short Description']) || '', x = fsel[e.id];
      return '<div class="ftile" data-el="' + esc(e.id) + '"><b>' + esc((t && t.n) || nm(e)) + (prereq(e, r, ch.level) === 'no' ? PRE_BADGE.no : '') + '</b>' + (d ? '<small>' + esc(glossAuto ? gsub(d) : d) + '</small>' : '') +
        (mine && x ? '<span class="ft-a"><i>' + esc(fwhere(x)) + '</i><button class="mini ghost" data-fsel="' + esc(x.key) + '">바꾸기</button><button class="mini ghost" data-fdel="' + esc(x.key) + '" data-fid="' + esc(e.id) + '" title="빼기">×</button></span>' : '') + '</div>'; }).join('') +
      (mine ? fopen.map(function (x) { return '<div class="ftile todo" data-fsel="' + esc(x.key) + '"><b>+ 재주 고르기</b><small>' + esc(fwhere(x)) + ' · 비어 있어요</small></div>'; }).join('') : '') + '</div>');
    var langs = ownedOf(r, 'Language');
    if (langs.length) h += sec('lang', '언어 <span class="hint">' + langs.length + '</span>', '<div class="ltags">' + langs.map(function (e) { return '<span data-el="' + esc(e.id) + '">' + esc(nm(e)) + '</span>'; }).join('') + '</div>');
    /* 그 밖의 보정: 계산은 됐지만 위에 자리가 없는 값들 + 조건부 보정 */
    var OTH = { 'saving throws': '내성 굴림', 'death saving throws': '죽음 내성 굴림', 'attack rolls': '공격 굴림', 'damage rolls': '피해 굴림', 'damage': '피해', 'inherent attack': '내재 공격 · 피해', 'action points': '액션 포인트' }, oth = '', cond = '';
    Object.keys(s).sort().forEach(function (k) { if (!s[k]) return; var lab = OTH[k], m;
      if (!lab && (m = /^resist:(.+)$/.exec(k))) lab = '저항 ' + (gloss(m[1]) || m[1]);
      if (!lab && (m = /^(.+):(attack|damage)$/.exec(k))) lab = (m[2] === 'attack' ? '공격' : '피해') + ' (' + m[1].split(',').map(function (x) { x = x.trim(); var e2 = db.byId[x.toUpperCase()]; return e2 ? e2.n : gloss(x.replace(/ group$/, '')) || x; }).join(' · ') + ')';
      if (lab) oth += '<div data-why="' + esc(k) + '"><small>' + esc(lab) + '</small><b>' + (s[k] > 0 ? '+' : '') + s[k] + '</b></div>'; });
    Object.keys(r.breakdown).forEach(function (k) { r.breakdown[k].forEach(function (x) { if (!x.cond || !x.v) return; var se = db.byId[x.src]; cond += '<div class="cnd"><b>' + (x.v > 0 ? '+' : '') + x.v + '</b> ' + esc(gloss(k) || k) + ' <span>' + esc(glossAuto ? gsub(x.cond) : x.cond) + '</span><small>' + esc(se ? se.n : '') + '</small></div>'; }); });
    var txt = ''; (r.worn || []).forEach(function (e) { if (e.t !== 'Magic Item') return; var sp2 = e.sp || {}, parts = [];
      ['Enhancement', 'Property', 'Critical', 'Special'].forEach(function (k) { if (sp2[k] && (!e.r || k !== 'Enhancement')) parts.push('<i>' + esc(F_KO[k] || k) + '</i> ' + esc(glossAuto ? gsub(sp2[k]) : sp2[k])); });
      if (parts.length) txt += '<div class="cnd" data-el="' + esc(e.id) + '" style="cursor:pointer"><b>' + esc(e.n) + '</b> ' + (e.r ? '' : '<span class="badge unk">계산 안 됨</span> ') + '<span>' + parts.join(' · ') + '</span></div>'; });
    if (txt) cond += '<p class="hint" style="margin:8px 0 4px">물품의 글로 된 효과 (직접 확인하세요. 무기 · 도구의 +N 강화는 공격과 피해에 들어가 있어요)</p>' + txt;
    if (oth || cond) h += sec('other', '그 밖의 보정', (oth ? '<div class="vit oth">' + oth + '</div>' : '') + (cond ? '<p class="hint" style="margin:8px 0 4px">조건부 보정 (위 수치에는 들어가지 않아요)</p>' + cond : ''), false);
    if (r.warnings.length) h += '<p class="hint">확인 필요: ' + esc(r.warnings.slice(0, 5).join(' / ')) + '</p>';
    return h;
  }
  function wireSheet(box, r) {
    box.onclick = function (ev) {
      if (ev.target.closest('[data-whyx]')) { box.querySelector('#why').hidden = true; return; }
      if (ev.target.closest('[data-pcall]')) { ev.preventDefault(); var all = box.querySelectorAll('details.pc'), any = false; all.forEach(function (d) { if (!d.open) any = true; }); all.forEach(function (d) { d.open = any; }); return; }
      var fs = ev.target.closest('[data-fsel]'), fd = ev.target.closest('[data-fdel]');
      if (fd) { var fk = fd.getAttribute('data-fdel'), fi = fd.getAttribute('data-fid'); cur.choices[fk] = (cur.choices[fk] || []).filter(function (x) { return x !== fi; }); saveChars(); rebuild(); return; }
      if (fs) { var sx = (res.selects || []).filter(function (x) { return x.key === fs.getAttribute('data-fsel'); })[0]; if (sx) openPicker(sx); return; }
      var ga = ev.target.closest('[data-gadd]'), gk = ev.target.closest('[data-gkey]'), gs = ev.target.closest('[data-gslot]');
      if (ga) { gearPick(ga.getAttribute('data-gadd')); return; }
      if (gs && !ev.target.closest('.gt-n,.gt-base')) { gearPick(GROW[gs.getAttribute('data-gslot')]); return; }
      if (gk && !gs && !ev.target.closest('.gt-n,.gt-base')) { var kk = gk.getAttribute('data-gkey'); if (kk === 'other') { var oe = gk.querySelector('[data-el]'), oid = oe && oe.getAttribute('data-el'); if (oid && confirm('이 물품을 뺄까요?')) { cur.eq.other = (cur.eq.other || []).filter(function (x) { return x !== oid; }); syncEquip(); rebuild(); } } else gearPick(kk); return; }
      var w = ev.target.closest('[data-why]'), e = ev.target.closest('[data-el]');
      if (e) { openDetail(db.byId[e.getAttribute('data-el')]); return; }
      if (!w) return;
      var k = w.getAttribute('data-why'), rows = r.breakdown[k] || [], why = box.querySelector('#why');
      if (!why.hidden && why.getAttribute('data-k') === k) { why.hidden = true; return; }
      why.hidden = false; why.setAttribute('data-k', k);
      why.innerHTML = '<button class="mini ghost wx" data-whyx="1">닫기</button><b>' + esc(k) + ' = ' + (r.stats[k] || 0) + '</b><br>' + rows.map(function (x) {
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
    $('sheet').innerHTML = sheetHtml(cur, res); wireSheet($('sheet'), res);
    $('featBox').innerHTML = extraHtml(cur, res); $('featBox').onclick = function (ev) { var hx = ev.target.closest('[data-hxadd],[data-hxedit],[data-hxsave],[data-hxdel],[data-hxcancel],[data-hxcat]');
      if (hx) { ev.preventDefault(); var redraw = function () { $('featBox').innerHTML = extraHtml(cur, res); var d0 = $('featBox').querySelector('[data-sec=hb]'); if (d0) d0.open = true; };
        if (hx.hasAttribute('data-hxcat')) { var fm = hx.closest('.hxform'), ci = fm.querySelector('[data-hx=cat]'), on = hx.classList.contains('on'); fm.querySelectorAll('[data-hxcat]').forEach(function (b) { b.classList.remove('on'); }); ci.value = on ? '' : hx.getAttribute('data-hxcat'); hx.classList.toggle('on', !on); return; }
        if (hx.hasAttribute('data-hxadd')) { hbEditing = 'new'; redraw(); var ni = $('featBox').querySelector('.hxform [data-hx=n]'); if (ni) ni.focus(); return; }
        if (hx.hasAttribute('data-hxedit')) { hbEditing = hx.getAttribute('data-hxedit'); redraw(); return; }
        if (hx.hasAttribute('data-hxcancel')) { hbEditing = ''; redraw(); return; }
        cur.hbx = cur.hbx || [];
        if (hx.hasAttribute('data-hxdel')) { var did = hx.getAttribute('data-hxdel'); if (!confirm('이 홈브류 특성을 지울까요?')) return; cur.hbx = cur.hbx.filter(function (x) { return x.id !== did; }); }
        else { var f2 = hx.closest('.hxform'), g = function (k) { return f2.querySelector('[data-hx=' + k + ']').value.trim(); }, nmv = g('n'); if (!nmv) { toast('이름을 적어 주세요', true); return; }
          var xid = f2.getAttribute('data-hxid'), ex = cur.hbx.filter(function (x) { return x.id === xid; })[0]; if (!ex) { ex = { id: 'hx' + Date.now().toString(36) }; cur.hbx.push(ex); }
          ex.n = nmv; ex.cat = g('cat'); ex.step = g('step'); ex.text = f2.querySelector('[data-hx=text]').value.trim(); }
        hbEditing = ''; saveChars(); redraw(); return; }
      var t = ev.target.closest('[data-hbadd],[data-hbnew],[data-hbedit],[data-hbdel]');
      if (t) { ev.preventDefault(); if (t.hasAttribute('data-hbadd')) { buildTab = 'hb'; localStorage.setItem('d4e_btab', buildTab); var bp = document.querySelector('[data-sec=b_pick]'); if (bp) bp.open = true; renderSelects(); $('selects').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        else if (t.hasAttribute('data-hbnew')) D4EHouse.newEl('Homebrew Feature'); else if (t.hasAttribute('data-hbedit')) D4EHouse.editEl(t.getAttribute('data-hbedit'));
        else { var hid = t.getAttribute('data-hbdel'); cur.hb = (cur.hb || []).filter(function (x) { return x !== hid; }); saveChars(); rebuild(); } return; }
      var e = ev.target.closest('[data-el]'); if (e && !ev.target.closest('[data-tr]')) openDetail(db.byId[e.getAttribute('data-el')]); };
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
      l.innerHTML = '<span class="an"><b>' + a.slice(0, 3).toUpperCase() + '</b> <span class="hint">' + AB_KO[a] + '</span></span>';
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
      box.appendChild(l);
    });
  }
  /* 세팅 기능용 요소: 내재 보너스, 기술 특화(배경 대체). 팀 하우스룰이라 코드에서 만든다. */
  function ensureBuiltins() {
    if (db.byId['ID_HOUSE_INHERENT']) return;
    var r = []; [2, 7, 12, 17, 22, 27].forEach(function (L) { r.push(['statadd', { name: 'Inherent Attack', value: '+1', requires: L + ' level' }]); });
    [4, 9, 14, 19, 24, 29].forEach(function (L) { r.push(['statadd', { name: 'Inherent Defense', value: '+1', requires: L + ' level' }]); });
    ['AC', 'Fortitude Defense', 'Reflex Defense', 'Will Defense'].forEach(function (d) { r.push(['statadd', { name: d, value: '+Inherent Defense', type: 'Enhancement' }]); });
    var add = [{ id: 'ID_HOUSE_INHERENT', n: '내재 보너스', t: 'Internal', src: ['하우스룰'], r: r, body: '2/7/12/17/22/27레벨에 공격 · 피해 굴림 +1 강화 보너스, 4/9/14/19/24/29레벨에 모든 방어 +1 강화 보너스.' },
      { id: 'ID_HOUSE_SPEC', n: '기술 특화', t: 'Internal', src: ['하우스룰'], r: [['select', { type: 'Skill Specialization', name: '배경 대신', number: '1' }]] }];
    (db.byType['Skill'] || []).forEach(function (sk) {
      var key = sk.n.toUpperCase().replace(/[^A-Z]/g, '_'), ko = koName('Skill', sk.n) || sk.n, tr = ['statadd', { name: sk.n + ' Trained', value: '+5', type: 'trained' }];
      add.push({ id: 'ID_HOUSE_SPEC_' + key + '_BONUS', n: ko + ' 특화 · 판정 +3', t: 'Skill Specialization', src: ['하우스룰'], sp: { 'Short Description': sk.n + ' 훈련 + 판정 +3' }, r: [tr, ['statadd', { name: sk.n, value: '+3' }]], body: '이 기술에 훈련되고, 이 기술 판정에 +3 보너스를 받는다.' });
      add.push({ id: 'ID_HOUSE_SPEC_' + key + '_ABIL', n: ko + ' 특화 · 가장 높은 능력치', t: 'Skill Specialization', src: ['하우스룰'], sp: { 'Short Description': sk.n + ' 훈련 + 가장 높은 능력치 사용' },
        r: [tr].concat(E.ABILITIES.map(function (a) { return ['statadd', { name: sk.n, value: '+ABILITYMOD(' + a + ')', type: 'Ability' }]; })), body: '이 기술에 훈련되고, 이 기술의 능력치 대신 자신의 가장 높은 능력치를 쓴다.' });
    });
    db.add(add);
  }
  var setNow = {}, banRules = [];
  function parseBans(text) {
    return String(text || '').split(/\n/).map(function (line) { var c = {}; line.split(';').forEach(function (p) { var i = p.indexOf('='); if (i > 0) c[p.slice(0, i).trim()] = p.slice(i + 1).trim().split('|').map(lc); }); return c; }).filter(function (c) { return Object.keys(c).length; });
  }
  function banned(e) {
    for (var i = 0; i < banRules.length; i++) { var c = banRules[i], ok = true;
      if (c['종류'] && c['종류'].indexOf(lc(e.t)) < 0) ok = false;
      if (ok && c['이름'] && !c['이름'].some(function (v) { return v.indexOf('*') >= 0 ? lc(e.n).indexOf(v.replace(/\*/g, '')) >= 0 : lc(e.n) === v; })) ok = false;
      if (ok && c['출처'] && !c['출처'].some(function (v) { return (e.src || []).some(function (x) { return lc(x).indexOf(v) >= 0; }); })) ok = false;
      if (ok && c['조건'] && !c['조건'].some(function (v) { return lc(e.pre).indexOf(v) >= 0; })) ok = false;
      if (ok && c['물품'] && !c['물품'].some(function (v) { return lc((e.sp || {})['Magic Item Type']).indexOf(v) >= 0; })) ok = false;
      if (ok) return true; }
    return false;
  }
  function useSet() {
    ensureBuiltins();
    var ids = D4EHouse.setIds(); if (!cur.set || !D4EHouse.sets()[cur.set]) cur.set = (localStorage.getItem('d4e_set') && D4EHouse.sets()[localStorage.getItem('d4e_set')]) ? localStorage.getItem('d4e_set') : ids[0];
    var st = setNow = D4EHouse.setOf(cur.set); campaign.points = st.points != null ? +st.points : 22; D4EHouse.apply(db, cur.set); banRules = parseBans(st.bans);
    cur.grants = [].concat(st.inherent ? ['ID_HOUSE_INHERENT'] : [], st.spec ? ['ID_HOUSE_SPEC'] : []);
    if (!cur.setInit) { cur.setInit = cur.set; if (st.level > cur.level) cur.level = st.level; $('chLevel').value = cur.level; }
    var sel = $('chSet'); sel.innerHTML = ''; ids.forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = D4EHouse.sets()[id].name; if (id === cur.set) o.selected = true; sel.appendChild(o); });
    teamOptions($('chTeam'), cur.team || '', true);
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
      if ((setNow.hide || []).indexOf(s.type) >= 0 && !s.picked.length) return;
      var need = !s.optional && s.picked.length < s.number; if (need) todo++;
      if (hide && s.optional && !s.picked.length) return;
      for (var g = 0; g < SEL_GROUPS.length; g++) if (SEL_GROUPS[g][1].test(s.type)) { groups[g].push([s, need]); break; }
    });
    var tabs = [];
    groups.forEach(function (list, g) { if (list.length) tabs.push({ key: 'g' + g, label: SEL_GROUPS[g][0], list: list, left: list.filter(function (x) { return x[1]; }).length }); });
    tabs.push({ key: 'eq', label: '장비', left: 0, n: (cur.equip || []).length });
    var hbEvery = D4EHouse.custom(db), hbAll = isGM() ? hbEvery : hbEvery.filter(function (e) { return hbFor(e, cur.name) || (cur.hb || []).indexOf(e.id) >= 0; }); cur.hb = (cur.hb || []).filter(function (id) { return db.byId[id]; });
    if (hbEvery.length || cur.hb.length) tabs.push({ key: 'hb', label: '홈브류', left: 0, n: cur.hb.length });
    if (!tabs.some(function (t) { return t.key === buildTab; })) buildTab = tabs[0].key;
    var bar = document.createElement('div'); bar.className = 'btabs';
    tabs.forEach(function (t) { var b = document.createElement('button'); b.className = t.key === buildTab ? 'on' : ''; b.setAttribute('data-btab', t.label);
      b.innerHTML = esc(t.label) + (t.left ? '<i>' + t.left + '</i>' : '') + ((t.key === 'eq' || t.key === 'hb') && t.n ? '<em>' + t.n + '</em>' : '');
      b.onclick = function () { buildTab = t.key; localStorage.setItem('d4e_btab', buildTab); renderSelects(); }; bar.appendChild(b); });
    box.appendChild(bar); $('equip').hidden = buildTab !== 'eq';
    if (buildTab === 'hb') { var hbx = document.createElement('div'); hbx.className = 'hbpick'; var gmNow = isGM();
      hbx.innerHTML = '<p class="hint">GM 이 하우스룰 탭에서 새로 만든 능력이에요. 눌러서 이 캐릭터에 넣거나 빼요. 수치 보정이나 파워가 딸려 있으면 시트에 바로 반영돼요.</p>' +
        (hbAll.length ? hbGroups(hbAll).map(function (g) { return '<div class="hbcat">' + esc(g[0]) + ' <span class="hint">' + g[1].length + '</span></div><div class="hbgrid">' + g[1].map(function (e) { var on = cur.hb.indexOf(e.id) >= 0, d = (e.sp && (e.sp['Short Description'] || e.sp['Benefit'] || e.sp['Effect'])) || e.body || '', inf = hbInfo(e), other = inf.who.length && !hbFor(e, cur.name);
          return '<div class="hbt' + (on ? ' on' : '') + (other ? ' oth' : '') + '" data-hbt="' + esc(e.id) + '"><div class="hbt-h"><b>' + hbStep(e) + esc(e.n) + '</b><span class="badge hbb">' + esc(typeKo(e.t)) + '</span></div>' + (inf.who.length ? '<div class="hbw">' + esc(inf.who.join(', ')) + ' 전용' + (other ? ' · 이 캐릭터 것이 아니에요' : '') + '</div>' : '') + '<small>' + esc(String(d).slice(0, 140)) + '</small><div class="hbt-a"><span>' + (on ? '✔ 넣었어요' : '눌러서 넣기') + '</span><button class="mini ghost" data-hbsee="' + esc(e.id) + '">내용</button>' + (gmNow ? '<button class="mini ghost" data-hbedit="' + esc(e.id) + '">고치기</button>' : '') + '</div></div>'; }).join('') + '</div>'; }).join('')
          : '<p class="hint">이 세팅에는 아직 만든 홈브류가 없어요.' + (gmNow ? '' : ' GM 이 만들면 여기에 나와요.') + '</p>') +
        (gmNow ? '<div class="hb-bar"><button class="mini" data-hbnew="Homebrew Feature">+ 새 홈브류 특성 (GM)</button><button class="mini ghost" data-hbnew="Power">+ 새 홈브류 파워 (GM)</button></div>' : '');
      hbx.onclick = function (ev) { var see = ev.target.closest('[data-hbsee]'), ed2 = ev.target.closest('[data-hbedit]'), nw = ev.target.closest('[data-hbnew]'), tl = ev.target.closest('[data-hbt]');
        if (see) { openDetail(db.byId[see.getAttribute('data-hbsee')]); return; } if (ed2) { D4EHouse.editEl(ed2.getAttribute('data-hbedit')); return; } if (nw) { D4EHouse.newEl(nw.getAttribute('data-hbnew')); return; }
        if (tl) { var id = tl.getAttribute('data-hbt'), i = cur.hb.indexOf(id); if (i >= 0) cur.hb.splice(i, 1); else cur.hb.push(id); saveChars(); rebuild(); } };
      box.appendChild(hbx); }
    tabs.forEach(function (t) {
      if (t.key !== buildTab || !t.list) return;
      var list = t.list, grid = document.createElement('div'); grid.className = 'sgrid'; box.appendChild(grid);
      list.forEach(function (x) {
        var s = x[0], need = x[1], d = document.createElement('div'); d.className = 'sel tile' + (need ? ' todo' : '') + (s.picked.length ? ' has' : '');
        var small = null;
        /* 후보가 적거나(9개 이하), 이름만 있는 단순한 것(기술 · 언어 등 40개 이하)은 창 없이 타일 안에 다 띄워 바로 고른다. */
        if (!/^(Feat|Power|Background|Theme|Paragon Path|Epic Destiny|Race|Class|Deity|Skill Specialization)$/.test(s.type)) {
          small = E.options(db, s, res.vars).filter(function (e) { return !/Unselectable|Not Selectable/i.test(e.pre || '') && !banned(e); });
          var plain = /^(Skill Training|Language)$/.test(s.type) || small.every(function (e) { return !e.body && !e.fl && !Object.keys(e.sp || {}).length; });
          if (!small.length || small.length > (plain ? 40 : 9)) small = null;
        }
        if (s.type === 'Power') { var m = /encounter|daily|utility|at-will/i.exec((s.name || '') + ' ' + (s.category || '')); d.className += ' pwt ' + ({ encounter: 'enc', daily: 'day', utility: 'util', 'at-will': 'at' }[m ? lc(m[0]) : 'at']); }
        var from = db.byId[s.from], lab = document.createElement('div'); lab.className = 'lab';
        lab.innerHTML = '<strong>' + esc(selLabel(s)) + '</strong>' + (s.number > 1 ? ' <span class="hint">' + s.picked.length + ' / ' + s.number + '</span>' : '') + (s.optional ? ' <span class="hint">선택 사항</span>' : '') +
          '<small>' + esc(from ? (from.t === 'Level' ? from.n + '레벨' : /^(Level1Rules|Internal)$/.test(from.t) ? '1레벨' : nm(from)) : '') + '</small>';
        var chips = document.createElement('div'); chips.className = 'chips';
        if (small) {
          d.className += ' inline' + (small.length > 9 ? ' wide' : ''); d.style.cursor = 'default';
          small.forEach(function (e) { var on = s.picked.indexOf(e.id) >= 0 || s.picked.indexOf(e.n) >= 0, o = document.createElement('button'); var got = !on && !!res.owned[e.id]; o.className = 'opt' + (on ? ' on' : '') + (got ? ' got' : ''); o.textContent = koName(e.t, e.n) || e.n; o.title = e.n + (got ? ' (이미 가지고 있어요)' : ''); o.disabled = got;
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
        if (s.swap && s.picked.length) {
          var use = /encounter|daily|utility/i.exec(s.category || ''), uw = use ? lc(use[0]) : '', cand = [];
          res.selects.forEach(function (o) { if (o.type !== 'Power' || o.key === s.key || !new RegExp(uw, 'i').test((o.category || '') + ' ' + (o.name || ''))) return; o.picked.forEach(function (id) { var e = db.get(id, 'Power'); if (e && cand.indexOf(e) < 0) cand.push(e); }); });
          var os = document.createElement('select'); os.className = 'mini swp'; os.innerHTML = '<option value="">대신 뺄 파워를 고르세요</option>' + cand.map(function (e) { return '<option value="' + esc(e.id) + '"' + (s.out[0] === e.id ? ' selected' : '') + '>' + esc(e.n) + ' 빼기</option>'; }).join('');
          os.onclick = function (ev) { ev.stopPropagation(); }; os.onchange = function () { cur.choices[s.key + ':out'] = os.value ? [os.value] : []; rebuild(); }; chips.appendChild(os);
          if (!s.out.length) { d.className += ' todo'; }
        }
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
    ['offM', '보조 손 마법', function (e) { return e.t === 'Magic Item' && mit(e) === 'Weapon'; }],
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
  /* 시트의 장비 칸: 자리별 카드. 갑옷 · 무기는 본체와 마법을 한 장에 묶는다 */
  var GEAR_KIND = { body: ['armor', '갑옷'], main: ['weapon', '주 무기'], off: ['shield', '방패 · 보조 손'], impl: ['impl', '도구'], head: ['slot', '머리'], neck: ['slot', '목'], arms: ['slot', '팔'], hands: ['slot', '손'], waist: ['slot', '허리'], feet: ['slot', '발'], ring1: ['slot', '반지'], ring2: ['slot', '반지'] };
  function gearHtml(ch, r) {
    var q = ch.eq || {}, used = {}, tiles = [], T = ch.tr || {}, name = function (e) { return (T[e.id] && T[e.id].n) || e.n; };
    var chips = function (e) { var sp = e.sp || {}, a = [];
      if (e.t === 'Weapon') { if (sp['Damage']) a.push(['피해', sp['Damage']]); if (sp['Proficiency Bonus']) a.push(['숙련', '+' + sp['Proficiency Bonus']]); if (sp['Range']) a.push(['사거리', sp['Range']]); if (sp['Group']) a.push(['', gsub(sp['Group'])]); if (sp['Properties']) a.push(['', gsub(sp['Properties'])]); }
      else if (e.t === 'Armor') { if (sp['Armor Bonus']) a.push(['방어', '+' + sp['Armor Bonus']]); else if (sp['Shield Bonus']) a.push(['방어', '+' + sp['Shield Bonus']]); if (sp['Check'] && sp['Check'] !== '0' && sp['Check'] !== '-') a.push(['판정', sp['Check']]); if (sp['Speed'] && sp['Speed'] !== '0' && sp['Speed'] !== '-') a.push(['이동', sp['Speed']]); }
      else { if (sp['Enhancement']) a.push(['', glossAuto ? gsub(sp['Enhancement']) : sp['Enhancement']]); if (sp['Critical']) a.push(['치명타', sp['Critical']]); }
      return a; };
    var skey = '', tile = function (kind, slot, base, magic) { var top = magic || base, lv = magic && magic.sp && magic.sp['Level'], plus = magic ? plusN(magic) : 0, cs = (base ? chips(base) : []).concat(magic && magic !== base ? chips(magic) : []);
      if (!cs.length && base && !magic) { var l = eqLine(base); if (l) cs.push(['', l]); }
      tiles.push('<div class="gtile ' + kind + (magic ? ' magic' : '') + '"' + (ch === cur && skey ? ' data-gkey="' + skey + '"' : '') + '><div class="gt-h"><span class="gt-slot">' + slot + '</span>' + (lv ? '<span class="gt-lv">' + esc(lv) + '레벨</span>' : '') + '</div>' +
        '<div class="gt-n" data-el="' + esc(top.id) + '">' + (plus ? '<i class="gt-plus">+' + plus + '</i>' : '') + '<b>' + esc(name(top)) + '</b></div>' +
        (magic && base && magic !== base ? '<div class="gt-base" data-el="' + esc(base.id) + '">' + esc(name(base)) + '</div>' : '') +
        '<div class="gt-c">' + cs.map(function (c) { return '<span>' + (c[0] ? '<small>' + c[0] + '</small> ' : '') + esc(c[1]) + '</span>'; }).join('') + '</div></div>'); };
    /* 무기 · 갑옷 · 목이 중심 자리: 한 줄씩 먼저, 그 아래에 나머지와 소지금 */
    var st = D4EHouse.setOf(ch.set || '') || {}, min = +st.minEnh || 0, E_ = function (k) { return db.byId[q[k]]; }, take = function (kind, slot, bk, mk) { var b = E_(bk), m = mk && E_(mk); skey = bk + (mk ? ',' + mk : ''); if (!b && !m) return 0; if (b) used[b.id] = 1; if (m) used[m.id] = 1; if (b && b.t === 'Magic Item' && !m) { m = b; b = null; } tile(kind, slot, b, m); return m ? plusN(m) : 0; };
    var row = function (label, kind, fill) { var n0 = tiles.length, plus = fill(), mine = tiles.splice(n0), has = mine.length > 0, ok = !min || plus >= min;
      return '<div class="gmain ' + kind + (has ? '' : ' empty') + '"' + (ch === cur ? ' data-gslot="' + label + '" title="눌러서 고르기 · 바꾸기"' : '') + '><div class="gm-l"><b>' + label + '</b>' + (has && plus ? '<i>+' + plus + '</i>' : '') + '</div><div class="gm-c">' + (has ? mine.join('') : '<span class="gm-none">비어 있음</span>') + '</div>' +
        (min ? '<div class="gm-s ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓ +' + min + ' 이상' : '+' + min + ' 이상 필요') + '</div>' : '') + '</div>'; };
    var mains = row('무기', 'weapon', function () { var a = take('weapon', '주 무기', 'main', 'mainM'), b = take('impl', '도구', 'impl'); return Math.max(a, b); }) +
      row('갑옷', 'armor', function () { return take('armor', '갑옷', 'body', 'bodyM'); }) + row('목', 'slot', function () { return take('slot', '목', 'neck'); });
    [['off', 'offM'], ['head'], ['arms'], ['hands'], ['waist'], ['feet'], ['ring1'], ['ring2']].forEach(function (pr) { var k = GEAR_KIND[pr[0]], e = E_(pr[0]); if (pr[0] === 'off' && e && e.t === 'Weapon') k = ['weapon', '보조 손']; take(k[0], k[1], pr[0], pr[1]); });
    skey = 'other'; (r.worn || []).forEach(function (e) { if (!used[e.id]) tile('etc', '소지품', e.t === 'Magic Item' ? null : e, e.t === 'Magic Item' ? e : null); });
    var gold = '';
    if (st.gold) { var spent = 0; (r.worn || []).forEach(function (e) { if (e.t === 'Magic Item') spent += +((e.sp || {})['Gold'] || 0); });
      gold = '<div class="ggold' + (spent > st.gold ? ' bad' : '') + '"><span><small>소지금</small><b>' + (st.gold - spent).toLocaleString() + '</b> gp</span><span class="gg-bar"><i style="width:' + Math.min(100, Math.round(spent / st.gold * 100)) + '%"></i></span><span class="hint">' + Number(st.gold).toLocaleString() + ' 중 ' + spent.toLocaleString() + ' 사용</span></div>'; }
    var addBar = ch === cur ? '<div class="gadd"><button class="mini ghost" data-gadd="off,offM">방패 · 보조 손</button><button class="mini ghost" data-gadd="head">머리</button><button class="mini ghost" data-gadd="arms">팔</button><button class="mini ghost" data-gadd="hands">손</button><button class="mini ghost" data-gadd="waist">허리</button><button class="mini ghost" data-gadd="feet">발</button><button class="mini ghost" data-gadd="ring1">반지 1</button><button class="mini ghost" data-gadd="ring2">반지 2</button><button class="mini" data-gadd="other">+ 그 밖의 물품</button></div>' : '';
    return '<div class="gmains">' + mains + '</div>' + (tiles.length ? '<div class="gtiles">' + tiles.join('') + '</div>' : '') + addBar + gold;
  }
  /* 시트의 장비 칸에서 바로 고르기: keys = 'body,bodyM' 처럼 그 줄에 딸린 자리들 */
  function gearPick(keys) {
    var q = cur.eq = cur.eq || {}, byKey = {}; EQ_SLOTS.forEach(function (sl) { byKey[sl[0]] = sl; });
    if (keys === 'other') { openSearch('그 밖의 물품 더하기', function (x) { return [{ label: '더하기', fn: function () { (q.other = q.other || []).push(x.id); syncEquip(); rebuild(); } }]; },
      eqList(function (e) { return e.t === 'Gear' || (e.t === 'Magic Item' && !slotOf(e) && !/^(Armor|Weapon)$/.test(mit(e)) && !IMPL.test(mit(e))); })); return; }
    var ks = keys.split(','), one = function (k) { var sl = byKey[k]; openSearch(sl[1] + ' 고르기', function (x) { return [{ label: '이걸로 차기', fn: function () { q[k] = x.id; syncEquip(); rebuild(); } }]; }, eqList(sl[2])); };
    if (ks.length === 1 && !q[ks[0]]) { one(ks[0]); return; }
    /* 자리가 여럿이거나 이미 찬 자리: 무엇을 할지 먼저 묻는다 */
    var box = $('gpick'); if (!box) { box = document.createElement('div'); box.id = 'gpick'; box.className = 'mtbox'; document.body.appendChild(box); }
    box.innerHTML = '<div class="mtin" style="max-width:420px"><button class="mtx" data-g="x">×</button><h3>장비 고르기</h3><div class="gpl">' + ks.map(function (k) { var e = db.byId[q[k]];
      return '<div><small>' + byKey[k][1] + '</small><b>' + (e ? esc(e.n) : '<span class="hint">비어 있음</span>') + '</b><span><button class="mini" data-g="p:' + k + '">' + (e ? '바꾸기' : '고르기') + '</button>' + (e ? '<button class="mini ghost" data-g="d:' + k + '">빼기</button>' : '') + '</span></div>'; }).join('') + '</div></div>';
    box.style.display = 'flex'; box.onclick = function (ev) { var g = ev.target.getAttribute && ev.target.getAttribute('data-g'); if (ev.target === box || g === 'x') { box.style.display = 'none'; return; } if (!g) return;
      box.style.display = 'none'; if (g.charAt(0) === 'p') one(g.slice(2)); else { delete q[g.slice(2)]; syncEquip(); rebuild(); } };
  }
  var GROW = { '무기': 'main,mainM,impl', '갑옷': 'body,bodyM', '목': 'neck' };
  function syncEquip() { var q = cur.eq || {}, ids = []; EQ_SLOTS.forEach(function (sl) { if (q[sl[0]]) ids.push(q[sl[0]]); }); (q.other || []).forEach(function (id) { ids.push(id); }); cur.equip = ids; }
  var FIGURE = '<svg viewBox="0 0 120 260" class="fig" aria-hidden="true"><g fill="currentColor" opacity=".16"><circle cx="60" cy="26" r="18"/><rect x="52" y="42" width="16" height="12" rx="4"/>' +
    '<path d="M30 56h60a10 10 0 0 1 10 10v8H20v-8a10 10 0 0 1 10-10z"/><rect x="34" y="70" width="52" height="66" rx="8"/><rect x="14" y="68" width="16" height="78" rx="8"/><rect x="90" y="68" width="16" height="78" rx="8"/>' +
    '<circle cx="22" cy="154" r="9"/><circle cx="98" cy="154" r="9"/><rect x="36" y="132" width="48" height="16" rx="6"/><rect x="36" y="146" width="21" height="92" rx="9"/><rect x="63" y="146" width="21" height="92" rx="9"/>' +
    '<rect x="30" y="236" width="28" height="14" rx="6"/><rect x="62" y="236" width="28" height="14" rx="6"/></g></svg>';
  var EQ_SIDE = { L: ['head', 'neck', 'body', 'bodyM', 'arms', 'hands', 'waist', 'feet'], R: ['main', 'mainM', 'off', 'offM', 'impl', 'ring1', 'ring2'] };
  function renderEquip() {
    var box = $('equip'); if (!box) return; box.innerHTML = ''; var q = cur.eq = cur.eq || {};
    if (setNow.gold) {
      var spent = 0, low = []; (cur.equip || []).forEach(function (id) { var e = db.byId[id]; if (e && e.t === 'Magic Item') spent += +((e.sp || {})['Gold'] || 0); });
      [['bodyM', '갑옷'], ['mainM', '주 무기'], ['neck', '목']].forEach(function (k) { var e = db.byId[q[k[0]]], m = e && /\+(\d+)\s*$/.exec(e.n); if (e && setNow.minEnh && m && +m[1] < setNow.minEnh) low.push(k[1]); });
      var g = document.createElement('div'); g.className = 'gold' + (spent > setNow.gold ? ' bad' : '');
      g.innerHTML = '골드 ' + Number(setNow.gold).toLocaleString() + ' 중 <b>' + spent.toLocaleString() + '</b> 사용 · ' + (setNow.gold - spent).toLocaleString() + ' 남음 <span class="hint">마법 물품만 셈 · 비마법 장비는 무료</span>' +
        (low.length ? '<br><span class="hint bad">' + low.join(' · ') + ': +' + setNow.minEnh + ' 이상이어야 해요</span>' : '');
      box.appendChild(g);
    }
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
  function eqList(pred) { var out = []; ['Armor', 'Weapon', 'Gear', 'Superior Implement', 'Magic Item'].forEach(function (t) { (db.byType[t] || []).forEach(function (e) { if (pred(e) && !banned(e)) out.push(e); }); });
    out.sort(function (a, b) { var la = +((a.sp || {})['Level'] || 0), lb = +((b.sp || {})['Level'] || 0); var ga = +((a.sp || {})['Gold'] || 0), gb = +((b.sp || {})['Gold'] || 0); return la - lb || ga - gb || (a.n < b.n ? -1 : 1); }); return out; }

  /* ---------- 고르기 창 ---------- */
  /* 클래스 · 종족 · 패러곤 경로 등: 수치와 주는 것(특성 · 파워)을 먼저, 설정 글은 접어서 뒤에. */
  var MECH = {
    'Class': ['Role', 'Power Source', 'Key Abilities', 'Hit Points at 1st Level', 'Hit Points per Level Gained', 'Healing Surges', 'Bonus to Defense', 'Armor Proficiencies', 'Weapon Proficiencies', 'Implements', 'Trained Skills', 'Class Skills', 'Build Options'],
    'Race': ['Ability Scores', 'Size', 'Speed', 'Vision', 'Languages', 'Skill Bonuses']
  };
  MECH['Hybrid Class'] = MECH['Class'];
  var MECH_KO = { 'Role': '역할', 'Power Source': '파워 원천', 'Key Abilities': '주요 능력치', 'Hit Points at 1st Level': '1레벨 HP', 'Hit Points per Level Gained': '레벨당 HP', 'Healing Surges': '원기 횟수',
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
      [['at', '1레벨 무제한 파워'], ['enc', '1레벨 조우 파워'], ['day', '1레벨 일일 파워']].forEach(function (u) {
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
    var tv = tview(e);
    var h = '<div class="gc ' + cls + '"><div class="gh"><span class="pn">' + tname(e, nm(e)) + '</span><span class="pd">' + esc(right) + '</span></div>';
    if (sp['Short Description']) h += '<div class="gm">' + tx(e, 'Short Description', sp['Short Description']) + '</div>';
    var chips = '', rows = '', skip = { 'Tier': 1, 'Rarity': 1, 'Short Description': 1, 'Level': isItem, 'Magic Item Type': 1, 'type': 1, 'Type': 1, 'Full Text': 1, 'Associated Power Info': 1, 'Associated Powers': 1, 'Container': 1 };
    Object.keys(sp).forEach(function (k) {
      var v = String(sp[k]).trim(); if (!v || v === '-' || skip[k] || k.charAt(0) === '_') return;
      v = idNames(v); if (k === 'Gold') v = Number(v).toLocaleString() + ' gp'; if (k === 'Weight') v = v + ' lb'; if (k === 'Proficiency Bonus' || k === 'Armor Bonus') v = '+' + v.replace(/^\+/, '');
      if (v.length <= 30 && v.indexOf('\n') < 0) chips += '<div><small>' + esc(F_KO[k] || k) + '</small><span>' + esc(v) + '</span></div>';
      else rows += '<div class="pr' + (k === '하우스룰' ? ' hr' : '') + '"><b>' + esc(F_KO[k] || gloss(k) || k) + '</b><span>' + (k === '하우스룰' ? rich(v) : tx(e, k, v)) + '</span></div>';
    });
    var pre = readablePre(e);
    if (pre) rows = '<div class="pr pre ' + (preState || '') + '"><b>선행 조건</b><span>' + esc(pre) + (preState ? ' ' + PRE_BADGE[preState] : '') + '</span></div>' + rows;
    if (chips) h += '<div class="gs">' + chips + '</div>';
    h += '<div class="pb">' + (e.fl ? '<p class="pfl">' + (tv && TR(e) && TR(e).fl ? esc(TR(e).fl) : esc(e.fl)) + '</p>' : '') + rows + (e.body ? '<div class="pr"><span>' + tx(e, '_body', e.body) + '</span></div>' : '') + (e.src ? '<p class="psrc">' + esc(e.src.join(', ')) + '</p>' : '') + '</div>' + trBar(e) + '</div>';
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
  /* ---------- 고르기 창의 걸러 보기 ----------
   * 후보의 종류에 맞는 것만 몇 개 둔다. 재주: 티어 · 분류 · 출처 / 파워: 키워드 · 행동 유형 · 출처 /
   * 물품: 레벨대 · 희귀도 · 종류 · 출처 · (세팅에 골드가 있으면) 남은 골드로 살 수 있는 것만. */
  function buildFilters(all, onChange) {
    var box = $('mFilter'); box.innerHTML = ''; if (!all || all.length < 8) return function () { return true; };
    var t0 = all[0].t, isItem = /^(Magic Item|Armor|Weapon|Gear|Superior Implement)$/.test(t0), F = [], st = {};
    var sp = function (e, k) { return (e.sp || {})[k] || ''; };
    var band = function (e) { var L = +sp(e, 'Level') || 0; return !L ? '레벨 없음' : (Math.floor((L - 1) / 5) * 5 + 1) + '~' + (Math.floor((L - 1) / 5) * 5 + 5); };
    if (t0 === 'Feat') { F.push(['tier', '티어', 'chips', function (e) { return TIER_KO[lc(sp(e, 'Tier'))] || sp(e, 'Tier') || '기타'; }, ['영웅', '패러곤', '에픽']]); F.push(['ftype', '분류', 'select', function (e) { return sp(e, 'type') || sp(e, 'Type') || '일반'; }]); }
    if (t0 === 'Power') { F.push(['kw', '키워드', 'select', function (e) { return String(sp(e, 'Keywords')).split(',').map(function (x) { return x.trim(); }).filter(Boolean); }, null, function (v) { return gloss(v) ? gloss(v) + ' ' + v : v; }]);
      F.push(['act', '행동', 'select', function (e) { return sp(e, 'Action Type') || '—'; }, null, function (v) { return gloss(v) || ACT_KO[lc(v)] || v; }]); }
    if (isItem) { F.push(['lv', '레벨', 'chips', band]); F.push(['rar', '희귀도', 'chips', function (e) { return RAR_KO[lc(sp(e, 'Rarity'))] || (e.t === 'Magic Item' ? '일반' : '평범'); }, ['평범', '일반', '비범', '희귀']]);
      F.push(['kind', '종류', 'select', function (e) { return e.t === 'Magic Item' ? sp(e, 'Magic Item Type') || sp(e, 'Item Slot') || '기타' : e.t === 'Armor' ? sp(e, 'Armor Category') || 'Armor' : e.t === 'Weapon' ? String(sp(e, 'Group')).split(',')[0].trim() || 'Weapon' : e.t; }]); }
    if (t0 === 'Class' || t0 === 'Hybrid Class') { F.push(['role', '역할', 'chips', function (e) { return String(sp(e, 'Role')).split('.')[0] || '—'; }, null, function (v) { return koName('Role', v) || v; }]); F.push(['psrc', '파워 원천', 'chips', function (e) { return String(sp(e, 'Power Source')).split('.')[0] || '—'; }, null, function (v) { return gloss(v) || v; }]); }
    if (all.length > 20) F.push(['src', '출처', 'select', function (e) { return (e.src || ['?'])[0]; }]);
    var gold = isItem && setNow.gold ? { on: false } : null;
    var vals = function (f, e) { var v = f[3](e); return Array.isArray(v) ? v : [v]; };
    var num = function (x) { var m = /\d+/.exec(x); return m ? +m[0] : 999; };
    F.forEach(function (f) {
      var c = {}; all.forEach(function (e) { vals(f, e).forEach(function (v) { c[v] = (c[v] || 0) + 1; }); });
      var keys = Object.keys(c); if (keys.length < 2) return;
      keys.sort(function (a, b) { if (f[4]) { var ia = f[4].indexOf(a), ib = f[4].indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); } return f[0] === 'lv' ? num(a) - num(b) : f[2] === 'select' ? (c[b] - c[a] || (a < b ? -1 : 1)) : (a < b ? -1 : 1); });
      var lab = f[5] || function (v) { return v; }, row = document.createElement('span'); row.className = 'fg'; row.innerHTML = '<small>' + f[1] + '</small>';
      if (f[2] === 'chips' && keys.length <= 8) { st[f[0]] = {}; keys.forEach(function (k) { var b = document.createElement('button'); b.className = 'opt'; b.textContent = lab(k); b.title = c[k] + '개';
          b.onclick = function () { if (st[f[0]][k]) delete st[f[0]][k]; else st[f[0]][k] = 1; b.classList.toggle('on'); onChange(); }; row.appendChild(b); }); }
      else { var sel = document.createElement('select'); sel.innerHTML = '<option value="">전체</option>' + keys.slice(0, 120).map(function (k) { return '<option value="' + esc(k) + '">' + esc(lab(k)) + ' (' + c[k] + ')</option>'; }).join('');
        sel.onchange = function () { st[f[0]] = sel.value ? (function () { var o = {}; o[sel.value] = 1; return o; })() : {}; onChange(); }; st[f[0]] = {}; row.appendChild(sel); }
      box.appendChild(row);
    });
    if (gold) { var spent = 0; (cur.equip || []).forEach(function (id) { var e = db.byId[id]; if (e && e.t === 'Magic Item') spent += +((e.sp || {})['Gold'] || 0); }); var left = setNow.gold - spent;
      var gl = document.createElement('label'); gl.className = 'fg'; gl.innerHTML = '<input type="checkbox"> 남은 골드(' + left.toLocaleString() + ') 안에서'; gl.querySelector('input').onchange = function (ev) { gold.on = ev.target.checked; onChange(); }; gold.left = left; box.appendChild(gl); }
    var cnt = document.createElement('span'); cnt.className = 'fcnt'; box.appendChild(cnt);
    var test = function (e) { for (var i = 0; i < F.length; i++) { var s0 = st[F[i][0]]; if (!s0 || !Object.keys(s0).length) continue; if (!vals(F[i], e).some(function (v) { return s0[v]; })) return false; }
      if (gold && gold.on && e.t === 'Magic Item' && +((e.sp || {})['Gold'] || 0) > gold.left) return false; return true; };
    test.count = function (n) { cnt.textContent = n + '개'; };
    return test;
  }
  function openDetail(e) {
    if (!e) return; $('mOpt').hidden = true; $('mFilter').innerHTML = '';
    $('mTitle').textContent = e.n; $('mSearch').hidden = true; $('mList').hidden = true; $('mDetail').innerHTML = fields(e);
    $('modal').querySelector('.mbody').style.gridTemplateColumns = 'minmax(0,1fr)'; $('modal').querySelector('.box').classList.add('fit'); $('modal').hidden = false;
  }
  function openPicker(s) {
    trCtx = { map: {}, edit: false };
    var all0 = E.options(db, s, res.vars).filter(function (e) { return !/Unselectable|Not Selectable/i.test(e.pre || '') ; }), all = all0.filter(function (e) { return !banned(e); }), nBan = all0.length - all.length;
    var pre = {}; all.forEach(function (e) { pre[e.id] = prereq(e, res, cur.level); });
    var rank = { ok: 0, unk: 1, no: 2 };
    all.sort(function (a, b) { return rank[pre[a.id]] - rank[pre[b.id]] || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0); });
    var chosen = (cur.choices[s.key] || []).slice(), active = null, nNo = all.filter(function (e) { return pre[e.id] === 'no'; }).length;
    var onlyOk = localStorage.getItem('d4e_onlyok') !== '0';
    $('mOpt').hidden = !nNo; $('mOnly').checked = onlyOk; $('mOnlyN').textContent = '(조건 미달 ' + nNo + '개)';
    $('mOnly').onchange = function () { onlyOk = $('mOnly').checked; localStorage.setItem('d4e_onlyok', onlyOk ? '1' : '0'); list(); };
    $('modal').querySelector('.box').classList.toggle('few', all.length <= 12);
    var ftest = buildFilters(all, function () { list(); });
    $('mTitle').textContent = selLabel(s) + ' — 후보 ' + all.length + '개' + (nBan ? ' (세팅 금지 ' + nBan + '개 뺌)' : ''); $('mSearch').hidden = false; $('mSearch').value = ''; $('mList').hidden = false;
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
      var q = lc($('mSearch').value), box = $('mList'), n = 0, total = 0; box.innerHTML = '';
      for (var i = 0; i < all.length; i++) {
        var e = all[i];
        if (q && lc(nm(e)).indexOf(q) < 0 && lc(short(e)).indexOf(q) < 0 && lc(e.pre).indexOf(q) < 0) continue;
        if (onlyOk && pre[e.id] === 'no' && chosen.indexOf(e.id) < 0) continue;
        if (!ftest(e)) continue; total++; if (n >= 300) continue;
        var d = document.createElement('div'); n++;
        d.className = (active === e ? 'on ' : '') + ((res.owned[e.id] && chosen.indexOf(e.id) < 0) || pre[e.id] === 'no' ? 'dim' : '') + (e.t === 'Power' ? ' pl ' + usageClass(e) : e.t === 'Feat' ? ' fl t-' + (lc((e.sp || {})['Tier']) || 'heroic') : '');
        d.innerHTML = (chosen.indexOf(e.id) >= 0 ? '✔ ' : '') + esc(nm(e)) + PRE_BADGE[pre[e.id]] + '<small>' + esc(short(e)) + (e.pre ? ' · 조건: ' + esc(e.pp || e.pre) : '') + '</small>';
        d.onclick = (function (e) { return function () { show(e); }; })(e);
        box.appendChild(d);
      }
      if (ftest.count) ftest.count(total);
      if (total > n) { var m = document.createElement('div'); m.className = 'dim'; m.textContent = total + '개 중 300개만 보여요. 걸러 보기나 검색으로 좁혀 주세요.'; box.appendChild(m); }
      if (!n) box.innerHTML = '<div class="dim">맞는 후보가 없어요.</div>';
    }
    $('mSearch').oninput = list; list(); $('modal').hidden = false;
  }
  /* 모든 요소에서 찾기 (하우스룰용). actions(e) → [{label, fn, ghost}] */
  function openSearch(title, actions, given, needQuery) {
    trCtx = { map: {}, edit: false };
    $('mOpt').hidden = true; $('modal').querySelector('.box').classList.remove('few');
    var ftest2 = given && !needQuery ? buildFilters(given, function () { list(); }) : (($('mFilter').innerHTML = ''), function () { return true; });
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
      var total = 0;
      for (var i = 0; i < all.length; i++) {
        var e = all[i]; if (q && lc(nm(e)).indexOf(q) < 0 && lc(given && !needQuery ? eqLine(e) : '').indexOf(q) < 0) continue;
        if (!ftest2(e)) continue; total++; if (n >= 200) continue;
        var d = document.createElement('div'); n++;
        if (needQuery && e.t === 'Power') d.className = 'pl ' + usageClass(e); else if (given && e.t === 'Magic Item') d.className = 'il r-' + (lc((e.sp || {})['Rarity']) || 'common'); else if (given) d.className = 'il r-mundane';
        d.innerHTML = esc(nm(e)) + '<small>' + esc(given && !needQuery ? eqLine(e) + ((e.sp || {})['Gold'] ? ' · ' + Number(e.sp['Gold']).toLocaleString() + ' gp' : '') : typeKo(e.t) + ' · ' + short(e)) + '</small>';
        d.onclick = (function (e) { return function () { show(e); }; })(e); box.appendChild(d);
      }
      if (ftest2.count) ftest2.count(total);
      if (total > n) { var m = document.createElement('div'); m.className = 'dim'; m.textContent = total + '개 중 200개만 보여요. 걸러 보기나 검색으로 좁혀 주세요.'; box.appendChild(m); }
      if (!n) box.innerHTML = '<div class="dim">맞는 요소가 없어요.</div>';
    }
    $('mSearch').oninput = list; list(); $('modal').hidden = false; $('mSearch').focus();
  }
  function closeModal() { if (cur && !$('tab-edit').hidden) trCtx = { map: cur.tr || {}, edit: true };
    $('modal').hidden = true; $('modal').querySelector('.box').classList.remove('fit', 'few'); }

  /* ---------- 서명 · GM ----------
   * 망켓몬 제작기와 같은 방식: 이름 + 비밀구. 비밀구의 해시가 「자리」를 구별한다(비밀구 자체는 이 브라우저에만 남는다).
   * GM 은 공유 DB 의 gm 문서에 해시가 등록된 서명. GM 이 한 명도 없으면 누구나 세팅 · 하우스룰을 고칠 수 있다.
   * 화면에서 막는 것이라 DB 자체를 잠그는 것은 아니다. */
  var ME = { name: '', hash: '', gm: false };
  async function sha256hex(t) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  async function loadSign() {
    var o = null; try { o = JSON.parse(localStorage.getItem('d4e_sign') || 'null'); } catch (e) {}
    if (o && o.secret) { ME.name = o.name || ''; ME.hash = (await sha256hex('d4e:' + o.secret)).slice(0, 24); } else { ME.name = localStorage.getItem('d4e_me') || ''; ME.hash = ''; }
    refreshSign();
  }
  function refreshSign() {
    var g = D4EHouse.gm(); ME.gm = !!(ME.hash && g.hashes.indexOf(ME.hash) >= 0);
    $('me').value = ME.name; localStorage.setItem('d4e_me', ME.name);
    $('signBtn').textContent = ME.hash ? ME.name + (ME.gm ? ' · GM' : '') : '서명하기'; $('signBtn').className = ME.hash ? 'ghost' : '';
    document.body.classList.toggle('is-gm', ME.gm || !g.hashes.length);
  }
  /* 홈브류의 분류 · 단계 · 대상 캐릭터 */
  var HB_ORDER = ['공격', '생존', '활용'], hbEditing = '';
  function hbInfo(e) { var sp = e.sp || {}; return { cat: String(sp['분류'] || '').trim(), step: String(sp['단계'] || '').trim(), who: String(sp['대상 캐릭터'] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean) }; }
  function hbFor(e, name) { var w = hbInfo(e).who; return !w.length || w.map(lc).indexOf(lc(String(name || '').trim())) >= 0; }
  function hbGroups(list) { var g = {}, keys = []; list.forEach(function (e) { var c = hbInfo(e).cat || '그 밖'; if (!g[c]) { g[c] = []; keys.push(c); } g[c].push(e); });
    keys.sort(function (a, b) { var x = HB_ORDER.indexOf(a), y = HB_ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || (a < b ? -1 : 1); });
    return keys.map(function (k) { return [k, g[k].sort(function (a, b) { return hbInfo(a).step.localeCompare(hbInfo(b).step, 'ko', { numeric: true }) || (a.n < b.n ? -1 : 1); })]; }); }
  var hbStep = function (e) { var st = hbInfo(e).step; return st ? '<i class="hbs">' + esc(st) + '</i>' : ''; };
  function isGM() { var g = D4EHouse.gm(); return !g.hashes.length || !!ME.gm; }
  function canGM(what) { var g = D4EHouse.gm(); if (!g.hashes.length || ME.gm) return true; alert((what || '이것') + '은(는) GM 만 고칠 수 있어요. GM 서명으로 들어와 주세요.'); return false; }
  function openSign() {
    var g = D4EHouse.gm(), o = {}; try { o = JSON.parse(localStorage.getItem('d4e_sign') || '{}') || {}; } catch (e) {}
    $('sgName').value = o.name || ME.name || ''; $('sgSecret').value = o.secret || '';
    $('sgState').textContent = ME.hash ? '지금 서명: ' + ME.name + (ME.gm ? ' (GM)' : '') : '아직 서명하지 않았어요.';
    $('sgGm').textContent = g.hashes.length ? 'GM: ' + (g.names || []).join(', ') : '아직 GM 이 등록되지 않았어요. 서명한 뒤 「GM 으로 등록」을 누르면 이 서명이 GM 이 돼요.';
    $('sgGmAdd').hidden = !(ME.hash && (!g.hashes.length || ME.gm) && !(ME.gm)); $('sgGmDel').hidden = !ME.gm;
    $('signBox').hidden = false;
  }
  async function saveGm(d) { await D4EShare.put('gm', d, D4EHouse.CFG); D4EHouse.setGm(d); refreshSign(); openSign(); }
  function wireSign() {
    $('signBtn').onclick = openSign; $('sgClose').onclick = function () { $('signBox').hidden = true; };
    $('sgSave').onclick = async function () { var n = $('sgName').value.trim(), sc = $('sgSecret').value; if (!n || !sc) { alert('이름과 비밀구를 모두 적어 주세요.'); return; }
      localStorage.setItem('d4e_sign', JSON.stringify({ name: n, secret: sc })); await loadSign(); openSign(); if (!$('tab-team').hidden) renderTeam(); };
    $('sgClear').onclick = async function () { localStorage.removeItem('d4e_sign'); await loadSign(); openSign(); };
    $('sgGmAdd').onclick = async function () { var g = D4EHouse.gm(); if (g.hashes.length && !ME.gm) return; if (!confirm('「' + ME.name + '」 서명을 GM 으로 등록할까요?')) return;
      try { await saveGm({ hashes: g.hashes.concat([ME.hash]), names: (g.names || []).concat([ME.name]), at: Date.now() }); } catch (e) { alert('등록하지 못했어요: ' + e.message); } };
    $('sgGmDel').onclick = async function () { var g = D4EHouse.gm(), i = g.hashes.indexOf(ME.hash); if (i < 0 || !confirm('이 서명의 GM 등록을 풀까요?')) return; var h = g.hashes.slice(), nn = (g.names || []).slice(); h.splice(i, 1); nn.splice(i, 1);
      try { await saveGm({ hashes: h, names: nn, at: Date.now() }); } catch (e) { alert(e.message); } };
  }

  /* ---------- 팀 ---------- */
  var teamView = localStorage.getItem('d4e_team') || '';
  function teamOptions(sel, val, withNone) { var T = D4EHouse.teams(); sel.innerHTML = withNone ? '<option value="">(팀 없음)</option>' : '';
    Object.keys(T).sort(function (a, b) { return T[a].name < T[b].name ? -1 : 1; }).forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = T[id].name; if (id === val) o.selected = true; sel.appendChild(o); }); }
  async function teamEdit(id) {
    if (!canGM('팀')) return; var T = D4EHouse.teams(), name = prompt(id ? '팀 이름 바꾸기' : '새 팀 이름', id ? T[id].name : ''); if (!name || !name.trim()) return;
    id = id || 'team_' + Date.now().toString(36);
    try { await D4EShare.put(id, { name: name.trim(), at: Date.now() }, D4EHouse.CFG); T[id] = { name: name.trim() }; teamView = id; localStorage.setItem('d4e_team', id); renderTeam(); teamOptions($('chTeam'), cur.team || '', true); } catch (e) { alert('저장하지 못했어요: ' + e.message); }
  }
  async function teamDel(id) { if (!canGM('팀')) return; var T = D4EHouse.teams(); if (!confirm('팀 「' + T[id].name + '」을 지울까요? 시트는 남고 「팀 없음」으로 보여요.')) return;
    try { await D4EShare.del(id, D4EHouse.CFG); delete T[id]; teamView = ''; renderTeam(); teamOptions($('chTeam'), cur.team || '', true); } catch (e) { alert(e.message); } }

  /* ---------- 팀 시트 ---------- */
  async function shareCur() {
    if (!ME.hash) { alert('먼저 서명해 주세요. 서명이 이 시트의 주인을 구별해요.'); openSign(); return; }
    var me = ME.name, btn = $('chShare'), bt0 = '팀에 올리기'; cur.owner = me; saveChars(); status('올리는 중…'); btn.disabled = true; btn.textContent = '올리는 중…';
    try {
      var ex = (await D4EShare.list()).filter(function (r) { return r.id === cur.id; })[0];
      if (ex && ex.data && ex.data.ownerHash && ex.data.ownerHash !== ME.hash && !ME.gm) { status(''); btn.disabled = false; btn.textContent = bt0; alert('이 시트는 「' + (ex.data.owner || '?') + '」 서명으로 올라가 있어요. 주인이나 GM 만 덮어쓸 수 있어요.'); return; }
      var keep = ex && ex.data && ex.data.ownerHash && ex.data.ownerHash !== ME.hash && ME.gm;
      await D4EShare.put(cur.id, { name: cur.name, owner: keep ? ex.data.owner : me, ownerHash: keep ? ex.data.ownerHash : ME.hash, team: cur.team || '', set: cur.set || '', port: cur.port || '', level: cur.level, abilities: cur.abilities, choices: cur.choices, eq: cur.eq || {}, equip: cur.equip || [], grants: cur.grants || [], tr: cur.tr || {}, ed: cur.ed || {}, hb: cur.hb || [], hbx: cur.hbx || [], sum: summary(cur, res), at: Date.now() });
      var tn = (D4EHouse.teams()[cur.team] || {}).name;
      status('팀 시트에 올렸어요 (' + new Date().toLocaleTimeString() + ')'); toast('「' + (cur.name || '이름 없음') + '」 시트를 ' + (tn ? '「' + tn + '」 팀에' : '팀 없이') + (ex ? ' 다시 올렸어요 (덮어씀)' : ' 올렸어요'));
      btn.textContent = '올렸어요 ✓'; setTimeout(function () { btn.textContent = bt0; }, 2500);
    } catch (e) { status(''); btn.textContent = bt0; toast('올리지 못했어요: ' + e.message, true); alert('올리지 못했어요: ' + e.message); }
    btn.disabled = false;
  }
  async function renderTeam() {
    var box = $('teamList'); box.innerHTML = '<p class="hint">읽는 중이에요.</p>'; $('teamSheet').hidden = true;
    try { await D4EHouse.load(db); refreshSign(); } catch (e) {}
    var T = D4EHouse.teams(), tb = $('teamBar'); tb.innerHTML = ''; if (teamView && teamView !== '_none' && !T[teamView]) teamView = '';
    var chip = function (id, label) { var b = document.createElement('button'); b.className = 'tchip' + (teamView === id ? ' on' : ''); b.textContent = label; b.onclick = function () { teamView = id; localStorage.setItem('d4e_team', id); renderTeam(); }; tb.appendChild(b); };
    chip('', '전체'); Object.keys(T).sort(function (a, b) { return T[a].name < T[b].name ? -1 : 1; }).forEach(function (id) { chip(id, T[id].name); }); chip('_none', '팀 없음');
    $('teamRen').hidden = $('teamDelBtn').hidden = !T[teamView];
    var rows;
    try { rows = await D4EShare.list(); } catch (e) { box.innerHTML = '<p class="hint">읽지 못했어요: ' + esc(e.message) + '</p>'; return; }
    rows = rows.filter(function (r) { var t = (r.data || {}).team || ''; if (t && !T[t]) t = ''; return teamView === '' || (teamView === '_none' ? !t : t === teamView); });
    box.innerHTML = rows.length ? '' : '<p class="hint">여기에는 아직 올라온 시트가 없어요. 「내 캐릭터」에서 팀을 고르고 「팀에 올리기」를 눌러 보세요.</p>';
    rows.forEach(function (row) {
      var d = row.data || {}, s = d.sum || {}, c = document.createElement('section'); c.className = 'tcard';
      /* 옛 시트에는 파워 가짓수가 없어서, 룰 데이터가 있으면 이름으로 찾아 센다 */
      var pw = s.pw || (db ? pwCount((s.powers || []).map(function (n) { return (db.byName[lc(n)] || []).filter(function (e) { return e.t === 'Power'; })[0]; })) : null);
      var cls = db && (db.byName[lc(s.cls || '')] || []).filter(function (e) { return e.t === 'Class'; })[0], role = s.role || (cls && cls.sp && cls.sp['Role']) || '';
      role = role ? String(role).split(/[.:]/)[0].trim() : ''; role = role ? (koName('Role', role) || gsub(role)) : '';
      var sg = function (v) { return (v >= 0 ? '+' : '') + v; }, cell = function (l, v, k) { return '<div class="' + (k || '') + '"><small>' + l + '</small><b>' + v + '</b></div>'; };
      c.innerHTML = '<div class="tc-top' + (d.port ? '' : ' none') + '">' + (d.port ? '<img src="' + esc(d.port) + '" alt="">' : '<span class="tc-ini">' + esc((d.name || '?').charAt(0)) + '</span>') +
        (T[d.team] ? '<span class="tc-team">' + esc(T[d.team].name) + '</span>' : '') + '<span class="tc-lv">Lv ' + (d.level || 1) + '</span>' +
        '<div class="tc-name"><h3>' + esc(d.name || '이름 없음') + '</h3><p>' + esc(koName('Race', s.race) || s.race || '종족 미정') + ' ' + esc(koName('Class', s.cls) || s.cls || '클래스 미정') + (s.path ? ' · ' + esc(s.path) : '') + '</p></div></div>' +
        '<div class="tc-body"><p class="tc-who">' + (role ? '<span class="tc-role">' + esc(role) + '</span>' : '') + '<span>' + esc(d.owner || '?') + '</span></p>' +
        '<div class="tc-hp"><span><small>HP</small><b>' + (s.hp || 0) + '</b></span><span class="mid"><small>반죽음</small><b>' + Math.floor((s.hp || 0) / 2) + '</b></span><span class="sg"><small>원기</small><b>' + (s.hsv || Math.floor((s.hp || 0) / 4)) + '</b><i>×' + (s.surges || 0) + '</i></span></div>' +
        '<div class="tc-def">' + cell('AC', s.ac || 0) + cell('Fort', s.fort || 0) + cell('Ref', s.ref || 0) + cell('Will', s.will || 0) + '</div>' +
        '<div class="tc-row">' + cell('이동', s.speed || 0) + cell('우선권', sg(s.init || 0)) + (pw ? cell('상시', pw.at, 'at pwc" data-u="at') + cell('조우', pw.enc, 'enc pwc" data-u="enc') + cell('일일', pw.day, 'day pwc" data-u="day') + cell('활용', pw.util, 'util pwc" data-u="util') : cell('파워', (s.powers || []).length)) + '</div><div class="tc-pw" hidden></div></div>';
      var acts = document.createElement('div'); acts.className = 'tc-act'; c.appendChild(acts); var card = c, card0 = function () { return card; }; c = acts;
      var built = function () { if (d.set) D4EHouse.apply(db, d.set);
        var ch = { id: row.id, name: d.name, port: d.port || '', level: d.level || 1, abilities: d.abilities || {}, choices: d.choices || {}, equip: d.equip || [], grants: d.grants || [], tr: d.tr || {}, ed: d.ed || {}, hb: d.hb || [], hbx: d.hbx || [], set: d.set || '' }, r = E.build(db, ch); ch.eq = d.eq || {}; return { ch: ch, r: r }; };
      /* 파워 가짓수 칸을 누르면 그 묶음의 파워 이름이 펼쳐지고, 이름을 누르면 파워 카드가 뜬다 */
      var pwBox = card0().querySelector('.tc-pw'), pwOpen = '';
      card0().querySelectorAll('.pwc').forEach(function (el) { el.title = '눌러서 파워 보기'; el.onclick = function () {
        if (!db) { alert('파워 내용은 룰 데이터를 불러온 뒤에 볼 수 있어요. 「데이터」 탭을 확인해 주세요.'); return; }
        var u = el.getAttribute('data-u'); card0().querySelectorAll('.pwc').forEach(function (x) { x.classList.remove('on'); });
        if (pwOpen === u) { pwOpen = ''; pwBox.hidden = true; return; }
        pwOpen = u; el.classList.add('on'); var bb = built(), list = ownedOf(bb.r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && !/^ID_INTERNAL/.test(p.id) && p.n !== 'Second Wind' && usageClass(p) === u; });
        trCtx = { map: bb.ch.tr || {}, edit: false }; calcCtx = bb; pwBox.hidden = false; pwBox.innerHTML = list.length ? '' : '<span class="hint">없어요</span>';
        list.forEach(function (p) { var b = document.createElement('button'); b.className = 'tc-pchip ' + u; var t = (bb.ch.tr || {})[p.id]; b.textContent = (t && t.n) || p.n;
          b.onclick = function () { trCtx = { map: bb.ch.tr || {}, edit: false }; calcCtx = bb; openDetail(p); $('mTitle').textContent = (d.name || '') + ' · ' + b.textContent; $('mDetail').innerHTML = powerCard(p, true); }; pwBox.appendChild(b); });
      }; });
      var canEdit = !!(ME.gm || (d.ownerHash ? d.ownerHash === ME.hash : (chars[row.id] || (d.owner && d.owner === ME.name) || !d.ownerHash)));
      var b1 = document.createElement('button'); b1.className = 'mini'; b1.textContent = '시트 보기';
      b1.onclick = function () {
        if (!db) { alert('전체 시트는 룰 데이터를 불러온 뒤에 볼 수 있어요. 「데이터」 탭을 확인해 주세요.'); return; }
        var bb = built(), ch = bb.ch, r = bb.r; var ts = $('teamSheet'); ts.hidden = false; ts.innerHTML = '<div class="tsbar"><b>' + esc(d.name || '이름 없음') + '</b><span class="hint">' + (canEdit ? '주인이나 GM 은 「이 시트 고치기」로 만들기 화면에서 고친 뒤 다시 올릴 수 있어요' : '보기 전용이에요') + '</span>' + (canEdit ? '<button class="mini" data-ts="edit">이 시트 고치기</button>' : '') + '<button class="mini ghost" data-ts="close">닫기 ×</button></div>' + sheetHtml(ch, r, d.owner);
        teamCtx = { map: ch.tr || {}, edit: false }; teamCalc = { r: r, ch: ch }; wireSheet(ts, r); ts.scrollIntoView({ behavior: 'smooth' });
        ts.querySelector('[data-ts=close]').onclick = function (ev) { ev.stopPropagation(); ts.hidden = true; ts.innerHTML = ''; card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
        var eb = ts.querySelector('[data-ts=edit]'); if (eb) eb.onclick = function (ev) { ev.stopPropagation();
          var loc = chars[row.id]; if (loc && !confirm('내 브라우저에 이 캐릭터가 이미 있어요.\n확인 = 팀에 올라온 판으로 덮어쓰고 고치기\n취소 = 내 브라우저의 판을 그대로 열기')) { cur = loc; saveChars(); tab('edit'); return; }
          var n = loc || newChar(); if (!loc) { delete chars[n.id]; n.id = row.id; chars[n.id] = n; }
          n.name = d.name || ''; n.level = d.level || 1; n.port = d.port || ''; n.abilities = Object.assign({}, d.abilities || {}); n.choices = JSON.parse(JSON.stringify(d.choices || {})); n.eq = JSON.parse(JSON.stringify(d.eq || {})); n.equip = (d.equip || []).slice(); n.grants = (d.grants || []).slice();
          n.set = d.set || ''; n.setInit = n.set; n.team = d.team || ''; n.tr = JSON.parse(JSON.stringify(d.tr || {})); n.ed = JSON.parse(JSON.stringify(d.ed || {})); n.hb = (d.hb || []).slice(); n.hbx = JSON.parse(JSON.stringify(d.hbx || [])); n.owner = d.owner || ''; cur = n; saveChars(); tab('edit'); toast('만들기 화면으로 가져왔어요. 고친 뒤 「팀에 올리기」를 누르면 반영돼요'); };
      };
      var b2 = document.createElement('button'); b2.className = 'mini ghost'; b2.textContent = '복제해서 내 것으로';
      b2.onclick = function () { var n = newChar(); n.name = (d.name || '') + ' (복제)'; n.level = d.level || 1; n.port = d.port || ''; n.abilities = Object.assign(n.abilities, d.abilities || {}); n.choices = JSON.parse(JSON.stringify(d.choices || {})); n.eq = JSON.parse(JSON.stringify(d.eq || {})); n.equip = (d.equip || []).slice(); n.set = d.set || ''; n.setInit = n.set; n.tr = JSON.parse(JSON.stringify(d.tr || {})); n.ed = JSON.parse(JSON.stringify(d.ed || {})); n.hb = (d.hb || []).slice(); n.hbx = JSON.parse(JSON.stringify(d.hbx || [])); cur = n; saveChars(); tab('edit'); };
      c.appendChild(b1); c.appendChild(document.createTextNode(' ')); c.appendChild(b2);
      if (ME.gm || (d.ownerHash ? d.ownerHash === ME.hash : (chars[row.id] || (d.owner && d.owner === ME.name)))) {
        var b3 = document.createElement('button'); b3.className = 'mini ghost'; b3.textContent = '내리기';
        if (ME.gm && Object.keys(T).length) { var mv = document.createElement('select'); mv.className = 'mini'; teamOptions(mv, T[d.team] ? d.team : '', true);
          mv.onchange = async function () { d.team = mv.value; try { await D4EShare.put(row.id, d); renderTeam(); } catch (e) { alert(e.message); } }; c.appendChild(document.createTextNode(' ')); c.appendChild(mv); }
        b3.onclick = async function () { if (!confirm('팀 시트에서 내릴까요? 내 브라우저의 캐릭터는 남아요.')) return; try { await D4EShare.del(row.id); renderTeam(); } catch (e) { alert(e.message); } };
        c.appendChild(document.createTextNode(' ')); c.appendChild(b3);
      }
      /* 카드 어디를 눌러도 시트가 열린다 (단추 · 고르기 · 파워 칸은 제 할 일을 한다) */
      card.title = '눌러서 시트 보기'; card.onclick = function (ev) { if (ev.target.closest('button,select,.pwc,.tc-pw,.tc-act')) return; b1.onclick(); };
      box.appendChild(card);
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
    setTimeout(refreshSign, 0);
    try { var n = await D4EHouse.load(db); refreshSign(); if (n) status('룰 요소 ' + Object.keys(db.byId).length.toLocaleString() + '개 · 하우스룰 ' + n + '개'); }
    catch (e) { status('하우스룰을 읽지 못했어요'); }
  }
  async function start() {
    loadChars();
    for (var L = 1; L <= 30; L++) { var o = document.createElement('option'); o.value = L; o.textContent = L; $('chLevel').appendChild(o); }
    var id = localStorage.getItem('d4e_cur'); cur = chars[id] || chars[Object.keys(chars)[0]] || newChar();
    document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-tab')); }; });
    $('mClose').onclick = closeModal; $('modal').onclick = function (ev) { if (ev.target === $('modal')) closeModal(); };
    $('chSel').onchange = function () { cur = chars[$('chSel').value]; saveChars(); renderEdit(); };
    $('chNew').onclick = function () { cur = newChar(); saveChars(); renderEdit(); };
    $('chDel').onclick = function () { if (!confirm('「' + (cur.name || '') + '」을(를) 이 브라우저에서 지울까요?')) return; delete chars[cur.id]; cur = chars[Object.keys(chars)[0]] || newChar(); saveChars(); renderEdit(); };
    $('chName').oninput = function () { cur.name = $('chName').value.trim(); saveChars(); var o = $('chSel').selectedOptions[0]; if (o) o.textContent = cur.name || cur.id; var h = $('sheet').querySelector('h2'); if (h && h.firstChild && h.firstChild.nodeType === 3) h.firstChild.nodeValue = (cur.name || '이름 없음') + ' '; };
    $('chLevel').onchange = function () { cur.level = +$('chLevel').value; rebuild(); };
    $('gAuto').checked = glossAuto; $('gAuto').onchange = function () { glossAuto = $('gAuto').checked; localStorage.setItem('d4e_gauto', glossAuto ? '1' : '0'); trOrig = {}; if (db && !$('tab-edit').hidden) rebuild(); };
    $('hideOpt').onchange = renderSelects;
    $('chTeam').onchange = function () { cur.team = $('chTeam').value; saveChars(); };
    $('teamAdd').onclick = function () { teamEdit(''); }; $('teamRen').onclick = function () { teamEdit(teamView); }; $('teamDelBtn').onclick = function () { teamDel(teamView); };
    wireSign();
    $('chSet').onchange = function () { cur.set = $('chSet').value; delete cur.setInit; saveChars(); renderEdit(); };
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
    window.D4EApp = { mtData: mtData, hasChar: function () { return !!(db && cur && res); }, charNames: function () { return Object.keys(chars).map(function (k) { return chars[k].name; }).filter(Boolean); }, gsub: gsub, vocab: function (key, n) {
        var V = vocabCache[key]; if (!V) { var c = {}; (db.byType['Power'] || []).forEach(function (p) { var v = (p.sp || {})[key]; if (!v) return; (key === 'Keywords' ? String(v).split(',') : [String(v)]).forEach(function (x) { x = x.trim(); if (x && x.length < 60) c[x] = (c[x] || 0) + 1; }); });
          V = vocabCache[key] = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }); }
        return V.slice(0, n || 30); }, canGM: canGM, me: function () { return ME; }, card: function (e) { return fields(e); }, db: function () { return db; }, esc: esc, nm: nm, typeKo: typeKo, openSearch: openSearch, status: status,
      houseChanged: function () { if (!$('tab-edit').hidden) renderEdit(); status('룰 요소 ' + Object.keys(db.byId).length.toLocaleString() + '개 · 하우스룰 ' + D4EHouse.count() + '개'); } };
    D4EHouse.start();
    await loadSign();
    status('데이터를 찾는 중…');
    var d = (await D4EData.loadStored()) || (await D4EData.loadSite());
    if (d) { useData(d); await loadHouse(); tab('edit'); }
    else { $('dataState').textContent = '아직 룰 데이터가 없어요. 아래에서 파일을 한 번 불러와 주세요.'; status('룰 데이터 없음'); tab('data'); }
  }
  start();
})();
