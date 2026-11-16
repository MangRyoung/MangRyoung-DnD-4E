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
  var mine = [], pack = [], sel = null, editing = null, loaded = false, F = { q: '', role: '', lo: '', hi: '', src: '' }, orig = {}, koCache = {};
  /* 자료집(영어 원문)은 번역해서 보여 주고, 「원문」 탭을 누른 것만 그대로 보여 준다 */
  function isEn(m) { return !!(m && (m._pack || m.src === 'MM') && !m.ko); }
  function ko(m) { if (!isEn(m) || !window.D4E_MONKO) return m; if (!koCache[m.id]) { var o = D4E_MONKO.mon(m), g = window.D4EApp && D4EApp.gsub; if (g) o.pw.forEach(function (p) { try { p.t = g(p.t); } catch (e) {} }); koCache[m.id] = o; } return koCache[m.id]; }
  function shown(m) { return isEn(m) && !orig[m.id] ? ko(m) : m; }

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
  var sitePack = null, PACK_URL = 'data/monster-pack.json';
  function loadPack() { var loc = []; try { loc = JSON.parse(localStorage.getItem(PACK_KEY) || '[]') || []; } catch (e) { loc = []; }
    /* 이 브라우저에 불러온 자료집이 있으면 그것을, 없으면 사이트의 기본 자료집(data/monster-pack.json — 저장소에 넣어 두면 모두의 기본 자료)을 쓴다 */
    pack = loc.length ? loc : (sitePack || []); packFrom = loc.length ? 'local' : (sitePack ? 'site' : ''); pack.forEach(function (m, i) { m.id = m.id || 'pk' + i; m._pack = 1; }); koCache = {}; }
  var packFrom = '';
  async function loadSitePack() { if (sitePack !== null) return; sitePack = false; try { var r = await fetch(PACK_URL + '?v=' + (document.querySelector('meta[name=d4e-version]') || {}).content, { cache: 'no-cache' }); if (r.ok) { var a = await r.json(); if (Array.isArray(a) && a.length) sitePack = a; } } catch (e) {} }
  async function load() { await loadSitePack(); loadPack(); try { mine = (await D4EShare.list(KIND)).map(function (r) { var d = r.data || {}; d.id = r.id; return d; }); } catch (e) { mine = []; note('공유 DB에서 몬스터를 읽지 못했어요: ' + e.message); } loaded = true; }
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
    var h = '<div class="mblock r-' + esc(String(m.role || '').toLowerCase()) + ' t-' + esc(String(m.tier || '').toLowerCase()) + '"><div class="mb-h"><div><b>' + esc(m.n) + (m.n_en ? ' <small>' + esc(m.n_en) + '</small>' : '') + (m.q ? ' <i title="자료집에서 이름을 확실히 못 읽었어요. 확인해 주세요">?</i>' : '') + '</b><span>' + esc(m.type || '') + '</span></div><div class="mb-r"><b>' + (m.lv || 1) + '레벨 ' + tier + role + (m.leader ? ' (지휘)' : '') + '</b><span>XP ' + esc(Number(m.xp || 0).toLocaleString()) + '</span></div></div><div class="mb-b">';
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
      if (q && (m.n + ' ' + (m.type || '') + ' ' + (isEn(m) ? ko(m).n + ' ' + ko(m).type : '')).toLowerCase().indexOf(q) < 0) return false; return true;
    }).sort(function (a, b) { return (a._pack ? 1 : 0) - (b._pack ? 1 : 0) || (+a.lv - +b.lv) || (a.n < b.n ? -1 : 1); }); }
  function renderList() { var box = $('monList'); if (!box) return; var L = filtered();
    $('monCount').textContent = L.length + '마리' + (pack.length ? ' · 자료집 ' + pack.length + (packFrom === 'site' ? ' (사이트 기본)' : ' (이 브라우저)') : '') + (mine.length ? ' · 만든 것 ' + mine.length : '');
    box.innerHTML = L.length ? L.slice(0, 400).map(function (m) { return '<div class="mrow r-' + esc(String(m.role || '').toLowerCase()) + (sel === m.id ? ' on' : '') + '" data-mid="' + esc(m.id) + '"><i>' + (m.lv || 1) + '</i><b title="' + esc(m.n) + '">' + esc(isEn(m) ? ko(m).n : m.n) + '</b><span>' + (m.tier && m.tier !== 'Standard' ? TIER_KO[m.tier] + ' ' : '') + (m.role === 'Minion' ? '' : (ROLE_KO[m.role] || m.role || '')) + '</span>' + (m._pack ? '<em>자료집</em>' : '') + '</div>'; }).join('') + (L.length > 400 ? '<p class="hint">400마리까지만 보여요. 검색이나 레벨로 좁혀 주세요.</p>' : '')
      : '<p class="hint">' + (all().length ? '조건에 맞는 몬스터가 없어요.' : '아직 몬스터가 없어요. 「+ 새 몬스터」로 만들거나, 자료집 파일을 불러와 보세요.') + '</p>'; }
  function renderView() { var box = $('monView'); if (!box) return;
    if (editing) { box.innerHTML = form(editing); return; }
    var m = sel && byId(sel); if (!m) { box.innerHTML = '<p class="hint">왼쪽에서 몬스터를 고르면 스탯 블록이 여기에 나와요.</p>'; return; }
    var en = isEn(m), tabs = en ? '<span class="trtab"><button data-mact="vtr" class="' + (orig[m.id] ? '' : 'on') + '">번역</button><button data-mact="vor" class="' + (orig[m.id] ? 'on' : '') + '">원문</button></span>' : ''; var mv = shown(m);
    box.innerHTML = '<div class="mbar">' + tabs + '<button data-mact="tok" title="맵툴 토큰 파일(.rptok)로 받아요. 맵 위로 끌어다 놓으면 돼요">맵툴 토큰</button>' + (m._pack ? '<button data-mact="base">이걸 바탕으로 새로 만들기</button>' : '<button data-mact="edit">고치기</button><button class="ghost" data-mact="base">복사해서 새로</button><button class="ghost" data-mact="del">지우기</button>') + '</div>' + block(mv) + (en && !orig[m.id] ? '<p class="hint">자동 번역이에요. 규칙으로 못 옮긴 문장은 영어가 섞여 있어요. 「원문」 탭에서 원래 글을 볼 수 있고, 「이걸 바탕으로 새로 만들기」로 손봐서 쓸 수 있어요.</p>' : ''); }
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
  function render() { var root = $('tab-mon'); if (!root) return; if (window.D4EEnc) D4EEnc.sync();
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
      if ((a === 'vtr' || a === 'vor') && m) { if (a === 'vor') orig[m.id] = 1; else delete orig[m.id]; renderView(); }
      else if (a === 'tok' && m) { act.disabled = true; try { var mx = shown(m); await saveMonToken(mx); var td = monTokenData(mx); note('「' + m.n + '」 토큰을 받았어요. 공격 버튼 ' + td.attacks + '개, 그 밖 버튼 ' + (td.macros.length - td.attacks * 2) + '개가 들어 있어요.'); } catch (e) { alert('토큰을 만들지 못했어요: ' + e.message); } act.disabled = false; }
      else if (a === 'edit' && m) { editing = JSON.parse(JSON.stringify(m)); renderView(); }
      else if (a === 'base' && m) { editing = JSON.parse(JSON.stringify(clean(shown(m)))); editing.id = ''; delete editing.q; delete editing.src; delete editing.n_en; editing.ko = 1; editing.base = m.n; if (m.role === 'Minion') { editing.tier = 'Minion'; editing.role = 'Skirmisher'; } renderView(); }
      else if (a === 'del' && m) { if (!confirm('「' + m.n + '」을(를) 지울까요? 되돌릴 수 없어요.')) return; try { await D4EShare.del(m.id, KIND); mine = mine.filter(function (x) { return x.id !== m.id; }); sel = null; renderList(); renderView(); } catch (e) { alert('지우지 못했어요: ' + e.message); } }
      else if (a === 'fill' && editing) { readForm(); fill(editing, true); renderView(); }
      else if (a === 'cancel') { editing = null; renderView(); }
      else if (a === 'save' && editing) { readForm(); if (!String(editing.n || '').trim()) { alert('이름을 적어 주세요.'); return; } act.disabled = true; try { var d = await save(editing); editing = null; sel = d.id; renderList(); renderView(); note('「' + d.n + '」을(를) 저장했어요.'); } catch (e) { act.disabled = false; alert('저장하지 못했어요: ' + e.message); } } }); }
  /* ---------- 맵툴 토큰 내보내기 ----------
   * 캠페인의 「몹 기본」 토큰을 본으로, 속성(Level · HP · AC …)과 공격(at1~at8 의 JSON + 공격 버튼 · 수정 버튼), 비공격 버튼을 채운다.
   * 버튼 본문은 Lib:Initiative 의 Create_creature_ability · set_creature_ability_natk 가 만드는 것과 같다(js/mon_tpl.js). */
  var USE_C = { at: ['#407040', '669966', '1', 'teal'], enc: ['#704040', '990033', '2', 'red'], day: ['#404040', '333333', '3', 'gray25'] };
  function useOf(p) { var u = String(p.use || '').toLowerCase(); return /daily|일일/.test(u) ? 'day' : /encounter|recharge|조우|재충전/.test(u) ? 'enc' : 'at'; }
  function actOf(p) { var a = String(p.act || '').toLowerCase();
    return /immediate interrupt|즉시 방해|즉각 개입|즉시 개입/.test(a) ? ['즉각 개입', '4. 즉각 행동', 'Immediate Interrupt'] : /immediate reaction|즉시 반응|즉각 반응/.test(a) ? ['즉각 반응', '4. 즉각 행동', 'Immediate Reaction'] : /opportunity|기회/.test(a) ? ['기회 행동', '4. 즉각 행동', 'Opportunity Action']
      : /standard|일반|표준/.test(a) ? ['일반', '1. 기본 행동', 'Standard Action'] : /move|이동/.test(a) ? ['이동', '2. 이동 행동', 'Move Action'] : /minor|보조|간략/.test(a) ? ['간략', '3. 간략 행동', 'Minor Action'] : /free|자유/.test(a) ? ['자유 행동', '5. 자유 행동', 'Free Action'] : ['-', '6. 행동 없음', 'No Action']; }
  var NATK_ACT = { '일반': '기본 행동', '이동': '이동 행동', '간략': '간략 행동', '즉각 반응': '즉각 반응', '즉각 개입': '즉각 개입', '기회 행동': '기회 행동', '자유 행동': '자유 행동', '-': '행동 없음' };
  /* 파워 한 줄 → 맵툴 공격 틀의 칸들. 본문에서 사거리 · 대상 · 명중 · 피해 주사위 · 피해 종류 · 명중 효과를 읽어 낸다 */
  function parsePw(p) { var t = String(p.t || '').trim(), u = String(p.use || ''), o = { name: p.n || KIND_KO[p.k] || '특성', usage: useOf(p), act: actOf(p), trait: p.kw || '', recharge: '', trigger: '', range: '', target: '', bonus: '', vs: '', dice: '', dtype: '', hit: '', effect: '' };
    var rc = /(recharge[sd]?[^;]*|재충전[^;]*)/i.exec(u); if (rc) o.recharge = rc[1].replace(/^recharges?\s*/i, '').replace(/^재충전\s*/, '') || '있음';
    var tg = /((?:when|if)\s[^;]*|[^;]*(?:때|하면))$/i.exec(u); if (tg && !rc) o.trigger = tg[1].trim(); else { var tg2 = u.split(';').map(function (x) { return x.trim(); }).filter(function (x) { return /^(when|if)\b|때$|하면$/i.test(x); })[0]; if (tg2) o.trigger = tg2; }
    var am = /([+\-]\d+)\s*vs\.?\s*(AC|Fortitude|Reflex|Will|Fort|Ref|인내|반사|의지)/i.exec(t);
    if (!am) { o.effect = t; var r0 = /^((?:Reach|Ranged|Close|Area|Melee|간격|원거리|근거리|범위|근접)[^;.]*)[;.]\s*/i.exec(t); if (r0) { o.range = r0[1]; o.effect = t.slice(r0[0].length); } return o; }
    o.bonus = String(+am[1]); o.vs = { ac: 'AC', fortitude: 'Fort', fort: 'Fort', '인내': 'Fort', reflex: 'Ref', ref: 'Ref', '반사': 'Ref', will: 'Will', '의지': 'Will' }[am[2].toLowerCase()] || 'AC';
    t.slice(0, am.index).split(';').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) { if (/^targets?\b|대상/i.test(x)) o.target = x.replace(/^(targets?|대상)\s*:?\s*/i, ''); else if (!o.range) o.range = x; else o.trigger = o.trigger || x; });
    if (!o.range) o.range = (p.k === 'm' || p.k === 'M') ? '근접 1' : (p.k === 'r' || p.k === 'R') ? '원거리 10' : '';
    if (!o.target && /^[CcAa]$/.test(p.k || '')) o.target = '범위 내 모든 개체';
    var rest = t.slice(am.index + am[0].length).replace(/^\s*[;,.]\s*/, ''), dm = /^(\d+d\d+(?:\s*[+\-]\s*\d+)?|\d+)\s+([^,.;(]*?(?:damage|피해))/i.exec(rest);
    if (dm) { o.dice = dm[1].replace(/\s+/g, ''); o.dtype = dm[2].replace(/damage/i, '피해').trim() + '.'; o.hit = rest.slice(dm[0].length).replace(/^\s*[,;.]?\s*(and\s+)?/i, '').trim(); } else o.hit = rest;
    return o; }
  function monTokenData(m) { var T = window.D4E_MONT, num = function (v, d) { var x = /-?\d+/.exec(String(v == null ? '' : v)); return x ? x[0] : (d == null ? '' : d); };
    var tier = m.tier && m.tier !== 'Standard' ? TIER_KO[m.tier] + ' ' : '', role = tier + (m.role === 'Minion' ? '' : (ROLE_KO[m.role] || m.role || '')) + (m.leader ? ' (지휘)' : '');
    var memo1 = [m.senses ? '감각 ' + m.senses : '', m.speed ? '이동 ' + m.speed : ''].filter(Boolean).join(' / '), memo2 = [m.immune ? '면역 ' + m.immune : '', m.resist ? '저항 ' + m.resist : '', m.vuln ? '취약 ' + m.vuln : ''].filter(Boolean).join(' / ');
    var props = { Level: String(m.lv || 1), HP: num(m.hp, 1), MaxHP: num(m.hp, 1), AC: num(m.ac), MaxAC: num(m.ac), Fort: num(m.fort), MaxFort: num(m.fort), Reflex: num(m.ref), MaxReflex: num(m.ref), Will: num(m.will), MaxWill: num(m.will),
      DisplayNAD: num(m.fort) + '/' + num(m.ref) + '/' + num(m.will), Mov: num(m.speed, 6), IniBonus: num(m.init, 0), save: num(m.saves, 0), AP: num(m.ap, 0), Role: role.trim(), Memo1: memo1, Memo2: memo2 };
    var macros = [], n = 0;
    (m.pw || []).forEach(function (p) { var a = parsePw(p), uc = USE_C[a.usage], br = function (s) { return String(s || '').replace(/\n/g, ' '); };
      if (a.bonus !== '' && n < 8) { n++; var js = { submit: '수정', AA_name_origin: a.name, index: n, AA_name: a.name, AA_usage: uc[0], AA_trait: a.trait, Recharge: a.recharge, AA_action: a.act[0], AA_range: a.range, AA_trigger: a.trigger, AA_target: a.target || '한 개체', AA_bonus: +a.bonus, AA_vs: a.vs, AA_Dice: a.dice, AA_dtype: a.dtype || (a.dice ? '피해.' : ''), AA_hit: br(a.hit), AA_effect: '', A_memo: '' };
        props['at' + n] = JSON.stringify(js);
        var tip = [a.recharge ? '재충전: ' + a.recharge : '', a.trigger ? '트리거: ' + a.trigger : '', '사거리: ' + (a.range || '근접 무기'), '공격: +' + a.bonus + ' vs ' + a.vs, '대상: ' + js.AA_target, a.dice ? '피해 주사위: ' + a.dice : '', a.hit ? '명중시: ' + br(a.hit) : ''].filter(Boolean).join('\n\t');
        macros.push({ label: a.name, group: '1-' + a.act[1], color: uc[3], font: 'white', sort: uc[2], tip: tip, command: T.attack.replace(/"\+index\+"/g, String(n)).replace(/"\+power_table_color\+"/g, uc[1]) });
        macros.push({ label: a.name + ' 수정', group: '2. 몹 공격 수정', color: 'default', font: 'default', sort: '', tip: '', command: T.edit.replace(/"\+index\+"/g, String(n)) });
      } else { var eff = [a.bonus !== '' ? '+' + a.bonus + ' vs ' + a.vs + (a.dice ? '; ' + a.dice + ' ' + a.dtype : '') + (a.hit ? ' ' + a.hit : '') : '', a.effect].filter(Boolean).join(' '), v = { AA_name: a.name, AA_usage: uc[0], AA_trait: a.trait, Recharge: a.recharge, AA_action: NATK_ACT[a.act[0]] || a.act[0], AA_Range: a.range || (p.k === 'aura' ? (p.use || '오라') : ''), AA_trigger: a.trigger, AA_effect: eff.replace(/\n/g, '<br>&nbsp;'), power_table_color: uc[1] };
        var tip2 = [a.recharge ? '재충전: ' + a.recharge : '', a.trigger ? '트리거: ' + a.trigger : '', '사거리: ' + (v.AA_Range || '근접 무기'), eff].filter(Boolean).join('\n\t');
        macros.push({ label: a.name, group: '1-' + a.act[1], color: uc[3], font: 'white', sort: uc[2], tip: tip2, command: T.natk.replace(/"\+(\w+)\+"/g, function (x, k) { return v[k] == null ? '' : String(v[k]); }).replace(/\[r: ?Recharge\]/g, function () { return a.recharge; }) }); } });
    return { name: m.n, props: props, macros: macros, attacks: n }; }
  function monTokenXml(m, img, hash) { var T = window.D4E_MONT, U = window.D4EMt, xe = U.xe, d = monTokenData(m);
    var props = '<propertyMapCI>\n<store>\n' + Object.keys(d.props).map(function (k) { return '<entry>\n<string>' + xe(k.toLowerCase()) + '</string>\n<net.rptools.CaseInsensitiveHashMap_-KeyValue>\n<key>' + xe(k) + '</key>\n<value class="string">' + xe(d.props[k]) + '</value>\n</net.rptools.CaseInsensitiveHashMap_-KeyValue>\n</entry>'; }).join('\n') + '\n</store>\n</propertyMapCI>';
    var idx = T.nextIndex, macros = d.macros.map(function (mc) { var i = idx++; return T.entry.replace(/@@INDEX@@/g, i).replace('@@UUID@@', U.uuid()).replace('@@COLOR@@', mc.color).replace('@@FONT@@', mc.font).replace('@@SORT@@', xe(mc.sort)).replace('@@GROUP@@', function () { return xe(mc.group); })
      .replace('@@LABEL@@', function () { return xe(mc.label); }).replace('@@TIP@@', function () { return xe(mc.tip); }).replace('@@COMMAND@@', function () { return xe(mc.command); }); }).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + T.token.replace('@@ID@@', U.guid()).replace('@@EXP@@', U.guid()).replace('@@IMG@@', hash).replace('@@NAME@@', function () { return xe(d.name); })
      .replace(/<width>\d+<\/width>\s*<height>\d+<\/height>\s*<isoWidth>\d+<\/isoWidth>\s*<isoHeight>\d+<\/isoHeight>/, '<width>' + img.w + '</width>\n<height>' + img.h + '</height>\n<isoWidth>' + img.w + '</isoWidth>\n<isoHeight>' + img.h + '</isoHeight>')
      .replace('@@PROPS@@', function () { return props; }).replace('@@MACROS@@', function () { return macros + '\n'; }); }
  var ROLE_COL = { Skirmisher: '#3f7d4e', Brute: '#93283a', Soldier: '#3d6a8a', Lurker: '#5b4a7a', Controller: '#a8661c', Artillery: '#7a2b6b', Minion: '#6b6b6b' };
  /* 토큰 그림: 몬스터에 넣어 둔 그림이 있으면 원형으로, 없으면 역할 색 원에 이름 첫 글자 */
  function monImage(m) { return new Promise(function (ok) { var cv = document.createElement('canvas'); cv.width = cv.height = 256; var x = cv.getContext('2d');
      var done = function () { x.lineWidth = 10; x.strokeStyle = m.tier === 'Solo' ? '#d4af37' : m.tier === 'Elite' ? '#c0c0c0' : '#222'; x.beginPath(); x.arc(128, 128, 121, 0, 7); x.stroke(); cv.toBlob(function (b) { b.arrayBuffer().then(function (ab) { ok({ bytes: new Uint8Array(ab), w: 256, h: 256 }); }); }, 'image/png'); };
      var blank = function () { x.fillStyle = ROLE_COL[m.role] || '#555'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 120px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(m.n || '?').trim().charAt(0), 128, 136); done(); };
      if (!m.img) return blank(); var im = new Image(); im.onload = function () { var s = Math.min(im.width, im.height); x.save(); x.beginPath(); x.arc(128, 128, 124, 0, 7); x.clip(); x.drawImage(im, (im.width - s) / 2, 0, s, s, 0, 0, 256, 256); x.restore(); done(); }; im.onerror = blank; im.src = m.img; }); }
  /* 토큰 파일 하나의 내용(zip blob). nameAs 를 주면 토큰 이름을 그것으로(조우 판의 「고블린 2」 같은 번호 붙은 이름) */
  async function monTokenBlob(m, nameAs) { var U = window.D4EMt; if (!window.D4E_MONT || !U) throw new Error('토큰 본을 읽지 못했어요.'); await U.loadZip(); var mm = nameAs ? Object.assign({}, m, { n: nameAs }) : m, img = await monImage(m), hash = U.md5(img.bytes), zip = new window.JSZip(), xe = U.xe;
    zip.file('content.xml', monTokenXml(mm, img, hash)); zip.file('properties.xml', '<map>\n  <entry>\n    <string>version</string>\n    <string>' + window.D4E_MONT.version + '</string>\n  </entry>\n</map>');
    zip.file('assets/' + hash, '<net.rptools.maptool.model.Asset>\n  <id>\n    <id>' + hash + '</id>\n  </id>\n  <name>' + xe(mm.n) + '</name>\n  <extension>png</extension>\n  <type>IMAGE</type>\n</net.rptools.maptool.model.Asset>');
    zip.file('assets/' + hash + '.png', img.bytes); zip.file('thumbnail', img.bytes); zip.file('thumbnail_large', img.bytes);
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }); }
  function fileName(n) { return String(n || 'monster').replace(/[\\/:*?"'<>|\s]+/g, '_'); }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000); }
  async function saveMonToken(m) { download(await monTokenBlob(m), fileName(m.n) + '.rptok'); }
  window.D4EMon = { tokenBlob: monTokenBlob, download: download, fileName: fileName, shown: shown, clean: clean, load: function () { return loaded ? Promise.resolve() : load(); }, gm: gm, XP: XP, ROLE_COL: ROLE_COL, ROLE_KO: ROLE_KO, TIER_KO: TIER_KO, tokenData: monTokenData, tokenXml: monTokenXml, parsePw: parsePw, saveToken: saveMonToken, render: function () { wire(); render(); }, math: math, dice: dice, block: block, all: all, byId: byId };
})();
