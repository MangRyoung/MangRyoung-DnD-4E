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
      c = lc(c).replace(/^\(|\)$/g, '').trim().replace(/\.$/, '').replace(/^you must (?:be trained in|have training in) /, 'trained in '); if (!c || c.charAt(0) === '~') return 'ok'; /* 활용 파워의 "You must be trained in Endurance." */
      if (/unselectable|not selectable/.test(c)) return 'no';
      var neg = false; while (c.charAt(0) === '!') { neg = !neg; c = c.slice(1).trim(); }
      var res, m;
      if ((m = /^(\d+)(?:st|nd|rd|th)?[- ]level$/.exec(c)) || (m = /^level (\d+)$/.exec(c))) res = level >= +m[1];
      else if ((m = /^(heroic|paragon|epic)(?: tier)?$/.exec(c))) res = level >= { heroic: 1, paragon: 11, epic: 21 }[m[1]];
      else if ((m = /^(str|strength|con|constitution|dex|dexterity|int|intelligence|wis|wisdom|cha|charisma) (\d+)$/.exec(c))) res = (r.stats[AB_SHORT[m[1]] || m[1]] || 10) >= +m[2];
      else if ((m = /^(?:trained in|training in) (.+)$/.exec(c))) { var sk = m[1].replace(/ skill$/, ''); if (db.byName[sk]) res = (r.stats[sk + ' trained'] || 0) > 0; }
      else if (/^id_/.test(c)) res = has(c); /* 요소 id 로 적힌 조건(특정 파워 · 클래스 · 하이브리드 클래스): 가졌는지만 보면 된다 */
      else if (c === 'fighter weapon talent class feature' || c === 'fighter weapon talent') res = has('one-handed weapon talent') || has('two-handed weapon talent'); /* 데이터에서는 Fighter Talents 아래 두 갈래로 나뉘어 있다 */
      else if ((m = /^must worship (?:the )?(.+)$/.exec(c))) { if (has(m[1]) || has('the ' + m[1])) res = true; else if (db.byName[m[1]] || db.byName['the ' + m[1]]) res = false; }
      else if ((m = /^proficiency with (.+)$/.exec(c))) { var pw = m[1].replace(/s$/, ''), pa = pw.replace(/ armor$/, ''), psh = pa.replace(/ shield$/, ''), pn = ['weapon proficiency (' + pw + ')', 'armor proficiency (' + pa + ')', 'shield proficiency (' + psh + ')'], wpn = (db.byName[pw] || []).filter(function (x) { return x.t === 'Weapon'; })[0];
        if (pn.some(has) || (wpn && has(lc((wpn.sp || {})['Weapon Category'])))) res = true; else if (wpn || pn.some(function (x) { return db.byName[x]; })) res = false; }
      else if ((m = /^can use (?:the |a |an )?(.+?) implements?$/.exec(c))) { var ip = 'implement proficiency (' + m[1].replace(/^ki focuses$/, 'ki focus').replace(/s$/, '') + ')', ip2 = 'implement proficiency (' + m[1] + ')'; if (has(ip) || has(ip2)) res = true; else if (db.byName[ip] || db.byName[ip2]) res = false; }
      else {
        var names = [c, c.replace(/^any /, ''), c.replace(/ (class feature|racial trait|racial power|regional background|countsasclass|class|race|power|feat|feature|theme|background)$/, ''), c.replace(/^any (.+) class$/, '$1')];
        for (var i = 0; i < names.length && res === undefined; i++) { if (has(names[i])) res = true; }
        /* 「shifter」처럼 종족 이름의 일부만 적힌 조건 */
        if (res === undefined && /^[a-z-]+$/.test(c)) { for (var rk in r.owned) if (r.owned[rk].t === 'Race' && lc(r.owned[rk].n).split(/[ ,]+/).indexOf(c) >= 0) res = true; }
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
  /* ---------- 내 시트 자동 저장 · 기기 사이 맞추기 ----------
   * 서명한 사람의 시트는 고칠 때마다 공유 DB 에 저절로 올라가고(잠깐 뒤에 한 번), 다른 기기에서 같은 서명으로 들어오면 내려받는다.
   * ch.mt = 내용이 마지막으로 바뀐 때, ch.sy = 마지막으로 DB 와 맞춘 때, ch.pub = 팀 시트에 보이게 올렸는지, ch.foreign = 남의 시트를 가져온 것(저절로 올리지 않음).
   * DB 문서의 priv:true 는 「내 보관용」 — 팀 시트 탭에는 안 보인다. */
  var SNAP = {}, REMOTE = {}, upTimer = 0, syncing = false;
  var sig = function (ch) { var o = Object.assign({}, ch); delete o.mt; delete o.sy; return JSON.stringify(o); };
  function loadChars() { try { chars = JSON.parse(localStorage.getItem('d4e_chars') || '{}'); } catch (e) { chars = {}; } Object.keys(chars).forEach(function (k) { SNAP[k] = sig(chars[k]); }); }
  function saveRaw() { try { localStorage.setItem('d4e_chars', JSON.stringify(chars)); } catch (e) { toast('이 브라우저의 저장 공간이 가득 찼어요. 안 쓰는 캐릭터를 지워 주세요', true); } if (cur) localStorage.setItem('d4e_cur', cur.id); }
  function saveChars() {
    if (cur && chars[cur.id] === cur) { var g = sig(cur); if (SNAP[cur.id] !== g) { SNAP[cur.id] = g; cur.mt = Date.now(); queueUp(); } }
    saveRaw();
  }
  function syncNote(t, bad) { var el = document.getElementById('syncState'); if (el) { el.textContent = t || ''; el.className = 'hint syncst' + (bad ? ' bad' : ''); } }
  function canAuto(ch) { if (!ME.hash || !ch || ch.foreign) return false; if (!REMOTE[ch.id] && ch.name === '새 캐릭터' && !Object.keys(ch.choices || {}).length) return false; /* 아직 손대지 않은 빈 시트는 올리지 않는다 */ var rm = REMOTE[ch.id]; return !(rm && rm.ownerHash && rm.ownerHash !== ME.hash); }
  function queueUp() { clearTimeout(upTimer); if (!canAuto(cur)) { syncNote(ME.hash ? (cur && cur.foreign ? '남의 시트예요 · 「팀에 올리기」를 눌러야 반영돼요' : '') : '서명하면 저절로 저장돼서 다른 기기에서도 이어 할 수 있어요'); return; } syncNote('저장 대기 중…'); upTimer = setTimeout(pushCur, 2500); }
  function docOf(ch, r) { return { name: ch.name, owner: ME.name, ownerHash: ME.hash, team: ch.team || '', set: ch.set || '', port: ch.port || '', tok: ch.tok || '', face: ch.face || '', stand: ch.stand || '', cut: ch.cut || '', hidePw: ch.hidePw || [], fx: ch.fx || {}, level: ch.level, abilities: ch.abilities, choices: ch.choices, eq: ch.eq || {}, equip: ch.equip || [], grants: ch.grants || [], tr: ch.tr || {}, ed: ch.ed || {}, hb: ch.hb || [], hbx: ch.hbx || [], pg: ch.pg || {}, bio: ch.bio || {}, vers: ch.vers || [], abMode: ch.abMode || '', setInit: ch.setInit || '', sum: summary(ch, r), priv: !ch.pub, at: Date.now() }; }
  function applyDoc(n, d) {
    n.name = d.name || ''; n.level = d.level || 1; n.port = d.port || ''; n.tok = d.tok || ''; n.face = d.face || ''; n.stand = d.stand || ''; n.cut = d.cut || ''; n.hidePw = (d.hidePw || []).slice(); n.abilities = Object.assign({}, d.abilities || {}); n.choices = JSON.parse(JSON.stringify(d.choices || {})); n.eq = JSON.parse(JSON.stringify(d.eq || {})); n.equip = (d.equip || []).slice(); n.grants = (d.grants || []).slice();
    n.set = d.set || ''; n.setInit = d.setInit || n.set; if (d.abMode) n.abMode = d.abMode; n.team = d.team || ''; n.tr = JSON.parse(JSON.stringify(d.tr || {})); n.ed = JSON.parse(JSON.stringify(d.ed || {})); n.hb = (d.hb || []).slice(); n.hbx = JSON.parse(JSON.stringify(d.hbx || [])); n.pg = JSON.parse(JSON.stringify(d.pg || {})); n.fx = JSON.parse(JSON.stringify(d.fx || {})); n.bio = JSON.parse(JSON.stringify(d.bio || {})); n.bio = JSON.parse(JSON.stringify(d.bio || {})); n.vers = JSON.parse(JSON.stringify(d.vers || [])); n.owner = d.owner || ''; return n;
  }
  async function pushCur() {
    if (!db || !res || !cur || syncing || !canAuto(cur) || !D4EShare.ready()) return; var ch = cur, doc = docOf(ch, res);
    try { syncNote('저장 중…'); await D4EShare.put(ch.id, doc); ch.sy = doc.at; if ((ch.mt || 0) > doc.at) ch.mt = doc.at; ch.owner = ME.name; REMOTE[ch.id] = { ownerHash: ME.hash, at: doc.at }; SNAP[ch.id] = sig(ch); saveRaw();
      syncNote('저장됨 ' + new Date(doc.at).toLocaleTimeString().replace(/:\d\d$/, '') + (ch.pub ? ' · 팀에 보임' : ' · 내 보관용')); }
    catch (e) { syncNote('저장하지 못했어요 (' + e.message + ')', true); }
  }
  /* 서명한 뒤 · 시작할 때 · 창으로 돌아올 때: 내 시트를 DB 와 맞춘다. 더 새로운 쪽이 이긴다 */
  var lastSync = 0;
  async function syncDown(force) {
    if (!ME.hash || !D4EShare.ready() || syncing || (!force && Date.now() - lastSync < 20000)) return; syncing = true; lastSync = Date.now();
    try { var rows = await D4EShare.list(undefined, ME.hash), got = 0, changedCur = false;
      rows.forEach(function (row) { var d = row.data || {}, at = d.at || 0, loc = chars[row.id]; REMOTE[row.id] = { ownerHash: d.ownerHash, at: at };
        if (!loc) { loc = chars[row.id] = applyDoc({ id: row.id }, d); loc.mt = loc.sy = at; loc.pub = !d.priv; SNAP[row.id] = sig(loc); got++; }
        else if (at > (loc.mt || 0) && at > (loc.sy || 0)) { applyDoc(loc, d); loc.mt = loc.sy = at; loc.pub = !d.priv; delete loc.foreign; SNAP[row.id] = sig(loc); got++; if (loc === cur) changedCur = true; }
        else if (loc.pub == null) loc.pub = !d.priv; });
      saveRaw(); if (got) { if (db && !$('tab-edit').hidden) renderEdit(); toast('다른 기기에서 저장한 시트 ' + got + '개를 가져왔어요'); }
      syncing = false; if (cur && canAuto(cur) && (cur.mt || 0) > (cur.sy || 0)) queueUp(); else if (cur && canAuto(cur) && cur.sy) syncNote('저장됨 · ' + (cur.pub ? '팀에 보임' : '내 보관용')); else queueUp();
    } catch (e) { syncing = false; syncNote('내 시트를 맞추지 못했어요 (' + e.message + ')', true); }
  }
  /* ---------- 버전: 같은 캐릭터의 여러 판(10레벨 · 12레벨 …)을 시트 안에 보관 ----------
   * 보관하는 것은 레벨 · 능력치 · 고르기 · 장비 · 고친 파워 · 홈브류 · 패시브 · 세팅. 이름 · 포트 · 설정 · 번역 · 팀은 모든 버전이 같이 쓴다. */
  var VKEYS = ['level', 'abilities', 'abMode', 'choices', 'eq', 'equip', 'grants', 'ed', 'hb', 'hbx', 'pg', 'fx', 'set', 'setInit'];
  function snapOf(ch) { var o = {}; VKEYS.forEach(function (k) { if (ch[k] != null) o[k] = JSON.parse(JSON.stringify(ch[k])); }); return o; }
  /* 같은지 비교: 열쇠 순서(공유 DB 를 거치면 바뀜) · 빈 값 차이는 무시한다 */
  function stab(o) { if (Array.isArray(o)) return o.map(stab); if (o && typeof o === 'object') { var r = {}; Object.keys(o).sort().forEach(function (k) { var v = stab(o[k]); if (v == null || v === '' || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length)) return; r[k] = v; }); return r; } return o; }
  function sameSnap(a, b) { return JSON.stringify(stab(a || {})) === JSON.stringify(stab(b || {})); }
  var AUTOV = /^불러오기 전 /;
  function isAuto(v) { return v.auto || AUTOV.test(v.label); }
  /* 자동 보관본 정리: 이름 붙인 버전과 같은 것은 지우고, 자동 보관본은 가장 새 것 하나만 남긴다 */
  function tidyVers() { var vs = cur.vers || [], named = vs.filter(function (v) { return !isAuto(v); }), autos = vs.filter(isAuto).sort(function (a, b) { return b.at - a.at; }), keep = [];
    autos.forEach(function (a) { if (keep.length) return; if (named.some(function (v) { return sameSnap(v.snap, a.snap); })) return; keep.push(a); });
    var before = vs.length; cur.vers = named.concat(keep); return before - cur.vers.length; }
  function verKeep(label, replace) {
    var vs = cur.vers = cur.vers || [], sm = res ? summary(cur, res) : {}, v = { label: label, at: Date.now(), level: cur.level, cls: sm.cls || '', race: sm.race || '', snap: snapOf(cur) };
    var i = vs.findIndex(function (x) { return x.label === label; }); if (i >= 0) vs[i] = v; else vs.push(v); return v;
  }
  function verWhen(t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function renderVers() {
    var vs = (cur.vers || []).slice().sort(function (a, b) { return (a.level - b.level) || (a.at - b.at); }), now = snapOf(cur);
    $('verTitle').textContent = '「' + (cur.name || '이름 없음') + '」 버전 ' + vs.length + '개';
    $('chVer').textContent = vs.length ? '버전 ' + vs.length : '버전';
    $('verName').value = cur.level + '레벨';
    $('verList').innerHTML = vs.length ? vs.map(function (v) { var same = sameSnap(v.snap, now);
      return '<div class="vrow' + (same ? ' on' : '') + '"><div class="vinfo"><b>' + esc(v.label) + '</b>' + (same ? ' <span class="vnow">지금 시트</span>' : '') + '<small>' + v.level + '레벨' + (v.race || v.cls ? ' · ' + esc([v.race, v.cls].filter(Boolean).map(function (x) { return gloss(x) || x; }).join(' ')) : '') + ' · ' + verWhen(v.at) + '</small></div>' +
        '<button data-vload="' + esc(v.label) + '"' + (same ? ' disabled' : '') + '>불러오기</button><button class="ghost" data-vover="' + esc(v.label) + '"' + (same ? ' disabled' : '') + ' title="지금 시트로 이 버전을 덮어써요">덮어쓰기</button><button class="ghost" data-vdel="' + esc(v.label) + '">지우기</button></div>'; }).join('') : '<p class="hint">아직 보관한 버전이 없어요. 위에서 이름을 붙여 저장해 보세요.</p>';
  }
  function openVers() { if (cur.foreign) { toast('남의 시트는 버전을 만들 수 없어요', true); return; } var gone = tidyVers(); if (gone) { saveChars(); toast('겹친 자동 보관본 ' + gone + '개를 정리했어요'); } renderVers(); $('verBox').hidden = false; }
  function wireVers() {
    $('chVer').onclick = openVers; $('verClose').onclick = function () { $('verBox').hidden = true; };
    $('verBox').onclick = function (ev) { if (ev.target === $('verBox')) $('verBox').hidden = true; };
    $('verSave').onclick = function () { var l = $('verName').value.trim(); if (!l) { toast('버전 이름을 적어 주세요', true); return; }
      if ((cur.vers || []).some(function (x) { return x.label === l; }) && !confirm('「' + l + '」 버전이 이미 있어요. 지금 시트로 덮어쓸까요?')) return;
      verKeep(l); saveChars(); renderVers(); toast('「' + l + '」 버전으로 보관했어요'); };
    $('verList').onclick = function (ev) { var b = ev.target.closest('button'); if (!b) return; var vs = cur.vers || [];
      var l = b.getAttribute('data-vload') || b.getAttribute('data-vover') || b.getAttribute('data-vdel'), v = vs.find(function (x) { return x.label === l; }); if (!v) return;
      if (b.hasAttribute('data-vdel')) { if (!confirm('「' + l + '」 버전을 지울까요?')) return; cur.vers = vs.filter(function (x) { return x !== v; }); saveChars(); renderVers(); return; }
      if (b.hasAttribute('data-vover')) { if (!confirm('「' + l + '」 버전을 지금 시트로 덮어쓸까요?')) return; verKeep(l); saveChars(); renderVers(); toast('「' + l + '」 버전을 덮어썼어요'); return; }
      var now = snapOf(cur), kept = vs.some(function (x) { return sameSnap(x.snap, now); }), auto = '';
      if (!kept) { auto = '불러오기 전 ' + verWhen(Date.now()); cur.vers = vs.filter(function (x) { return !isAuto(x); }); verKeep(auto).auto = true; }
      VKEYS.forEach(function (k) { delete cur[k]; }); Object.assign(cur, JSON.parse(JSON.stringify(v.snap)));
      saveChars(); renderEdit(); renderVers(); toast('「' + l + '」 버전을 불러왔어요' + (auto ? ' · 하던 시트는 「' + auto + '」로 보관했어요' : '')); };
  }
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
      powers: ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && !/^ID_INTERNAL/.test(p.id) && !isChildOwned(r, p) && (ch.hidePw || []).indexOf(p.id) < 0; }).map(function (p) { return p.n; }),
      feats: ownedOf(r, 'Feat').map(function (f) { return f.n; }), pw: pwCount(ownedOf(r, 'Power').filter(function (p) { return !isChildOwned(r, p) && (ch.hidePw || []).indexOf(p.id) < 0; })), hsv: Math.floor((s['hit points'] || 0) / 4) + (s['healing surge value'] || 0),
      role: ((ownedOf(r, 'Class')[0] || {}).sp || {})['Role'] || '', path: one('Paragon Path'), epic: one('Epic Destiny') };
  }

  /* ---------- 번역 ----------
   * (1) 용어 자동 번역: 카드의 글에서 팀 용어집의 영어 용어를 한국어로 바꿔 보여 준다. 화면에서만 바꾸고 저장하지 않는다.
   * (2) 내 번역: 캐릭터마다 자기 시트의 파워 · 물품에 칸별로 번역을 적는다. ch.tr[id] = {n 이름, fl 플레이버, body 설명, f:{칸: 글}}.
   * 카드마다 「번역 | 원문」 탭으로 바꿔 본다. */
  /* 공용 번역: 요소 id 기준으로 공유 DB(kind = dnd4e_tr)에 둔다. 서명한 팀원이면 누구나 도감에서 쓴다.
   * 시트의 번역 묶음(ch.tr)은 이 묶음을 「밑바탕」으로 삼는다(프로토타입) — 시트에 자기 번역이 있으면 그것, 없으면 공용 번역이 보인다. 저장(JSON)에는 자기 것만 들어간다. */
  var SHTR = {}, SHTR_KIND = 'dnd4e_tr', shLoaded = false;
  /* 기본 번역 묶음(data/tr-pack.json, 감우가 옮긴 히로익 파워 · 클래스 특성 · 마법 물품): 공용 번역의 밑바탕.
   * 보이는 순서는 시트의 자기 번역 → 공용 번역 → 기본 번역 → 용어 자동 번역. 공용 번역 DB(dnd4e_tr)에는 넣지 않는다. */
  var TRPACK = {}; Object.setPrototypeOf(SHTR, TRPACK);
  async function loadTrPack() { try { var r = await fetch('data/tr-pack.json?v=' + ((document.querySelector('meta[name=d4e-version]') || {}).content || ''), { cache: 'no-cache' }); if (!r.ok) return 0; var j = await r.json(), m = j && (j.tr || j); if (m && typeof m === 'object') Object.keys(m).forEach(function (k) { TRPACK[k] = m[k]; }); return Object.keys(TRPACK).length; } catch (e) { return 0; } }
  function packTr(id) { return !ownTr(SHTR, id) && Object.prototype.hasOwnProperty.call(TRPACK, id); }
  function shTr(o) { o = o || {}; if (o !== SHTR && Object.getPrototypeOf(o) !== SHTR) Object.setPrototypeOf(o, SHTR); return o; }
  function ownTr(map, id) { return !!map && Object.prototype.hasOwnProperty.call(map, id); }
  async function loadShTr() { if (!D4EShare.ready()) return; try { var rows = await D4EShare.list(SHTR_KIND); Object.keys(SHTR).forEach(function (k) { delete SHTR[k]; }); rows.forEach(function (r) { if (r.data) SHTR[r.id] = r.data; }); shLoaded = true; } catch (e) {} }
  var trCtx = { map: shTr({}), edit: false }, teamCtx = null, trOrig = {}, glossAuto = localStorage.getItem('d4e_gauto') !== '0';
  function gsub(t) {
    if (!t) return ''; var G = D4EHouse.glossary();
    if (gsub.src !== G) { gsub.src = G; gsub.map = {}; var terms = G.map(function (p) { gsub.map[lc(p[0])] = p[1]; return p[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).sort(function (a, b) { return b.length - a.length; });
      gsub.re = terms.length ? new RegExp('(^|[^A-Za-z])(' + terms.join('|') + ')(?![A-Za-z])', 'gi') : null; }
    return gsub.re ? String(t).replace(gsub.re, function (m, pre, term) { return pre + (gsub.map[lc(term)] || term); }) : String(t);
  }
  /* 아이템 파워 카드(물품id~p1)는 따로 쓴 번역이 없으면 물품에 넣어 둔 번역(이름 · Power 칸)을 빌려 쓴다 */
  function itemTr(map, e) { var it = e && e._item && map && map[e._item]; if (!it) return null; var pw = it.f && it.f['Power']; if (!it.n && !pw) return null;
    var f = {}; if (pw) { var k = ['Effect', 'Hit', 'Trigger'].filter(function (x) { return (e.sp || {})[x]; })[0]; if (k) f[k] = String(pw).replace(/^파워\s*\([^)]*\)\s*[:：]\s*/, ''); } return { n: it.n, f: f, _lent: 1 }; }
  function TR(e) { var t = trCtx.map[e.id]; if (t && t.t && !t.body) t.body = t.t; return t || itemTr(trCtx.map, e) || null; }
  /* 카드의 id → 요소. 아이템 파워처럼 DB에 없는 것도 찾는다 */
  function EL(id) { var e = db.byId[id]; if (e || !id) return e; var i = String(id).indexOf('~p'); if (i < 0) return e; var it = db.byId[String(id).slice(0, i)]; return it ? itemPowersOf(it).filter(function (p) { return p.id === id; })[0] : undefined; }
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
  /* 파워에 얹히는 것 두 가지: ① 재주 등이 요소 id 로 칸을 바꿔 쓰는 modify (Melee Training → 근접 기본 공격의 Attack · Hit) ② 시트에서 손으로 고친 성능(ed). 손으로 고친 것이 맨 나중. */
  function eff(p, ch) { if (!p || p._ed) return p;
    var r0 = calcCtx && calcCtx.ch === ch ? calcCtx.r : (ch && ch === cur ? res : null), ms = r0 && r0.mods ? r0.mods.filter(function (m) { return m.name === p.id && m.field && m.value != null && String(m.value).trim() && (p.sp || {})[m.field] != null; }) : [];
    var ed = ch && ch.ed && ch.ed[p.id]; if (!ms.length && (!ed || !ed.f)) return p;
    var sp = Object.assign({}, p.sp || {}); ms.forEach(function (m) { sp[m.field] = m.value; });
    if (ed && ed.f) Object.keys(ed.f).forEach(function (k) { if (ed.f[k] === '') delete sp[k]; else sp[k] = ed.f[k]; });
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
      (!trCtx.shared && ownTr(SHTR, e.id) && !ownTr(trCtx.map, e.id) && !trOrig[e.id] ? '<span class="shtag" title="도감에서 팀이 같이 쓰는 번역이에요' + (SHTR[e.id].by ? ' · ' + esc(SHTR[e.id].by) : '') + '">공용 번역</span>' : '') + (packTr(e.id) && !(trCtx.map !== SHTR && ownTr(trCtx.map, e.id)) && !trOrig[e.id] ? '<span class="shtag pk" title="미리 옮겨 둔 기본 번역이에요. 공용 번역이나 내 번역을 쓰면 그쪽이 먼저 보여요">기본 번역</span>' : '') + (trCtx.shared && !trCtx.edit ? '<span class="hint">서명하면 공용 번역을 쓸 수 있어요</span>' : '') +
      (trCtx.edit ? '<button class="mini ghost" data-tr="edit">' + (trCtx.shared ? (ownTr(SHTR, e.id) ? '공용 번역 고치기' : '공용 번역 쓰기') : ownTr(trCtx.map, e.id) ? '내 번역 고치기' : SHTR[e.id] ? '내 번역으로 따로 쓰기' : '내 번역 쓰기') + '</button>' + (isP && !trCtx.shared ? '<button class="mini ghost" data-tr="ped">성능 고치기</button>' : '') : '') + (edd ? '<span class="pedb" title="이 시트에서 성능을 고친 파워예요">고침</span>' : '') + '</div>';
  }
  function trFields(e) {
    var sp = e.sp || {}, out = [{ k: '_n', label: '이름', orig: e.n, one: true }], seen = {};
    if (e.fl) out.push({ k: '_fl', label: '플레이버', orig: e.fl });
    var add = function (k) { if (sp[k] == null || seen[k] || k.charAt(0) === '_' || k === '하우스룰' || /^(type|Type|Full Text|Tier|Rarity|Level|Class|Power Type|Display|Power Usage|Action Type|Magic Item Type|Gold|Weight)$/.test(k)) return; seen[k] = 1;
      out.push({ k: k, label: { 'Keywords': '키워드', 'Attack Type': '공격 유형' }[k] || rowLabel(k), orig: String(sp[k]) }); };
    if (e.t === 'Power') ROW_ORDER.forEach(add);
    Object.keys(sp).forEach(function (k) { if (e.t === 'Power' || String(sp[k]).length > 30 || k === 'Short Description' || k === 'Keywords') add(k); });
    if (e.body) out.push({ k: '_body', label: '설명', orig: e.body });
    return out;
  }
  function trForm(e) {
    var t = (trCtx.shared ? SHTR[e.id] : (cur.tr || {})[e.id]) || {}, h = '<div class="gc misc trform" data-id="' + esc(e.id) + '"><div class="gh"><span class="pn">' + esc(e.n) + (trCtx.shared ? ' · 공용 번역' : ' · 내 번역') + '</span><span class="pd">칸마다 적어요. 비운 칸은 용어 자동 번역으로 보여요</span></div><div class="tfs">';
    trFields(e).forEach(function (f) { var v = f.k === '_n' ? t.n : f.k === '_fl' ? t.fl : f.k === '_body' ? (t.body || t.t) : (t.f || {})[f.k], g = gsub(f.orig);
      h += '<div class="tf"><b>' + esc(f.label) + '</b><div class="to">' + esc(f.orig) + '</div>' + (g !== f.orig ? '<div class="tg">' + esc(g) + '</div>' : '') +
        (f.one ? '<input type="text" data-k="' + esc(f.k) + '" value="' + esc(v || '') + '" placeholder="번역">' : '<textarea data-k="' + esc(f.k) + '" placeholder="번역">' + esc(v || '') + '</textarea>') + '</div>'; });
    return h + '</div><div class="trb" data-id="' + esc(e.id) + '"><button class="mini" data-tr="save">저장</button><button class="mini ghost" data-tr="sub" title="내가 적은 글 속의 영어 용어를 용어집의 한국어로 바꿔요">적은 글의 용어 치환</button>' +
      (Object.keys(t).length && (trCtx.shared || ownTr(cur.tr, e.id)) ? '<button class="mini ghost" data-tr="del">' + (trCtx.shared ? '공용 번역 지우기' : '내 번역 지우기') + '</button>' : '') + '<button class="mini ghost" data-tr="cancel">그만두기</button></div></div>';
  }
  function ctxFor(node) { if (node.closest('#dexView')) trCtx = { map: SHTR, edit: !!ME.hash, shared: true }; else if (node.closest('#teamSheet') && teamCtx) trCtx = teamCtx; else if (!node.closest('#mDetail')) trCtx = { map: cur.tr || {}, edit: true }; }
  function redrawCard(card, e) { if (card.closest('#dexView') && window.D4EDex) { D4EDex.redraw(); return; }
    if (RICH_TYPES.test(e.t)) { var tr0 = document.createElement('div'); tr0.innerHTML = richDetail(e); card.replaceWith(tr0.firstChild); return; }
    ctxFor(card); var open = card.tagName !== 'DETAILS' || card.open || card.classList.contains('trform'), tmp = document.createElement('div');
    tmp.innerHTML = (e.t === 'Power' && e.sp && e.sp['Power Usage']) ? powerCard(e, open) : cardHtml(e); card.replaceWith(tmp.firstChild); }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-tr]'); if (!b) return; ev.preventDefault(); ev.stopPropagation();
    var bar = b.closest('.trb'), id = bar.getAttribute('data-id'), card = bar.closest('.pc,.gc,.rd'), act = b.getAttribute('data-tr'), e = EL(id); if (!e) return; if (card) ctxFor(card);
    if (act === 'vtr' || act === 'vor') { if (act === 'vor') trOrig[id] = 1; else delete trOrig[id]; redrawCard(card, e); return; }
    if (act === 'edit') { var tmp = document.createElement('div'); tmp.innerHTML = trForm(e); card.replaceWith(tmp.firstChild); return; }
    if (act === 'ped') { var tp = document.createElement('div'); tp.innerHTML = pedForm(e); card.replaceWith(tp.firstChild); return; }
    if (act === 'pedsave') { var f = {}, sp0 = e.sp || {}; card.querySelectorAll('[data-pk]').forEach(function (x) { var k = x.getAttribute('data-pk'), v = x.value.trim(), o = sp0[k] == null ? '' : String(sp0[k]).trim(); if (v !== o) f[k] = v; });
      cur.ed = cur.ed || {}; if (Object.keys(f).length) cur.ed[id] = { f: f }; else delete cur.ed[id]; saveChars(); rebuild(); toast(Object.keys(f).length ? '「' + e.n + '」 성능을 고쳤어요' : '바뀐 칸이 없어요'); return; }
    if (act === 'peddel') { if (cur.ed) delete cur.ed[id]; saveChars(); rebuild(); toast('「' + e.n + '」 을(를) 원래대로 돌렸어요'); return; }
    if (act === 'sub') { card.querySelectorAll('[data-k]').forEach(function (x) { x.value = gsub(x.value); }); return; }
    if (act === 'save') { var o = { f: {} }; card.querySelectorAll('[data-k]').forEach(function (x) { var k = x.getAttribute('data-k'), v = x.value.trim(); if (!v) return; if (k === '_n') o.n = v; else if (k === '_fl') o.fl = v; else if (k === '_body') o.body = v; else o.f[k] = v; });
      var some = !!(o.n || o.fl || o.body || Object.keys(o.f).length);
      if (card.closest('#dexView')) { if (!ME.hash) { alert('공용 번역은 서명한 뒤에 쓸 수 있어요.'); return; }
        if (some) { o.by = ME.name || ''; o.at = Date.now(); SHTR[id] = o; D4EShare.put(id, o, SHTR_KIND).then(function () { toast('「' + e.n + '」 공용 번역을 저장했어요'); }, function (er) { alert('공용 번역을 저장하지 못했어요: ' + er.message); }); }
        else { delete SHTR[id]; D4EShare.del(id, SHTR_KIND).catch(function () {}); }
        delete trOrig[id]; }
      else { cur.tr = shTr(cur.tr); if (some) cur.tr[id] = o; else delete cur.tr[id]; saveChars(); delete trOrig[id]; } }
    if (act === 'del') { if (card.closest('#dexView')) { if (!ME.hash) { alert('공용 번역은 서명한 뒤에 지울 수 있어요.'); return; } if (!confirm('이 공용 번역을 지울까요? 팀 모두에게서 사라져요.')) return; delete SHTR[id]; D4EShare.del(id, SHTR_KIND).catch(function (er) { alert('지우지 못했어요: ' + er.message); }); } else { if (cur.tr) delete cur.tr[id]; saveChars(); } }
    var inModal = !!card.closest('#mDetail'); card.classList.add('trform'); redrawCard(card, e);
    /* 상세 창에서 번역을 쓰거나 지웠으면 시트의 장비 줄 · 재주 타일 이름도 바로 바뀌게 */
    if ((act === 'save' || act === 'del') && db && cur && inModal && trCtx.edit) { var keep = trCtx; rebuild(); trCtx = keep; }
  });

  /* ---------- 공격 · 피해 계산 ----------
   * 공격 = 레벨 절반 + 능력 수정치 + 숙련(무기 파워, 숙련된 무기) + 강화(마법 무기 · 도구의 +N 과 내재 보너스 중 큰 쪽) + 범위가 맞는 보정.
   * 데이터의 보정은 "weapon,heavy blade group:attack" 처럼 꼬리표가 붙은 수치라, 파워 · 무기의 꼬리표가 다 맞을 때만 더한다.
   * 조건부 보정은 넣지 않는다. 서로 다른 수치에서 온 같은 종류 보너스가 겹치는 드문 경우는 가리지 못한다. */
  var calcCtx = null, teamCalc = null;
  function plusN(e) { var m = e && /\+(\d+)\s*$/.exec(e.n); return m ? +m[1] : 0; }
  var srcName = function (id) { var e = db.byId[id]; return !e ? String(id || '') : e.t === 'Level' ? e.n + '레벨 기본 규칙' : e.n; };
  /* 한 번의 공격 계산. W = 무기(없으면 null), I = 도구, enhItem = 강화를 주는 마법 물품 */
  /* 재주 등이 무기 자체를 바꾸는 modify (예: Spiked Chain Training — 피해 2d4, 그룹에 Light Blade 추가) 를 든 무기에 입힌다 */
  function effW(W, r) { if (!W || W.t !== 'Weapon' || !r || !r.mods) return W;
    var ms = r.mods.filter(function (m) { return m.type === 'Weapon' && m.field && (m.name === W.id || lc(m.name) === lc(W.n)); }); if (!ms.length) return W;
    var sp = Object.assign({}, W.sp || {}); ms.forEach(function (m) { if (m.add) { var cur0 = String(sp[m.field] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); String(m.add).split(',').forEach(function (x) { x = x.trim(); if (x && cur0.map(lc).indexOf(lc(x)) < 0) cur0.push(x); }); sp[m.field] = cur0.join(', '); } else if (m.value != null) sp[m.field] = m.value; });
    var c = Object.assign({}, W); c.sp = sp; return c; }
  function calcAttack(p, ctx, W, I, enhItem, atkText, hitText) {
    W = effW(W, ctx.r);
    var r = ctx.r, ch = ctx.ch, sp = p.sp || {}, st = r.stats, wsp = (W && W.sp) || {};
    /* "Strength + 2 vs. AC" 처럼 파워 자체에 붙은 명중 보정 */
    /* 명중 쪽이 레벨로 커지는 줄: "Level 11: Constitution + 4 vs. AC", "Level 21: +9.", "Increase to +4 bonus at 11th level …" 가운데 지금 레벨에 맞는 것 */
    var lvA = st['level'] || ch.level || 1, aLines = String(atkText || '').split('\n'), aBase = aLines[0], flatOv = null, ABR = /Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma/g;
    aLines.slice(1).forEach(function (l) { var m = /Level (\d+):\s*(.*)/.exec(l), n;
      if (m) { if (+m[1] <= lvA) { if (/\bvs\b/.test(m[2])) { aBase = m[2]; flatOv = null; } else if ((n = /\+\s*(\d+)/.exec(m[2]))) flatOv = +n[1]; } return; }
      if ((n = /gain a \+(\d+) bonus to the attack roll/i.exec(l))) flatOv = +n[1];
      var re = /\+(\d+)(?: bonus)?(?: (?:on|to) (?:the )?attack rolls?)? at (\d+)(?:st|nd|rd|th) level/g, x, best = 0; while ((x = re.exec(l))) if (+x[2] <= lvA && +x[2] > best) { best = +x[2]; flatOv = +x[1]; } });
    /* 명중 칸에 같이 적힌 꼴: "Increase to +4 bonus and 2d6 + Constitution modifier damage at 11th level, and to +6 bonus and 3d6 … at 21st level" (용의 숨결 등) */
    var hbRe = /to \+(\d+) bonus and ([^,.]*?) at (\d+)(?:st|nd|rd|th) level/gi, hb, hbBest = 0, hbDice = ''; while ((hb = hbRe.exec(String(hitText || '')))) if (+hb[3] <= lvA && +hb[3] > hbBest) { hbBest = +hb[3]; flatOv = +hb[1]; hbDice = hb[2]; }
    var flat = 0, flat1 = false; atkText = aBase.replace(/\s*([+\-–])\s*(\d+)(?=\s+vs\.?\s)/g, function (_, sg, n) { if (!flat1) { flat = (sg === '+' ? 1 : -1) * +n; flat1 = true; } return ''; });
    if (flatOv != null) flat = flatOv;
    /* 능력치를 골라 쓰는 파워("Intelligence, Wisdom, or Charisma + 4 vs. Will", "highest ability modifier"): 가장 높은 것으로. 무기 파워는 손에 따라 갈리는 것(근접 근력 · 원거리 민첩)이라 건드리지 않는다 */
    if (!/(^|,)\s*weapon/i.test(String(sp['Keywords'] || ''))) { var abs = /highest ability/i.test(atkText) ? ['Strength', 'Constitution', 'Dexterity', 'Intelligence', 'Wisdom', 'Charisma'] : (atkText.match(ABR) || []), dfm = /vs\.?\s+(AC|Fortitude|Reflex|Will)/i.exec(atkText);
      if (abs.length > 1 && dfm) { var bestA = abs[0]; abs.forEach(function (x) { if ((st[lc(x)] || 10) > (st[lc(bestA)] || 10)) bestA = x; }); atkText = bestA + ' vs. ' + dfm[1]; } }
    /* 근접 무기로는 원거리 기본 공격을 못 한다(사거리 없는 무기는 빼고 계산) */
    if (W && /^ranged basic attack$/i.test(p.n) && !wsp['Range'] && !/thrown/i.test(wsp['Properties'] || '')) { W = null; wsp = {}; }
    var am = /(Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma)\s+vs\.?\s+(AC|Fortitude|Reflex|Will)/i.exec(atkText || ''); if (!am) return null;
    var kws = String(sp['Keywords'] || '').split(',').map(lc).filter(Boolean), isW = kws.indexOf('weapon') >= 0, isI = kws.indexOf('implement') >= 0;
    var tags = {}; kws.forEach(function (k) { tags[k] = 1; }); var at = lc(sp['Attack Type']).split(' ')[0]; if (at) tags[at] = 1; tags[lc(p.id)] = 1; (p.cat || []).forEach(function (c) { tags[lc(c)] = 1; });
    if (W) { tags[lc(W.id)] = 1; tags[lc(W.n)] = 1; String(wsp['Group'] || '').split(',').forEach(function (g) { g = lc(g); if (g) { tags[g + ' group'] = 1; tags[g] = 1; } }); String(wsp['Properties'] || '').split(',').forEach(function (g) { if (lc(g)) tags[lc(g)] = 1; }); if (wsp['Hands Required']) { tags[lc(wsp['Hands Required'])] = 1; tags[/two/i.test(wsp['Hands Required']) ? 'two-hands' : 'one-hand'] = 1; }
      if (isI) String(wsp['Group'] || '').split(',').forEach(function (g) { g = lc(g); if (g) tags[g + ' implement group'] = 1; }); }
    var addI = function (x) { if (!x) return; tags[lc(x.id)] = 1; var it = lc(x.t === 'Superior Implement' ? ((x.sp || {})['Group'] || x.n) : ((x.sp || {})['Magic Item Type'] || x.n)); tags[it] = 1; tags[it + ' implement'] = 1; tags[lc(x.n)] = 1; if (/ki focus/.test(it)) { tags['ki focus'] = 1; tags['ki focuses implement'] = 1; } };
    addI(I); if (isI && enhItem && enhItem !== I) addI(enhItem);
    /* 노리는 방어 · 기본 공격도 꼬리표로 (예: reflex:attack, melee basic:attack) */
    tags[lc(am[2])] = 1; if (am[2] === 'AC') tags['ac'] = 1; if (/^melee basic attack$/i.test(p.n)) tags['melee basic'] = 1; if (/^ranged basic attack$/i.test(p.n)) tags['ranged basic'] = 1;
    /* 꼬리표가 맞는 수치의 낱줄을 모아, 종류가 같은 보너스는 수치 이름이 달라도 가장 큰 것만 남긴다 */
    var gather = function (suffix, plain) {
      var rows = [], cond = [];
      Object.keys(r.breakdown).forEach(function (k) { var i = k.lastIndexOf(':'), ok = plain.indexOf(k) >= 0;
        var suf = i > 0 ? k.slice(i + 1) : '', pm = /^(\w+)\((.+)\)$/.exec(suf); /* "implement:attack(Accurate staff)" 처럼 괄호 안 물품을 쓰고 있을 때만 붙는 보정 */
        if (!ok && i > 0 && (pm ? pm[1] === suffix && tags[lc(pm[2])] : suf === suffix)) ok = k.slice(0, i).split(',').every(function (x) { return tags[lc(x.trim())]; });
        if (!ok) return;
        r.breakdown[k].forEach(function (x) { if (!x.v) return; var o = { v: x.v, type: x.type || '', label: srcName(x.src), scope: i > 0 ? k.slice(0, i) : '' }; if (x.cond) { o.cond = x.cond; cond.push(o); } else if (!x.off) rows.push(o); }); });
      var best = {}; rows.forEach(function (o) { var t = lc(o.type); if (t && o.v > 0) { if (!best[t] || o.v > best[t].v) { if (best[t]) best[t].off = true; best[t] = o; } else o.off = true; } });
      return { rows: rows, cond: cond, sum: rows.reduce(function (a, o) { return a + (o.off ? 0 : o.v); }, 0) };
    };
    var mod = function (a) { return Math.floor(((st[lc(a)] || 10) - 10) / 2); }, half = st['half-level'] || 0;
    var has = function (n) { for (var k in r.owned) if (lc(r.owned[k].n) === n) return true; return false; };
    var pend = W && db.byId[wsp['_Primary End']], profOk = W && (has(lc(wsp['Weapon Category'])) || has('weapon proficiency (' + lc(W.n) + ')') || !!(pend && has('weapon proficiency (' + lc(pend.n) + ')'))), prof = isW && profOk ? +(wsp['Proficiency Bonus'] || 0) : 0;
    var inh = st['inherent attack'] || 0, itemEnh = (isW || isI) ? plusN(enhItem) : 0, enh = Math.max(inh, itemEnh);
    var ga = gather('attack', ['attack rolls']), gd = gather('damage', ['damage rolls', 'damage']);
    var A = [{ v: half, label: '레벨 절반' }, { v: mod(am[1]), label: am[1].slice(0, 3).toUpperCase() + ' 수정치' }];
    if (isW && W && !profOk) A.push({ v: 0, label: '숙련 없음 (' + W.n + ')', off: true }); else if (prof) A.push({ v: prof, label: '숙련 (' + W.n + ')' });
    if (enh) A.push({ v: enh, label: '강화 · ' + (itemEnh >= inh && itemEnh ? enhItem.n : '내재 보너스'), type: 'Enhancement' });
    A = A.concat(ga.rows);
    var atk = half + mod(am[1]) + prof + enh + ga.sum + flat; if (flat) A.push({ v: flat, label: '파워 자체 보정 · ' + p.n });
    var hit = hitText || '', dm = /(\d+)\[W\]/.exec(hit), dice = '', mmh = /\+\s*(half |one-half )?(?:your )?(Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma) modifier/i.exec(hit), mm = mmh && [mmh[0], mmh[2]], mmHalf = !!(mmh && mmh[1]), Dp = [];
    var die = /(\d+)d(\d+)/.exec(wsp['Damage'] || '1d4') || [0, 1, 4];
    var cut = hit.search(/damage/i), head = cut >= 0 ? hit.slice(0, cut) : hit, terms = [], maxDice = 0, tk, tre = /(\d+)\[W\]|(\d+)d(\d+)/g;
    var rawTerms = [];
    /* 레벨에 따라 커지는 피해: "Level 5: 4d10 + …", "Increase damage to 2[W] + … at 21st level" 가운데 지금 레벨에 맞는 가장 높은 줄 */
    var lvNow = st['level'] || ch.level || 1, lvBest = 0, lvTxt = '', lm, lre1 = /Level (\d+):\s*([^\n]*)/g, lre2 = /Increase (?:the )?damage to ([^\n]*?) at (\d+)(?:st|nd|rd|th) level/gi;
    while ((lm = lre1.exec(hit))) if (+lm[1] <= lvNow && +lm[1] > lvBest && /\d+\[W\]|\d+d\d+/.test(lm[2])) { lvBest = +lm[1]; lvTxt = lm[2]; }
    while ((lm = lre2.exec(hit))) if (+lm[2] <= lvNow && +lm[2] > lvBest && /\d+\[W\]|\d+d\d+/.test(lm[1])) { lvBest = +lm[2]; lvTxt = lm[1]; }
    if (hbBest > lvBest && /\d+\[W\]|\d+d\d+/.test(hbDice)) { lvBest = hbBest; lvTxt = hbDice; }
    if (lvBest) { var lc2 = lvTxt.search(/damage/i); head = lc2 >= 0 ? lvTxt.slice(0, lc2) : lvTxt; }
    while ((tk = tre.exec(head))) { var cnt = tk[1] ? +tk[1] * +die[1] : +tk[2], size = tk[1] ? +die[2] : +tk[3]; terms.push(cnt + 'd' + size); maxDice += cnt * size; rawTerms.push(tk[1] ? { w: +tk[1] } : { n: +tk[2], d: +tk[3] }); }
    /* 파워의 「Weapon」 칸: "If you're wielding an axe, a heavy blade …, you gain a bonus to the attack roll equal to one-half your Strength modifier" 같은 든 무기에 따른 보정 */
    var wtx = isW && W ? String(sp['Weapon'] || '') : '', wm = /^If you(?:'re| are) wielding (.+?), (?:you gain a bonus to the (attack|damage) rolls? equal to (one-half |half )?your (Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma) modifier|the (?:primary )?attacks? deals? (?:extra )?damage equal to (one-half |half )?your (Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma) modifier|you gain a \+(\d+) bonus to the (attack|damage) rolls?|the (?:primary )?attacks? deals? (\d+)d(\d+) extra damage)/i.exec(wtx);
    if (wm) { var wgrp = lc(wsp['Group'] || ''), wcat = lc(wsp['Weapon Category'] || ''), twoH = /two/i.test(wsp['Hands Required'] || '') || (/versatile/i.test(wsp['Properties'] || '') && !(ch.eq || {}).off);
      var wok = lc(wm[1]).split(/,\s*(?:or\s+)?|\s+or\s+/).some(function (t) { t = t.replace(/^(an?|your)\s+/, '').trim(); if (!t) return false;
        if (/with both hands|two-handed weapon/.test(t)) return twoH; if (/^simple /.test(t)) return /^simple/.test(wcat); if (/^military /.test(t)) return /^military/.test(wcat);
        var t1 = t.replace(/s$/, ''); return wgrp.split(',').some(function (g) { g = g.trim(); return g === t || g === t1; }) || lc(W.n) === t || lc(W.n) === t1; });
      if (wok) { var wlab = '든 무기 (' + W.n + ') · ' + p.n;
        if (wm[2]) { var wv = wm[3] ? Math.floor(mod(wm[4]) / 2) : mod(wm[4]); if (wm[2].toLowerCase() === 'attack') { A.push({ v: wv, label: wlab }); atk += wv; } else Dp.push({ v: wv, label: wlab }); }
        else if (wm[6]) Dp.push({ v: wm[5] ? Math.floor(mod(wm[6]) / 2) : mod(wm[6]), label: wlab });
        else if (wm[7]) { if (wm[8].toLowerCase() === 'attack') { A.push({ v: +wm[7], label: wlab }); atk += +wm[7]; } else Dp.push({ v: +wm[7], label: wlab }); }
        else if (wm[9]) { terms.push(wm[9] + 'd' + wm[10]); maxDice += +wm[9] * +wm[10]; } } }
    dice = terms.join('+');
    if (mm) Dp.push({ v: mmHalf ? Math.floor(mod(mm[1]) / 2) : mod(mm[1]), label: mm[1].slice(0, 3).toUpperCase() + ' 수정치' + (mmHalf ? '의 절반' : '') });
    /* "1[W] + Strength modifier + Wisdom modifier damage" 처럼 수정치가 둘 이상 붙는 피해: 첫 「damage」 앞까지에서 둘째부터 더 넣는다 */
    if (mm && cut >= 0) { var mre = /\+\s*(half |one-half )?(?:your )?(Strength|Constitution|Dexterity|Intelligence|Wisdom|Charisma) modifier/gi, m2, mi = 0, hd0 = hit.slice(0, cut); while ((m2 = mre.exec(hd0))) { if (mi++ === 0) continue; Dp.push({ v: m2[1] ? Math.floor(mod(m2[2]) / 2) : mod(m2[2]), label: m2[2].slice(0, 3).toUpperCase() + ' 수정치' + (m2[1] ? '의 절반' : '') }); } }
    if (enh) Dp.push({ v: enh, label: '강화 · ' + (itemEnh >= inh && itemEnh ? enhItem.n : '내재 보너스'), type: 'Enhancement' });
    var two = isW && W && /versatile/i.test(wsp['Properties'] || '') && !(ch.eq || {}).off; if (two) Dp.push({ v: 1, label: '양손으로 쥠 (Versatile, 보조 손이 비어 있음)' });
    Dp = Dp.concat(gd.rows);
    var dbonus = Dp.reduce(function (a, o) { return a + (o.off ? 0 : o.v); }, 0), isDmg = /damage/i.test(hit);
    var dmg = dice ? dice + (dbonus ? (dbonus > 0 ? '+' : '') + dbonus : '') : (isDmg && dbonus ? (dbonus > 0 ? '+' : '') + dbonus : '');
    /* 치명타: 주사위 최댓값 + 보정, 그리고 강화 +N 마다 추가 주사위(마법 무기에 치명타 칸이 있으면 그 글), High Crit 무기는 [W] 추가 */
    var crit = '';
    if (dice) { var mx = maxDice + dbonus, ex = [];
      /* 치명타 주사위는 마법 무기 · 도구의 치명타 속성에서만(강화가 내재 보너스에 밀려도 속성은 그대로). 내재 보너스는 치명타 주사위를 주지 않는다 — 2026-11-16 망령 님 결정 */
      if ((isW || isI) && enhItem && (enhItem.sp || {})['Critical']) ex.push(enhItem.sp['Critical']);
      /* Wicked Blade 재주: 중검으로 하는 근접 기본 공격은 High Crit 으로 침 */
      var wicked = isW && W && has('wicked blade') && /heavy blade/i.test(wsp['Group'] || '') && /^melee basic attack$/i.test(p.n);
      if (isW && W && (wicked || /high crit/i.test(wsp['Properties'] || ''))) { var n = (r.stats['level'] || 1) >= 21 ? 3 : (r.stats['level'] || 1) >= 11 ? 2 : 1; ex.push('+' + (n * +die[1]) + 'd' + die[2] + ' (High Crit)'); }
      crit = mx + (ex.length ? ' ' + ex.join(' ') : ''); }
    return { terms: rawTerms, dbonus: dbonus, isW: isW, isI: isI, enh: enh, half: half, prof: prof, die: die[1] + 'd' + die[2], dieMax: +die[1] * +die[2], atk: atk, vs: am[2], dmg: dmg, crit: crit, tool: W ? W.n : I ? I.n : (isW ? '무기 없음' : isI ? '도구 없음' : ''), noTool: !W && !I && (isW || isI), A: A, D: Dp, dice: dice, condA: ga.cond, condD: gd.cond };
  }
  function attackInfo(p, ctx) {
    p = eff(p, (ctx || calcCtx || {}).ch);
    ctx = ctx || calcCtx; if (!ctx) return null; var sp = p.sp || {}, q = ctx.ch.eq || {}, kws = lc(sp['Keywords']);
    var isW = /(^|,)\s*weapon/.test(kws), isI = /(^|,)\s*implement/.test(kws), W = isW ? db.byId[q.main] : null, I = isI ? db.byId[q.impl] || db.byId[q.implM] || null : null, Im = isI ? db.byId[q.implM] || I : null;
    var main = calcAttack(p, ctx, W, I, isW ? db.byId[q.mainM] : Im, sp['Attack'] || sp['Primary Attack'], sp['Hit']); if (!main) return null;
    var out = { main: main }, off = db.byId[q.off];
    if (isW && off && off.t === 'Weapon') out.off = calcAttack(p, ctx, off, null, db.byId[q.offM] || null, sp['Attack'] || sp['Primary Attack'], sp['Hit']);
    if (sp['Secondary Attack']) out.sec = calcAttack(p, ctx, W, I, isW ? db.byId[q.mainM] : Im, sp['Secondary Attack'], sp['Secondary Hit'] || '');
    return out;
  }
  function attackDetail(p, ctx) {
    var ai = attackInfo(p, ctx); if (!ai) return '';
    var line = function (o) { return '<div class="' + (o.off ? 'off' : '') + '"><b>' + (o.v >= 0 ? '+' : '') + o.v + '</b> ' + esc(o.label) + (o.type ? ' <i>[' + esc(gloss(o.type + ' Bonus') || o.type) + ']</i>' : '') + (o.scope ? ' <small>' + esc(o.scope) + '</small>' : '') + (o.cond ? ' <small>— ' + esc(glossAuto ? gsub(o.cond) : o.cond) + '</small>' : '') + '</div>'; };
    var block = function (x, title) { var h = '<div class="padc"><strong>' + title + ' · 공격 ' + (x.atk >= 0 ? '+' : '') + x.atk + ' vs ' + esc(gloss(x.vs === 'AC' ? 'Armor Class' : x.vs) || x.vs) + '</strong>' + x.A.map(line).join('');
      if (x.dmg) h += '<strong>피해 ' + esc(x.dmg) + '</strong>' + (x.dice ? '<div><b>' + esc(x.dice) + '</b> 주사위</div>' : '') + x.D.map(line).join('') + (x.crit ? '<div><b>치명타</b> ' + esc(x.crit) + '</div>' : '');
      if (x.condA.length || x.condD.length) h += '<strong class="cnh">조건부 (위 숫자에 넣지 않음)</strong>' + x.condA.map(function (o) { o = Object.assign({}, o, { label: '공격 · ' + o.label }); return line(o); }).join('') + x.condD.map(function (o) { o = Object.assign({}, o, { label: '피해 · ' + o.label }); return line(o); }).join('');
      return h + '</div>'; };
    return (ai.main.noTool ? '<p class="hint notool" style="margin:0 0 4px">' + (ai.main.isI ? '도구 파워예요. 장비의 도구 칸에 성표 · 지팡이 같은 도구를 끼워야 강화와 도구에 붙는 보정(익스퍼타이즈 등)이 들어가요.' : '무기 파워예요. 장비의 주 무기 칸에 무기를 끼워야 숙련 · 강화 · 무기에 붙는 보정이 들어가요.') + '</p>' : '') + block(ai.main, ai.main.tool || '공격') + (ai.off ? block(ai.off, '보조 손 · ' + ai.off.tool) : '') + (ai.sec ? block(ai.sec, '2차 공격') : '') + '<p class="hint" style="margin:4px 0 0">줄 그어진 것은 같은 종류의 더 큰 보너스에 밀려 빠진 것이에요.</p>';
  }
  document.addEventListener('click', function (ev) {
    var pa = ev.target.closest('.pa'); if (!pa) return; var card = pa.closest('.pc'), e = card && EL(card.getAttribute('data-pc')); if (!e) return;
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
    var W = db.byId[q.main], Wm = db.byId[q.mainM], I = db.byId[q.implM] || db.byId[q.impl], O = db.byId[q.off], Om = db.byId[q.offM];
    var itemCrit = function (m) { var c = /(\d+d\d+)/.exec((m && m.sp && m.sp['Critical']) || ''); return c ? c[1] : '0'; };
    var has = function (n) { for (var k in r.owned) if (lc(r.owned[k].n) === n) return true; return false; };
    var wset = function (w, m) { var wsp = (w && w.sp) || {}, die = /(\d+)d(\d+)/.exec(wsp['Damage'] || '1d4') || [0, 1, 4], enh = Math.max(inh, plusN(m));
      var prof = w && (has(lc(wsp['Weapon Category'])) || has('weapon proficiency (' + lc(w.n) + ')')) ? +(wsp['Proficiency Bonus'] || 0) : 0;
      return { hit: half + prof + enh, W: die[1] + 'd' + die[2], WMax: +die[1] * +die[2], Dmg: enh, Crit: itemCrit(m) }; };
    var s1 = wset(W, Wm), s2 = I ? { hit: half + Math.max(inh, plusN(I)), W: '1d4', WMax: 4, Dmg: Math.max(inh, plusN(I)), Crit: itemCrit(I) } : (O && O.t === 'Weapon' ? wset(O, Om) : { hit: half + inh, W: '1d4', WMax: 4, Dmg: inh, Crit: '0' });
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
    /* 증강 가능한 파워는 증강 버전마다 매크로 하나씩(어미 대신) */
    var mtList = []; ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && p.n !== 'Second Wind'; }).forEach(function (p) { var av = augVersions(p); if (av.length) av.forEach(function (c) { mtList.push(c); }); else mtList.push(p); });
    mtList.forEach(function (p) {
      p = eff(p, ch); var sp = p.sp, u = usageClass(p), t = T[p.id] || {}, ai = attackInfo(p, ctx), m = ai && ai.main;
      var usage = u === 'day' ? '#404040' : u === 'enc' ? '#704040' : (lc(sp['Power Usage']).indexOf('daily') >= 0 ? '#404040' : lc(sp['Power Usage']).indexOf('encounter') >= 0 ? '#704040' : '#407040');
      var a = { group: '', pname: (t.n || p.n).replace(/["';]/g, ''), pkind: safe(sp['Display'] || ''), usage: usage, keyword: safe(t.f && t.f['Keywords'] || (glossAuto ? gsub(sp['Keywords'] || '') : sp['Keywords'] || '')), action: MT_ACT[lc(sp['Action Type'])] || '-',
        range: txt(p, 'Attack Type'), Trigger: txt(p, 'Trigger'), Target: txt(p, 'Target', 'Targets', 'Primary Target') || '-', Effect: txt(p, 'Effect'), Special: [txt(p, 'Special'), txt(p, 'Requirement', 'Requirements') ? '요구 조건: ' + txt(p, 'Requirement', 'Requirements') : '', sp['하우스룰'] ? '하우스룰: ' + safe(sp['하우스룰']) : ''].filter(Boolean).join('<br>'), A_Memo: '', submit: '' };
      var fxT = (ch.fx || {})[p.id], fxAll = m ? (ch.fx || {})['*'] : ''; if ((fxT || fxAll) && window.D4EFx) { var fxC = { str: P.strmod, con: P.conmod, dex: P.dexmod, int: P.intmod, wis: P.wismod, cha: P.chamod, lv: P.Level }, fxO = D4EFx.compile(D4EFx.parse(fxT || '', !!m).ops, fxC).concat(fxAll ? D4EFx.compile(D4EFx.parse(fxAll, true).ops, fxC) : []); if (fxO.length) a.fx = fxO; }
      if (!m) { powers.push({ nonatk: 1, args: a }); return; }
      var set = m.isW ? ['Hit', P.hit] : ['Hit2', P.Hit2], first = m.terms[0], rest = m.terms.slice(1), dmgStr = '', adm = [];
      if (first && first.w && first.w <= 9) dmgStr = first.w + (m.isW ? 'W' : 'W2'); else if (first && !first.w && first.n <= 9) dmgStr = first.n + 'd' + first.d; else if (first) rest = m.terms;
      rest.forEach(function (x) { adm.push(x.w ? (x.w * +m.die.split('d')[0]) + 'd' + m.die.split('d')[1] : x.n + 'd' + x.d); }); if (m.dbonus || !adm.length) adm.push(String(m.dbonus));
      a.AHit = set[0]; a.Attack = { AC: 'AC', Fortitude: 'Fort', Reflex: 'Ref', Will: 'Will' }[m.vs] || 'AC'; a.Amod = String(m.atk - set[1]); a.Damage = dmgStr; a.Dmod = 'None'; a.ADM = adm.join('+').replace(/\+-/g, '-');
      a.Description = txt(p, 'Hit'); a.Miss = txt(p, 'Miss');
      powers.push({ nonatk: 0, args: a });
    });
    /* 장비의 속성 · 파워와 홈브류 특성도 버튼으로: 굴림 없이 내용만 찍는 비공격 틀을 쓴다 */
    var clean = function (x) { return String(x || '').replace(/[\"';]/g, '').trim(); }, blankArgs = function (name, kind, usage, action, range, eff, special, group) {
      return { nonatk: 1, group: group, args: { group: '', pname: clean(name), pkind: safe(kind), usage: usage, keyword: '', action: action, range: range || '-', Trigger: '', Target: '-', Effect: eff, Special: special || '', A_Memo: '', submit: '' } }; };
    (r.worn || []).forEach(function (e) { if (e.t !== 'Magic Item') return; var sp = e.sp || {}, t = T[e.id] || {}, nm0 = t.n || e.n, done = false;
      Object.keys(sp).forEach(function (k) { if (!/^(Power|Utility Power|Attack Power)/.test(k) || !sp[k]) return; var raw = String(sp[k]), u = /Daily/i.test(raw.slice(0, 40) + k) ? '#404040' : /Encounter/i.test(raw.slice(0, 40) + k) ? '#704040' : '#407040';
        var am = /(Standard|Move|Minor|Free|Immediate Interrupt|Immediate Reaction|Opportunity|No) Action|Immediate (Interrupt|Reaction)/i.exec(raw), act = am ? (MT_ACT[lc(am[0])] || MT_ACT[lc(am[0]) + ' action'] || MT_ACT[lc(am[0]).replace(' action', '')] || '-') : '-';
        var ipx = blankArgs(nm0, '장비 파워', u, act, '-', txt(e, k), sp['Property'] ? '속성: ' + txt(e, 'Property') : '', act === '-' ? '0. 장비' : ''); var ifx = (ch.fx || {})[e.id]; if (ifx && window.D4EFx) { var ifo = D4EFx.compile(D4EFx.parse(ifx, false).ops, { str: P.strmod, con: P.conmod, dex: P.dexmod, int: P.intmod, wis: P.wismod, cha: P.chamod, lv: P.Level }); if (ifo.length) ipx.args.fx = ifo; }
        powers.push(ipx); done = true; });
    });
    /* 패시브 묶음마다 버튼 하나: 누르면 그 묶음의 효과가 한꺼번에 찍힌다 */
    passiveGroups(ch, r).groups.forEach(function (g) { if (!g.items.length) return; var pfx = g.items.map(function (it) { var t = (ch.fx || {})['p:' + it.key]; if (!t || !window.D4EFx) return null; var o = D4EFx.compile(D4EFx.parse(t, false).ops, { str: P.strmod, con: P.conmod, dex: P.dexmod, int: P.intmod, wis: P.wismod, cha: P.chamod, lv: P.Level }); return o.length ? { n: clean(it.n), fx: o, ft: o.some(function (q) { return q.to === 't'; }) ? 1 : 0 } : null; }); var x = blankArgs('패시브 · ' + g.n, '패시브 효과 ' + g.items.length + '개', '#407040', '-', '-', g.items.map(function (it) { return '<b>' + safe(it.n) + '</b> ' + safe(it.text); }).join('<br>'), '', '0. 패시브'); x.src = 'pas'; if (pfx.some(Boolean)) x.args.pfx = pfx; powers.push(x); });
    powers.forEach(function (p) { if (!p.src) p.src = /^장비/.test(p.args.pkind) ? 'item' : 'power'; });
    return { name: ch.name || '이름 없음', port: ch.port || '', tok: ch.tok || '', face: ch.face || '', stand: ch.stand || '', cut: ch.cut || '', props: P, skills: skills, powers: powers };
  }

  /* ---------- 파워 카드 ---------- */
  var USE_KO = { 'at-will': '무제한', 'encounter': '조우', 'daily': '일일' };
  var ACT_KO = { 'standard action': '표준 행동', 'move action': '이동 행동', 'minor action': '보조 행동', 'free action': '자유 행동', 'immediate interrupt': '즉시 방해',
    'immediate reaction': '즉시 반응', 'opportunity action': '기회 행동', 'no action': '행동 없음' };
  /* 겹친 칸 이름표: "Hit (2)" → 명중, "Secondary Hit" → 2차 명중, "Tertiary Hit" → 3차 명중 */
  function rowLabel(k) { k = String(k).trim().replace(/ \(\d+\)$/, ''); var m = /^(Secondary|Tertiary) (.+)$/.exec(k), whole = gloss(k) || ROW_KO[k] || F_KO[k]; if (whole) return whole;
    if (m) { var b = gloss(m[2]) || ROW_KO[m[2]] || F_KO[m[2]] || m[2]; return (m[1] === 'Secondary' ? '2차 ' : '3차 ') + b; } return k; }
  var ROW_KO = { 'Trigger': '발동 조건', 'Requirement': '요구 조건', 'Prerequisite': '선행 조건', 'Target': '대상', 'Primary Target': '1차 대상', 'Secondary Target': '2차 대상',
    'Attack': '공격', 'Primary Attack': '1차 공격', 'Secondary Attack': '2차 공격', 'Hit': '명중', 'Miss': '빗나감', 'Effect': '효과', 'Special': '특수', 'Sustain': '유지',
    'Sustain Minor': '유지 (보조)', 'Sustain Standard': '유지 (표준)', 'Sustain Move': '유지 (이동)', 'Augment': '증강', 'Aftereffect': '후속 효과', 'Level': '레벨' };
  var ROW_ORDER = ['Trigger', 'Requirement', 'Prerequisite', 'Target', 'Primary Target', 'Attack', 'Primary Attack', 'Hit', 'Miss', 'Effect', 'Secondary Target', 'Secondary Targets', 'Secondary Attack', 'Secondary Hit', 'Secondary Miss', 'Secondary Effect', 'Tertiary Target', 'Tertiary Attack', 'Tertiary Hit', 'Tertiary Miss', 'Tertiary Effect', 'Aftereffect', 'Sustain', 'Sustain Minor', 'Sustain Move', 'Sustain Standard', 'Special'];
  var PC_SKIP = { 'Power Usage': 1, 'Display': 1, 'Keywords': 1, 'Action Type': 1, 'Attack Type': 1, 'Power Type': 1, 'Class': 1, 'Level': 1, 'type': 1, 'Full Text': 1 };
  /* 주사위 · [W] · 방어 이름을 굵게 */
  var rich = function (t) { return esc(t).replace(/(\d+d\d+|\d+\[W\]|\b(?:AC|Fortitude|Reflex|Will)\b)/g, '<b>$1</b>').replace(/\n\s*/g, '<br>'); };
  function usageKo(p) { var u = lc(p.sp && p.sp['Power Usage']); for (var k in USE_KO) if (u.indexOf(k) >= 0) return USE_KO[k] + (u.replace(k, '').trim() ? ' ' + (p.sp['Power Usage'].replace(new RegExp(k, 'i'), '').trim()) : ''); return (p.sp && p.sp['Power Usage']) || ''; }
  /* 딸린 파워(_ChildPower: Fire Hawk → Fire Hawk Attack 같은 2차 공격 · 연계 파워)는 어미 카드 안에 같이 보여 준다 */
  /* 아이템 파워: 마법 물품의 「Power」 칸 글("Power (Daily): Minor Action. …")을 파워 카드로 만든다. 장비 칸에 낀 것만. */
  var ITEMPW = {};
  function itemPowersOf(e) { if (ITEMPW[e.id]) return ITEMPW[e.id]; var P = String((e.sp || {})['Power'] || '').trim(), out = []; if (!P) return (ITEMPW[e.id] = out);
    var parts = P.split(/\n(?=(?:(?:Attack|Utility) )?(?:Power\s*\(|Utility \())/).filter(function (x) { return /^(?:(?:Attack|Utility) )?(?:Power|Utility)\b/.test(x.trim()); });
    parts.forEach(function (tx0, i) { tx0 = tx0.trim(); var nl = tx0.search(/[:\n]/), hm = /^[^\n]*?\)\s*(?:[:*]\s*)?(?:(?:Daily|Encounter|At-Will)\s*)?(?:\([^)]*\))?/.exec(tx0), head = tx0.split('\n')[0];
      var u = /\b(Daily|Encounter|At-Will|Consumable)\b/i.exec(head), use = u ? u[1].replace(/^./, function (c) { return c.toUpperCase(); }) : 'Daily';
      var am = /\b((?:Standard|Move|Minor|Free|No|Opportunity) Action|Immediate (?:Interrupt|Reaction))\b/i.exec(tx0), act = am ? am[1].replace(/\b\w/g, function (c) { return c.toUpperCase(); }).replace(/ Action$/, ' Action') : '';
      var kw = []; var pm = /\(([^)]*)\)/.exec(head); if (pm) pm[1].split(/[•✦,*]/).forEach(function (k) { k = k.trim(); if (k && !/^(Daily|Encounter|At-Will|Consumable)$/i.test(k) && !/Action$/i.test(k)) kw.push(k); });
      /* 본문: 머리(「Power (…): Minor Action.」)를 떼고, Trigger/Effect 같은 이름표가 있으면 칸으로 나눈다 */
      var body = tx0; if (am) { var ai = tx0.indexOf(am[0]) + am[0].length; body = tx0.slice(ai).replace(/^\)?\s*[.:]?\s*/, ''); } else body = tx0.replace(/^[^:]*:\s*/, '');
      var sp = { 'Power Usage': use, 'Display': 'Item Power', 'Power Type': 'Item', '_Item': e.id }; if (act) sp['Action Type'] = act; if (kw.length) sp['Keywords'] = kw.join(', ');
      var lab = /(?:^|\n|\.\s+)(Trigger|Requirement|Target|Attack|Hit|Miss|Effect|Special|Sustain \w+):\s*/g, lm, marks = []; while ((lm = lab.exec(body))) marks.push({ k: lm[1], at: lm.index + (/^\./.test(lm[0]) ? 1 : 0), end: lab.lastIndex });
      if (marks.length) { var pre = body.slice(0, marks[0].at).trim(); marks.forEach(function (m, j) { var v = body.slice(m.end, j + 1 < marks.length ? marks[j + 1].at : body.length).trim(); if (v) sp[m.k] = v; }); if (pre) sp['Effect'] = pre + (sp['Effect'] ? '\n' + sp['Effect'] : ''); }
      else if (body.trim()) sp['Effect'] = body.trim();
      out.push({ id: e.id + '~p' + (i + 1), n: e.n + (parts.length > 1 ? ' (' + (i + 1) + ')' : ''), t: 'Power', src: e.src, sp: sp, cat: [], _item: e.id }); });
    return (ITEMPW[e.id] = out); }
  function itemPowers(ch) { var q = (ch && ch.eq) || {}, seen = {}, out = []; Object.keys(q).forEach(function (k) { [].concat(q[k] || []).forEach(function (id) { var e = db.byId[id]; if (!e || seen[id] || e.t === 'Power') return; seen[id] = 1; itemPowersOf(e).forEach(function (p) { out.push(p); }); }); }); return out; }
  function childPowers(p) { return String((p.sp || {})['_ChildPower'] || '').split(',').map(function (x) { return db.byId[x.trim()]; }).filter(function (c) { return c && c.t === 'Power' && c.id !== p.id; }); }
  function isChildOwned(r, p) { var par = (p.sp || {})['_ParentPower']; return !!(par && r.owned[par] && childPowers(r.owned[par]).some(function (c) { return c.id === p.id; })); }
  /* 사이오닉 증강 버전(_AugmentVersions: 「… (Augment N)」)도 어미 카드 안에 접어서 넣는다 */
  function augVersions(p) { return String((p.sp || {})['_AugmentVersions'] || '').split(',').map(function (x) { return db.byId[x.trim()]; }).filter(function (c) { return c && c.t === 'Power'; }); }
  function augLabel(c) { var m = /\(Augment (\d+)\)\s*$/.exec(c.n); return m ? '증강 ' + m[1] + (m[1] === '0' ? ' · 포인트 안 씀' : ' · 파워 포인트 ' + m[1]) : c.n; }
  function powerCard(p, open, nested) {
    var kids = nested ? [] : childPowers(p), augs = nested ? [] : augVersions(p);
    p = eff(p, calcCtx && calcCtx.ch);
    var sp = p.sp || {}, cls = usageClass(p), act = sp['Action Type'] || '', rows = [], seen = {};
    var add = function (k) { if (sp[k] == null || seen[k] || PC_SKIP[k] || k.charAt(0) === '_') return; seen[k] = 1; rows.push('<div class="pr' + (k === '하우스룰' ? ' hr' : '') + '"><b>' + esc(k === '하우스룰' ? k : rowLabel(k)) + '</b><span>' + (k === '하우스룰' ? rich(sp[k]) : tx(p, k, sp[k])) + '</span></div>'); };
    add('하우스룰'); ROW_ORDER.forEach(add); Object.keys(sp).forEach(add);
    if (calcCtx && calcCtx.r.mods) calcCtx.r.mods.forEach(function (m) { if (m.name !== p.n || (m.type && m.type !== 'Power') || m.value == null || !String(m.value).trim() || /^[\d.+-]+$/.test(String(m.value).trim())) return;
      var se = db.byId[m.src]; rows.push('<div class="pr md"><b>' + esc(se ? se.n : m.field) + '</b><span>' + (tv && glossAuto ? rich(gsub(m.value)) : rich(m.value)) + '</span></div>'); });
    var tv = tview(p), sub = function (x) { return tv && glossAuto ? gsub(x) : x; };
    var h = '<details class="pc ' + cls + '"' + (open ? ' open' : '') + ' data-pc="' + esc(p.id) + '"><summary><span class="pn">' + tname(p) + '</span>' + (function () { var a0 = attackInfo(p), m0 = a0 && a0.main; return m0 ? '<span class="ps">' + (m0.atk >= 0 ? '+' : '') + m0.atk + (m0.dmg ? ' · ' + esc(m0.dmg) : '') + '</span>' : ''; })() + (cls.indexOf('util') >= 0 ? '<span class="pu ' + USE_CL[usageOrder(p)] + '">' + USE_KO[usageOrder(p)] + '</span>' : '') + '<span class="pd">' + esc(sp['Display'] || '') + '</span></summary>';
    h += '<div class="pm"><span><i class="dot"></i>' + esc(usageKo(p)) + (sp['Keywords'] ? ' ✦ ' + (tv && TR(p) && (TR(p).f || {})['Keywords'] ? esc(TR(p).f['Keywords']) : esc(sub(sp['Keywords']))) : '') + '</span><span>' + esc(gloss(act) || ACT_KO[lc(act)] || act) + (sp['Attack Type'] ? ' · ' + (tv && TR(p) && (TR(p).f || {})['Attack Type'] ? esc(TR(p).f['Attack Type']) : esc(sub(sp['Attack Type']))) : '') + '</span></div>';
    var aiA = attackInfo(p), ai = aiA && aiA.main; if (ai) h += '<div class="pa" title="누르면 보정 내역"><span>공격 <b>' + (ai.atk >= 0 ? '+' : '') + ai.atk + '</b> vs ' + esc(gloss(ai.vs === 'AC' ? 'Armor Class' : ai.vs) || ai.vs) + '</span>' + (ai.dmg ? '<span>피해 <b>' + esc(ai.dmg) + '</b></span>' : '') + (ai.crit ? '<span class="cr">치명타 ' + esc(ai.crit) + '</span>' : '') + (aiA.off ? '<span class="cr">보조 손 ' + (aiA.off.atk >= 0 ? '+' : '') + aiA.off.atk + ' · ' + esc(aiA.off.dmg) + '</span>' : '') + (aiA.sec ? '<span class="cr">2차 ' + (aiA.sec.atk >= 0 ? '+' : '') + aiA.sec.atk + ' vs ' + esc(aiA.sec.vs === 'Fortitude' ? 'Fort' : aiA.sec.vs === 'Reflex' ? 'Ref' : aiA.sec.vs) + (aiA.sec.dmg ? ' · ' + esc(aiA.sec.dmg) : '') + '</span>' : '') + (ai.tool ? '<small' + (ai.noTool ? ' class="notool"' : '') + '>' + esc(ai.tool) + ' ▾</small>' : '<small>▾</small>') + '</div>';
    h += '<div class="pb">' + (p.fl ? '<p class="pfl">' + (tv && TR(p) && TR(p).fl ? esc(TR(p).fl) : esc(p.fl)) + '</p>' : '') + rows.join('') + (p.body && !rows.length ? '<div class="pr"><span>' + tx(p, '_body', p.body) + '</span></div>' : '') +
      (kids.length ? '<div class="pkids"><small>이 파워에 딸린 파워</small>' + kids.map(function (c) { return powerCard(c, true, true); }).join('') + '</div>' : '') +
      (augs.length ? '<div class="pkids paug"><small>증강 버전 — 누르면 펼쳐져요</small>' + augs.map(function (c) { return '<div class="paugl">' + esc(augLabel(c)) + '</div>' + powerCard(c, false, true); }).join('') + '</div>' : '') +
      (p.src && !nested ? '<p class="psrc">' + esc(p.src.join(', ')) + '</p>' : '') + '</div>' + trBar(p) + '</details>';
    return h;
  }

  /* ---------- 시트 ---------- */
  /* 고른 칸의 레벨(파워 · 재주가 몇 레벨 칸에서 왔는지). 레벨 칸이 아니면 파워 자체 레벨. */
  function slotLevels(r) { var m = {}; (r.selects || []).forEach(function (x) { var se = db.byId[x.from]; if (!se || se.t !== 'Level') return; (x.picked || []).forEach(function (id) { if (!(id in m)) m[id] = +se.n || 0; }); }); return m; }
  function pwLevel(p, lv) { return (lv && lv[p.id] != null) ? lv[p.id] : (+((p.sp || {})['Level']) || 0); }
  function usageOrder(p) { var u = lc((p.sp || {})['Power Usage']); return u.indexOf('daily') >= 0 ? 2 : u.indexOf('encounter') >= 0 ? 1 : 0; }
  var USE_KO = ['무제한', '조우', '일일'], USE_CL = ['at', 'enc', 'day'];
  /* 기본으로 누구나 가진 파워(기본 공격 · 밀치기 · 붙잡기 · 기회 공격 · 숨 고르기): 시트에서 골라 숨길 수 있다 */
  var BASIC_PW = { 'Melee Basic Attack': 1, 'Ranged Basic Attack': 1, 'Bull Rush Attack': 1, 'Grab Attack': 1, 'Opportunity Attack': 1, 'Second Wind': 1 };
  function isBasicPw(p) { return !!BASIC_PW[p.n]; }
  var pwCfgOpen = false;
  function nmP(p) { var t = cur && cur.tr && cur.tr[p.id]; return (t && t.n) || p.n; }
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
    return (cf ? sec('cf', '클래스 특성 <span class="hint">누르면 내용 · 번역 / 원문 탭</span>', cf) : '') + (rt ? sec('rt', '종족 특성', rt) : '') + hbSec + (function () { var lg = ownedOf(r, 'Language'); return lg.length ? sec('lang', '언어 <span class="hint">' + lg.length + '</span>', '<div class="ltags">' + lg.map(function (e) { return '<span data-el="' + esc(e.id) + '">' + esc(nm(e)) + '</span>'; }).join('') + '</div>') : ''; })() +
      (pf.length ? sec('prof', '숙련 <span class="hint">' + pf.length + '</span>', '<div class="tags">' + pf.map(function (e) { return '<span data-el="' + esc(e.id) + '">' + esc(glossAuto ? gsub(e.n) : e.n) + '</span>'; }).join('') + '</div>', false) : '');
  }
  function sheetHtml(ch, r, who) {
    ch.tr = shTr(ch.tr); trCtx = { map: ch.tr, edit: ch === cur }; calcCtx = { r: r, ch: ch };
    var s = r.stats, hp = s['hit points'] || 0, half = Math.floor(ch.level / 2);
    var race = ownedOf(r, 'Race')[0], cls = ownedOf(r, 'Class')[0];
    var st = function (k, label) { return '<div data-why="' + esc(k) + '"><small>' + label + '</small><b>' + (s[k] || 0) + '</b></div>'; };
    var pmine = ch === cur, h = '<div class="shead">' + (ch.port || pmine ? '<div class="pslot' + (ch.port ? '' : ' empty') + '"' + (pmine ? ' data-port="1" title="그림을 끌어다 놓거나 눌러서 고르기"' : '') + '>' + (ch.port ? '<img src="' + esc(ch.port) + '" alt="">' + (pmine ? '<button class="px" data-portdel="1" title="포트 빼기">×</button><span class="pchg">바꾸기</span>' : '') : '<span class="pnone">포트<small>끌어다 놓기<br>또는 눌러서 고르기</small></span>') +
      (ch.tok || pmine ? '<span class="ptok' + (ch.tok ? '' : ' empty') + '"' + (pmine ? ' data-tok="1" title="토큰 그림 — 끌어다 놓거나 눌러서 고르기. 자르지 않고 통째로 보관하고, 맵툴 토큰은 이 그림으로 나가요"' : ' title="토큰 그림"') + '>' + (ch.tok ? '<img src="' + esc(ch.tok) + '" alt="">' + (pmine ? '<button class="tx" data-tokdel="1" title="토큰 그림 빼기">×</button>' : '') : '<small>토큰</small>') + '</span>' : '') + '</div>' : '') + '<div class="sh2"><h2>' + esc(ch.name || '이름 없음') + ' <span class="hint">' + esc(race ? nm(race) : '종족 미정') + ' ' + esc(cls ? nm(cls) : '클래스 미정') + ' · ' + ch.level + '레벨' + (who ? ' · ' + esc(who) : '') + '</span></h2>';
    var hsv = Math.floor(hp / 4) + (s['healing surge value'] || 0);
    h += '<div class="hpbar" data-why="hit points" title="눌러서 HP 내역 보기"><div class="hpfill"></div><div class="hpmid"></div><span class="hpl"><small>HP</small><b>' + hp + '</b></span><span class="hpb"><small>반죽음</small><b>' + Math.floor(hp / 2) + '</b></span></div>';
    h += '<div class="vrow"><div class="surge"><span class="sgt">원기 <small>Healing Surge</small></span><span data-why="healing surge value"><small>회복량</small><b>' + hsv + '</b></span><span data-why="healing surges"><small>횟수</small><b>' + (s['healing surges'] || 0) + '<i>회</i></b></span></div>' +
      '<div class="vit mv">' + (race ? st('speed', '이동 속도') : '<div title="이동 속도는 종족에서 와요. 종족을 고르면 채워져요"><small>이동 속도</small><b>—</b></div>') + st('initiative', '우선권') + '</div></div>';
    h += '<div class="vit def">' + st('ac', 'AC') + st('fortitude defense', 'Fort') + st('reflex defense', 'Ref') + st('will defense', 'Will') + '</div></div></div>';
    if (s['inherent attack'] || s['inherent defense']) h += '<p class="inh">내재 보너스 · 공격 굴림과 피해 굴림 +' + (s['inherent attack'] || 0) + ' · 방어 +' + (s['inherent defense'] || 0) + ' <span class="hint">강화 보너스라 마법 장비의 강화와는 큰 쪽만 적용돼요. 치명타 주사위는 마법 무기 · 도구의 치명타 속성으로 붙어요</span></p>';
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
    h += strip + sec('skill', '기술 <span class="hint">● 숙련</span>', skl) + bioHtml(ch);
    if (who) h += extraHtml(ch, r);
    var hidePw = ch.hidePw || [], basics = ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && isBasicPw(p); }), slotLv = slotLevels(r);
    var pws = ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && !isChildOwned(r, p) && hidePw.indexOf(p.id) < 0; }).map(function (p) { return eff(p, ch); }).concat(itemPowers(ch).map(function (p) { return eff(p, ch); })), pb = '';
    [['at', '무제한'], ['enc', '조우'], ['day', '일일'], ['util', '활용'], ['item', '아이템 파워']].forEach(function (g) {
      var list = pws.filter(function (p) { return g[0] === 'item' ? !!p._item : !p._item && usageClass(p) === g[0]; }).sort(function (a, b) { return (g[0] === 'util' || g[0] === 'item' ? usageOrder(a) - usageOrder(b) : 0) || (isBasicPw(a) ? 1 : 0) - (isBasicPw(b) ? 1 : 0) || pwLevel(a, slotLv) - pwLevel(b, slotLv) || (a.n < b.n ? -1 : 1); });
      if (!list.length) return;
      pb += sec('pw_' + g[0], '<span class="pgh ' + g[0] + '"><i></i>' + g[1] + '</span> <span class="hint">' + list.length + '</span>', '<div class="pcards">' + list.map(function (p) { return powerCard(p, false); }).join('') + '</div>');
    });
    h += sec('power', '파워 <span class="hint">' + pws.length + '개 · 이름을 누르면 펼쳐져요</span> <button class="mini ghost" data-pcall="1">모두 펼치기 / 접기</button>' + (ch === cur && basics.length ? ' <button class="mini ghost" data-pwcfg="1" title="기본 공격 · 밀치기 · 붙잡기처럼 누구나 가진 파워를 골라서 숨겨요">설정' + (hidePw.length ? ' · ' + hidePw.length + '개 숨김' : '') + '</button>' : ''),
      (ch === cur && pwCfgOpen ? '<div class="pwcfg"><b>기본 파워 숨기기</b><span class="hint">체크한 것은 시트와 한 장 요약에서 빠져요 (맵툴 내보내기에는 그대로 나가요)</span><div class="pwcfg-l">' + basics.map(function (p) { return '<label><input type="checkbox" data-pwhide="' + esc(p.id) + '"' + (hidePw.indexOf(p.id) >= 0 ? ' checked' : '') + '> ' + esc(nmP(p)) + '</label>'; }).join('') + '</div></div>' : '') + (pb || '<p class="hint">아직 없어요.</p>'));
    if (ch === cur || (r.worn && r.worn.length)) h += sec('gear', '장비 <span class="hint">' + (r.worn || []).length + (ch === cur ? ' · 줄을 누르면 고르거나 바꿀 수 있어요' : '') + '</span>', gearHtml(ch, r));
    var feats = ownedOf(r, 'Feat'), mine = ch === cur, fsel = {}, fopen = [];
    (r.selects || []).forEach(function (x) { if (x.type !== 'Feat' || x.swap) return; (x.picked || []).forEach(function (id) { fsel[id] = x; }); if ((x.picked || []).length < x.number && !x.optional) fopen.push(x); });
    var fwhere = function (x) { var se = db.byId[x.from]; return !se ? '' : se.t === 'Level' ? se.n + '레벨' : nm(se); };
    if (feats.length || (mine && fopen.length)) h += sec('feat', '재주 <span class="hint">' + feats.length + (mine ? ' · 「바꾸기」로 여기서 바로 고쳐요' : '') + '</span>', '<div class="ftiles">' + feats.map(function (e) { var t = (ch.tr || {})[e.id], d = (e.sp && e.sp['Short Description']) || '', x = fsel[e.id];
      return '<div class="ftile' + (e.t === 'Feat' ? ' t-' + lc((e.sp || {})['Tier'] || 'heroic') : '') + '" data-el="' + esc(e.id) + '"><b>' + esc((t && t.n) || nm(e)) + (prereq(e, r, ch.level) === 'no' ? PRE_BADGE.no : '') + '</b>' + (d ? '<small>' + esc(t && t.f && t.f['Short Description'] && !trOrig[e.id] ? t.f['Short Description'] : glossAuto ? gsub(d) : d) + '</small>' : '') +
        (mine && x ? '<span class="ft-a"><i>' + esc(fwhere(x)) + '</i><button class="mini ghost" data-fsel="' + esc(x.key) + '">바꾸기</button><button class="mini ghost" data-fdel="' + esc(x.key) + '" data-fid="' + esc(e.id) + '" title="빼기">×</button></span>' : '') + '</div>'; }).join('') +
      (mine ? fopen.map(function (x) { return '<div class="ftile todo" data-fsel="' + esc(x.key) + '"><b>+ 재주 고르기</b><small>' + esc(fwhere(x)) + ' · 비어 있어요</small></div>'; }).join('') : '') + '</div>');
    /* 그 밖의 보정: 계산은 됐지만 위에 자리가 없는 값들 + 조건부 보정 */
    var OTH = { 'saving throws': '내성 굴림', 'death saving throws': '죽음 내성 굴림', 'attack rolls': '공격 굴림', 'damage rolls': '피해 굴림', 'damage': '피해', 'inherent attack': '내재 공격 · 피해', 'action points': '액션 포인트' }, oth = '', cond = '';
    Object.keys(s).sort().forEach(function (k) { if (!s[k]) return; var lab = OTH[k], m;
      if (!lab && (m = /^resist:(.+)$/.exec(k))) lab = '저항 ' + (gloss(m[1]) || m[1]);
      if (!lab && (m = /^(.+):(attack|damage)$/.exec(k))) lab = (m[2] === 'attack' ? '공격' : '피해') + ' (' + m[1].split(',').map(function (x) { x = x.trim(); var e2 = db.byId[x.toUpperCase()]; return e2 ? e2.n : gloss(x.replace(/ group$/, '')) || x; }).join(' · ') + ')';
      if (lab) oth += '<div data-why="' + esc(k) + '"><small>' + esc(lab) + '</small><b>' + (s[k] > 0 ? '+' : '') + s[k] + '</b></div>'; });
    var pas = passiveHtml(ch, r);
    if (oth || pas.n || ch === cur) h += sec('other', '패시브 효과 <span class="hint">' + pas.n + ' · 지금 적용 중인 글로 된 효과</span>', pas.html + (oth ? '<div class="pasg"><div class="pasg-h"><b>그 밖의 수치 보정</b></div><div class="vit oth">' + oth + '</div></div>' : ''));
    if (r.warnings.length) h += '<p class="hint">확인 필요: ' + esc(r.warnings.slice(0, 5).join(' / ')) + '</p>';
    return h;
  }
  /* ---------- 자동화 구문 탭 (2026-11-24) ----------
   * ch.fx = { 파워 id: 구문 글 }. 추천은 영어 원문을 읽어 보여 주기만 하고, 「추천 넣기」 를 눌러야 시트에 들어간다. 내보낼 때는 시트 구문만 나간다. */
  function fxPowers() { var out = []; ownedOf(res, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && p.n !== 'Second Wind'; }).forEach(function (p) { var av = augVersions(p); if (av.length) av.forEach(function (c) { out.push(c); }); else out.push(p); }); return out; }
  function fxTab() {
    var F = window.D4EFx, bx = document.createElement('div'); bx.className = 'hbpick'; if (!F) { bx.textContent = '구문 도구를 읽지 못했어요.'; return bx; } cur.fx = cur.fx || {};
    var list = fxPowers(), T = cur.tr || {}, nSug = 0, nErr = 0, actx = { r: res, ch: cur }, txt = function (p, k) { var t = T[p.id], f = (t && t.f) || {}, sp = p.sp || {}; return String(f[k] || (glossAuto ? gsub(sp[k] || '') : sp[k] || '')); };
    var SUG = {}, cards = list.map(function (p0) { var p = eff(p0, cur), sp = p.sp || {}, isAtk = !!attackInfo(p, actx), have = cur.fx[p.id] || '', sug = SUG[p.id] = F.suggest(p0.sp || {}, isAtk), pr = F.parse(have, isAtk), u = usageClass(p), same = have && sug.join('\n') === F.str(pr.ops, isAtk);
      if (sug.length && !have) nSug++; if (pr.errs.length) nErr++;
      var rows = [['명중', 'Hit'], ['빗나감', 'Miss'], ['효과', 'Effect']].map(function (k) { var t = txt(p, k[1]); return t ? '<div class="fx-src"><b>' + k[0] + '</b> ' + esc(t) + '</div>' : ''; }).join('');
      return '<div class="fx-card' + (pr.errs.length ? ' bad' : have ? ' on' : '') + '"><div class="fx-h"><b>' + esc((T[p.id] && T[p.id].n) || p.n) + '</b> <span class="hint">' + (u === 'day' ? '일일' : u === 'enc' ? '조우' : '상시') + (isAtk ? ' · 공격' : '') + '</span></div>' + rows +
        '<textarea data-fx="' + esc(p.id) + '" rows="' + Math.max(2, have.split('\n').length) + '" placeholder="' + (isAtk ? '예) 상태 멍함 내성' : '예) 효과: 임시HP 건강') + '">' + esc(have) + '</textarea>' +
        (pr.errs.length ? '<div class="fx-err">' + pr.errs.map(function (e) { return e.line + '번째 줄: ' + esc(e.msg); }).join('<br>') + '</div>' : '') +
        (sug.length && !same ? '<div class="fx-sug"><span class="hint">추천</span> <code>' + sug.map(esc).join('</code> <code>') + '</code> <button class="mini" data-fxuse="' + esc(p.id) + '">추천 넣기</button></div>' : (sug.length ? '<div class="fx-sug"><span class="hint">추천과 같아요</span></div>' : '')) + '</div>'; }).join('');
    /* 장비 파워: 입고 있는 마법 물품 가운데 파워가 있는 것. 구문은 그 물품의 파워 단추에 실린다 */
    var items = (res.worn || []).filter(function (e) { return e.t === 'Magic Item' && Object.keys(e.sp || {}).some(function (k) { return /^(Power|Utility Power|Attack Power)/.test(k) && e.sp[k]; }); });
    cards += items.map(function (e) { var sp = e.sp || {}, have = cur.fx[e.id] || '', pk = Object.keys(sp).filter(function (k) { return /^(Power|Utility Power|Attack Power)/.test(k) && sp[k]; }), sug = SUG[e.id] = [], pr = F.parse(have, false);
      pk.forEach(function (k) { F.suggest({ Power: sp[k] }, false).forEach(function (l) { if (sug.indexOf(l) < 0) sug.push(l); }); }); var same = have && sug.join('\n') === F.str(pr.ops, false); if (sug.length && !have) nSug++; if (pr.errs.length) nErr++;
      return '<div class="fx-card' + (pr.errs.length ? ' bad' : have ? ' on' : '') + '"><div class="fx-h"><b>' + esc((T[e.id] && T[e.id].n) || e.n) + '</b> <span class="hint">장비 파워</span></div>' + pk.map(function (k) { return '<div class="fx-src"><b>파워</b> ' + esc(txt(e, k)) + '</div>'; }).join('') + (sp['Property'] ? '<div class="fx-src"><b>속성</b> ' + esc(txt(e, 'Property')) + '</div>' : '') +
        '<textarea data-fx="' + esc(e.id) + '" rows="' + Math.max(2, have.split('\n').length) + '" placeholder="예) 보정 피해+2 자신 조우">' + esc(have) + '</textarea>' + (pr.errs.length ? '<div class="fx-err">' + pr.errs.map(function (x) { return x.line + '번째 줄: ' + esc(x.msg); }).join('<br>') + '</div>' : '') +
        (sug.length && !same ? '<div class="fx-sug"><span class="hint">추천</span> <code>' + sug.map(esc).join('</code> <code>') + '</code> <button class="mini" data-fxuse="' + esc(e.id) + '">추천 넣기</button></div>' : (sug.length ? '<div class="fx-sug"><span class="hint">추천과 같아요</span></div>' : '')) + '</div>'; }).join('');
    /* 패시브(재주 · 특성 · 장비 속성 · 홈브류 · 직접 적은 것): 구문을 적으면 맵툴 행동판 패시브 탭의 그 줄에 「발동」 단추가 생긴다. 저장 칸 = 'p:' + 패시브 열쇠 */
    var pasCards = ''; passiveGroups(cur, res).groups.forEach(function (g) { g.items.forEach(function (it) { var id = 'p:' + it.key, have = cur.fx[id] || '', el = it.el ? db.byId[it.el] : null, esp = (el && el.sp) || {}, src = it.key.charAt(0) === 'i' ? [esp['Property'], esp['Critical'], esp['Special']].filter(Boolean).join(' ') : (esp['Benefit'] || esp['Short Description'] || (el && el.body) || ''), sug = SUG[id] = src ? F.suggest({ Effect: src }, false) : [], pr = F.parse(have, false), same = have && sug.join('\n') === F.str(pr.ops, false);
      if (sug.length && !have) nSug++; if (pr.errs.length) nErr++;
      pasCards += '<div class="fx-card' + (pr.errs.length ? ' bad' : have ? ' on' : '') + '"><div class="fx-h"><b>' + esc(it.n) + '</b> <span class="hint">패시브 · ' + esc(g.n) + '</span></div><div class="fx-src">' + esc(it.text) + '</div>' +
        '<textarea data-fx="' + esc(id) + '" rows="' + Math.max(1, have.split('\n').length) + '" placeholder="발동 단추를 눌렀을 때 걸 효과 · 예) 보정 AC+1,반사+1 자신">' + esc(have) + '</textarea>' + (pr.errs.length ? '<div class="fx-err">' + pr.errs.map(function (x) { return x.line + '번째 줄: ' + esc(x.msg); }).join('<br>') + '</div>' : '') +
        (sug.length && !same ? '<div class="fx-sug"><span class="hint">추천</span> <code>' + sug.map(esc).join('</code> <code>') + '</code> <button class="mini" data-fxuse="' + esc(id) + '">추천 넣기</button></div>' : '') + '</div>'; }); });
    if (pasCards) cards += '<h4 style="margin:14px 0 4px">패시브 <span class="hint">적어 두면 행동판 패시브 탭에 「발동」 단추가 생겨요. 「~하면」 꼴 효과를 손으로 켤 때 써요</span></h4>' + pasCards;
    var allHave = cur.fx['*'] || '', allPr = F.parse(allHave, true), allCard = '<div class="fx-card' + (allPr.errs.length ? ' bad' : allHave ? ' on' : '') + '"><div class="fx-h"><b>모든 공격 파워</b> <span class="hint">공격할 때마다 같이 붙는 줄 · 예) 파이터의 표식 <code>효과: 상태 마크</code></span></div><textarea data-fx="*" rows="' + Math.max(1, allHave.split('\n').length) + '" placeholder="예) 효과: 상태 마크">' + esc(allHave) + '</textarea>' + (allPr.errs.length ? '<div class="fx-err">' + allPr.errs.map(function (e) { return e.line + '번째 줄: ' + esc(e.msg); }).join('<br>') + '</div>' : '') + '</div>';
    cards = allCard + cards;
    bx.innerHTML = '<p class="hint">파워마다 한 줄에 효과 하나씩 적으면 맵툴 토큰에 실려 자동으로 걸려요. <code>상태 멍함 내성</code> · <code>지속피해 5 화염</code> · <code>빗나감: 반감</code> · <code>효과: 임시HP 건강</code> · <code>밀기 2</code> · <code>넘어뜨리기</code> · <code>회복 서지</code> · <code>기타 저항 5 자신</code>(걸어 두는 글 효과) · <code>내성굴림 +5</code> · <code>보정 명중+2,피해+4 자신 조우</code>(굴림에 실제로 더해짐 · AC 인내 반사 의지 모든방어 · 내명중 내피해 = 이 대상에게 내가 칠 때) · <code>메모 글</code>. 지속: 내성 · 내다음턴끝(기본) · 내다음턴시작 · 대상다음턴끝 · 조우. 조건이 붙은 효과는 적지 말고 손으로 처리해 주세요.</p>' +
      '<div class="pas-bar"><button class="mini" data-fxall="1">빈 칸을 추천으로 채우기 (' + nSug + ')</button><span class="hint">적은 칸 ' + Object.keys(cur.fx).filter(function (k) { return k !== '*'; }).length + ' · 파워 ' + list.length + (nErr ? ' · 오류 ' + nErr : '') + '</span></div>' + (cards || '<p class="hint">파워가 아직 없어요.</p>');
    var setFx = function (id, v) { v = String(v || '').replace(/\r/g, '').replace(/\n{2,}/g, '\n').trim(); if (v) cur.fx[id] = v; else delete cur.fx[id]; };
    bx.onchange = function (ev) { var t = ev.target; if (!t.hasAttribute || !t.hasAttribute('data-fx')) return; setFx(t.getAttribute('data-fx'), t.value); saveChars(); rebuild(); };
    bx.onclick = function (ev) { var u = ev.target.closest('[data-fxuse]'), al = ev.target.closest('[data-fxall]'); if (!u && !al) return;
      Object.keys(SUG).forEach(function (id) { if (u ? id !== u.getAttribute('data-fxuse') : (!!cur.fx[id] || id.indexOf('p:') === 0)) return; /* 한꺼번에 채우기는 패시브를 건너뛴다(조건 글이 많아서) */ if (SUG[id].length) setFx(id, SUG[id].join('\n')); }); saveChars(); rebuild(); };
    return bx; }
  /* 패시브 순서 옮기기. kind = 'g' 묶음 | 'i' 효과. to = {g:묶음, i:효과키, after:bool} 로 놓거나 step(±1) 으로 한 칸 */
  function pasMove(kind, id, to, step) {
    if (!cur || !res) return; var pg = cur.pg = cur.pg || {}, P = passiveGroups(cur, res), gids = P.groups.map(function (g) { return g.id; });
    if (kind === 'g') { var shown = P.groups.filter(function (g) { return g.items.length || g.custom; }).map(function (g) { return g.id; }), from = gids.indexOf(id); if (from < 0) return; var tgt;
      if (to) { if (!to.g || to.g === id) return; tgt = to.g; gids.splice(from, 1); gids.splice(gids.indexOf(tgt) + (to.after ? 1 : 0), 0, id); }
      else { var si = shown.indexOf(id), ti = si + step; if (si < 0 || ti < 0 || ti >= shown.length) return; tgt = shown[ti]; gids.splice(from, 1); gids.splice(gids.indexOf(tgt) + (step > 0 ? 1 : 0), 0, id); }
      pg.go = gids; }
    else { var srcG = null; P.groups.forEach(function (g) { if (g.items.some(function (it) { return it.key === id; })) srcG = g; }); if (!srcG) return; var dstG = srcG, ref = null, after = false;
      if (to) { dstG = P.groups.filter(function (g) { return g.id === to.g; })[0]; if (!dstG) return; ref = to.i && to.i !== id ? to.i : null; after = !!to.after; if (to.i === id) return; }
      else { var k = srcG.items.map(function (it) { return it.key; }), ci = k.indexOf(id), ni = ci + step; if (ni < 0 || ni >= k.length) return; ref = k[ni]; after = step > 0; }
      var flat = []; P.groups.forEach(function (g) { var keys = g.items.map(function (it) { return it.key; }).filter(function (x) { return x !== id; }); if (g === dstG) { var at2 = ref ? keys.indexOf(ref) : -1; if (at2 < 0) keys.push(id); else keys.splice(at2 + (after ? 1 : 0), 0, id); } flat = flat.concat(keys); });
      pg.io = flat;
      if (dstG !== srcG) { if (id.indexOf('u:') === 0) (pg.cu || []).forEach(function (c) { if ('u:' + c.id === id) c.g = dstG.id; }); else (pg.at = pg.at || {})[id] = dstG.id; } }
    saveChars(); rebuild(); }
  function wireSheet(box, r) {
    var pasDrag = null, pasClear = function () { box.querySelectorAll('.pas-over,.pas-over-b').forEach(function (x) { x.classList.remove('pas-over', 'pas-over-b'); }); };
    var pasTarget = function (ev) { if (!pasDrag) return null; var it = ev.target.closest('[data-pasit]'), gp = ev.target.closest('[data-pasg]'); if (!gp) return null; var el = pasDrag.kind === 'i' && it ? it : gp, rc = el.getBoundingClientRect();
      return { el: el, g: gp.getAttribute('data-pasg'), i: pasDrag.kind === 'i' && it ? it.getAttribute('data-pasit') : null, after: ev.clientY > rc.top + rc.height / 2 }; };
    box.ondragstart = function (ev) { var h = ev.target.closest && ev.target.closest('[data-pasdrag]'); if (!h) return; var v = h.getAttribute('data-pasdrag'); pasDrag = { kind: v.slice(0, 1), id: v.slice(2) }; try { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', v); var holder = h.closest(pasDrag.kind === 'g' ? '[data-pasg]' : '[data-pasit]'); if (holder && ev.dataTransfer.setDragImage) ev.dataTransfer.setDragImage(holder, 12, 12); } catch (e) {} };
    box.ondragover = function (ev) { var t = pasTarget(ev); if (!t) return; ev.preventDefault(); pasClear(); t.el.classList.add(t.after ? 'pas-over-b' : 'pas-over'); };
    box.ondragend = function () { pasDrag = null; pasClear(); };
    box.ondrop = function (ev) { var t = pasTarget(ev); if (!t) return; ev.preventDefault(); var d = pasDrag; pasDrag = null; pasClear(); pasMove(d.kind, d.id, { g: t.g, i: t.i, after: d.kind === 'g' || t.i ? t.after : true }); };
    box.onchange = function (ev) { var t = ev.target; if (!t.getAttribute || box.id !== 'sheet') return;
      if (t.hasAttribute('data-pwhide')) { var hid = t.getAttribute('data-pwhide'), hl = (cur.hidePw || []).filter(function (x) { return x !== hid; }); if (t.checked) hl.push(hid); cur.hidePw = hl; saveChars(); rebuild(); return; }
      var pg = cur.pg = cur.pg || {}, hit = true;
      if (t.hasAttribute('data-pasat')) { var k = t.getAttribute('data-pasat'), v = t.value; if (k.indexOf('u:') === 0) { (pg.cu || []).forEach(function (c) { if ('u:' + c.id === k) { if (v === '_hide') c.del = 1; else c.g = v; } }); pg.cu = (pg.cu || []).filter(function (c) { return !c.del; }); }
        else if (v === '_hide') (pg.hide = pg.hide || {})[k] = 1; else (pg.at = pg.at || {})[k] = v; }
      else if (t.hasAttribute('data-pastx')) { var k2 = t.getAttribute('data-pastx'); if (k2.indexOf('u:') === 0) (pg.cu || []).forEach(function (c) { if ('u:' + c.id === k2) c.text = t.value; }); else (pg.tx = pg.tx || {})[k2] = t.value; }
      else if (t.hasAttribute('data-pascn')) (pg.cu || []).forEach(function (c) { if (c.id === t.getAttribute('data-pascn')) c.n = t.value.trim() || '효과'; });
      else if (t.hasAttribute('data-bio')) { (cur.bio = cur.bio || {})[t.getAttribute('data-bio')] = t.value.trim(); saveChars(); return; }
      else if (t.hasAttribute('data-pasname')) { var gid = t.getAttribute('data-pasname'), cg = (pg.groups || []).filter(function (x) { return x.id === gid; })[0]; if (cg) cg.n = t.value.trim() || cg.n; else (pg.nm = pg.nm || {})[gid] = t.value.trim(); }
      else hit = false;
      if (hit) { saveChars(); rebuild(); } };
    box.onclick = function (ev) {
      if (ev.target.closest('[data-whyx]')) { box.querySelector('#why').hidden = true; return; }
      if (ev.target.closest('[data-pcall]')) { ev.preventDefault(); var all = box.querySelectorAll('details.pc'), any = false; all.forEach(function (d) { if (!d.open) any = true; }); all.forEach(function (d) { d.open = any; }); return; }
      if (ev.target.closest('[data-pwcfg]')) { ev.preventDefault(); pwCfgOpen = !pwCfgOpen; rebuild(); return; }
      if (ev.target.closest('[data-tokdel]')) { ev.stopPropagation(); if (cur.tok) { delete cur.tok; rebuild(); } return; }
      if (ev.target.closest('[data-tok]')) { ev.stopPropagation(); $('tokFile').click(); return; }
      if (ev.target.closest('[data-portdel]')) { if (cur.port) { delete cur.port; rebuild(); } return; }
      if (ev.target.closest('[data-port]')) { $('portFile').click(); return; }
      var mvb = ev.target.closest('[data-pasmv]'); if (mvb) { var mp = mvb.getAttribute('data-pasmv'), mi = mp.lastIndexOf(':'); pasMove(mp.slice(0, 1), mp.slice(2, mi), null, +mp.slice(mi + 1)); return; }
      var pb = ev.target.closest('[data-pasedit],[data-pasgadd],[data-pasgdel],[data-pasadd],[data-pascdel],[data-pasreset],[data-passhow]');
      if (pb) { var pg = cur.pg = cur.pg || {}, A = function (k) { return pb.getAttribute('data-' + k); };
        if (pb.hasAttribute('data-pasedit')) pasEdit = !pasEdit;
        else if (pb.hasAttribute('data-pasgadd')) { var gn = prompt('새 묶음 이름'); if (!gn || !gn.trim()) return; (pg.groups = pg.groups || []).push({ id: 'g' + Date.now().toString(36), n: gn.trim() }); }
        else if (pb.hasAttribute('data-pasgdel')) { var gid = A('pasgdel'); pg.groups = (pg.groups || []).filter(function (x) { return x.id !== gid; }); Object.keys(pg.at || {}).forEach(function (k) { if (pg.at[k] === gid) delete pg.at[k]; }); pg.cu = (pg.cu || []).filter(function (c) { return c.g !== gid; }); }
        else if (pb.hasAttribute('data-pasadd')) (pg.cu = pg.cu || []).push({ id: 'u' + Date.now().toString(36), g: A('pasadd'), n: '새 효과', text: '' });
        else if (pb.hasAttribute('data-pascdel')) pg.cu = (pg.cu || []).filter(function (c) { return c.id !== A('pascdel'); });
        else if (pb.hasAttribute('data-pasreset')) delete (pg.tx || {})[A('pasreset')];
        else if (pb.hasAttribute('data-passhow')) delete (pg.hide || {})[A('passhow')];
        saveChars(); rebuild(); return; }
      var fs = ev.target.closest('[data-fsel]'), fd = ev.target.closest('[data-fdel]');
      if (fd) { var fk = fd.getAttribute('data-fdel'), fi = fd.getAttribute('data-fid'); cur.choices[fk] = (cur.choices[fk] || []).filter(function (x) { return x !== fi; }); saveChars(); rebuild(); return; }
      if (fs) { var sx = (res.selects || []).filter(function (x) { return x.key === fs.getAttribute('data-fsel'); })[0]; if (sx) openPicker(sx); return; }
      var ga = ev.target.closest('[data-gadd]'), gk = ev.target.closest('[data-gkey]'), gs = ev.target.closest('[data-gslot]');
      if (ga) { gearPick(ga.getAttribute('data-gadd')); return; }
      if (gs && !ev.target.closest('.gt-n,.gt-base')) { gearPick(GROW[gs.getAttribute('data-gslot')]); return; }
      if (gk && !gs && !ev.target.closest('.gt-n,.gt-base')) { var kk = gk.getAttribute('data-gkey'); if (kk === 'other') { var oe = gk.querySelector('[data-el]'), oid = oe && oe.getAttribute('data-el'); if (oid && confirm('이 물품을 뺄까요?')) { cur.eq.other = (cur.eq.other || []).filter(function (x) { return x !== oid; }); syncEquip(); rebuild(); } } else gearPick(kk); return; }
      var w = ev.target.closest('[data-why]'), e = ev.target.closest('[data-el]');
      if (e) { if (ev.target.closest('summary')) ev.preventDefault(); openDetail(db.byId[e.getAttribute('data-el')]); return; }
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
    if (!db) { saveChars(); return; } /* 룰 데이터가 아직 안 읽혔을 때(읽는 중에 레벨 등을 바꾼 경우) — 값만 보관하고, 다 읽히면 그때 그린다 */
    cur.tr = shTr(cur.tr); trCtx = { map: cur.tr, edit: true };
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
        hbEditing = ''; saveChars(); redraw(); renderSelects(); return; }
      var t = ev.target.closest('[data-hbadd],[data-hbnew],[data-hbedit],[data-hbdel]');
      if (t) { ev.preventDefault(); if (t.hasAttribute('data-hbadd')) { buildTab = 'hb'; localStorage.setItem('d4e_btab', buildTab); var bp = document.querySelector('[data-sec=b_pick]'); if (bp) bp.open = true; renderSelects(); $('selects').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        else if (t.hasAttribute('data-hbnew')) D4EHouse.newEl('Homebrew Feature'); else if (t.hasAttribute('data-hbedit')) D4EHouse.editEl(t.getAttribute('data-hbedit'));
        else { var hid = t.getAttribute('data-hbdel'); cur.hb = (cur.hb || []).filter(function (x) { return x !== hid; }); saveChars(); rebuild(); } return; }
      var e = ev.target.closest('[data-el]'); if (e && !ev.target.closest('[data-tr]')) openDetail(db.byId[e.getAttribute('data-el')]); };
  }
  /* 능력치: 포인트 구매(캠페인에서 정한 포인트) 또는 직접 입력.
   * 4판 방식: 하나는 8, 나머지는 10 에서 시작. 8 기준 값별 비용은 아래 표, 기본 배열(8 하나 + 10 다섯)이 0포인트. */
  /* 포인트는 「모두 10」에서 센다. 하나를 8로 낮추면 2점이 돌아온다 → 공식 규칙(8 하나 + 10 다섯에서 22점)과 같은 값. 세팅의 20점 = 공식 22점. */
  var COST8 = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9, 16: 11, 17: 14, 18: 18 };
  var campaign = { points: 22 };
  function pointsUsed(ab) { var t = 0, low = 0, bad = false; E.ABILITIES.forEach(function (a) { var v = ab[a]; if (!(v in COST8)) bad = true; else t += COST8[v]; if (v < 10) low++; }); return { used: t - 12, low: low, bad: bad }; }
  function renderAbil() {
    var box = $('abil'), free = cur.abMode === 'free', u = pointsUsed(cur.abilities), left = campaign.points - u.used; box.innerHTML = '';
    $('abilHead').innerHTML = free ? '<span class="hint">직접 입력 중</span> <button class="mini ghost" id="abMode">포인트 구매로</button>'
      : '<span class="pts' + (left < 0 || u.bad || u.low > 1 ? ' bad' : left === 0 ? ' ok' : '') + '" title="모두 10에서 시작해요. 하나를 8로 낮추면 2점이 돌아와요(공식 규칙의 8 하나 + 10 다섯 · 22점과 같아요).">포인트 ' + campaign.points + (u.low && !u.bad ? ' <small>+' + E.ABILITIES.reduce(function (t, k) { var v = cur.abilities[k]; return t + (v < 10 ? 2 - COST8[v] : 0); }, 0) + '</small>' : '') + ' 중 <b>' + (u.bad ? '?' : left) + '</b> 남음</span>' +
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
    $('chName').value = cur.name || ''; $('chLevel').value = cur.level; $('chVer').textContent = (cur.vers || []).length ? '버전 ' + cur.vers.length : '버전';
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
    var hbEvery = D4EHouse.custom(db), hbAll = (ME.gm || !D4EHouse.gm().hashes.length) ? hbEvery : hbEvery.filter(function (e) { return hbFor(e, cur.name) || (cur.hb || []).indexOf(e.id) >= 0; }); cur.hb = (cur.hb || []).filter(function (id) { return db.byId[id]; });
    tabs.push({ key: 'hb', label: '홈브류', left: 0, n: cur.hb.length + (cur.hbx || []).length });
    tabs.push({ key: 'fx', label: '자동화', left: 0, n: Object.keys(cur.fx || {}).length });
    tabs.push({ key: 'img', label: '토큰 · 초상 · 스탠딩 · 컷신', left: 0, n: (cur.tok ? 1 : 0) + (cur.face ? 1 : 0) + (cur.stand ? 1 : 0) + (cur.cut ? 1 : 0) });
    if (!tabs.some(function (t) { return t.key === buildTab; })) buildTab = tabs[0].key;
    var bar = document.createElement('div'); bar.className = 'btabs';
    tabs.forEach(function (t) { var b = document.createElement('button'); b.className = t.key === buildTab ? 'on' : ''; b.setAttribute('data-btab', t.label);
      b.innerHTML = esc(t.label) + (t.left ? '<i>' + t.left + '</i>' : '') + ((t.key === 'eq' || t.key === 'hb' || t.key === 'img') && t.n ? '<em>' + t.n + '</em>' : '');
      b.onclick = function () { buildTab = t.key; localStorage.setItem('d4e_btab', buildTab); renderSelects(); }; bar.appendChild(b); });
    box.appendChild(bar); $('equip').hidden = buildTab !== 'eq';
    if (buildTab === 'fx') box.appendChild(fxTab());
    if (buildTab === 'img') { var ibx = document.createElement('div'); ibx.className = 'hbpick';
      ibx.innerHTML = '<p class="hint">맵툴 토큰 파일 안에 같이 들어가는 그림이에요. 토큰은 맵 위 말로, 초상은 맵툴 초상화(portrait) 칸과 채팅 얼굴로, 스탠딩은 채팅 대사와 컷인에, 컷신은 치명타 연출에 쓰여요. 넷 다 자르지 않고 통째로 보관해요(토큰 · 초상은 긴 쪽 512, 나머지는 1024).</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:16px">' + [['tok', '토큰', '맵 위 말로 나가는 그림'], ['face', '초상', '얼굴 위주 상반신 (맵툴 portrait)'], ['stand', '스탠딩', '배경을 지운 전신 그림'], ['cut', '컷신', '치명타 때 띄울 그림']].map(function (k) { var v = cur[k[0]] || '';
          return '<div style="flex:1 1 200px;max-width:300px;padding:12px;border:1px solid #8884;border-radius:12px"><b>' + k[1] + '</b> <span class="hint">' + k[2] + '</span>' +
            '<div data-imgpick="' + k[0] + '" title="눌러서 고르기" style="margin:8px 0;height:260px;display:flex;align-items:center;justify-content:center;border:1px dashed #8886;border-radius:10px;cursor:pointer;background:repeating-conic-gradient(#8882 0% 25%, transparent 0% 50%) 50% / 16px 16px">' +
            (v ? '<img src="' + esc(v) + '" alt="" style="max-width:100%;max-height:100%;object-fit:contain">' : '<span class="hint">눌러서 그림 고르기</span>') + '</div>' +
            '<button class="mini" data-imgpick="' + k[0] + '">' + (v ? '바꾸기' : '고르기') + '</button>' + (v ? ' <button class="mini ghost" data-imgdel="' + k[0] + '">지우기</button>' : '') + (k[0] === 'stand' && !v && cur.tok ? ' <button class="mini ghost" data-imgcopy="stand">토큰 그림 그대로 쓰기</button><div class="hint" style="margin-top:6px">비워 두면 내보낼 때 토큰 그림이 스탠딩으로 나가요.</div>' : '') + '</div>'; }).join('') + '</div>';
      ibx.onclick = function (ev) { var dl = ev.target.closest('[data-imgdel]'), pk = ev.target.closest('[data-imgpick]'), cp = ev.target.closest('[data-imgcopy]');
        if (cp) { if (cur.tok) { cur.stand = cur.tok; rebuild(); saveChars(); } return; }
        if (dl) { var dk = dl.getAttribute('data-imgdel'); if (dk === 'tok') { if (cur.tok) { delete cur.tok; rebuild(); } } else window.D4EImg.del(dk, function () { saveChars(); }); return; }
        if (pk && pk.getAttribute('data-imgpick') === 'tok') { $('tokFile').click(); return; }
        if (pk) { var kind = pk.getAttribute('data-imgpick'), f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = function () { window.D4EImg.set(kind, f.files[0], function () { saveChars(); }); }; f.click(); } };
      box.appendChild(ibx); }
    if (buildTab === 'hb') { var hbx = document.createElement('div'); hbx.className = 'hbpick'; var gmNow = isGM();
      var own = (cur.hbx || []).slice().sort(function (a, b) { var x = HB_ORDER.indexOf(a.cat), y = HB_ORDER.indexOf(b.cat); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || String(a.step || '').localeCompare(String(b.step || ''), 'ko', { numeric: true }); });
      hbx.innerHTML = '<div class="hbcat">이 캐릭터의 홈브류 <span class="hint">' + own.length + '</span></div>' + (own.length ? '<div class="hbgrid">' + own.map(function (x) {
          return '<div class="hbt on" data-hxgo="' + esc(x.id) + '"><div class="hbt-h"><b>' + (x.step ? '<i class="hbs">' + esc(x.step) + '</i>' : '') + esc(x.n) + '</b>' + (x.cat ? '<span class="badge hbb">' + esc(x.cat) + '</span>' : '') + '</div><small>' + esc(String(x.text || '').slice(0, 120)) + '</small><div class="hbt-a"><span>눌러서 고치기</span></div></div>'; }).join('') + '</div>' : '<p class="hint">아직 없어요.</p>') +
        '<div class="hb-bar"><button class="mini" data-hxgo="new">+ 추가</button></div>' +
        (hbAll.length || gmNow ? '<div class="hbcat" style="margin-top:14px">공용 홈브류 <span class="hint">GM 이 만든 것 · 눌러서 넣거나 빼요</span></div>' : '') +
        (hbAll.length ? hbGroups(hbAll).map(function (g) { return '<div class="hbcat">' + esc(g[0]) + ' <span class="hint">' + g[1].length + '</span></div><div class="hbgrid">' + g[1].map(function (e) { var on = cur.hb.indexOf(e.id) >= 0, d = (e.sp && (e.sp['Short Description'] || e.sp['Benefit'] || e.sp['Effect'])) || e.body || '', inf = hbInfo(e), other = inf.who.length && !hbFor(e, cur.name);
          return '<div class="hbt' + (on ? ' on' : '') + (other ? ' oth' : '') + '" data-hbt="' + esc(e.id) + '"><div class="hbt-h"><b>' + hbStep(e) + esc(e.n) + '</b><span class="badge hbb">' + esc(typeKo(e.t)) + '</span></div>' + (inf.who.length ? '<div class="hbw">' + esc(inf.who.join(', ')) + ' 전용' + (other ? ' · 이 캐릭터 것이 아니에요' : '') + '</div>' : '') + '<small>' + esc(String(d).slice(0, 140)) + '</small><div class="hbt-a"><span>' + (on ? '✔ 넣었어요' : '눌러서 넣기') + '</span><button class="mini ghost" data-hbsee="' + esc(e.id) + '">내용</button>' + (gmNow ? '<button class="mini ghost" data-hbedit="' + esc(e.id) + '">고치기</button>' : '') + '</div></div>'; }).join('') + '</div>'; }).join('')
          : (gmNow ? '<p class="hint">아직 만든 공용 홈브류가 없어요.</p>' : '')) +
        (gmNow ? '<div class="hb-bar"><button class="mini" data-hbnew="Homebrew Feature">+ 새 홈브류 특성 (GM)</button><button class="mini ghost" data-hbnew="Power">+ 새 홈브류 파워 (GM)</button></div>' : '');
      hbx.onclick = function (ev) { var go = ev.target.closest('[data-hxgo]');
        if (go) { hbEditing = go.getAttribute('data-hxgo'); $('featBox').innerHTML = extraHtml(cur, res); var hs = $('featBox').querySelector('[data-sec=hb]'); if (hs) { hs.open = true; hs.scrollIntoView({ behavior: 'smooth', block: 'center' }); var fi = hs.querySelector('.hxform [data-hx=n]'); if (fi) fi.focus({ preventScroll: true }); } return; }
        var see = ev.target.closest('[data-hbsee]'), ed2 = ev.target.closest('[data-hbedit]'), nw = ev.target.closest('[data-hbnew]'), tl = ev.target.closest('[data-hbt]');
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
        s.picked.forEach(function (id) { var e = db.get(id, s.type), c = document.createElement('span'); c.className = 'chip' + (e && e.t === 'Feat' ? ' ft t-' + lc((e.sp || {})['Tier'] || 'heroic') : '');
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
    ['implM', '도구 마법', function (e) { return e.t === 'Magic Item' && IMPL.test(mit(e)); }],
    ['head', '머리', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'head'; }],
    ['neck', '목', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'neck'; }],
    ['arms', '팔', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'arms'; }],
    ['hands', '손', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'hands'; }],
    ['waist', '허리', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'waist'; }],
    ['feet', '발', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'feet'; }],
    ['ring1', '반지 1', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'ring'; }],
    ['ring2', '반지 2', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'ring'; }],
    ['tattoo', '문신', function (e) { return e.t === 'Magic Item' && slotOf(e) === 'tattoo'; }]
  ];
  /* 마법 무기 · 갑옷이 지금 찬 바탕 무기 · 갑옷에 맞는지 (데이터의 Weapon / Armor 칸: "Any melee", "Heavy Blade, Light Blade", "Chain, Scale, Plate" …) */
  var MAGIC_BASE = { mainM: 'main', offM: 'off', bodyM: 'body', implM: 'impl' };
  function fitsBase(e, key) {
    var bk = MAGIC_BASE[key], base = bk && db.byId[(cur.eq || {})[bk]]; if (!base) return true;
    var sp = e.sp || {}, bs = base.sp || {};
    if (key === 'bodyM') { var a = lc(sp['Armor'] || 'any'), k = (/(cloth|leather|hide|chain|scale|plate)/.exec(lc(base.n)) || [])[1]; return /any/.test(a) || !k || a.indexOf(k) >= 0; }
    if (key === 'implM') { var grp = lc(bs['Group'] || bs['Magic Item Type'] || ''); return !grp || lc(mit(e)) === grp; }
    if (base.t !== 'Weapon') return true;
    var w = lc(sp['Weapon'] || 'any'), cat = lc(bs['Weapon Category'] || ''), ranged = /ranged/.test(cat), thrown = /thrown/.test(lc(bs['Properties']));
    if (w === 'any' || /^any\b(?! (melee|ranged|thrown))/.test(w)) return true;
    if (/any melee/.test(w) && !ranged) return true; if (/any ranged/.test(w) && ranged) return true; if (/any thrown/.test(w) && thrown) return true;
    if (w.indexOf(lc(base.n)) >= 0) return true;
    return lc(bs['Group']).split(',').some(function (g) { g = g.trim(); return g && w.indexOf(g) >= 0; });
  }
  function slotTest(key, sl) { var f = sl[2]; return MAGIC_BASE[key] ? function (e) { return f(e) && fitsBase(e, key); } : f; }
  function slotTitle(key, sl) { var bk = MAGIC_BASE[key], b = bk && db.byId[(cur.eq || {})[bk]]; return sl[1] + ' 고르기' + (b ? ' — ' + b.n + '에 맞는 것만' : MAGIC_BASE[key] ? ' — 먼저 ' + (key === 'bodyM' ? '갑옷' : key === 'implM' ? '상급 도구' : '무기') + '부터 차면 거기에 맞는 것만 보여요' : ''); }
  function eqLine(e) { var sp = e.sp || {}, a = [];
    if (e.t === 'Weapon') { a.push(sp['Damage'] || ''); if (sp['Proficiency Bonus']) a.push('숙련 +' + sp['Proficiency Bonus']); a.push(sp['Group'] || ''); if (sp['Range']) a.push('사거리 ' + sp['Range']); if (sp['Properties']) a.push(sp['Properties']); }
    else if (e.t === 'Armor') { a.push((sp['Armor Type'] || '') + ' ' + (sp['Armor Category'] || '')); if (sp['Armor Bonus']) a.push('방어 +' + sp['Armor Bonus']); if (sp['Check'] && sp['Check'] !== '-') a.push('판정 ' + sp['Check']); if (sp['Speed'] && sp['Speed'] !== '-') a.push('이동 ' + sp['Speed']); }
    else { if (sp['Level']) a.push(sp['Level'] + '레벨'); a.push(sp['Enhancement'] || mit(e) || ''); }
    return a.filter(Boolean).join(' · '); }
  /* 시트의 장비 칸: 자리별 카드. 갑옷 · 무기는 본체와 마법을 한 장에 묶는다 */
  var GEAR_KIND = { body: ['armor', '갑옷'], main: ['weapon', '주 무기'], off: ['shield', '방패 · 보조 손'], impl: ['impl', '도구'], head: ['slot', '머리'], neck: ['slot', '목'], arms: ['slot', '팔'], hands: ['slot', '손'], waist: ['slot', '허리'], feet: ['slot', '발'], ring1: ['slot', '반지'], ring2: ['slot', '반지'], tattoo: ['slot', '문신'] };
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
    var st = D4EHouse.setOf(ch.set || '') || {}, min = +st.minEnh || 0, E_ = function (k) { return db.byId[q[k]]; }, take = function (kind, slot, bk, mk) { var b = E_(bk), m = mk && E_(mk); skey = bk + (mk ? ',' + mk : ''); if (!b && !m) return -1; if (b) used[b.id] = 1; if (m) used[m.id] = 1; if (b && b.t === 'Magic Item' && !m) { m = b; b = null; } tile(kind, slot, b, m); return m ? plusN(m) : -1; }; /* -1 = 마법 물품 없음(최소 강화 규칙은 마법 물품을 살 때만 해당) */
    var row = function (label, kind, fill) { var n0 = tiles.length, plus = fill(), mine = tiles.splice(n0), has = mine.length > 0, magic = plus >= 0, ok = !min || plus >= min;
      return '<div class="gmain ' + kind + (has ? '' : ' empty') + '"' + (ch === cur ? ' data-gslot="' + label + '" title="눌러서 고르기 · 바꾸기"' : '') + '><div class="gm-l"><b>' + label + '</b>' + (has && plus > 0 ? '<i>+' + plus + '</i>' : '') + '</div><div class="gm-c">' + (has ? mine.join('') : '<span class="gm-none">비어 있음</span>') + '</div>' +
        (min && magic ? '<div class="gm-s ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓ +' + min + ' 이상' : '+' + min + ' 이상 필요') + '</div>' : '') + '</div>'; };
    var mains = row('무기', 'weapon', function () { var a = take('weapon', '주 무기', 'main', 'mainM'), b = take('impl', '도구', 'impl', 'implM'); return Math.max(a, b); }) +
      row('갑옷', 'armor', function () { return take('armor', '갑옷', 'body', 'bodyM'); }) + row('목', 'slot', function () { return take('slot', '목', 'neck'); });
    [['off', 'offM'], ['head'], ['arms'], ['hands'], ['waist'], ['feet'], ['ring1'], ['ring2'], ['tattoo']].forEach(function (pr) { var k = GEAR_KIND[pr[0]], e = E_(pr[0]); if (pr[0] === 'off' && e && e.t === 'Weapon') k = ['weapon', '보조 손']; take(k[0], k[1], pr[0], pr[1]); });
    skey = 'other'; (r.worn || []).forEach(function (e) { if (!used[e.id]) tile('etc', '소지품', e.t === 'Magic Item' ? null : e, e.t === 'Magic Item' ? e : null); });
    var gold = '';
    if (st.gold) { var spent = 0; (r.worn || []).forEach(function (e) { if (e.t === 'Magic Item') spent += +((e.sp || {})['Gold'] || 0); });
      gold = '<div class="ggold' + (spent > st.gold ? ' bad' : '') + '"><span><small>소지금</small><b>' + (st.gold - spent).toLocaleString() + '</b> gp</span><span class="gg-bar"><i style="width:' + Math.min(100, Math.round(spent / st.gold * 100)) + '%"></i></span><span class="hint">' + Number(st.gold).toLocaleString() + ' 중 ' + spent.toLocaleString() + ' 사용</span></div>'; }
    var addBar = ch === cur ? '<div class="gadd"><button class="mini ghost" data-gadd="off,offM">방패 · 보조 손</button><button class="mini ghost" data-gadd="head">머리</button><button class="mini ghost" data-gadd="arms">팔</button><button class="mini ghost" data-gadd="hands">손</button><button class="mini ghost" data-gadd="waist">허리</button><button class="mini ghost" data-gadd="feet">발</button><button class="mini ghost" data-gadd="ring1">반지 1</button><button class="mini ghost" data-gadd="ring2">반지 2</button><button class="mini ghost" data-gadd="tattoo">문신</button><button class="mini" data-gadd="other">+ 그 밖의 물품</button></div>' : '';
    return '<div class="gmains">' + mains + '</div>' + (tiles.length ? '<div class="gtiles">' + tiles.join('') + '</div>' : '') + addBar + gold;
  }
  /* 시트의 장비 칸에서 바로 고르기: keys = 'body,bodyM' 처럼 그 줄에 딸린 자리들 */
  function gearPick(keys) {
    var q = cur.eq = cur.eq || {}, byKey = {}; EQ_SLOTS.forEach(function (sl) { byKey[sl[0]] = sl; });
    if (keys === 'other') { openSearch('그 밖의 물품 더하기', function (x) { return [{ label: '더하기', fn: function () { (q.other = q.other || []).push(x.id); syncEquip(); rebuild(); } }]; },
      eqList(function (e) { return e.t === 'Gear' || (e.t === 'Magic Item' && !slotOf(e) && !/^(Armor|Weapon)$/.test(mit(e)) && !IMPL.test(mit(e))); })); return; }
    var ks = keys.split(','), one = function (k) { var sl = byKey[k]; openSearch(slotTitle(k, sl), function (x) { return [{ label: '이걸로 차기', fn: function () { q[k] = x.id; syncEquip(); rebuild(); } }]; }, eqList(slotTest(k, sl))); };
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
  var EQ_SIDE = { L: ['head', 'neck', 'body', 'bodyM', 'arms', 'hands', 'waist', 'feet'], R: ['main', 'mainM', 'off', 'offM', 'impl', 'implM', 'ring1', 'ring2', 'tattoo'] };
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
        openSearch(slotTitle(key, sl), function (x) { return [{ label: '이걸로 차기', fn: function () { q[key] = x.id; syncEquip(); rebuild(); } }]; }, eqList(slotTest(key, sl)));
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
    var sp = e.sp || {}, used = {}, h = '<div class="rd"><h3>' + tname(e, nm(e)) + ' <span class="hint">' + esc(typeKo(e.t)) + (e.src ? ' · ' + esc(e.src.join(', ')) : '') + '</span></h3>';
    if (sp['Short Description']) { h += '<p><b>' + tx(e, 'Short Description', sp['Short Description']) + '</b></p>'; used['Short Description'] = 1; }
    var trfl = tview(e) && TR(e) && TR(e).fl;
    if (trfl) h += '<p class="fl"><span class="mine">' + esc(trfl) + '</span></p>';
    if (e.pre || e.pp) h += '<p><b>선행 조건</b> ' + esc(e.pp || e.pre) + '</p>';
    var mech = (MECH[e.t] || []).filter(function (k) { return sp[k]; });
    if (mech.length) { h += '<div class="mech">'; mech.forEach(function (k) { used[k] = 1; var v = sp[k], tk = tview(e) && TR(e) && (TR(e).f || {})[k]; if (tk) v = tk; if (k === 'Role' || k === 'Power Source') v = v.split('.')[0]; h += '<div><small>' + MECH_KO[k] + '</small><span>' + esc(v) + '</span></div>'; }); h += '</div>'; }
    var g = gives(e), feats = g.filter(function (x) { return x.el.t !== 'Power'; }), pws = g.filter(function (x) { return x.el.t === 'Power' && x.el.sp && x.el.sp['Power Usage']; });
    if (feats.length) { h += '<h4>특성</h4>'; feats.forEach(function (x) { var t = x.el;
      var tt = TR(t), tvw = tview(t), sd = t.sp && t.sp['Short Description'];
      h += '<details class="ft" data-ftid="' + esc(t.id) + '"><summary>' + (tvw && tt && tt.n ? esc(tt.n) + ' <small class="hint">' + esc(t.n) + '</small>' : esc(t.n)) + (x.lv > 1 ? ' <span class="badge">' + x.lv + '레벨</span>' : '') + (sd ? ' <span class="hint">' + esc(tvw && tt && tt.f && tt.f['Short Description'] ? tt.f['Short Description'] : glossAuto && tvw ? gsub(sd) : sd) + '</span>' : '') + '</summary>' + (RICH_TYPES.test(t.t) ? '<p>' + rich(t.body || '') + '</p>' : cardHtml(t)) + '</details>'; }); }
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
    Object.keys(sp).forEach(function (k) { if (used[k] || k.charAt(0) === '_' || /^(type|Full Text|Class Features|Powers|Power Name|Racial Traits|Trait Package)$/i.test(k)) return; lore += '<p><b>' + esc(rowLabel(k)) + '</b> ' + tx(e, k, sp[k]) + '</p>'; });
    if (e.body) lore += '<p>' + tx(e, '_body', e.body) + '</p>';
    if (lore) h += '<details class="ft lore"><summary>설정 · 소개 글 <span class="hint">눌러서 보기</span></summary>' + lore + '</details>';
    return h + trBar(e) + '</div>';
  }
  var F_KO = { 'Weight': '무게', 'Armor Bonus': '방어 보너스', 'Minimum Enhancement Bonus': '최소 강화', 'Check': '판정 벌점', 'Speed': '이동 벌점', 'Gold': '가격', 'Silver': '가격(은)', 'Special': '특수',
    'Armor Type': '갑옷 분류', 'Item Slot': '부위', 'Armor Category': '종류', 'Damage': '피해', 'Proficiency Bonus': '숙련 보너스', 'Weapon Category': '무기 분류', 'Hands Required': '손', 'Group': '무기군',
    'Properties': '속성', 'Range': '사거리', 'Level': '레벨', 'Rarity': '희귀도', 'Magic Item Type': '물품 종류', 'Enhancement': '강화', 'Critical': '치명타', 'Property': '특성', 'Power': '파워',
    'Requirement': '요구 조건', 'Tier': '티어', 'Short Description': '요약', 'Prerequisite': '선행 조건', 'Weapon': '무기', 'Armor': '갑옷', 'Size': '크기', 'Key Ability': '주 능력치', 'Benefit': '혜택',
    'Associated Skills': '관련 기술', 'Associated Languages': '관련 언어', 'Campaign': '캠페인', 'Key Skill': '주 기술', 'Component Cost': '재료비', 'Market Price': '시세', 'Time': '시간', 'Duration': '지속', 'Category': '분류',
    'Alignment': '성향', 'Domains': '영역', 'Granted Powers': '주는 파워', 'Characteristics': '성격', 'Physical Qualities': '신체 특징', 'Immortality': '불멸' };
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
      var tk = tv && TR(e) && (TR(e).f || {})[k]; if (tk && (k === 'Gold' || k === 'Weight' || k === 'Proficiency Bonus' || k === 'Armor Bonus')) tk = '';
      if (v.length <= 30 && v.indexOf('\n') < 0) chips += '<div><small>' + esc(rowLabel(k)) + '</small><span>' + (tk ? '<span class="mine">' + esc(tk) + '</span>' : esc(v)) + '</span></div>';
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
    trCtx = { map: shTr({}), edit: false };
    var all0 = E.options(db, s, res.vars).filter(function (e) { return !/Unselectable|Not Selectable/i.test(e.pre || '') ; }), all = all0.filter(function (e) { return !banned(e); }), nBan = all0.length - all.length;
    var pre = {}; all.forEach(function (e) { pre[e.id] = prereq(e, res, cur.level); });
    var rank = { ok: 0, unk: 1, no: 2 };
    var plv = function (e) { return e.t === 'Power' ? +(e.sp || {})['Level'] || 0 : 0; };
    all.sort(function (a, b) { return rank[pre[a.id]] - rank[pre[b.id]] || plv(b) - plv(a) || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0); });
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
        var tr0 = e.t === 'Feat' ? (lc((e.sp || {})['Tier']) || 'heroic') : '';
        d.innerHTML = (chosen.indexOf(e.id) >= 0 ? '✔ ' : '') + (tr0 ? '<i class="tchip t-' + tr0 + '">' + ({ heroic: '영웅', paragon: '패러곤', epic: '에픽' }[tr0] || tr0) + '</i>' : '') + esc(nm(e)) + PRE_BADGE[pre[e.id]] + '<small>' + (e.t === 'Power' && (e.sp || {})['Level'] ? esc(e.sp['Level']) + '레벨 · ' : '') + esc(short(e)) + (e.pre ? ' · 조건: ' + esc(e.pp || e.pre) : '') + '</small>';
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
    trCtx = { map: shTr({}), edit: false };
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
  function closeModal() { if (cur && !$('tab-edit').hidden) trCtx = { map: shTr(cur.tr || (cur.tr = {})), edit: true };
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
    refreshSign(); noteSign();
  }
  /* 서명 명부: 서명한 사람이 사이트를 열면 공유 DB(kind = dnd4e_sig)에 「해시 → 이름」 한 줄을 남긴다. GM 을 올릴 때 접속해 있지 않은 서명도 고를 수 있게.
   * 비밀 문구는 남기지 않는다(시트의 ownerHash 와 같은 해시뿐). 같은 이름 · 같은 날이면 다시 쓰지 않는다. */
  var SIG_KIND = 'dnd4e_sig';
  function noteSign() { if (!ME.hash || !D4EShare.ready()) return; var day = new Date().toISOString().slice(0, 10), key = ME.hash + '|' + ME.name + '|' + day; if (localStorage.getItem('d4e_signote') === key) return;
    D4EShare.put(ME.hash, { name: ME.name || '이름 없음', at: Date.now() }, SIG_KIND).then(function () { localStorage.setItem('d4e_signote', key); }, function () {}); }
  function refreshSign() {
    var g = D4EHouse.gm(); ME.gm = !!(ME.hash && g.hashes.indexOf(ME.hash) >= 0);
    $('me').value = ME.name; localStorage.setItem('d4e_me', ME.name);
    $('signBtn').textContent = ME.hash ? ME.name + (ME.gm ? ' · GM' : '') : '서명하기'; $('signBtn').className = ME.hash ? 'ghost' : '';
    document.body.classList.toggle('is-gm', ME.gm || !g.hashes.length);
    if (window.D4EPresence) D4EPresence.refresh(); if (!$('tab-house').hidden) renderGm();
  }
  /* 홈브류의 분류 · 단계 · 대상 캐릭터 */
  var HB_ORDER = ['공격', '생존', '활용'], hbEditing = '';
  function hbInfo(e) { var sp = e.sp || {}; return { cat: String(sp['분류'] || '').trim(), step: String(sp['단계'] || '').trim(), who: String(sp['대상 캐릭터'] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean) }; }
  function hbFor(e, name) { var w = hbInfo(e).who; return !w.length || w.map(lc).indexOf(lc(String(name || '').trim())) >= 0; }
  function hbGroups(list) { var g = {}, keys = []; list.forEach(function (e) { var c = hbInfo(e).cat || '그 밖'; if (!g[c]) { g[c] = []; keys.push(c); } g[c].push(e); });
    keys.sort(function (a, b) { var x = HB_ORDER.indexOf(a), y = HB_ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || (a < b ? -1 : 1); });
    return keys.map(function (k) { return [k, g[k].sort(function (a, b) { return hbInfo(a).step.localeCompare(hbInfo(b).step, 'ko', { numeric: true }) || (a.n < b.n ? -1 : 1); })]; }); }
  var hbStep = function (e) { var st = hbInfo(e).step; return st ? '<i class="hbs">' + esc(st) + '</i>' : ''; };
  /* ---------- 설정 · 백스토리 (ch.bio) ---------- */
  var BIO = [['tag', '한 줄 소개', 1, '이 캐릭터를 한 줄로'], ['look', '외모', 3, '생김새, 차림, 눈에 띄는 점'], ['pers', '성격 · 말투', 3, '어떤 사람인지, 버릇, 말버릇'], ['story', '백스토리', 8, '어디서 와서 왜 여기 있는지'], ['goal', '목표 · 인연', 3, '바라는 것, 아는 사람, 빚진 것'], ['note', '메모', 3, '그 밖에 적어 둘 것']];
  function bioHtml(ch) {
    var b = ch.bio || {}, mine = ch === cur, has = BIO.some(function (f) { return b[f[0]]; }); if (!mine && !has) return '';
    var body = mine ? '<div class="bio ed">' + BIO.map(function (f) { return '<label><b>' + f[1] + '</b>' + (f[2] === 1 ? '<input type="text" data-bio="' + f[0] + '" value="' + esc(b[f[0]] || '') + '" placeholder="' + f[3] + '">' : '<textarea data-bio="' + f[0] + '" rows="' + f[2] + '" placeholder="' + f[3] + '">' + esc(b[f[0]] || '') + '</textarea>') + '</label>'; }).join('') + '</div>'
      : '<div class="bio">' + BIO.filter(function (f) { return b[f[0]]; }).map(function (f) { return '<div><b>' + f[1] + '</b><p>' + esc(b[f[0]]).replace(/\n/g, '<br>') + '</p></div>'; }).join('') + '</div>';
    return sec('bio', '설정 · 백스토리' + (b.tag ? ' <span class="hint">' + esc(b.tag) + '</span>' : mine && !has ? ' <span class="hint">아직 비어 있어요</span>' : ''), body, mine ? has : true);
  }
  /* ---------- 한 장 요약 ---------- */
  function onePage(ch, r, owner) {
    var s = r.stats, T = ch.tr || {}, b = ch.bio || {}, one = function (t) { var e = ownedOf(r, t)[0]; return e ? (koName(t, e.n) || e.n) : ''; }, nmOf = function (e) { var t0 = T[e.id] || itemTr(T, e); return (t0 && t0.n) || gloss(e.n) || e.n; }, sg = function (v) { return (v >= 0 ? '+' : '') + v; };
    var short = function (x) { x = String(x || '').split('\n')[0].trim(); return x.length > 120 ? x.slice(0, 118) + '…' : x; };
    var lang = ownedOf(r, 'Language').map(function (e) { return esc(nm(e)); }).join(', ');
    var hp = s['hit points'] || 0, hsv = Math.floor(hp / 4) + (s['healing surge value'] || 0), cell = function (l, v) { return '<div><small>' + l + '</small><b>' + v + '</b></div>'; };
    var slotLv = slotLevels(r), hidePw = ch.hidePw || [], ctx = { r: r, ch: ch }, pws = ownedOf(r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && hidePw.indexOf(p.id) < 0; }).map(function (p) { return eff(p, ch); }).concat(itemPowers(ch).map(function (p) { return eff(p, ch); }))
      .sort(function (a, b) { return ((usageClass(a) === 'util' && usageClass(b) === 'util') || (a._item && b._item) ? usageOrder(a) - usageOrder(b) : 0) || (isBasicPw(a) ? 1 : 0) - (isBasicPw(b) ? 1 : 0) || pwLevel(a, slotLv) - pwLevel(b, slotLv) || (a.n < b.n ? -1 : 1); });
    /* 딸린 파워 · 증강 버전은 어미 바로 아래에 「↳」로 */
    var subOf = {}, grp = { at: [], enc: [], day: [], util: [], item: [] }; pws.forEach(function (p) { if ((/^ID_INTERNAL/.test(p.id) && !/Basic Attack/.test(p.n)) || isChildOwned(r, p)) return; var g = grp[p._item ? 'item' : usageClass(p)]; g.push(p);
      childPowers(p).forEach(function (c) { if (r.owned[c.id]) { subOf[c.id] = '↳ '; g.push(eff(c, ch)); } });
      augVersions(p).forEach(function (c) { var m = /\(Augment (\d+)\)/.exec(c.n); if (m && m[1] === '0') return; subOf[c.id] = '↳ 증강 ' + (m ? m[1] : '') + ' '; g.push(eff(c, ch)); }); });
    var pline = function (p) { var ai = attackInfo(p, ctx), m = ai && ai.main, sp = p.sp || {}, act = ACT_KO[lc(sp['Action Type'] || '')] || '', t = T[p.id] || itemTr(T, p) || {}, f = t.f || {}, eff0 = short(f['Hit'] || f['Effect'] || (function (x) { return x && glossAuto ? gsub(x) : x; })(sp['Hit'] || sp['Effect'] || ''));
      var rng = f['Attack Type'] || gsub(String(sp['Attack Type'] || '').replace(/\s*\([^)]*\blevel\b[^)]*\)/ig, '')).replace(/\s+/g, ' ');
      var lvN = pwLevel(p, slotLv), lvTag = subOf[p.id] || isBasicPw(p) || !lvN ? '' : '<i class="op-lv" title="' + lvN + '레벨 칸">' + lvN + '</i>', useTag = (usageClass(p) === 'util' || p._item) && !subOf[p.id] ? '<i class="op-use ' + USE_CL[usageOrder(p)] + '">' + USE_KO[usageOrder(p)] + '</i>' : '';
      return '<div class="op-p' + (subOf[p.id] ? ' sub' : '') + '"><b>' + lvTag + useTag + (subOf[p.id] ? esc(subOf[p.id]) + (/증강/.test(subOf[p.id]) ? '' : esc(nmOf(p))) : esc(nmOf(p))) + '</b><span>' + [act.replace(' 행동', ''), esc(rng)].filter(Boolean).join(' · ') + '</span>' +
        (m ? '<i>' + sg(m.atk) + ' vs ' + esc(m.vs === 'Fortitude' ? 'Fort' : m.vs === 'Reflex' ? 'Ref' : m.vs) + (m.dmg ? ' · ' + esc(m.dmg) : '') + '</i>' : '') + (eff0 ? '<em>' + esc(eff0) + '</em>' : '') + '</div>'; };
    var pcol = function (k, lab) { return grp[k].length ? '<div class="op-g ' + k + '"><h4>' + lab + ' <small>' + grp[k].length + '</small></h4>' + grp[k].map(pline).join('') + '</div>' : ''; };
    var skills = (db.byType['Skill'] || []).slice().sort(function (a, c) { return a.n < c.n ? -1 : 1; }).map(function (sk) { var v = s[lc(sk.n)] || 0, tr = (s[lc(sk.n + ' trained')] || 0) > 0; return '<span class="' + (tr ? 'tr' : '') + '">' + esc(koName('Skill', sk.n) || sk.n) + ' <b>' + sg(v) + '</b></span>'; }).join('');
    /* 장비: 찬 자리마다 효과까지 한 줄씩, 자리 없는 물품(그 밖)은 이름만 */
    var q = ch.eq || {}, tx = function (e, k) { var t = T[e.id], v = t && t.f && t.f[k]; return v || (glossAuto ? gsub(String((e.sp || {})[k] || '')) : String((e.sp || {})[k] || '')); };
    var gfx = function (e) { if (!e) return []; var sp = e.sp || {}, a = [];
      if (e.t === 'Weapon') { if (sp['Damage']) a.push('피해 ' + sp['Damage']); if (sp['Proficiency Bonus']) a.push('숙련 +' + sp['Proficiency Bonus']); if (sp['Range']) a.push('사거리 ' + sp['Range']); }
      else if (e.t === 'Armor') { if (sp['Armor Bonus']) a.push('방어 +' + sp['Armor Bonus']); else if (sp['Shield Bonus']) a.push('방어 +' + sp['Shield Bonus']); if (sp['Check'] && !/^(0|-)$/.test(sp['Check'])) a.push('판정 ' + sp['Check']); if (sp['Speed'] && !/^(0|-)$/.test(sp['Speed'])) a.push('이동 ' + sp['Speed']); }
      else { ['Enhancement', 'Critical'].concat(Object.keys(sp).filter(function (k) { return /^Property( \(\d+\))?$/.test(k); })).forEach(function (k) { if (sp[k]) a.push((k === 'Critical' ? '치명타 ' : '') + short(tx(e, k))); });
        Object.keys(sp).forEach(function (k) { if (/^(Power|Utility Power|Attack Power)/.test(k) && sp[k]) { var pv = short(tx(e, k)); a.push(/^(파워|Power|활용|Utility|공격|Attack)/.test(pv) ? pv : '파워: ' + pv); } }); }
      return a; };
    var used = {}, grow = function (lab, keys) { var es = keys.map(function (k) { return db.byId[q[k]]; }).filter(Boolean); if (!es.length) return ''; es.forEach(function (e) { used[e.id] = 1; });
      var magic = es.filter(function (e) { return e.t === 'Magic Item'; }), base = es.filter(function (e) { return e.t !== 'Magic Item'; }), title = magic.length ? magic.map(nmOf).join(' + ') + (base.length ? ' <small>(' + base.map(nmOf).join(', ') + ')</small>' : '') : base.map(nmOf).join(', ');
      var fx = []; base.concat(magic).forEach(function (e) { fx = fx.concat(gfx(e)); });
      return '<div class="op-gr"><b>' + lab + '</b><span><em>' + title + '</em>' + (fx.length ? ' — ' + esc(fx.join(' · ')) : '') + '</span></div>'; };
    var gearMain = grow('무기', ['main', 'mainM']) + grow('도구', ['impl', 'implM']) + grow('갑옷', ['body', 'bodyM']) + grow('방패', ['off', 'offM']) + grow('목', ['neck']) +
      grow('머리', ['head']) + grow('팔', ['arms']) + grow('손', ['hands']) + grow('허리', ['waist']) + grow('발', ['feet']) + grow('반지', ['ring1']) + grow('반지', ['ring2']) + grow('문신', ['tattoo']);
    var gear = (r.worn || []).filter(function (e) { return !used[e.id]; }).map(function (e) { return esc(nmOf(e)); }).join(', '), feats = ownedOf(r, 'Feat').sort(function (a, b) { return (slotLv[a.id] || 0) - (slotLv[b.id] || 0); }).map(function (e) { var t = T[e.id], d = (t && t.f && t.f['Short Description']) || (function (x) { return glossAuto ? gsub(x) : x; })(String((e.sp || {})['Short Description'] || ''));
      return '<div class="op-f"><b>' + (slotLv[e.id] ? '<i class="op-lv" title="' + slotLv[e.id] + '레벨 칸">' + slotLv[e.id] + '</i>' : '') + esc(nmOf(e)) + '</b>' + (d ? ' ' + esc(d) : '') + '</div>'; }).join('');
    /* 클래스 · 종족 특성: 고르기만 하는 껍데기(Choose …, Fighter Talents 같은 것)와 파워만 주는 것은 빼고 이름 + 한 줄 */
    var featLine = function (ty) { return ownedOf(r, ty).filter(function (e) { var sp = e.sp || {}; return !/^Choose /.test(e.n) && !/^(You gain a |Choose )/.test(sp['Short Description'] || '') && (sp['Short Description'] || e.body); }).map(function (e) {
      var t = T[e.id], sp = e.sp || {}, d = (t && (t.body || (t.f && t.f['Short Description']))) || (function (x) { return glossAuto ? gsub(x) : x; })(String(sp['Short Description'] || short(e.body || '')));
      return '<div class="op-f"><b>' + esc(nmOf(e)) + '</b>' + (d ? ' ' + esc(d) : '') + '</div>'; }).join(''); };
    var cfs = featLine('Class Feature'), rts = featLine('Racial Trait');
    var hbl = (ch.hbx || []).map(function (x) { return '<div class="op-h"><b>' + esc(x.n) + '</b> ' + esc(x.text || '') + '</div>'; }).join('') + (ch.hb || []).map(function (id) { var e = db.byId[id]; return e ? '<div class="op-h"><b>' + esc(nmOf(e)) + '</b> ' + esc((e.sp && e.sp['Short Description']) || '') + '</div>' : ''; }).join('');
    return '<div class="op-page"><div class="op-top">' + (ch.port ? '<img src="' + esc(ch.port) + '" alt="">' : '') + '<div class="op-id"><h2>' + esc(ch.name || '이름 없음') + '</h2><p>' + esc([one('Race'), one('Class'), one('Paragon Path'), one('Epic Destiny')].filter(Boolean).join(' · ')) + ' · ' + ch.level + '레벨' + (owner ? ' · ' + esc(owner) : '') + '</p>' + (b.tag ? '<p class="op-tag">' + esc(b.tag) + '</p>' : '') + (lang ? '<p class="op-lang"><b>언어</b> ' + lang + '</p>' : '') +
        '<div class="op-ab">' + E.ABILITIES.map(function (a) { var v = s[lc(a)] || 10; return cell(a.slice(0, 3).toUpperCase(), v + ' <i>' + sg(Math.floor((v - 10) / 2)) + '</i>'); }).join('') + '</div>' +
        '<div class="op-st"><div class="op-hp"><span><small>HP</small><b>' + hp + '</b></span><span class="mid"><small>반죽음</small><b>' + Math.floor(hp / 2) + '</b></span></div><div class="op-sg"><span class="t">원기</span>' + cell('회복량', hsv) + cell('횟수', (s['healing surges'] || 0)) + '</div>' + cell('이동', s['speed'] || 0) + cell('우선권', sg(s['initiative'] || 0)) + '</div>' +
        '<div class="op-df">' + cell('AC', s['ac'] || 0) + cell('Fort', s['fortitude defense'] || 0) + cell('Ref', s['reflex defense'] || 0) + cell('Will', s['will defense'] || 0) + '</div></div></div>' +
      '<div class="op-sk">' + skills + '</div>' +
      '<div class="op-pw">' + pcol('at', '무제한') + pcol('enc', '조우') + pcol('day', '일일') + pcol('util', '활용') + pcol('item', '아이템') + '</div>' +
      (gearMain ? '<div class="op-gear">' + gearMain + '</div>' : '') + '<div class="op-ft">' + (gear ? '<p><b>그 밖의 장비</b> ' + gear + '</p>' : '') + '</div>' + (cfs ? '<div class="op-feats"><h4>클래스 특성</h4><div class="op-fl">' + cfs + '</div></div>' : '') + (rts ? '<div class="op-feats"><h4>종족 특성</h4><div class="op-fl">' + rts + '</div></div>' : '') + (feats ? '<div class="op-feats"><h4>재주</h4><div class="op-fl">' + feats + '</div></div>' : '') +
      (hbl ? '<div class="op-hb"><h4>홈브류 특성</h4>' + hbl + '</div>' : '') +
      (b.look || b.pers || b.story || b.goal ? '<div class="op-bio">' + BIO.filter(function (f) { return f[0] !== 'tag' && f[0] !== 'note' && b[f[0]]; }).map(function (f) { return '<p><b>' + f[1] + '</b> ' + esc(b[f[0]]).replace(/\n/g, '<br>') + '</p>'; }).join('') + '</div>' : '') + '</div>';
  }
  function savePng(el, name, btn) {
    var go = function () { var t0 = btn.textContent; btn.disabled = true; btn.textContent = '만드는 중…';
      window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true }).then(function (cv) { cv.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name.replace(/[\\/:*?"<>|]/g, '_'); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); btn.disabled = false; btn.textContent = t0; toast('PNG 로 저장했어요'); }, 'image/png'); })
        .catch(function (e) { btn.disabled = false; btn.textContent = t0; toast('PNG 를 만들지 못했어요: ' + e.message, true); }); };
    if (window.html2canvas) return go();
    var sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'; sc.onload = go; sc.onerror = function () { toast('그림 도구를 불러오지 못했어요', true); }; document.head.appendChild(sc);
  }
  function openOnePage(ch, r, owner) {
    var box = $('onePage'); if (!box) { box = document.createElement('div'); box.id = 'onePage'; document.body.appendChild(box); }
    box.innerHTML = '<div class="op-bar"><b>한 장 요약</b><span class="hint">PNG 는 그림 파일로, 인쇄 창에서 「PDF 로 저장」을 고르면 PDF 로 남아요</span><span class="sp"></span><button data-op="png">PNG 저장</button><button class="ghost" data-op="print">인쇄 · PDF</button><button class="ghost" data-op="close">닫기 ×</button></div>' + onePage(ch, r, owner);
    box.style.display = 'block'; document.body.classList.add('op-open'); box.scrollTop = 0;
    box.onclick = function (ev) { var k = ev.target.getAttribute && ev.target.getAttribute('data-op'); if (k === 'close') { box.style.display = 'none'; document.body.classList.remove('op-open'); } else if (k === 'print') window.print(); else if (k === 'png') savePng(box.querySelector('.op-page'), (ch.name || '시트') + '_한장요약.png', ev.target); };
  }
  /* ---------- 패시브 효과 ----------
   * 지금 적용 중인 글로 된 효과(재주 · 글로만 된 특성 · 장비 속성 · 홈브류 · 조건부 보정)를 모아 묶음으로 보여 준다.
   * ch.pg = { groups:[{id,n}], at:{key:묶음}, hide:{key:1}, tx:{key:글}, nm:{묶음:이름}, cu:[{id,g,n,text}] } */
  var PAS_DEF = [['feat', '재주'], ['feature', '클래스 · 종족 특성'], ['item', '장비'], ['hb', '홈브류'], ['cond', '조건부 보정']], pasEdit = false;
  function passiveList(ch, r) {
    var T = ch.tr || {}, out = [], g = function (x) { return glossAuto ? gsub(String(x || '')) : String(x || ''); }, nmOf = function (e) { return (T[e.id] && T[e.id].n) || e.n; };
    ownedOf(r, 'Feat').forEach(function (e) { var t = T[e.id], d = (t && t.f && t.f['Short Description']) || g((e.sp || {})['Short Description'] || (e.sp || {})['Benefit'] || ''); out.push({ key: 'f:' + e.id, g: 'feat', n: nmOf(e), text: d, el: e.id }); });
    ['Class Feature', 'Racial Trait'].forEach(function (ty) { ownedOf(r, ty).forEach(function (e) { var sp = e.sp || {}; if (!e.body || sp['Powers'] || sp['_DisplayPowers'] || /^Choose /.test(e.n)) return;
      if ((e.r || []).some(function (x) { return x[0] === 'select'; }) && String(e.body).length < 90) return;
      out.push({ key: 'c:' + e.id, g: 'feature', n: nmOf(e), text: (T[e.id] && (T[e.id].body || T[e.id].t)) || g(sp['Short Description'] || e.body), el: e.id }); }); });
    (r.worn || []).forEach(function (e) { if (e.t !== 'Magic Item') return; var sp = e.sp || {}, parts = []; ['Property', 'Critical', 'Special'].forEach(function (k) { if (sp[k]) parts.push((k === 'Property' ? '' : (F_KO[k] || k) + ' ') + ((T[e.id] && T[e.id].f && T[e.id].f[k]) || g(sp[k]))); });
      if (parts.length) out.push({ key: 'i:' + e.id, g: 'item', n: nmOf(e), text: parts.join(' · '), el: e.id }); });
    (ch.hbx || []).forEach(function (x) { out.push({ key: 'h:' + x.id, g: 'hb', n: x.n, text: x.text || '' }); });
    (ch.hb || []).forEach(function (id) { var e = db.byId[id]; if (!e || (e.t === 'Power' && e.sp && e.sp['Power Usage'])) return; var sp = e.sp || {}; out.push({ key: 'h:' + id, g: 'hb', n: nmOf(e), text: e.body || sp['Benefit'] || sp['Effect'] || sp['Short Description'] || '', el: id }); });
    Object.keys(r.breakdown).forEach(function (k) { r.breakdown[k].forEach(function (x) { if (!x.cond || !x.v) return; var se = db.byId[x.src];
      out.push({ key: 'k:' + k + ':' + x.src, g: 'cond', n: (x.v > 0 ? '+' : '') + x.v + ' ' + (gloss(k) || k), text: g(x.cond) + (se ? ' (' + se.n + ')' : ''), el: se ? se.id : '' }); }); });
    return out;
  }
  function passiveGroups(ch, r) {
    var pg = ch.pg || {}, at = pg.at || {}, hide = pg.hide || {}, tx = pg.tx || {}, nm2 = pg.nm || {}, groups = PAS_DEF.map(function (d) { return { id: d[0], n: nm2[d[0]] || d[1], items: [] }; }).concat((pg.groups || []).map(function (x) { return { id: x.id, n: x.n, items: [], custom: 1 }; }));
    var by = {}; groups.forEach(function (x) { by[x.id] = x; }); var hidden = [];
    passiveList(ch, r).forEach(function (it) { if (tx[it.key] != null) { it.orig = it.text; it.text = tx[it.key]; } if (hide[it.key]) { hidden.push(it); return; } (by[at[it.key]] || by[it.g]).items.push(it); });
    (pg.cu || []).forEach(function (c) { (by[c.g] || groups[0]).items.push({ key: 'u:' + c.id, n: c.n, text: c.text, cu: c.id }); });
    /* 끌어서 정한 순서(2026-11-24): go = 묶음 순서, io = 효과 순서. 목록에 없는 것은 원래 차례대로 뒤에 */
    var ord = function (arr, list, keyOf) { if (!list || !list.length) return arr; var ix = {}; list.forEach(function (k, i) { ix[k] = i; }); return arr.map(function (x, i) { return [x, ix[keyOf(x)] != null ? ix[keyOf(x)] : 1e6 + i]; }).sort(function (p, q) { return p[1] - q[1]; }).map(function (p) { return p[0]; }); };
    groups = ord(groups, pg.go, function (x) { return x.id; }); groups.forEach(function (x) { x.items = ord(x.items, pg.io, function (it) { return it.key; }); });
    return { groups: groups, hidden: hidden };
  }
  function passiveHtml(ch, r) {
    var mine = ch === cur, ed = mine && pasEdit, P = passiveGroups(ch, r), total = 0, opts = function (cur0) { return P.groups.map(function (g) { return '<option value="' + esc(g.id) + '"' + (g.id === cur0 ? ' selected' : '') + '>' + esc(g.n) + '</option>'; }).join('') + '<option value="_hide">숨기기</option>'; };
    var h = P.groups.map(function (g) { if (!g.items.length && !(ed && g.custom)) return ''; total += g.items.length;
      return '<div class="pasg"' + (ed ? ' data-pasg="' + esc(g.id) + '"' : '') + '><div class="pasg-h">' + (ed ? '<span class="pas-grip" draggable="true" data-pasdrag="g:' + esc(g.id) + '" title="끌어서 묶음 순서 바꾸기">⠿</span><button class="mini ghost pas-mv" data-pasmv="g:' + esc(g.id) + ':-1" title="위로">▲</button><button class="mini ghost pas-mv" data-pasmv="g:' + esc(g.id) + ':1" title="아래로">▼</button><input type="text" data-pasname="' + esc(g.id) + '" value="' + esc(g.n) + '">' + (g.custom ? '<button class="mini ghost" data-pasgdel="' + esc(g.id) + '" title="이 묶음 없애기">×</button>' : '') : '<b>' + esc(g.n) + '</b> <span class="hint">' + g.items.length + '</span>') + '</div>' +
        g.items.map(function (it) { return ed ? '<div class="pasl ed" data-pasit="' + esc(it.key) + '"><div class="pasl-t"><span class="pas-grip" draggable="true" data-pasdrag="i:' + esc(it.key) + '" title="끌어서 순서 · 묶음 바꾸기">⠿</span><button class="mini ghost pas-mv" data-pasmv="i:' + esc(it.key) + ':-1" title="위로">▲</button><button class="mini ghost pas-mv" data-pasmv="i:' + esc(it.key) + ':1" title="아래로">▼</button>' + (it.cu ? '<input type="text" data-pascn="' + esc(it.cu) + '" value="' + esc(it.n) + '" placeholder="이름">' : '<b>' + esc(it.n) + '</b>') + '<select data-pasat="' + esc(it.key) + '">' + opts(g.id) + '</select>' + (it.cu ? '<button class="mini ghost" data-pascdel="' + esc(it.cu) + '">×</button>' : it.orig != null ? '<button class="mini ghost" data-pasreset="' + esc(it.key) + '" title="원래 글로">되돌리기</button>' : '') + '</div><textarea data-pastx="' + esc(it.key) + '" rows="2">' + esc(it.text) + '</textarea></div>'
          : '<div class="pasl"' + (it.el ? ' data-el="' + esc(it.el) + '"' : '') + '><b>' + esc(it.n) + '</b><span>' + esc(it.text).replace(/\n/g, '<br>') + '</span></div>'; }).join('') +
        (ed ? '<button class="mini ghost" data-pasadd="' + esc(g.id) + '">+ 이 묶음에 직접 적기</button>' : '') + '</div>'; }).join('');
    if (ed && P.hidden.length) h += '<div class="pasg hid"><div class="pasg-h"><b>숨긴 것</b> <span class="hint">' + P.hidden.length + '</span></div>' + P.hidden.map(function (it) { return '<div class="pasl ed"><div class="pasl-t"><b>' + esc(it.n) + '</b><button class="mini ghost" data-passhow="' + esc(it.key) + '">다시 보이기</button></div></div>'; }).join('') + '</div>';
    var bar = mine ? '<div class="pas-bar"><button class="mini' + (ed ? '' : ' ghost') + '" data-pasedit="1">' + (ed ? '편집 끝내기' : '묶음 편집') + '</button>' + (ed ? '<button class="mini ghost" data-pasgadd="1">+ 새 묶음</button>' : '') + '<span class="hint">' + (ed ? '⠿ 를 끌거나 ▲▼ 로 묶음과 효과 순서를 바꾸고, 효과마다 묶음을 옮기거나 글을 고칠 수 있어요. 묶음은 맵툴 토큰에 「패시브」 버튼으로 나가요' : '') + '</span></div>' : '';
    return { html: bar + h, n: total };
  }
  /* GM 이 정하는 권한: gm 문서의 perm = { house, set, team, gloss, hb } — true 면 PL 도 할 수 있다 */
  var PERMS = [['house', '하우스룰 · 자작 요소 만들고 고치기'], ['hb', '공용 홈브류 만들고 고치기'], ['set', '세팅(메이킹 룰) 고치기'], ['gloss', '용어집 고치기'], ['team', '팀 만들기 · 이름 바꾸기 · 지우기']];
  var PERM_OF = { '하우스룰': 'house', '세팅': 'set', '용어집': 'gloss', '팀': 'team' };
  function perm(k) { var g = D4EHouse.gm(); return !!(g.perm && g.perm[k]); }
  function isGM(k) { var g = D4EHouse.gm(); return !g.hashes.length || !!ME.gm || perm(k || 'hb'); }
  function renderGm() {
    var box = $('gmPanel'); if (!box) return; var g = D4EHouse.gm(), real = !!ME.gm, open0 = !g.hashes.length;
    box.innerHTML = '<div class="bar"><strong>GM · 권한</strong><span class="hint">' + (g.hashes.length ? 'GM: ' + (g.names || []).map(esc).join(', ') : '아직 GM 이 없어요. 지금은 누구나 전부 고칠 수 있어요') + '</span><span class="sp"></span>' +
        (ME.hash && !real && open0 ? '<button class="mini" data-gm="add">내 서명을 GM 으로 등록</button>' : '') + (!ME.hash ? '<button class="mini ghost" data-gm="sign">서명하기</button>' : '') + '</div>' +
      (g.hashes.length ? '<div class="gmgrid"><div><b>GM 목록</b>' + (g.names || []).map(function (n, i) { return '<div class="gmrow"><span>' + esc(n) + (g.hashes[i] === ME.hash ? ' <span class="hint">(나)</span>' : '') + '</span>' + (real ? '<button class="mini ghost" data-gm="del" data-i="' + i + '">GM 풀기</button>' : '') + '</div>'; }).join('') +
          (real ? '<p class="hint">다른 사람을 GM 으로 올리려면 아래에서 골라요. 서명한 채로 사이트를 연 적이 있는 서명이 모두 나와요. 같은 이름이 여럿이면 비밀구가 다른 서명이에요(기기마다 다르게 서명한 경우) — 이름 뒤 네 글자로 가려요.</p><div class="gmrow"><select id="gmPick"><option value="">서명 고르기</option></select><button class="mini ghost" data-gm="promote">GM 으로 올리기</button></div>' : '') + '</div>' +
        '<div><b>PL 에게 허용할 것</b>' + PERMS.map(function (p) { return '<label class="gmrow"><span>' + p[1] + '</span><input type="checkbox" data-perm="' + p[0] + '"' + (perm(p[0]) ? ' checked' : '') + (real ? '' : ' disabled') + '></label>'; }).join('') +
          '<p class="hint">' + (real ? '끄면 GM 만 할 수 있어요. 자기 시트를 고치고 올리는 것은 언제나 누구나 돼요.' : 'GM 만 바꿀 수 있어요.') + '</p></div></div>' : '');
    /* GM 으로 올릴 수 있는 서명: 접속 중인 서명 + 시트를 올린 서명 + 요청 · 답글을 적은 서명 (서명 해시가 남아 있는 곳들) */
    var pk = $('gmPick'); if (pk) { var seenH = {}, addOpt = function (hash, name, where) { if (!hash || !name || seenH[hash] || g.hashes.indexOf(hash) >= 0 || !$('gmPick')) return; seenH[hash] = 1; var o = document.createElement('option'); o.value = hash + '|' + name; o.textContent = name + ' · ' + String(hash).slice(0, 4) + ' (' + where + ')'; $('gmPick').appendChild(o); };
      if (window.D4EPresence && D4EPresence.signed) D4EPresence.signed().forEach(function (p) { addOpt(p.hash, p.name, '접속 중'); });
      (REQS || []).forEach(function (d) { addOpt(d.byHash, d.by, '요청'); (d.replies || []).forEach(function (r) { addOpt(r.byHash, r.by, '요청'); }); });
      if (D4EShare.ready()) { D4EShare.list(SIG_KIND).then(function (rows) { rows.forEach(function (r) { addOpt(r.id, (r.data || {}).name, '서명'); }); }).catch(function () {});
        D4EShare.list().then(function (rows) { rows.forEach(function (r) { var d = r.data || {}; addOpt(d.ownerHash, d.owner, '시트'); }); }).catch(function () {}); } }
    box.onclick = async function (ev) { var k = ev.target.getAttribute && ev.target.getAttribute('data-gm'); if (!k) return; var g2 = D4EHouse.gm();
      try { if (k === 'sign') { openSign(); return; }
        if (k === 'add') { if (g2.hashes.length || !ME.hash || !confirm('「' + ME.name + '」 서명을 GM 으로 등록할까요?')) return; await saveGm({ hashes: [ME.hash], names: [ME.name] }); }
        else if (k === 'del') { if (!ME.gm) return; var i = +ev.target.getAttribute('data-i'); if (!confirm('「' + g2.names[i] + '」의 GM 을 풀까요?' + (g2.hashes.length === 1 ? '\nGM 이 아무도 없으면 누구나 전부 고칠 수 있게 돼요.' : ''))) return; var h = g2.hashes.slice(), nn = g2.names.slice(); h.splice(i, 1); nn.splice(i, 1); await saveGm({ hashes: h, names: nn }); }
        else if (k === 'promote') { if (!ME.gm) return; var v = ($('gmPick').value || '').split('|'); if (!v[0]) return; await saveGm({ hashes: g2.hashes.concat([v[0]]), names: g2.names.concat([v.slice(1).join('|')]) }); }
        renderGm(); } catch (e) { alert('저장하지 못했어요: ' + e.message); } };
    box.onchange = async function (ev) { var k = ev.target.getAttribute && ev.target.getAttribute('data-perm'); if (!k || !ME.gm) return; var g2 = D4EHouse.gm(), pm = Object.assign({}, g2.perm || {}); pm[k] = ev.target.checked;
      try { await saveGm({ hashes: g2.hashes, names: g2.names, perm: pm }); toast('권한을 바꿨어요'); } catch (e) { alert('저장하지 못했어요: ' + e.message); } renderGm(); };
  }
  function canGM(what) { var g = D4EHouse.gm(); if (!g.hashes.length || ME.gm || perm(PERM_OF[what])) return true; alert((what || '이것') + '은(는) GM 만 고칠 수 있어요. GM 서명으로 들어와 주세요.'); return false; }
  function openSign() {
    var g = D4EHouse.gm(), o = {}; try { o = JSON.parse(localStorage.getItem('d4e_sign') || '{}') || {}; } catch (e) {}
    $('sgName').value = o.name || ME.name || ''; $('sgSecret').value = o.secret || '';
    $('sgState').textContent = ME.hash ? '지금 서명: ' + ME.name + (ME.gm ? ' (GM)' : '') : '아직 서명하지 않았어요.';
    $('sgGm').textContent = g.hashes.length ? 'GM: ' + (g.names || []).join(', ') : '아직 GM 이 등록되지 않았어요. 서명한 뒤 「GM 으로 등록」을 누르면 이 서명이 GM 이 돼요.';
    $('sgGmAdd').hidden = !(ME.hash && (!g.hashes.length || ME.gm) && !(ME.gm)); $('sgGmDel').hidden = !ME.gm;
    $('signBox').hidden = false;
  }
  async function saveGm(d) { var old = D4EHouse.gm(); if (!d.perm && old.perm) d.perm = old.perm; d.at = Date.now(); await D4EShare.put('gm', d, D4EHouse.CFG); D4EHouse.setGm(d); refreshSign(); if (!$('signBox').hidden) openSign(); }
  function wireSign() {
    $('signBtn').onclick = openSign; $('sgClose').onclick = function () { $('signBox').hidden = true; };
    $('sgSave').onclick = async function () { var n = $('sgName').value.trim(), sc = $('sgSecret').value; if (!n || !sc) { alert('이름과 비밀구를 모두 적어 주세요.'); return; }
      localStorage.setItem('d4e_sign', JSON.stringify({ name: n, secret: sc })); await loadSign(); openSign(); if (!$('tab-team').hidden) renderTeam(); syncDown(true); };
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
      clearTimeout(upTimer); cur.pub = true; var doc = docOf(cur, res); if (keep) { doc.owner = ex.data.owner; doc.ownerHash = ex.data.ownerHash; } await D4EShare.put(cur.id, doc);
      if (!keep) { cur.sy = doc.at; REMOTE[cur.id] = { ownerHash: ME.hash, at: doc.at }; delete cur.foreign; SNAP[cur.id] = sig(cur); saveRaw(); syncNote('저장됨 · 팀에 보임'); }
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
    try { rows = (await D4EShare.list()).filter(function (r) { return !(r.data && r.data.priv); }); } catch (e) { box.innerHTML = '<p class="hint">읽지 못했어요: ' + esc(e.message) + '</p>'; return; }
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
        var ch = { id: row.id, name: d.name, port: d.port || '', tok: d.tok || '', face: d.face || '', stand: d.stand || '', cut: d.cut || '', hidePw: d.hidePw || [], fx: d.fx || {}, level: d.level || 1, abilities: d.abilities || {}, choices: d.choices || {}, equip: d.equip || [], grants: d.grants || [], tr: d.tr || {}, ed: d.ed || {}, hb: d.hb || [], hbx: d.hbx || [], pg: d.pg || {}, bio: d.bio || {}, set: d.set || '' }, r = E.build(db, ch); ch.eq = d.eq || {}; return { ch: ch, r: r }; };
      /* 파워 가짓수 칸을 누르면 그 묶음의 파워 이름이 펼쳐지고, 이름을 누르면 파워 카드가 뜬다 */
      var pwBox = card0().querySelector('.tc-pw'), pwOpen = '';
      card0().querySelectorAll('.pwc').forEach(function (el) { el.title = '눌러서 파워 보기'; el.onclick = function () {
        if (!db) { alert('파워 내용은 룰 데이터를 불러온 뒤에 볼 수 있어요. 「데이터」 탭을 확인해 주세요.'); return; }
        var u = el.getAttribute('data-u'); card0().querySelectorAll('.pwc').forEach(function (x) { x.classList.remove('on'); });
        if (pwOpen === u) { pwOpen = ''; pwBox.hidden = true; return; }
        pwOpen = u; el.classList.add('on'); var bb = built(), list = ownedOf(bb.r, 'Power').filter(function (p) { return p.sp && p.sp['Power Usage'] && !/^ID_INTERNAL/.test(p.id) && p.n !== 'Second Wind' && usageClass(p) === u; });
        trCtx = { map: shTr(bb.ch.tr), edit: false }; calcCtx = bb; pwBox.hidden = false; pwBox.innerHTML = list.length ? '' : '<span class="hint">없어요</span>';
        list.forEach(function (p) { var b = document.createElement('button'); b.className = 'tc-pchip ' + u; var t = (bb.ch.tr || {})[p.id]; b.textContent = (t && t.n) || p.n;
          b.onclick = function () { trCtx = { map: shTr(bb.ch.tr), edit: false }; calcCtx = bb; openDetail(p); $('mTitle').textContent = (d.name || '') + ' · ' + b.textContent; $('mDetail').innerHTML = powerCard(p, true); }; pwBox.appendChild(b); });
      }; });
      var canEdit = !!(ME.gm || (d.ownerHash ? d.ownerHash === ME.hash : (chars[row.id] || (d.owner && d.owner === ME.name) || !d.ownerHash)));
      var b1 = document.createElement('button'); b1.className = 'mini'; b1.textContent = '시트 보기';
      b1.onclick = function () {
        if (!db) { alert('전체 시트는 룰 데이터를 불러온 뒤에 볼 수 있어요. 「데이터」 탭을 확인해 주세요.'); return; }
        var bb = built(), ch = bb.ch, r = bb.r; var ts = $('teamSheet'); ts.hidden = false; ts.innerHTML = '<div class="tsbar"><b>' + esc(d.name || '이름 없음') + '</b><span class="hint">' + (canEdit ? '주인이나 GM 은 「이 시트 고치기」로 만들기 화면에서 고친 뒤 다시 올릴 수 있어요' : '보기 전용이에요') + '</span>' + '<button class="mini ghost" data-ts="one">한 장 요약</button>' + (canEdit ? '<button class="mini" data-ts="edit">이 시트 고치기</button>' : '') + '<button class="mini ghost" data-ts="close">닫기 ×</button></div>' + sheetHtml(ch, r, d.owner);
        teamCtx = { map: shTr(ch.tr), edit: false }; teamCalc = { r: r, ch: ch }; wireSheet(ts, r); ts.scrollIntoView({ behavior: 'smooth' });
        ts.querySelector('[data-ts=close]').onclick = function (ev) { ev.stopPropagation(); ts.hidden = true; ts.innerHTML = ''; card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
        ts.querySelector('[data-ts=one]').onclick = function (ev) { ev.stopPropagation(); trCtx = teamCtx; calcCtx = teamCalc; openOnePage(ch, r, d.owner); };
        var eb = ts.querySelector('[data-ts=edit]'); if (eb) eb.onclick = function (ev) { ev.stopPropagation();
          var loc = chars[row.id]; if (loc && !confirm('내 브라우저에 이 캐릭터가 이미 있어요.\n확인 = 팀에 올라온 판으로 덮어쓰고 고치기\n취소 = 내 브라우저의 판을 그대로 열기')) { cur = loc; saveChars(); tab('edit'); return; }
          var n = loc || newChar(); if (!loc) { delete chars[n.id]; n.id = row.id; chars[n.id] = n; }
          applyDoc(n, d); n.pub = !d.priv; if (d.ownerHash === ME.hash && ME.hash) { delete n.foreign; n.mt = n.sy = d.at || Date.now(); REMOTE[row.id] = { ownerHash: d.ownerHash, at: d.at || 0 }; } else n.foreign = true; SNAP[n.id] = sig(n); cur = n; saveChars(); tab('edit'); toast(n.foreign ? '만들기 화면으로 가져왔어요. 남의 시트라 고친 뒤 「팀에 올리기」를 눌러야 반영돼요' : '만들기 화면으로 가져왔어요. 고치면 저절로 저장돼요'); };
      };
      var b2 = document.createElement('button'); b2.className = 'mini ghost'; b2.textContent = '복제해서 내 것으로';
      b2.onclick = function () { var n = newChar(); n.name = (d.name || '') + ' (복제)'; n.level = d.level || 1; n.port = d.port || ''; n.abilities = Object.assign(n.abilities, d.abilities || {}); n.choices = JSON.parse(JSON.stringify(d.choices || {})); n.eq = JSON.parse(JSON.stringify(d.eq || {})); n.equip = (d.equip || []).slice(); n.set = d.set || ''; n.setInit = n.set; n.tr = JSON.parse(JSON.stringify(d.tr || {})); n.ed = JSON.parse(JSON.stringify(d.ed || {})); n.hb = (d.hb || []).slice(); n.hbx = JSON.parse(JSON.stringify(d.hbx || [])); n.pg = JSON.parse(JSON.stringify(d.pg || {})); n.fx = JSON.parse(JSON.stringify(d.fx || {})); n.bio = JSON.parse(JSON.stringify(d.bio || {})); cur = n; saveChars(); tab('edit'); };
      c.appendChild(b1); c.appendChild(document.createTextNode(' ')); c.appendChild(b2);
      if (ME.gm || (d.ownerHash ? d.ownerHash === ME.hash : (chars[row.id] || (d.owner && d.owner === ME.name)))) {
        var b3 = document.createElement('button'); b3.className = 'mini ghost'; b3.textContent = '내리기';
        if (ME.gm && Object.keys(T).length) { var mv = document.createElement('select'); mv.className = 'mini'; teamOptions(mv, T[d.team] ? d.team : '', true);
          mv.onchange = async function () { d.team = mv.value; try { await D4EShare.put(row.id, d); renderTeam(); } catch (e) { alert(e.message); } }; c.appendChild(document.createTextNode(' ')); c.appendChild(mv); }
        b3.onclick = async function (ev) { ev.stopPropagation(); if (!confirm('팀 시트에서 내릴까요? 시트는 주인의 보관용으로 남아요.')) return; try { d.priv = true; d.at = Date.now(); await D4EShare.put(row.id, d); var lc0 = chars[row.id]; if (lc0) { lc0.pub = false; lc0.sy = d.at; SNAP[row.id] = sig(lc0); saveRaw(); } renderTeam(); } catch (e) { alert(e.message); } };
        c.appendChild(document.createTextNode(' ')); c.appendChild(b3);
      }
      /* 카드 어디를 눌러도 시트가 열린다 (단추 · 고르기 · 파워 칸은 제 할 일을 한다) */
      card.title = '눌러서 시트 보기'; card.onclick = function (ev) { if (ev.target.closest('button,select,.pwc,.tc-pw,.tc-act')) return; b1.onclick(); };
      box.appendChild(card);
    });
  }

  /* ---------- 탭 · 시작 ---------- */
  /* ---------- 버그 · 개선 요청 게시판 (docs kind dnd4e_req, 한 글 = 문서 하나) ---------- */
  var REQ_KIND = 'dnd4e_req', REQS = [], reqKind = 'bug', reqF = localStorage.getItem('d4e_reqf') || 'open', reqOpen = {};
  var REQ_ST = { new: ['새 글', 'st-new'], seen: ['확인 중', 'st-seen'], done: ['고침', 'st-done'], hold: ['보류', 'st-hold'], no: ['안 함', 'st-no'] };
  var REQ_TY = { bug: '버그', idea: '개선 요청' };
  function reqText(t) { return esc(t || '').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>'); }
  function reqWho() { return ME.name || ($('rqName').value || '').trim(); }
  function reqMine(d) { return !!(ME.hash && d.byHash && d.byHash === ME.hash); }
  async function loadReqs() {
    try { var rows = await D4EShare.list(REQ_KIND); REQS = rows.map(function (r) { return Object.assign({ id: r.id }, r.data || {}); }); renderReqs(); }
    catch (e) { $('rqList').innerHTML = '<p class="hint bad">글을 읽지 못했어요: ' + esc(e.message) + '</p>'; }
  }
  function reqCount() { var n = REQS.filter(function (d) { return d.status === 'new' || d.status === 'seen' || !d.status; }).length; $('reqN').textContent = n ? ' ' + n : ''; }
  function renderReqs() {
    reqCount(); var gm = isGM('hb');
    var fl = [['open', '열린 것'], ['bug', '버그'], ['idea', '개선 요청'], ['done', '고친 것'], ['all', '전체']];
    $('rqFilter').innerHTML = fl.map(function (f) { var n = REQS.filter(function (d) { return reqPass(d, f[0]); }).length; return '<button class="mini' + (reqF === f[0] ? '' : ' ghost') + '" data-rf="' + f[0] + '">' + f[1] + ' ' + n + '</button>'; }).join('');
    var list = REQS.filter(function (d) { return reqPass(d, reqF); }).sort(function (a, b) { return (b.last || b.at || 0) - (a.last || a.at || 0); });
    $('rqList').innerHTML = list.length ? list.map(function (d) { var st = REQ_ST[d.status || 'new'] || REQ_ST.new, open = reqOpen[d.id], rp = d.replies || [], can = gm || reqMine(d);
      var h = '<article class="rq card' + (open ? ' open' : '') + '" data-rq="' + esc(d.id) + '"><div class="rqhead"><span class="rqty ty-' + (d.type === 'idea' ? 'idea' : 'bug') + '">' + (REQ_TY[d.type] || '버그') + '</span><b class="rqt">' + esc(d.title || '(제목 없음)') + '</b><span class="rqst ' + st[1] + '">' + st[0] + '</span></div>' +
        '<div class="rqmeta">' + esc(d.by || '익명') + ' · ' + verWhen(d.at || 0) + (rp.length ? ' · 답 ' + rp.length : '') + '</div>';
      if (!open) return h + (d.body ? '<div class="rqprev">' + esc(String(d.body).slice(0, 140)) + (String(d.body).length > 140 ? '…' : '') + '</div>' : '') + '</article>';
      h += '<div class="rqbody">' + reqText(d.body) + '</div>';
      h += rp.map(function (r, i) { return '<div class="rqrep' + (r.gm ? ' gm' : '') + '"><div class="rqmeta"><b>' + esc(r.by || '익명') + '</b>' + (r.gm ? ' <span class="rqgm">GM</span>' : '') + ' · ' + verWhen(r.at || 0) + ((gm || (ME.hash && r.byHash === ME.hash)) ? ' <button class="mini ghost" data-rqrdel="' + i + '">지우기</button>' : '') + '</div>' + reqText(r.text) + '</div>'; }).join('');
      h += '<div class="rqreply"><textarea rows="2" placeholder="답 달기"></textarea><button class="mini" data-rqrep>답 달기</button></div>';
      h += '<div class="rqacts">' + (gm ? '<label class="hint">상태 <select data-rqst>' + Object.keys(REQ_ST).map(function (k) { return '<option value="' + k + '"' + ((d.status || 'new') === k ? ' selected' : '') + '>' + REQ_ST[k][0] + '</option>'; }).join('') + '</select></label>' : '') + '<span class="sp"></span>' + (can ? '<button class="mini ghost" data-rqdel>글 지우기</button>' : '') + '<button class="mini ghost" data-rqfold>접기</button></div>';
      return h + '</article>'; }).join('') : '<p class="hint" style="padding:0 4px">' + (REQS.length ? '이 걸러 보기에 맞는 글이 없어요.' : '아직 올라온 글이 없어요.') + '</p>';
  }
  function reqPass(d, f) { var st = d.status || 'new'; return f === 'all' ? true : f === 'open' ? (st === 'new' || st === 'seen') : f === 'done' ? st === 'done' : (d.type || 'bug') === f && (st === 'new' || st === 'seen'); }
  async function reqSave(id, fn) {
    var row = await D4EShare.get(id, REQ_KIND); if (!row) throw new Error('글이 이미 지워졌어요');
    var d = row.data || {}; fn(d); await D4EShare.put(id, d, REQ_KIND);
    var i = REQS.findIndex(function (x) { return x.id === id; }); if (i >= 0) REQS[i] = Object.assign({ id: id }, d); renderReqs();
  }
  function wireReqs() {
    $('rqName').value = localStorage.getItem('d4e_reqname') || '';
    document.querySelectorAll('.rqkind button').forEach(function (b) { b.onclick = function () { reqKind = b.getAttribute('data-rk'); document.querySelectorAll('.rqkind button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    $('rqRefresh').onclick = loadReqs;
    $('rqFilter').onclick = function (ev) { var b = ev.target.closest('[data-rf]'); if (!b) return; reqF = b.getAttribute('data-rf'); localStorage.setItem('d4e_reqf', reqF); renderReqs(); };
    $('rqPost').onclick = async function () {
      var t = $('rqTitle').value.trim(), body = $('rqBody').value.trim(), who = reqWho();
      if (!t) { toast('제목을 적어 주세요', true); return; } if (!who) { toast('이름을 적어 주세요 (서명하면 자동으로 들어가요)', true); $('rqName').focus(); return; }
      if (!ME.name) localStorage.setItem('d4e_reqname', who);
      var id = 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), d = { type: reqKind, title: t.slice(0, 120), body: body.slice(0, 5000), by: who, byHash: ME.hash || '', at: Date.now(), last: Date.now(), status: 'new', replies: [] };
      $('rqPost').disabled = true;
      try { await D4EShare.put(id, d, REQ_KIND); REQS.unshift(Object.assign({ id: id }, d)); $('rqTitle').value = ''; $('rqBody').value = ''; if (reqF === 'done') reqF = 'open'; renderReqs(); toast('올렸어요. 고마워요!'); }
      catch (e) { toast('올리지 못했어요: ' + e.message, true); } finally { $('rqPost').disabled = false; }
    };
    $('rqList').onclick = async function (ev) {
      var art = ev.target.closest('[data-rq]'); if (!art) return; var id = art.getAttribute('data-rq'), b = ev.target.closest('button,select,textarea,a');
      if (!b) { reqOpen[id] = !reqOpen[id]; renderReqs(); return; }
      try {
        if (b.hasAttribute('data-rqfold')) { reqOpen[id] = false; renderReqs(); }
        else if (b.hasAttribute('data-rqrep')) { var ta = art.querySelector('.rqreply textarea'), txt = ta.value.trim(), who = reqWho(); if (!txt) return; if (!who) { toast('위쪽 이름 칸에 이름을 적어 주세요 (서명하면 자동)', true); return; }
          b.disabled = true; await reqSave(id, function (d) { (d.replies = d.replies || []).push({ by: who, byHash: ME.hash || '', gm: !!(ME.hash && isGM('hb')), text: txt.slice(0, 3000), at: Date.now() }); d.last = Date.now(); if (isGM('hb') && ME.hash && (d.status || 'new') === 'new') d.status = 'seen'; }); }
        else if (b.hasAttribute('data-rqrdel')) { var i = +b.getAttribute('data-rqrdel'); if (!confirm('이 답을 지울까요?')) return; await reqSave(id, function (d) { (d.replies || []).splice(i, 1); }); }
        else if (b.hasAttribute('data-rqdel')) { if (!confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return; await D4EShare.del(id, REQ_KIND); REQS = REQS.filter(function (x) { return x.id !== id; }); renderReqs(); toast('지웠어요'); }
      } catch (e) { toast('저장하지 못했어요: ' + e.message, true); }
    };
    $('rqList').onchange = async function (ev) { var s = ev.target.closest('[data-rqst]'); if (!s) return; var id = ev.target.closest('[data-rq]').getAttribute('data-rq');
      try { await reqSave(id, function (d) { d.status = s.value; d.last = Date.now(); }); toast('상태를 「' + REQ_ST[s.value][0] + '」(으)로 바꿨어요'); } catch (e) { toast('저장하지 못했어요: ' + e.message, true); } };
  }
  function tab(name) {
    if ((name === 'edit' || name === 'house') && !db) name = 'data';
    ['edit', 'team', 'house', 'data', 'req', 'mon'].forEach(function (t) { $('tab-' + t).hidden = t !== name; });
    if (name === 'mon' && window.D4EMon) D4EMon.render();
    if (name === 'data' && window.D4EDex) { D4EDex.render(); loadShTr().then(function () { if (!$('tab-data').hidden) D4EDex.render(); }); }
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === name); });
    if (name === 'edit') renderEdit();
    if (name === 'team') renderTeam();
    if (name === 'req') { $('rqName').hidden = !!ME.name; renderReqs(); loadReqs(); }
    if (name === 'house') { renderGm(); Promise.resolve(D4EHouse.refresh()).then(function () { refreshSign(); renderGm(); }, function () {}); }
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
    wireReqs(); setTimeout(function () { if (D4EShare.ready()) D4EShare.list(REQ_KIND).then(function (rows) { REQS = rows.map(function (r) { return Object.assign({ id: r.id }, r.data || {}); }); reqCount(); }, function () {}); }, 1500);
    $('mClose').onclick = closeModal; $('modal').onclick = function (ev) { if (ev.target === $('modal')) closeModal(); };
    $('chSel').onchange = function () { clearTimeout(upTimer); cur = chars[$('chSel').value]; saveChars(); renderEdit(); if (cur && canAuto(cur) && (cur.mt || 0) > (cur.sy || 0)) queueUp(); else syncNote(cur && cur.sy && canAuto(cur) ? '저장됨 · ' + (cur.pub ? '팀에 보임' : '내 보관용') : ''); if (!canAuto(cur)) queueUp(); };
    $('chNew').onclick = function () { cur = newChar(); saveChars(); renderEdit(); }; wireVers();
    $('chDel').onclick = function () { var rm = REMOTE[cur.id], mineRemote = !!(ME.hash && rm && rm.ownerHash === ME.hash && !cur.foreign); if (!confirm('「' + (cur.name || '') + '」을(를) 지울까요?' + (mineRemote ? '\n저장된 것도 함께 지워져서 다른 기기와 팀 시트에서도 사라져요.' : '\n이 브라우저에서만 지워져요.'))) return; clearTimeout(upTimer);
      if (mineRemote) { var did = cur.id; D4EShare.del(did).catch(function (e) { toast('저장된 것을 지우지 못했어요: ' + e.message, true); }); delete REMOTE[did]; } delete SNAP[cur.id]; delete chars[cur.id]; cur = chars[Object.keys(chars)[0]] || newChar(); saveChars(); renderEdit(); };
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
    /* 토큰 그림: 자르지 않고 통째로, 긴 쪽 512 까지 줄여 보관(2026-11-24: 전에는 정사각형 256 으로 잘랐음). 화면에서는 동그랗게 보이고 맵툴 토큰으로 나간다. */
    /* 스탠딩 · 컷신: 맵툴 토큰 안에 같이 넣는 그림. 자르지 않고 긴 쪽 1024 까지(2026-11-24). kind = 'face' | 'stand' | 'cut'. 초상(face)은 512 */
    window.D4EImg = { set: function (kind, f, cb) {
        if (!cur || (kind !== 'face' && kind !== 'stand' && kind !== 'cut')) return; if (!f || !/^image\//.test(f.type)) { alert('그림 파일을 골라 주세요.'); return; }
        var img = new Image(), url = URL.createObjectURL(f);
        img.onload = function () { var k = Math.min(1, (kind === 'face' ? 512 : 1024) / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); var out = c.toDataURL('image/webp', 0.86); if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png');
          URL.revokeObjectURL(url); cur[kind] = out; rebuild(); if (cb) cb(out); };
        img.onerror = function () { URL.revokeObjectURL(url); alert('그림 파일을 읽지 못했어요.'); }; img.src = url; },
      del: function (kind, cb) { if (cur && cur[kind]) { delete cur[kind]; rebuild(); } if (cb) cb(''); },
      get: function (kind) { return cur ? (cur[kind] || '') : ''; } };
    var setTok = function (f) {
      if (!f || !/^image\//.test(f.type)) { alert('그림 파일을 놓아 주세요.'); return; }
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () { var k = Math.min(1, 512 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var out = c.toDataURL('image/webp', 0.86); if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png');
        URL.revokeObjectURL(url); cur.tok = out; $('tokFile').value = ''; rebuild(); };
      img.onerror = function () { URL.revokeObjectURL(url); alert('그림 파일을 읽지 못했어요.'); };
      img.src = url;
    };
    if (!$('tokFile')) { var tf = document.createElement('input'); tf.type = 'file'; tf.accept = 'image/*'; tf.id = 'tokFile'; tf.hidden = true; document.body.appendChild(tf); }
    $('tokFile').onchange = function () { setTok($('tokFile').files[0]); };
    $('portFile').onchange = function () { setPort($('portFile').files[0]); };
    $('portDrop').onclick = function () { $('portFile').click(); };
    ['portDrop', 'sheet'].forEach(function (id) { var z = $(id);
      z.addEventListener('dragover', function (ev) { if (ev.dataTransfer && [].indexOf.call(ev.dataTransfer.types, 'Files') >= 0) { ev.preventDefault(); z.classList.add('drag'); } });
      z.addEventListener('dragleave', function () { z.classList.remove('drag'); });
      z.addEventListener('drop', function (ev) { ev.preventDefault(); z.classList.remove('drag'); (ev.target.closest && ev.target.closest('.ptok') ? setTok : setPort)(ev.dataTransfer.files[0]); }); });
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
    window.D4EApp = { onePage: function () { if (db && cur && res) openOnePage(cur, res, ME.name); }, mtData: mtData, hasChar: function () { return !!(db && cur && res); }, charNames: function () { return Object.keys(chars).map(function (k) { return chars[k].name; }).filter(Boolean); }, gsub: gsub, vocab: function (key, n) {
        var V = vocabCache[key]; if (!V) { var c = {}; (db.byType['Power'] || []).forEach(function (p) { var v = (p.sp || {})[key]; if (!v) return; (key === 'Keywords' ? String(v).split(',') : [String(v)]).forEach(function (x) { x = x.trim(); if (x && x.length < 60) c[x] = (c[x] || 0) + 1; }); });
          V = vocabCache[key] = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }); }
        return V.slice(0, n || 30); }, canGM: canGM, isGM: isGM, me: function () { return ME; }, curName: function () { return cur ? cur.name : ''; }, card: function (e) { return fields(e); }, shName: function (id) { var t = SHTR[id]; return (t && t.n) || ''; }, cardIn: function (e) { trCtx = { map: SHTR, edit: !!ME.hash, shared: true }; var kc = calcCtx; calcCtx = null; try { return fields(e); } finally { calcCtx = kc; } }, db: function () { return db; }, esc: esc, nm: nm, typeKo: typeKo, openSearch: openSearch, status: status,
      houseChanged: function () { if (!$('tab-edit').hidden) renderEdit(); status('룰 요소 ' + Object.keys(db.byId).length.toLocaleString() + '개 · 하우스룰 ' + D4EHouse.count() + '개'); } };
    D4EHouse.start();
    await loadSign(); loadShTr().then(function () { if (shLoaded && Object.keys(SHTR).length && db && cur && !$('tab-edit').hidden) rebuild(); });
    loadTrPack().then(function (n) { if (n && db && cur && !$('tab-edit').hidden) rebuild(); if (n && window.D4EDex && !$('tab-data').hidden) D4EDex.render(); });
    status('데이터를 찾는 중…');
    /* 사이트의 기본 데이터가 먼저(고쳐 올린 판이 모두에게 바로 가게). 사이트에서 못 읽을 때만 이 브라우저에 예전에 보관한 것을 쓴다. */
    var d = (await D4EData.loadSite()) || (await D4EData.loadStored());
    if (d) { useData(d); await loadHouse(); tab('edit'); if (!ME.hash) queueUp(); syncDown(true); window.addEventListener('focus', function () { syncDown(); }); }
    else { $('dataState').textContent = '아직 룰 데이터가 없어요. 아래에서 파일을 한 번 불러와 주세요.'; status('룰 데이터 없음'); tab('data'); }
  }
  start();
})();
