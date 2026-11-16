/* 몬스터 (GM용): 레벨 · 역할로 4판 표준 수치를 채워 몬스터를 만들고, 불러온 자료집의 몬스터를 바탕으로 고친다.
 * 만든 몬스터는 공유 DB(kind = dnd4e_mon)에, 불러온 자료집은 이 브라우저에만 둔다(책 내용을 사이트에 올리지 않는다). */
(function () {
  'use strict';
  var KIND = 'dnd4e_mon', PACK_KEY = 'd4e_monpack';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ROLES = ['Skirmisher', 'Brute', 'Soldier', 'Lurker', 'Controller', 'Artillery'];
  var ROLE_KO = { Skirmisher: '척후', Brute: '맹수', Soldier: '병사', Lurker: '잠복', Controller: '제어', Artillery: '포격', Minion: '졸개' };
  var TIERS = ['Standard', 'Elite', 'Solo', 'Minion'], TIER_KO = { Standard: '일반', Elite: '정예', Solo: '단독', Minion: '졸개' };
  var KINDS = [['', '특성'], ['aura', '오라'], ['m', '근접 기본'], ['M', '근접'], ['r', '원거리 기본'], ['R', '원거리'], ['C', '근거리'], ['A', '범위']];
  var KIND_KO = { '': '', aura: '오라', m: '근접 기본', M: '근접', r: '원거리 기본', R: '원거리', c: '근거리', C: '근거리', a: '범위', A: '범위' };
  var XP = [0, 100, 125, 150, 175, 200, 250, 300, 350, 400, 500, 600, 700, 800, 1000, 1200, 1400, 1600, 2000, 2400, 2800, 3200, 4150, 5100, 6050, 7000, 9000, 11000, 13000, 15000, 19000];
  var mine = [], pack = [], sel = null, editing = null, loaded = false, F = { q: '', role: '', lo: '', hi: '', src: '' };

  /* ---------- 4판 표준 수치 (MM3 이후의 표) ---------- */
  function roleOf(m) { return m.role === 'Minion' ? (m.role2 || 'Skirmisher') : m.role; }
  function math(lv, role, tier) {
    lv = Math.max(1, Math.min(35, +lv || 1)); var half = Math.floor(lv / 2);
    var hi = 16 + half, mid = 13 + half, lo = 10 + half, mod = function (v) { return Math.floor((v - 10) / 2); };
    var ab = { str: mid, con: mid, dex: mid, int: lo, wis: mid, cha: lo };
    if (role === 'Brute') { ab.str = hi; ab.con = hi; } else if (role === 'Soldier') { ab.str = hi; ab.con = mid; } else if (role === 'Skirmisher' || role === 'Lurker') { ab.dex = hi; } else if (role === 'Artillery') { ab.dex = hi; ab.int = mid; } else if (role === 'Controller') { ab.int = hi; ab.wis = hi; ab.cha = mid; }
    var f = role === 'Brute' ? 10 : (role === 'Lurker' || role === 'Artillery') ? 6 : 8;
    var hp = f * (lv + 1) + ab.con; if (tier === 'Elite') hp *= 2; else if (tier === 'Solo') hp *= 4; else if (tier === 'Minion') hp = 1;
    var ac = lv + (role === 'Soldier' ? 16 : (role === 'Brute' || role === 'Artillery') ? 12 : 14), nad = lv + 12;
    var fort = nad + ((role === 'Brute' || role === 'Soldier') ? 1 : role === 'Artillery' ? -1 : 0), ref = nad + ((role === 'Skirmisher' || role === 'Lurker' || role === 'Artillery') ? 1 : role === 'Brute' ? -1 : 0), will = nad + (role === 'Controller' ? 1 : 0);
    var dmg = lv + 8; if (role === 'Brute') dmg *= 1.25; if (tier === 'Minion') dmg = (lv + 8) / 2;
    var xp = (XP[Math.min(lv, 30)] || 19000) * (tier === 'Elite' ? 2 : tier === 'Solo' ? 5 : tier === 'Minion' ? 0.25 : 1);
    return { ab: ab, hp: hp, ac: ac, fort: fort, ref: ref, will: will, atkAC: lv + 5, atkNAD: lv + 3, dmg: Math.round(dmg), dmgArea: Math.round(dmg * 0.75), dmgLim: Math.round(dmg * 1.5),
      init: half + mod(ab.dex) + (role === 'Skirmisher' || role === 'Lurker' ? 2 : 0), xp: Math.round(xp), saves: tier === 'Elite' ? '+2' : tier === 'Solo' ? '+5' : '', ap: tier === 'Elite' ? '1' : tier === 'Solo' ? '2' : '', perc: half + mod(ab.wis) };
  }
  /* 평균 피해 → 주사위 식 (졸개는 고정 수치) */
  function dice(avg, flat) { avg = Math.max(1, Math.round(avg)); if (flat) return String(avg);
    var die = avg >= 40 ? 10 : avg >= 22 ? 8 : avg >= 12 ? 8 : 6, n = Math.max(1, Math.round(avg * 0.55 / ((die + 1) / 2))), b = Math.round(avg - n * (die + 1) / 2); if (b < 0) { n = Math.max(1, n - 1); b = Math.round(avg - n * (die + 1) / 2); }
    return n + 'd' + die + (b > 0 ? ' + ' + b : ''); }
  function blank() { var m = { id: '', n: '새 몬스터', lv: 1, role: 'Skirmisher', tier: 'Standard', leader: false, type: '중형 자연 인간형', senses: '', speed: '6', align: '무성향', lang: '', skills: '', eq: '', immune: '', resist: '', vuln: '', note: '', pw: [] }; fill(m, true); return m; }
  function fill(m, all) { var r = math(m.lv, roleOf(m), m.tier), set = function (k, v) { if (all || m[k] === '' || m[k] == null) m[k] = String(v); };
    ['hp', 'ac', 'fort', 'ref', 'will', 'init', 'xp'].forEach(function (k) { set(k, r[k]); }); Object.keys(r.ab).forEach(function (k) { set(k, r.ab[k]); });
    if (all) { m.saves = r.saves; m.ap = r.ap; if (!m.senses || /^Perception [+\-]\d+$/.test(m.senses) || /^지각 [+\-]\d+$/.test(m.senses)) m.senses = '지각 ' + (r.perc >= 0 ? '+' : '') + r.perc; }
    return m; }
  function atkTpl(m, kind) { var r = math(m.lv, roleOf(m), m.tier), mn = m.tier === 'Minion';
    if (kind === 'A' || kind === 'C') return { n: kind === 'A' ? '범위 공격' : '근거리 공격', k: kind, act: '일반', use: '조우', kw: '', t: (kind === 'A' ? '범위 폭발 1 (10칸 안)' : '근거리 분사 3') + '; +' + r.atkNAD + ' vs. 반사; ' + dice(mn ? r.dmg : r.dmgLim * 0.75, mn) + ' 피해.' };
    if (kind === 'R' || kind === 'r') return { n: '원거리 공격', k: 'r', act: '일반', use: '무제한', kw: '', t: '원거리 10; +' + r.atkAC + ' vs. AC; ' + dice(r.dmg, mn) + ' 피해.' };
    if (kind === 'lim') return { n: '강한 일격', k: 'M', act: '일반', use: '조우', kw: '', t: '+' + r.atkAC + ' vs. AC; ' + dice(mn ? r.dmg : r.dmgLim, mn) + ' 피해.' };
    return { n: '기본 공격', k: 'm', act: '일반', use: '무제한', kw: '', t: '+' + r.atkAC + ' vs. AC; ' + dice(r.dmg, mn) + ' 피해.' }; }

  /* ---------- 읽기 · 쓰기 ---------- */
  function gm() { return !window.D4EApp || D4EApp.isGM(); }
  function loadPack() { try { pack = JSON.parse(localStorage.getItem(PACK_KEY) || '[]') || []; } catch (e) { pack = []; } pack.forEach(function (m, i) { m.id = m.id || 'pk' + i; m._pack = 1; }); }
  async function load() { loadPack(); try { mine = (await D4EShare.list(KIND)).map(function (r) { var d = r.data || {}; d.id = r.id; return d; }); } catch (e) { mine = []; note('공유 DB에서 몬스터를 읽지 못했어요: ' + e.message); } loaded = true; }
  function note(t) { var n = $('monNote'); if (n) { n.textContent = t || ''; n.hidden = !t; } }
  function all() { return mine.concat(pack); }
  function byId(id) { return all().filter(function (m) { return m.id === id; })[0] || null; }
  function clean(m) { var o = {}; Object.keys(m).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = m[k]; }); return o; }
  async function save(m) { var me = (window.D4EApp && D4EApp.me()) || {}; if (!m.id || m._pack || /^pk\d+$/.test(m.id)) m.id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); delete m._pack;
    var d = clean(m); d.by = d.by || me.name || ''; d.at = Date.now(); await D4EShare.put(m.id, d, KIND);
    var i = mine.findIndex(function (x) { return x.id === m.id; }); if (i >= 0) mine[i] = d; else mine.unshift(d); return d; }

  /* ---------- 스탯 블록 ---------- */
  function sg(v) { v = String(v == null ? '' : v).trim(); return v === '' ? '' : (/^[+\-]/.test(v) ? v : '+' + v); }
  function mod(v, lv) { v = +v; if (!v) return ''; var x = Math.floor((v - 10) / 2) + Math.floor((+lv || 0) / 2); return v + ' (' + (x >= 0 ? '+' : '') + x + ')'; }
  function block(m) {
    var tier = m.tier && m.tier !== 'Standard' && m.tier !== 'Minion' ? (TIER_KO[m.tier] + ' ') : '', role = m.role === 'Minion' || m.tier === 'Minion' ? '졸개' + (m.role !== 'Minion' ? ' ' + (ROLE_KO[m.role] || m.role) : '') : (ROLE_KO[m.role] || m.role);
    var ln = function (a, b) { return b ? '<div class="mb-l"><b>' + a + '</b> ' + esc(b) + '</div>' : ''; }, hpN = +m.hp || 0;
    var h = '<div class="mblock r-' + esc(String(m.role || '').toLowerCase()) + ' t-' + esc(String(m.tier || '').toLowerCase()) + '"><div class="mb-h"><div><b>' + esc(m.n) + (m.q ? ' <i title="자료집에서 이름을 확실히 못 읽었어요. 확인해 주세요">?</i>' : '') + '</b><span>' + esc(m.type || '') + '</span></div><div class="mb-r"><b>' + (m.lv || 1) + '레벨 ' + tier + role + (m.leader ? ' (지휘)' : '') + '</b><span>XP ' + esc(Number(m.xp || 0).toLocaleString()) + '</span></div></div><div class="mb-b">';
    h += '<div class="mb-l"><b>우선권</b> ' + esc(sg(m.init)) + (m.senses ? ' &nbsp; <b>감각</b> ' + esc(m.senses) : '') + '</div>';
    (m.pw || []).filter(function (p) { return p.k === 'aura'; }).forEach(function (p) { h += '<div class="mb-l"><b>' + esc(p.n) + '</b>' + (p.kw ? ' (' + esc(p.kw) + ')' : '') + ' ' + esc(p.use || '오라') + '; ' + esc(p.t) + '</div>'; });
    h += '<div class="mb-l"><b>HP</b> ' + esc(m.hp) + (m.tier === 'Minion' || hpN <= 1 ? '; ' + esc(m.hpnote || '빗나간 공격은 졸개에게 피해를 주지 못한다.') : '; <b>반죽음</b> ' + Math.floor(hpN / 2)) + '</div>';
    h += '<div class="mb-def"><span><small>AC</small><b>' + esc(m.ac) + '</b></span><span><small>인내</small><b>' + esc(m.fort) + '</b></span><span><small>반사</small><b>' + esc(m.ref) + '</b></span><span><small>의지</small><b>' + esc(m.will) + '</b></span></div>';
    h += ln('면역', m.immune) + ln('저항', m.resist) + ln('취약', m.vuln) + ln('내성 굴림', m.saves) + ln('이동', m.speed) + ln('행동 점수', m.ap) + '</div><div class="mb-p">';
    (m.pw || []).filter(function (p) { return p.k !== 'aura'; }).forEach(function (p) {
      var head = [p.act, p.use].filter(Boolean).join('; ');
      h += '<div class="mb-pw' + (p.k ? ' mb-atk' : '') + '"><div class="mb-pn">' + (p.k ? '<i class="mb-ic">' + esc(KIND_KO[p.k] || p.k) + '</i>' : '') + '<b>' + esc(p.n || '') + '</b>' + (head ? ' <span>(' + esc(head) + ')</span>' : '') + (p.kw ? ' <em>✦ ' + esc(p.kw) + '</em>' : '') + '</div>' + (p.t ? '<div class="mb-pt">' + esc(p.t).replace(/\n/g, '<br>') + '</div>' : '') + '</div>'; });
    h += '</div><div class="mb-f">' + ln('성향', m.align) + ln('언어', m.lang) + ln('기술', m.skills) +
      '<div class="mb-ab">' + [['근력', 'str'], ['건강', 'con'], ['민첩', 'dex'], ['지능', 'int'], ['지혜', 'wis'], ['매력', 'cha']].map(function (a) { return '<span><small>' + a[0] + '</small>' + esc(mod(m[a[1]], m.lv) || '-') + '</span>'; }).join('') + '</div>' + ln('장비', m.eq) + ln('메모', m.note) + '</div></div>';
    return h; }

  /* ---------- 화면 ---------- */
  function filtered() { var q = F.q.trim().toLowerCase(); return all().filter(function (m) {
      if (F.src === 'mine' && m._pack) return false; if (F.src === 'pack' && !m._pack) return false;
      if (F.role && m.role !== F.role && !(F.role === 'Minion' && m.tier === 'Minion')) return false;
      if (F.lo && +m.lv < +F.lo) return false; if (F.hi && +m.lv > +F.hi) return false;
      if (q && (m.n + ' ' + (m.type || '')).toLowerCase().indexOf(q) < 0) return false; return true;
    }).sort(function (a, b) { return (a._pack ? 1 : 0) - (b._pack ? 1 : 0) || (+a.lv - +b.lv) || (a.n < b.n ? -1 : 1); }); }
  function renderList() { var box = $('monList'); if (!box) return; var L = filtered();
    $('monCount').textContent = L.length + '마리' + (pack.length ? ' · 자료집 ' + pack.length : '') + (mine.length ? ' · 만든 것 ' + mine.length : '');
    box.innerHTML = L.length ? L.slice(0, 400).map(function (m) { return '<div class="mrow r-' + esc(String(m.role || '').toLowerCase()) + (sel === m.id ? ' on' : '') + '" data-mid="' + esc(m.id) + '"><i>' + (m.lv || 1) + '</i><b>' + esc(m.n) + '</b><span>' + (m.tier && m.tier !== 'Standard' ? TIER_KO[m.tier] + ' ' : '') + (m.role === 'Minion' ? '' : (ROLE_KO[m.role] || m.role || '')) + '</span>' + (m._pack ? '<em>자료집</em>' : '') + '</div>'; }).join('') + (L.length > 400 ? '<p class="hint">400마리까지만 보여요. 검색이나 레벨로 좁혀 주세요.</p>' : '')
      : '<p class="hint">' + (all().length ? '조건에 맞는 몬스터가 없어요.' : '아직 몬스터가 없어요. 「+ 새 몬스터」로 만들거나, 자료집 파일을 불러와 보세요.') + '</p>'; }
  function renderView() { var box = $('monView'); if (!box) return;
    if (editing) { box.innerHTML = form(editing); return; }
    var m = sel && byId(sel); if (!m) { box.innerHTML = '<p class="hint">왼쪽에서 몬스터를 고르면 스탯 블록이 여기에 나와요.</p>'; return; }
    box.innerHTML = '<div class="mbar">' + (m._pack ? '<button data-mact="base">이걸 바탕으로 새로 만들기</button>' : '<button data-mact="edit">고치기</button><button class="ghost" data-mact="base">복사해서 새로</button><button class="ghost" data-mact="del">지우기</button>') + '</div>' + block(m); }
  function inp(k, v, w, ph) { return '<input type="text" data-mf="' + k + '" value="' + esc(v == null ? '' : v) + '"' + (w ? ' style="width:' + w + '"' : '') + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>'; }
  function selc(k, v, opts) { return '<select data-mf="' + k + '">' + opts.map(function (o) { var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(val) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') + '</select>'; }
  function form(m) {
    var r = math(m.lv, roleOf(m), m.tier), lab = function (t, x) { return '<label><small>' + t + '</small>' + x + '</label>'; };
    var h = '<div class="mform"><div class="mbar"><b>' + (m.id && !m._pack ? '몬스터 고치기' : '새 몬스터') + '</b><span class="sp"></span><button data-mact="save">저장</button><button class="ghost" data-mact="cancel">취소</button></div>';
    h += '<div class="mf-g">' + lab('이름', inp('n', m.n, '100%')) + lab('레벨', '<input type="number" min="1" max="35" data-mf="lv" value="' + esc(m.lv) + '" style="width:64px">') +
      lab('역할', selc('role', m.role === 'Minion' ? (m.role2 || 'Skirmisher') : m.role, ROLES.map(function (x) { return [x, ROLE_KO[x] + ' ' + x]; }))) + lab('등급', selc('tier', m.tier, TIERS.map(function (x) { return [x, TIER_KO[x]]; }))) +
      '<label class="chk"><input type="checkbox" data-mf="leader"' + (m.leader ? ' checked' : '') + '> 지휘(Leader)</label></div>';
    h += '<div class="mf-auto"><button data-mact="fill" title="레벨 · 역할 · 등급에 맞는 표준 수치로 HP · 방어 · 우선권 · 능력치 · XP 를 다시 채워요">표준 수치로 채우기</button><span class="hint" id="mfHint">기준: 명중 +' + r.atkAC + ' vs AC / +' + r.atkNAD + ' vs 그 밖 · 평균 피해 ' + r.dmg + ' (범위 ' + r.dmgArea + ', 조우 ' + r.dmgLim + ')</span></div>';
    h += '<div class="mf-g">' + lab('크기 · 기원 · 종류', inp('type', m.type, '100%', '예: 대형 원소 인간형 (불)')) + lab('XP', inp('xp', m.xp, '80px')) + '</div>';
    h += '<div class="mf-g n">' + lab('HP', inp('hp', m.hp)) + lab('AC', inp('ac', m.ac)) + lab('인내', inp('fort', m.fort)) + lab('반사', inp('ref', m.ref)) + lab('의지', inp('will', m.will)) + lab('우선권', inp('init', m.init)) + lab('내성', inp('saves', m.saves)) + lab('행동 점수', inp('ap', m.ap)) + '</div>';
    h += '<div class="mf-g">' + lab('감각', inp('senses', m.senses, '100%', '지각 +5; 암시야')) + lab('이동', inp('speed', m.speed, '100%', '6, 비행 8')) + '</div>';
    h += '<div class="mf-g">' + lab('면역', inp('immune', m.immune, '100%')) + lab('저항', inp('resist', m.resist, '100%', '불 10')) + lab('취약', inp('vuln', m.vuln, '100%')) + '</div>';
    h += '<div class="mf-g n">' + [['근력', 'str'], ['건강', 'con'], ['민첩', 'dex'], ['지능', 'int'], ['지혜', 'wis'], ['매력', 'cha']].map(function (a) { return lab(a[0], inp(a[1], m[a[1]])); }).join('') + '</div>';
    h += '<div class="mf-g">' + lab('성향', inp('align', m.align, '100%')) + lab('언어', inp('lang', m.lang, '100%')) + lab('기술', inp('skills', m.skills, '100%')) + lab('장비', inp('eq', m.eq, '100%')) + '</div>';
    h += '<div class="mf-ph"><b>파워 · 특성</b><span class="sp"></span><button class="mini" data-madd="m">+ 기본 공격</button><button class="mini" data-madd="r">+ 원거리</button><button class="mini" data-madd="lim">+ 조우 일격</button><button class="mini" data-madd="C">+ 근거리</button><button class="mini" data-madd="A">+ 범위</button><button class="mini ghost" data-madd="trait">+ 특성</button><button class="mini ghost" data-madd="aura">+ 오라</button></div>';
    h += (m.pw || []).map(function (p, i) { return '<div class="mf-pw" data-pi="' + i + '"><div class="mf-pr">' + selc('pw.k', p.k === 'c' ? 'C' : p.k === 'a' ? 'A' : p.k, KINDS) + '<input type="text" data-mf="pw.n" value="' + esc(p.n) + '" placeholder="이름">' +
      '<input type="text" data-mf="pw.act" value="' + esc(p.act) + '" placeholder="행동 (일반 · 보조 · 즉시 반응…)">' + '<input type="text" data-mf="pw.use" value="' + esc(p.use) + '" placeholder="무제한 · 조우 · 재충전 5 6">' + '<input type="text" data-mf="pw.kw" value="' + esc(p.kw) + '" placeholder="키워드">' +
      '<button class="mini ghost" data-mpup="' + i + '" title="위로">↑</button><button class="mini ghost" data-mpdel="' + i + '" title="지우기">×</button></div><textarea data-mf="pw.t" rows="2" placeholder="사거리; +명중 vs. 방어; 피해와 효과">' + esc(p.t) + '</textarea></div>'; }).join('') || '<p class="hint">위 단추로 공격이나 특성을 넣어 주세요. 명중과 피해는 표준 수치로 미리 채워져요.</p>';
    h += lab('메모 (GM만 보는 전술 · 설명)', '<textarea data-mf="note" rows="2">' + esc(m.note || '') + '</textarea>') + '<div class="mf-prev"><small>미리 보기</small>' + block(m) + '</div></div>';
    return h; }
  function readForm() { var m = editing, box = $('monView'); if (!m || !box) return;
    box.querySelectorAll('[data-mf]').forEach(function (x) { var k = x.getAttribute('data-mf'); if (k.indexOf('pw.') === 0) { var row = x.closest('[data-pi]'), p = m.pw[+row.getAttribute('data-pi')]; if (p) p[k.slice(3)] = x.value; return; }
      if (k === 'leader') m.leader = x.checked; else if (k === 'lv') m.lv = Math.max(1, Math.min(35, +x.value || 1)); else m[k] = x.value; });
    if (m.tier === 'Minion') { m.role2 = m.role === 'Minion' ? m.role2 : m.role; } }
  function render() { var root = $('tab-mon'); if (!root) return;
    if (!gm()) { $('monBody').hidden = true; note('몬스터 탭은 GM 서명으로 들어왔을 때 쓸 수 있어요.'); return; }
    $('monBody').hidden = false; note('');
    if (!loaded) { $('monList').innerHTML = '<p class="hint">읽는 중이에요.</p>'; load().then(function () { renderList(); renderView(); }); return; }
    renderList(); renderView(); }
  function wire() { var root = $('tab-mon'); if (!root || root._w) return; root._w = 1;
    root.addEventListener('input', function (ev) { var t = ev.target;
      if (t.id === 'monQ') { F.q = t.value; renderList(); } else if (t.id === 'monLo') { F.lo = t.value; renderList(); } else if (t.id === 'monHi') { F.hi = t.value; renderList(); }
      else if (t.closest('.mform') && editing) { readForm(); var pv = root.querySelector('.mf-prev'); if (pv) pv.innerHTML = '<small>미리 보기</small>' + block(editing); } });
    root.addEventListener('change', function (ev) { var t = ev.target;
      if (t.id === 'monRole') { F.role = t.value; renderList(); } else if (t.id === 'monSrc') { F.src = t.value; renderList(); }
      else if (t.id === 'monFile') { var f = t.files && t.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { try { var a = JSON.parse(rd.result); if (!Array.isArray(a)) throw new Error('몬스터 목록 파일이 아니에요.'); localStorage.setItem(PACK_KEY, JSON.stringify(a)); loadPack(); note('자료집 ' + pack.length + '마리를 이 브라우저에 불러왔어요.'); renderList(); } catch (e) { alert('불러오지 못했어요: ' + e.message); } t.value = ''; }; rd.readAsText(f); }
      else if (t.closest('.mform') && editing && /^(role|tier|lv)$/.test(t.getAttribute('data-mf') || '')) { readForm(); var r = math(editing.lv, roleOf(editing), editing.tier), hn = $('mfHint'); if (hn) hn.textContent = '기준: 명중 +' + r.atkAC + ' vs AC / +' + r.atkNAD + ' vs 그 밖 · 평균 피해 ' + r.dmg + ' (범위 ' + r.dmgArea + ', 조우 ' + r.dmgLim + ')'; var pv = root.querySelector('.mf-prev'); if (pv) pv.innerHTML = '<small>미리 보기</small>' + block(editing); } });
    root.addEventListener('click', async function (ev) { var t = ev.target, row = t.closest('[data-mid]'), act = t.closest('[data-mact]'), add = t.closest('[data-madd]');
      if (t.id === 'monNew') { editing = blank(); sel = null; renderList(); renderView(); return; }
      if (t.id === 'monPick') { $('monFile').click(); return; }
      if (t.id === 'monPackDel') { if (pack.length && confirm('이 브라우저에 불러온 자료집 ' + pack.length + '마리를 지울까요? (만든 몬스터는 그대로예요)')) { localStorage.removeItem(PACK_KEY); loadPack(); renderList(); renderView(); } return; }
      if (row && !editing) { sel = row.getAttribute('data-mid'); renderList(); renderView(); return; }
      if (row && editing) { if (confirm('고치던 것을 버리고 다른 몬스터를 볼까요?')) { editing = null; sel = row.getAttribute('data-mid'); renderList(); renderView(); } return; }
      if (add && editing) { readForm(); var k = add.getAttribute('data-madd'); editing.pw.push(k === 'trait' ? { n: '', k: '', act: '', use: '', kw: '', t: '' } : k === 'aura' ? { n: '', k: 'aura', act: '', use: '오라 1', kw: '', t: '' } : atkTpl(editing, k)); renderView(); return; }
      var pd = t.closest('[data-mpdel]'), pu = t.closest('[data-mpup]');
      if (pd && editing) { readForm(); editing.pw.splice(+pd.getAttribute('data-mpdel'), 1); renderView(); return; }
      if (pu && editing) { readForm(); var i = +pu.getAttribute('data-mpup'); if (i > 0) { var x = editing.pw[i]; editing.pw[i] = editing.pw[i - 1]; editing.pw[i - 1] = x; } renderView(); return; }
      if (!act) return; var a = act.getAttribute('data-mact'), m = sel && byId(sel);
      if (a === 'edit' && m) { editing = JSON.parse(JSON.stringify(m)); renderView(); }
      else if (a === 'base' && m) { editing = JSON.parse(JSON.stringify(clean(m))); editing.id = ''; delete editing.q; editing.base = m.n; if (m.role === 'Minion') { editing.tier = 'Minion'; editing.role = 'Skirmisher'; } renderView(); }
      else if (a === 'del' && m) { if (!confirm('「' + m.n + '」을(를) 지울까요? 되돌릴 수 없어요.')) return; try { await D4EShare.del(m.id, KIND); mine = mine.filter(function (x) { return x.id !== m.id; }); sel = null; renderList(); renderView(); } catch (e) { alert('지우지 못했어요: ' + e.message); } }
      else if (a === 'fill' && editing) { readForm(); fill(editing, true); renderView(); }
      else if (a === 'cancel') { editing = null; renderView(); }
      else if (a === 'save' && editing) { readForm(); if (!String(editing.n || '').trim()) { alert('이름을 적어 주세요.'); return; } act.disabled = true; try { var d = await save(editing); editing = null; sel = d.id; renderList(); renderView(); note('「' + d.n + '」을(를) 저장했어요.'); } catch (e) { act.disabled = false; alert('저장하지 못했어요: ' + e.message); } } }); }
  window.D4EMon = { render: function () { wire(); render(); }, math: math, dice: dice, block: block, all: all, byId: byId };
})();
