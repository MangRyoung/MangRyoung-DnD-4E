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
  function clean(m) { var o = {}; Object.keys(m).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = m[k]; }); if (Array.isArray(o.pw)) o.pw = o.pw.map(function (p) { var q = {}; Object.keys(p).forEach(function (k) { if (k.charAt(0) !== '_') q[k] = p[k]; }); return q; }); return o; }
  async function save(m) { var me = (window.D4EApp && D4EApp.me()) || {}; if (!m.id || m._pack || /^pk\d+$/.test(m.id)) m.id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); delete m._pack;
    var d = clean(m); d.by = d.by || me.name || ''; d.at = Date.now(); await D4EShare.put(m.id, d, KIND);
    var i = mine.findIndex(function (x) { return x.id === m.id; }); if (i >= 0) mine[i] = d; else mine.unshift(d); return d; }

  /* ---------- 스탯 블록 ---------- */
  function sg(v) { v = String(v == null ? '' : v).trim(); return v === '' ? '' : (/^[+\-]/.test(v) ? v : '+' + v); }
  function mod(v, lv) { v = +v; if (!v) return ''; var x = Math.floor((v - 10) / 2) + Math.floor((+lv || 0) / 2); return v + ' (' + (x >= 0 ? '+' : '') + x + ')'; }
  function block(m) {
    var tier = m.tier && m.tier !== 'Standard' && m.tier !== 'Minion' ? (TIER_KO[m.tier] + ' ') : '', role = m.role === 'Minion' || m.tier === 'Minion' ? '졸개' + (m.role !== 'Minion' ? ' ' + (ROLE_KO[m.role] || m.role) : '') : (ROLE_KO[m.role] || m.role);
    var ln = function (a, b) { return b ? '<div class="mb-l"><b>' + a + '</b> ' + esc(b) + '</div>' : ''; }, hpN = +m.hp || 0;
    var h = '<div class="mblock r-' + esc(String(m.role || '').toLowerCase()) + ' t-' + esc(String(m.tier || '').toLowerCase()) + '"><div class="mb-h">' + (m.img ? '<img class="mb-img" src="' + esc(m.img) + '" alt="">' : '') + '<div class="mb-t"><b>' + esc(m.n) + (m.n_en ? ' <small>' + esc(m.n_en) + '</small>' : '') + (m.q ? ' <i title="자료집에서 이름을 확실히 못 읽었어요. 확인해 주세요">?</i>' : '') + '</b><span>' + esc(m.type || '') + '</span></div><div class="mb-r"><b>' + (m.lv || 1) + '레벨 ' + tier + role + (m.leader ? ' (지휘)' : '') + '</b><span>XP ' + esc(Number(m.xp || 0).toLocaleString()) + '</span></div></div><div class="mb-b">';
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
    box.innerHTML = L.length ? L.slice(0, 400).map(function (m) { return '<div class="mrow r-' + esc(String(m.role || '').toLowerCase()) + (sel === m.id ? ' on' : '') + '" data-mid="' + esc(m.id) + '"><i>' + (m.lv || 1) + '</i>' + (m.img ? '<img class="mrow-img" src="' + esc(m.img) + '" alt="">' : '') + '<b title="' + esc(m.n) + '">' + esc(isEn(m) ? ko(m).n : m.n) + '</b><span>' + (m.tier && m.tier !== 'Standard' ? TIER_KO[m.tier] + ' ' : '') + (m.role === 'Minion' ? '' : (ROLE_KO[m.role] || m.role || '')) + '</span>' + (m._pack ? '<em>자료집</em>' : '') + '</div>'; }).join('') + (L.length > 400 ? '<p class="hint">400마리까지만 보여요. 검색이나 레벨로 좁혀 주세요.</p>' : '')
      : '<p class="hint">' + (all().length ? '조건에 맞는 몬스터가 없어요.' : '아직 몬스터가 없어요. 「+ 새 몬스터」로 만들거나, 자료집 파일을 불러와 보세요.') + '</p>'; }
  /* 다른 화면(조우 판)에서 몬스터 사본을 고칠 때: ext = { box: 칸 id, cb: 끝났을 때 부를 함수 } — DB에는 쓰지 않는다 */
  var ext = null;
  function editIn(boxId, m, cb) { if (editing && !ext) { alert('「몬스터 목록」에서 고치던 것이 있어요. 먼저 저장하거나 취소해 주세요.'); return false; } editing = JSON.parse(JSON.stringify(m)); if (!Array.isArray(editing.pw)) editing.pw = []; ext = { box: boxId, cb: cb }; renderView(); return true; }
  function editEnd() { if (ext) { ext = null; editing = null; } }
  function renderView() { if (ext) { var xb = $(ext.box); if (xb && editing) xb.innerHTML = '<p class="hint">이 조우에 올린 사본만 바뀌어요. 같은 몬스터 토큰은 함께 바뀌고, 「몬스터 목록」의 원본은 그대로예요.</p>' + form(editing); return; }
    var box = $('monView'); if (!box) return;
    if (editing) { box.innerHTML = form(editing); return; }
    var m = sel && byId(sel); if (!m) { box.innerHTML = '<p class="hint">왼쪽에서 몬스터를 고르면 스탯 블록이 여기에 나와요.</p>'; return; }
    var en = isEn(m), tabs = en ? '<span class="trtab"><button data-mact="vtr" class="' + (orig[m.id] ? '' : 'on') + '">번역</button><button data-mact="vor" class="' + (orig[m.id] ? 'on' : '') + '">원문</button></span>' : ''; var mv = shown(m);
    box.innerHTML = '<div class="mbar">' + tabs + '<button data-mact="tok" title="맵툴 토큰 파일(.rptok)로 받아요. 맵 위로 끌어다 놓으면 돼요">맵툴 토큰</button>' + (m._pack ? '<button data-mact="base">이걸 바탕으로 새로 만들기</button>' : '<button data-mact="edit">고치기</button><button class="ghost" data-mact="base">복사해서 새로</button><button class="ghost" data-mact="del">지우기</button>') + '</div>' + block(mv) + '<p class="hint">그림 파일을 이 칸으로 끌어다 놓으면 이 몬스터의 그림이 돼요.</p>' + (en && !orig[m.id] ? '<p class="hint">자동 번역이에요. 규칙으로 못 옮긴 문장은 영어가 섞여 있어요. 「원문」 탭에서 원래 글을 볼 수 있고, 「이걸 바탕으로 새로 만들기」로 손봐서 쓸 수 있어요.</p>' : ''); }
  function inp(k, v, w, ph) { return '<input type="text" data-mf="' + k + '" value="' + esc(v == null ? '' : v) + '"' + (w ? ' style="width:' + w + '"' : '') + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>'; }
  function selc(k, v, opts) { return '<select data-mf="' + k + '">' + opts.map(function (o) { var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(val) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') + '</select>'; }
  /* ---------- 파워 편집 칸 ----------
   * 저장되는 것은 여전히 p.t(글) 하나다. 편집하는 동안만 p._x 에 칸으로 나눠 두고, 읽을 때마다 글로 다시 합친다(pwJoin).
   * 글을 나눴다 합쳐서 원래 글과 같을 때만 칸으로 연다. 다르면 글 그대로 두고 「칸으로 나누기」를 누를 수 있다. */
  var DEF_KO = { ac: 'AC', fortitude: '인내', fort: '인내', '인내': '인내', reflex: '반사', ref: '반사', '반사': '반사', will: '의지', '의지': '의지' };
  var ACTS = ['일반', '이동', '보조', '자유', '즉시 방해', '즉시 반응', '기회', ''], USES = ['무제한', '조우', '일일', '재충전 6', '재충전 5 6', '재충전 4 5 6', '재충전 3 4 5 6'];
  /* 사거리: 모양을 고르고 숫자를 적는다. [키, 이름, 숫자 칸 수, 기본값] */
  var RG = { m: [['adj', '인접 (근접 1칸)', 0], ['reach', '간격', 1, [2]]], r: [['rng', '원거리', 1, [10]], ['rng2', '원거리 (가까이/멀리)', 2, [10, 20]]], C: [['cburst', '근거리 폭발', 1, [1]], ['cblast', '근거리 분사', 1, [3]]], A: [['aburst', '범위 폭발', 2, [1, 10]], ['awall', '범위 벽', 2, [8, 10]]] };
  RG.M = RG.m; RG.R = RG.r;
  var RG_ALL = RG.m.concat(RG.r, RG.C, RG.A), RG_LBL = { reach: ['칸'], rng: ['칸'], rng2: ['', '칸'], cburst: [''], cblast: [''], aburst: ['', '칸 안'], awall: ['', '칸 안'] };
  function rgParse(v) { v = String(v || '').trim(); var m; if (!v || /^(근접|근접 1|간격 1|melee|reach 1)$/i.test(v)) return { t: 'adj' };
    if ((m = /^(?:간격|reach)\s*(\d+)$/i.exec(v))) return { t: 'reach', a: m[1] }; if ((m = /^(?:원거리|ranged)\s*(\d+)\s*\/\s*(\d+)$/i.exec(v))) return { t: 'rng2', a: m[1], b: m[2] }; if ((m = /^(?:원거리|ranged)\s*(\d+)$/i.exec(v))) return { t: 'rng', a: m[1] };
    if ((m = /^(?:근거리 폭발|close burst)\s*(\d+)$/i.exec(v))) return { t: 'cburst', a: m[1] }; if ((m = /^(?:근거리 분사|close blast)\s*(\d+)$/i.exec(v))) return { t: 'cblast', a: m[1] };
    if ((m = /^(?:범위 폭발|area burst)\s*(\d+)\s*\(?\s*(?:within\s*)?(\d+)\s*(?:칸 안|칸 이내|squares)?\s*\)?$/i.exec(v))) return { t: 'aburst', a: m[1], b: m[2] }; if ((m = /^(?:범위 벽|area wall)\s*(\d+)\s*\(?\s*(?:within\s*)?(\d+)\s*(?:칸 안|칸 이내|squares)?\s*\)?$/i.exec(v))) return { t: 'awall', a: m[1], b: m[2] };
    return { t: 'txt' }; }
  function rgText(t, a, b) { a = Math.max(1, +a || 1); b = Math.max(1, +b || 1); return t === 'adj' ? '' : t === 'reach' ? '간격 ' + a : t === 'rng' ? '원거리 ' + a : t === 'rng2' ? '원거리 ' + a + '/' + b : t === 'cburst' ? '근거리 폭발 ' + a : t === 'cblast' ? '근거리 분사 ' + a : t === 'aburst' ? '범위 폭발 ' + a + ' (' + b + '칸 안)' : t === 'awall' ? '범위 벽 ' + a + ' (' + b + '칸 안)' : null; }
  function rgForm(t) { return RG_ALL.filter(function (o) { return o[0] === t; })[0]; }
  /* 대상: 빈 값은 기본(한 개체 / 범위 내 모든 개체)이라 글에 적지 않는다 */
  var TG1 = ['', '한 개체 또는 두 개체', '두 개체', '세 개체', '적 한 명', '반죽음 상태인 개체 하나', '멍해진 개체 하나', '넘어진 개체 하나', '붙잡힌 개체 하나', '이동 불가 상태인 개체 하나', '둔화된 개체 하나', '표식을 남긴 개체 하나', '전투 우위를 가진 개체 하나'];
  var TGA = ['', '범위 내 모든 적', '범위 내 적 한 명', '범위 내 한 개체 또는 두 개체', '범위 내 반죽음 상태인 모든 적', '범위 내 모든 아군', '범위 내 자신과 모든 아군'];
  function pwSplit(p) { var x = { trigger: '', range: '', target: '', bonus: '', vs: 'AC', dice: '', dtype: '', hit: '', miss: '', effect: '' }, main = [];
    String(p.t || '').split(/\n/).forEach(function (l) { l = l.trim(); if (!l) return; var mm;
      if ((mm = /^(?:빗나감|빗나가면|Miss)\s*:\s*/i.exec(l)) && !x.miss) x.miss = l.slice(mm[0].length); else if ((mm = /^(?:효과|Effect)\s*:\s*/i.exec(l)) && !x.effect) x.effect = l.slice(mm[0].length); else if ((mm = /^(?:발동|발동 조건|Trigger)\s*:\s*/i.exec(l)) && !x.trigger) x.trigger = l.slice(mm[0].length); else main.push(l); });
    var t = main.join(' '), am = /([+\-]\d+)\s*vs\.?\s*(AC|Fortitude|Reflex|Will|Fort|Ref|인내|반사|의지)/i.exec(t);
    if (!am) { var r0 = /^((?:Reach|Ranged|Close|Area|Melee|간격|원거리|근거리|범위|근접)[^;.]*)[;.]\s*/i.exec(t); if (r0) { x.range = r0[1]; t = t.slice(r0[0].length); } x.hit = t; x.noatk = true; return x; }
    x.bonus = String(+am[1]); x.vs = DEF_KO[am[2].toLowerCase()] || 'AC';
    t.slice(0, am.index).split(';').map(function (y) { return y.trim(); }).filter(Boolean).forEach(function (y) { if (/^(targets?|대상)\s*:?\s+/i.test(y)) x.target = y.replace(/^(targets?|대상)\s*:?\s*/i, ''); else if (!x.range) x.range = y; else x.target = x.target ? x.target + '; ' + y : y; });
    var rest = t.slice(am.index + am[0].length).replace(/^\s*[;,.]\s*/, ''), dm = /^(\d+d\d+(?:\s*[+\-]\s*\d+)?|\d+)\s+((?:[^,.;(]*?\s)?)(?:damage|피해)/i.exec(rest);
    if (dm) { x.dice = dm[1]; x.dtype = dm[2].trim(); x.hit = rest.slice(dm[0].length).replace(/^\s*[,;]\s*/, '').replace(/^\.\s*/, '').trim(); } else x.hit = rest.trim();
    return x; }
  function pwJoin(x) { var head = [x.range, x.target ? '대상: ' + x.target : ''].filter(Boolean), b = String(x.bonus == null ? '' : x.bonus).trim();
    if (b !== '' && !x.noatk) head.push((/^[+\-]/.test(b) ? b : '+' + b) + ' vs. ' + (x.vs || 'AC'));
    var dmg = x.dice && !x.noatk ? String(x.dice).trim() + ' ' + (x.dtype ? String(x.dtype).trim() + ' ' : '') + '피해' : '', hit = String(x.hit || '').trim(), tail = dmg && hit ? dmg + (hit.charAt(0) === '(' ? ' ' : ', ') + hit : dmg || hit;
    var line = head.join('; ') + (tail ? (head.length ? '; ' : '') + tail : ''); if (line && !/[.!?)…]$/.test(line)) line += '.';
    return [x.trigger ? '발동: ' + x.trigger : '', line, x.miss ? '빗나감: ' + x.miss : '', x.effect ? '효과: ' + x.effect : ''].filter(Boolean).join('\n'); }
  function pwSame(a, b) { var n = function (v) { return String(v || '').replace(/\s+/g, ' ').replace(/[.]\s*$/, '').trim(); }; return n(a) === n(b); }
  function pwStd(m, p) { var r = math(m.lv, roleOf(m), m.tier), mn = m.tier === 'Minion' || m.role === 'Minion', x = p._x; if (!x) return; var lim = useOf(p) !== 'at', area = /^[CcAa]$/.test(p.k || '');
    x.noatk = false; x.bonus = String(x.vs === 'AC' ? r.atkAC : r.atkNAD); x.dice = dice(mn ? r.dmg : (lim ? r.dmgLim : r.dmg) * (area ? 0.75 : 1), mn); }
  function opt(list, cur, blank) { var has = list.indexOf(cur) >= 0; return list.map(function (v) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v || blank || '없음') + '</option>'; }).join('') + (has ? '' : '<option value="' + esc(cur) + '" selected>' + esc(cur) + '</option>') + '<option value="__">직접 적기…</option>'; }
  function pwCard(m, p, i) { var kind = p.k === 'c' ? 'C' : p.k === 'a' ? 'A' : (p.k || ''), atk = kind && kind !== 'aura', n = (m.pw || []).length;
    if (atk && !p._x && !p._raw) { var sx = pwSplit(p); if (!String(p.t || '').trim() || pwSame(pwJoin(sx), p.t)) p._x = sx; }
    var x = p._x, f = function (k, v, ph, cls, list) { return '<input type="text" data-mf="px.' + k + '" value="' + esc(v == null ? '' : v) + '" placeholder="' + esc(ph || '') + '"' + (cls ? ' class="' + cls + '"' : '') + (list ? ' list="' + list + '"' : '') + '>'; };
    var h = '<div class="mf-pw u-' + (kind === 'aura' || !kind ? 'tr' : useOf(p)) + '" data-pi="' + i + '"><div class="pw-h">' + selc('pw.k', kind, KINDS) + '<input type="text" class="pw-n" data-mf="pw.n" value="' + esc(p.n) + '" placeholder="이름">' +
      '<span class="pw-b"><button class="mini ghost" data-mpup="' + i + '" title="위로"' + (i ? '' : ' disabled') + '>↑</button><button class="mini ghost" data-mpdn="' + i + '" title="아래로"' + (i < n - 1 ? '' : ' disabled') + '>↓</button><button class="mini ghost" data-mpcp="' + i + '" title="복사해서 하나 더">복사</button><button class="mini ghost" data-mpdel="' + i + '" title="지우기">×</button></span></div>';
    if (kind === 'aura') { var an = (/\d+/.exec(p.use || '') || ['1'])[0]; return h + '<div class="pw-r"><label>오라 범위<input type="number" min="1" max="20" class="num" data-mf="pw.aur" value="' + esc(an) + '"></label><label class="grow">키워드<input type="text" data-mf="pw.kw" value="' + esc(p.kw) + '" list="mfKw" placeholder="없으면 비워 두기"></label></div><label class="pw-f">효과<textarea data-mf="pw.t" rows="2" placeholder="오라 안의 적은 …">' + esc(p.t) + '</textarea></label></div>'; }
    h += '<div class="pw-r"><label>행동<select data-mf="pw.actsel">' + opt(ACTS, p.act || '', '없음') + '</select></label><label>사용<select data-mf="pw.usesel">' + opt(USES.concat(['']), p.use || '', '없음') + '</select></label><label class="grow">키워드<input type="text" data-mf="pw.kw" value="' + esc(p.kw) + '" list="mfKw" placeholder="화염, 무기…"></label></div>';
    if (!atk) return h + '<label class="pw-f">내용<textarea data-mf="pw.t" rows="2" placeholder="특성의 효과">' + esc(p.t) + '</textarea></label></div>';
    if (!x) return h + '<label class="pw-f">내용<textarea data-mf="pw.t" rows="3" placeholder="사거리; +명중 vs. 방어; 피해와 효과">' + esc(p.t) + '</textarea></label><div class="pw-m"><span class="hint">글이 복잡해서 그대로 뒀어요.</span><button class="mini ghost" data-mpsplit="' + i + '" title="글을 칸으로 나눠요. 문장 모양이 조금 바뀔 수 있어요">칸으로 나누기</button></div></div>';
    var forms = RG[kind] || RG_ALL, rg = rgParse(x.range); if (x._rt === 'txt') rg = { t: 'txt' }; if (rg.t !== 'txt' && !forms.some(function (o) { return o[0] === rg.t; })) { if (String(x.range || '').trim()) rg = { t: 'txt' }; else { rg = { t: forms[0][0], a: (forms[0][3] || [])[0], b: (forms[0][3] || [])[1] }; x.range = rgText(rg.t, rg.a, rg.b); } }
    var fo = rgForm(rg.t), lb = RG_LBL[rg.t] || [];
    h += '<div class="pw-g"><label>사거리<span class="pw-in"><select data-mf="px._rt">' + forms.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === rg.t ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '<option value="txt"' + (rg.t === 'txt' ? ' selected' : '') + '>직접 적기</option></select>' +
      (rg.t === 'txt' ? f('range', x.range, '예: 근거리 폭발 2', 'grow') : (fo && fo[2] >= 1 ? '<input type="number" min="1" max="99" class="num" data-mf="px._ra" value="' + esc(rg.a) + '">' + (lb[0] ? '<i>' + lb[0] + '</i>' : '') : '') + (fo && fo[2] >= 2 ? '<i>' + (rg.t === 'rng2' ? '/' : '·') + '</i><input type="number" min="1" max="99" class="num" data-mf="px._rb" value="' + esc(rg.b) + '"><i>' + (lb[1] || '') + '</i>' : '')) + '</span></label>';
    var tgl = (kind === 'C' || kind === 'A') ? TGA : TG1, tcur = String(x.target || '');
    h += '<label>대상<select data-mf="px._tg" class="wide">' + tgl.map(function (v) { return '<option value="' + esc(v) + '"' + (v === tcur ? ' selected' : '') + '>' + esc(v || (tgl === TGA ? '범위 내 모든 개체 (기본)' : '한 개체 (기본)')) + '</option>'; }).join('') + (tgl.indexOf(tcur) >= 0 ? '' : '<option value="' + esc(tcur) + '" selected>' + esc(tcur) + '</option>') + '<option value="__">직접 적기…</option></select></label></div>';
    h += '<div class="pw-a"><label>명중<span class="pw-in">+' + f('bonus', x.bonus, '', 'num') + '<i>vs</i><select data-mf="px.vs">' + ['AC', '인내', '반사', '의지'].map(function (d) { return '<option' + (d === x.vs ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></span></label><label class="grow">피해<span class="pw-in">' + f('dice', x.dice, '2d8 + 5', 'dice') + f('dtype', x.dtype, '종류 (화염…)', 'dt', 'mfKw') + '<i>피해</i></span></label><button class="mini" data-mpstd="' + i + '" title="레벨 · 역할의 표준 명중과 피해로 채워요">표준</button></div>';
    h += '<label class="pw-f">명중 시 추가 효과<textarea data-mf="px.hit" rows="1" placeholder="대상은 둔화 상태가 된다 (내성 굴림으로 끝남)">' + esc(x.hit) + '</textarea></label>';
    var more = x.miss || x.effect || x.trigger || p._more;
    h += more ? '<div class="pw-g"><label>빗나감' + f('miss', x.miss, '절반 피해') + '</label><label>효과 (명중과 상관없이)' + f('effect', x.effect, '') + '</label><label class="full">발동 조건' + f('trigger', x.trigger, '적이 인접한 칸을 떠날 때') + '</label></div>' : '';
    h += '<div class="pw-m">' + (more ? '' : '<button class="mini ghost" data-mpmore="' + i + '">+ 빗나감 · 효과 · 발동 조건</button>') + '<span class="sp"></span><button class="mini ghost" data-mptext="' + i + '" title="칸 대신 글 한 덩어리로 적어요">글로 적기</button></div></div>';
    return h; }
  function form(m) {
    var r = math(m.lv, roleOf(m), m.tier), lab = function (t, x) { return '<label><small>' + t + '</small>' + x + '</label>'; };
    var h = '<div class="mform"><div class="mbar"><b>' + (m.id && !m._pack ? '몬스터 고치기' : '새 몬스터') + '</b><span class="sp"></span><button data-mact="save">저장</button><button class="ghost" data-mact="cancel">취소</button></div>';
    h += '<div class="mf-img"><div class="mf-imgbox' + (m.img ? '' : ' none') + '" id="monImgBox" title="그림 파일을 여기로 끌어다 놓아도 돼요">' + (m.img ? '<img src="' + esc(m.img) + '" alt="">' : '<span>그림</span>') + '</div><div><button class="mini" data-mact="img">그림 넣기</button> ' + (m.img ? '<button class="mini ghost" data-mact="imgdel">빼기</button>' : '') + '<p class="hint">토큰과 스탯 블록, 조우 판에 쓰여요. 가운데를 정사각형으로 잘라 256px 로 줄여요.</p><input type="file" id="monImgFile" accept="image/*" hidden></div></div>';
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
    h += (m.pw || []).map(function (p, i) { return pwCard(m, p, i); }).join('') || '<p class="hint">위 단추로 공격이나 특성을 넣어 주세요. 명중과 피해는 표준 수치로 미리 채워져요.</p>';
    h += '<datalist id="mfKw">' + ['무기', '주문구', '화염', '냉기', '전격', '천둥', '산성', '독', '사령', '광휘', '정신', '역장', '공포', '매혹', '환영', '순간이동', '치유', '변신', '질병', '영역', '집중', '주시'].map(function (x) { return '<option value="' + x + '">'; }).join('') + '</datalist><datalist id="mfTg">' + ['한 개체', '적 한 명', '한 개체 또는 두 개체', '범위 내 모든 개체', '범위 내 모든 적', '멍해진 개체 하나'].map(function (x) { return '<option value="' + x + '">'; }).join('') + '</datalist>';
    h += lab('메모 (GM만 보는 전술 · 설명)', '<textarea data-mf="note" rows="2">' + esc(m.note || '') + '</textarea>') + '<div class="mf-prev"><small>미리 보기</small>' + block(m) + '</div></div>';
    return h; }
  function readForm() { var m = editing, box = $(ext ? ext.box : 'monView'); if (!m || !box) return;
    box.querySelectorAll('[data-mf]').forEach(function (x) { var k = x.getAttribute('data-mf'); if (k.indexOf('pw.') === 0 || k.indexOf('px.') === 0) { var row = x.closest('[data-pi]'), p = m.pw[+row.getAttribute('data-pi')], kk = k.slice(3); if (!p) return; if (k.charAt(1) === 'x') { if (!p._x) return; if (kk === '_tg') { if (x.value !== '__') p._x.target = x.value; } else p._x[kk] = x.value; } else if (kk === 'actsel') { if (x.value !== '__') p.act = x.value; } else if (kk === 'usesel') { if (x.value !== '__') p.use = x.value; } else if (kk === 'aur') p.use = '오라 ' + Math.max(1, +x.value || 1); else p[kk] = x.value; return; }
      if (k === 'leader') m.leader = x.checked; else if (k === 'lv') m.lv = Math.max(1, Math.min(35, +x.value || 1)); else m[k] = x.value; });
    (m.pw || []).forEach(function (p) { if (p._x) { var X = p._x; if (X._rt && X._rt !== 'txt') { var dv = (rgForm(X._rt) || [])[3] || []; X.range = rgText(X._rt, X._ra || dv[0], X._rb || dv[1]); } if (String(p._x.bonus || '').trim() !== '' || p._x.dice) p._x.noatk = false; p.t = pwJoin(p._x); } });
    if (m.tier === 'Minion') { m.role2 = m.role === 'Minion' ? m.role2 : m.role; } }
  /* 몬스터 그림: 가운데를 정사각형으로 잘라 256px, 되도록 작게(공유 DB에 들어가므로) */
  function readImg(file) { return new Promise(function (ok, no) { if (!file || (!/^image\//.test(file.type || '') && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || ''))) return no(new Error('그림 파일이 아니에요.')); var fr = new FileReader(); fr.onerror = function () { no(new Error('파일을 읽지 못했어요.')); };
      fr.onload = function () { var im = new Image(); im.onerror = function () { no(new Error('그림을 읽지 못했어요.')); }; im.onload = function () { var sz = Math.min(im.width, im.height), cv = document.createElement('canvas'); cv.width = cv.height = 256; var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
          x.drawImage(im, (im.width - sz) / 2, im.height > im.width ? 0 : (im.height - sz) / 2, sz, sz, 0, 0, 256, 256); var u = cv.toDataURL('image/webp', 0.86); if (u.indexOf('data:image/webp') !== 0) u = cv.toDataURL('image/jpeg', 0.86); ok(u); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }
  function setImg(file) { if (!editing) return; readForm(); readImg(file).then(function (u) { editing.img = u; renderView(); }, function (e) { alert(e.message); }); }
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
      else if (t.id === 'monImgFile') { setImg(t.files && t.files[0]); t.value = ''; }
      else if (t.id === 'monTokFile') { var fl = Array.prototype.slice.call(t.files || []); t.value = ''; importFiles(fl); }
      else if (t.id === 'monFile') { var f = t.files && t.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { try { var a = JSON.parse(rd.result); if (!Array.isArray(a)) throw new Error('몬스터 목록 파일이 아니에요.'); localStorage.setItem(PACK_KEY, JSON.stringify(a)); loadPack(); note('자료집 ' + pack.length + '마리를 이 브라우저에 불러왔어요.'); renderList(); } catch (e) { alert('불러오지 못했어요: ' + e.message); } t.value = ''; }; rd.readAsText(f); }
      else if (t.closest('.mform') && editing && /^(pw\.(k|actsel|usesel)|px\.(_rt|_tg))$/.test(t.getAttribute('data-mf') || '')) { var mfk = t.getAttribute('data-mf'), pr = t.closest('[data-pi]'), pq = editing.pw[+pr.getAttribute('data-pi')];
        if (mfk === 'px._rt' && pq && pq._x) { readForm(); var nf = rgForm(t.value), nd = (nf && nf[3]) || []; pq._x._rt = t.value; pq._x._ra = nd[0]; pq._x._rb = nd[1]; if (t.value !== 'txt') pq._x.range = rgText(t.value, nd[0], nd[1]); pq.t = pwJoin(pq._x); }
        else if (mfk === 'px._tg' && pq && pq._x) { readForm(); if (t.value === '__') { var tv = prompt('대상을 적어 주세요 (예: 불타고 있는 개체 하나)', pq._x.target || ''); if (tv != null) pq._x.target = tv.trim(); } pq.t = pwJoin(pq._x); }
        else if (t.value === '__' && pq) { var cur = mfk === 'pw.actsel' ? pq.act : pq.use, v = prompt(mfk === 'pw.actsel' ? '행동을 적어 주세요 (예: 즉시 반응, 자유)' : '사용 조건을 적어 주세요 (예: 재충전 — 처음 반죽음이 될 때)', cur || ''); readForm(); if (v != null) { if (mfk === 'pw.actsel') pq.act = v.trim(); else pq.use = v.trim(); } } else { readForm(); if (mfk === 'pw.k' && pq) { delete pq._x; delete pq._raw; var F = RG[pq.k]; if (F) { var sx = pwSplit(pq), g = rgParse(sx.range); if (g.t !== 'txt' && !F.some(function (o) { return o[0] === g.t; })) { var d0 = F[0][3] || []; sx.range = rgText(F[0][0], d0[0], d0[1]); sx.target = ''; pq._x = sx; pq.t = pwJoin(sx); } } if (pq.k === 'aura' && !/오라/.test(pq.use || '')) pq.use = '오라 1'; else if (pq.k !== 'aura' && /^오라/.test(pq.use || '')) pq.use = ''; } }
        setTimeout(renderView, 0); }
      else if (t.closest('.mform') && editing && /^(role|tier|lv)$/.test(t.getAttribute('data-mf') || '')) { readForm(); var r = math(editing.lv, roleOf(editing), editing.tier), hn = $('mfHint'); if (hn) hn.textContent = '기준: 명중 +' + r.atkAC + ' vs AC / +' + r.atkNAD + ' vs 그 밖 · 평균 피해 ' + r.dmg + ' (범위 ' + r.dmgArea + ', 조우 ' + r.dmgLim + ')'; var pv = root.querySelector('.mf-prev'); if (pv) pv.innerHTML = '<small>미리 보기</small>' + block(editing); } });
    root.addEventListener('click', async function (ev) { var t = ev.target, row = t.closest('[data-mid]'), act = t.closest('[data-mact]'), add = t.closest('[data-madd]');
      if (ext && t.closest('[data-mview]')) { var cbx = ext.cb; editEnd(); cbx(null); }
      if (ext && (t.id === 'monNew' || (t.closest('[data-mid]') && !t.closest('.mform')))) return;
      if (t.id === 'monNew') { editing = blank(); sel = null; renderList(); renderView(); return; }
      if (t.id === 'monPick') { $('monFile').click(); return; }
      if (t.id === 'monTokIn') { $('monTokFile').click(); return; }
      if (t.id === 'monPackDel') { if (pack.length && confirm('이 브라우저에 불러온 자료집 ' + pack.length + '마리를 지울까요? (만든 몬스터는 그대로예요)')) { localStorage.removeItem(PACK_KEY); loadPack(); renderList(); renderView(); } return; }
      if (row && !editing) { sel = row.getAttribute('data-mid'); renderList(); renderView(); return; }
      if (row && editing) { if (confirm('고치던 것을 버리고 다른 몬스터를 볼까요?')) { editing = null; sel = row.getAttribute('data-mid'); renderList(); renderView(); } return; }
      if (add && editing) { readForm(); var k = add.getAttribute('data-madd'); editing.pw.push(k === 'trait' ? { n: '', k: '', act: '', use: '', kw: '', t: '' } : k === 'aura' ? { n: '', k: 'aura', act: '', use: '오라 1', kw: '', t: '' } : atkTpl(editing, k)); renderView(); return; }
      var pd = t.closest('[data-mpdel]'), pu = t.closest('[data-mpup]');
      if (pd && editing) { readForm(); editing.pw.splice(+pd.getAttribute('data-mpdel'), 1); renderView(); return; }
      var px = t.closest('[data-mpdn],[data-mpcp],[data-mpstd],[data-mpsplit],[data-mptext],[data-mpmore]');
      if (px && editing) { readForm(); var ds = px.dataset, pi = +(ds.mpdn || ds.mpcp || ds.mpstd || ds.mpsplit || ds.mptext || ds.mpmore), P = editing.pw, q = P[pi]; if (!q) return;
        if ('mpdn' in ds) { if (pi < P.length - 1) { P[pi] = P[pi + 1]; P[pi + 1] = q; } } else if ('mpcp' in ds) { var cp = JSON.parse(JSON.stringify(q)); cp.n = (cp.n || '') + ' 2'; P.splice(pi + 1, 0, cp); }
        else if ('mpstd' in ds) { pwStd(editing, q); q.t = pwJoin(q._x); } else if ('mpsplit' in ds) { delete q._raw; q._x = pwSplit(q); q.t = pwJoin(q._x); } else if ('mptext' in ds) { delete q._x; q._raw = 1; } else if ('mpmore' in ds) q._more = 1;
        renderView(); return; }
      if (pu && editing) { readForm(); var i = +pu.getAttribute('data-mpup'); if (i > 0) { var x = editing.pw[i]; editing.pw[i] = editing.pw[i - 1]; editing.pw[i - 1] = x; } renderView(); return; }
      if (!act) return; var a = act.getAttribute('data-mact'), m = sel && byId(sel);
      if ((a === 'vtr' || a === 'vor') && m) { if (a === 'vor') orig[m.id] = 1; else delete orig[m.id]; renderView(); }
      else if (a === 'tok' && m) { act.disabled = true; try { var mx = shown(m); await saveMonToken(mx); var td = monTokenData(mx); note('「' + m.n + '」 토큰을 받았어요. 공격 버튼 ' + td.attacks + '개, 그 밖 버튼 ' + (td.macros.length - td.attacks * 2) + '개가 들어 있어요.'); } catch (e) { alert('토큰을 만들지 못했어요: ' + e.message); } act.disabled = false; }
      else if (a === 'edit' && m) { editing = JSON.parse(JSON.stringify(m)); renderView(); }
      else if (a === 'base' && m) { startBase(m); renderView(); }
      else if (a === 'del' && m) { if (!confirm('「' + m.n + '」을(를) 지울까요? 되돌릴 수 없어요.')) return; try { await D4EShare.del(m.id, KIND); mine = mine.filter(function (x) { return x.id !== m.id; }); sel = null; renderList(); renderView(); } catch (e) { alert('지우지 못했어요: ' + e.message); } }
      else if (a === 'fill' && editing) { readForm(); fill(editing, true); renderView(); }
      else if (a === 'img' && editing) { $('monImgFile').click(); }
      else if (a === 'imgdel' && editing) { readForm(); delete editing.img; renderView(); }
      else if (a === 'cancel' && ext) { var cb0 = ext.cb; editEnd(); cb0(null); }
      else if (a === 'save' && editing && ext) { readForm(); if (!String(editing.n || '').trim()) { alert('이름을 적어 주세요.'); return; } var res = clean(editing), cb1 = ext.cb; delete res.id; editEnd(); cb1(res); }
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
  function parsePw(p) { var sx0 = pwSplit(p), t = String(p.t || '').split(/\n/).filter(function (l) { return !/^\s*(빗나감|빗나가면|효과|발동|발동 조건)\s*:/.test(l); }).join(' ').trim(), u = String(p.use || ''), o = { name: p.n || KIND_KO[p.k] || '특성', usage: useOf(p), act: actOf(p), trait: p.kw || '', recharge: '', trigger: '', range: '', target: '', bonus: '', vs: '', dice: '', dtype: '', hit: '', effect: '' };
    var fin = function (r) { if (sx0.trigger) r.trigger = sx0.trigger; if (sx0.miss) r.hit = (r.hit ? r.hit + ' ' : '') + '빗나감: ' + sx0.miss; if (sx0.effect) r.effect = (r.effect ? r.effect + ' ' : '') + sx0.effect; return r; };
    var rc = /(recharge[sd]?[^;]*|재충전[^;]*)/i.exec(u); if (rc) o.recharge = rc[1].replace(/^recharges?\s*/i, '').replace(/^재충전\s*/, '') || '있음';
    var tg = /((?:when|if)\s[^;]*|[^;]*(?:때|하면))$/i.exec(u); if (tg && !rc) o.trigger = tg[1].trim(); else { var tg2 = u.split(';').map(function (x) { return x.trim(); }).filter(function (x) { return /^(when|if)\b|때$|하면$/i.test(x); })[0]; if (tg2) o.trigger = tg2; }
    var am = /([+\-]\d+)\s*vs\.?\s*(AC|Fortitude|Reflex|Will|Fort|Ref|인내|반사|의지)/i.exec(t);
    if (!am) { o.effect = t; var r0 = /^((?:Reach|Ranged|Close|Area|Melee|간격|원거리|근거리|범위|근접)[^;.]*)[;.]\s*/i.exec(t); if (r0) { o.range = r0[1]; o.effect = t.slice(r0[0].length); } return fin(o); }
    o.bonus = String(+am[1]); o.vs = { ac: 'AC', fortitude: 'Fort', fort: 'Fort', '인내': 'Fort', reflex: 'Ref', ref: 'Ref', '반사': 'Ref', will: 'Will', '의지': 'Will' }[am[2].toLowerCase()] || 'AC';
    t.slice(0, am.index).split(';').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) { if (/^targets?\b|대상/i.test(x)) o.target = x.replace(/^(targets?|대상)\s*:?\s*/i, ''); else if (!o.range) o.range = x; else o.trigger = o.trigger || x; });
    if (!o.range) o.range = (p.k === 'm' || p.k === 'M') ? '근접 1' : (p.k === 'r' || p.k === 'R') ? '원거리 10' : '';
    if (!o.target && /^[CcAa]$/.test(p.k || '')) o.target = '범위 내 모든 개체';
    var rest = t.slice(am.index + am[0].length).replace(/^\s*[;,.]\s*/, ''), dm = /^(\d+d\d+(?:\s*[+\-]\s*\d+)?|\d+)\s+([^,.;(]*?(?:damage|피해))/i.exec(rest);
    if (dm) { o.dice = dm[1].replace(/\s+/g, ''); o.dtype = dm[2].replace(/damage/i, '피해').trim() + '.'; o.hit = rest.slice(dm[0].length).replace(/^\s*[,;.]?\s*(and\s+)?/i, '').trim(); } else o.hit = rest;
    return fin(o); }
  function monTokenData(m) { var T = window.D4E_MONT, num = function (v, d) { var x = /-?\d+/.exec(String(v == null ? '' : v)); return x ? x[0] : (d == null ? '' : d); };
    /* 캠페인 「몹 기본」의 역할 · 입력 단추가 하는 일을 미리 해 둠: Role = 솔져 · 브루트 …, 토큰 라벨 = 미니언 · 엘리트 · 솔로, 엘리트 AP 1 · Save 2, 솔로 AP 2 · Save 5 */
    var mn = m.tier === 'Minion' || m.role === 'Minion', tr = mn ? 'Minion' : (m.tier || 'Standard'), role = MT_ROLE[m.role === 'Minion' ? m.role2 : m.role] || '', label = MT_TIER[tr] || '';
    var ap = num(m.ap, '') || (tr === 'Elite' ? '1' : tr === 'Solo' ? '2' : '0'), sv = num(m.saves, '') || (tr === 'Elite' ? '2' : tr === 'Solo' ? '5' : '0');
    var memo1 = [m.leader ? '지휘' : '', m.senses ? '감각 ' + m.senses : '', m.speed ? '이동 ' + m.speed : ''].filter(Boolean).join(' / '), memo2 = [m.immune ? '면역 ' + m.immune : '', m.resist ? '저항 ' + m.resist : '', m.vuln ? '취약 ' + m.vuln : ''].filter(Boolean).join(' / ');
    /* 캠페인 Monster 속성 중 기본값이 없는 칸은 비워서라도 넣어 둠 — 안 넣으면 맵툴이 「Value For "at1"」처럼 값을 물어봄 */
    var props = {}; ['Attack Bonus1', 'Damage1', 'Attack Bonus2', 'Damage2', 'Attack Bonus3', 'Damage3', 'Attack Bonus4', 'Damage4', 'Attack Bonus5', 'Damage5', 'at1', 'at2', 'at3', 'at4', 'at5', 'at6', 'at7', 'at8', 'Other', 'Ongoing1', 'Ongoing2', 'Ongoing3', 'EoNT'].forEach(function (k) { props[k] = ''; });
    var keep = clean(m); delete keep.id; delete keep.img; delete keep.by; delete keep.at; delete keep.q; delete keep.src; delete keep.n_en; props.D4E = JSON.stringify(keep);
    Object.assign(props, { Level: String(m.lv || 1), HP: num(m.hp, 1), MaxHP: num(m.hp, 1), AC: num(m.ac), MaxAC: num(m.ac), Fort: num(m.fort), MaxFort: num(m.fort), Reflex: num(m.ref), MaxReflex: num(m.ref), Will: num(m.will), MaxWill: num(m.will),
      DisplayNAD: num(m.fort) + '/' + num(m.ref) + '/' + num(m.will), Mov: num(m.speed, 6), IniBonus: num(m.init, 0), save: sv, AP: ap, Role: role, Memo1: memo1, Memo2: memo2 });
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
    return { name: m.n, label: label, props: props, macros: macros, attacks: n }; }
  function monTokenXml(m, img, hash, o) { var T = window.D4E_MONT, U = window.D4EMt, xe = U.xe, d = monTokenData(m);
    var props = '<propertyMapCI>\n<store>\n' + Object.keys(d.props).map(function (k) { return '<entry>\n<string>' + xe(k.toLowerCase()) + '</string>\n<net.rptools.CaseInsensitiveHashMap_-KeyValue>\n<key>' + xe(k) + '</key>\n<value class="string">' + xe(d.props[k]) + '</value>\n</net.rptools.CaseInsensitiveHashMap_-KeyValue>\n</entry>'; }).join('\n') + '\n</store>\n</propertyMapCI>';
    var idx = T.nextIndex, macros = d.macros.map(function (mc) { var i = idx++; return T.entry.replace(/@@INDEX@@/g, i).replace('@@UUID@@', U.uuid()).replace('@@COLOR@@', mc.color).replace('@@FONT@@', mc.font).replace('@@SORT@@', xe(mc.sort)).replace('@@GROUP@@', function () { return xe(mc.group); })
      .replace('@@LABEL@@', function () { return xe(mc.label); }).replace('@@TIP@@', function () { return xe(mc.tip); }).replace('@@COMMAND@@', function () { return xe(mc.command); }); }).join('\n');
    var FOOT = { 1: 'fwABAc9lFSoFAAAAKgABAQ==', 2: 'fwABAdBlFSoGAAAAKgABAA==', 3: 'fwABAdBlFSoHAAAAKgABAA==', 4: 'fwABAdFlFSoIAAAAKgABAQ==' };
    var tk = T.token.replace('&quot;Special_Name | 0 | Special name | Text&quot;,\n&quot;special_effect | 0 | Effect | Text &quot;\n)]', '&quot;Special_Name | | 이름 | TEXT&quot;,\n&quot;special_effect | | 효과 | TEXT&quot;\n)]\n[h: abort(status)]'); if (o) { tk = tk.replace(/<x>-?\d+<\/x>(\s*)<y>-?\d+<\/y>(\s*)<z>-?\d+<\/z>(\s*)<lastX>-?\d+<\/lastX>(\s*)<lastY>-?\d+<\/lastY>/, '<x>' + o.x + '</x>$1<y>' + o.y + '</y>$2<z>' + o.z + '</z>$3<lastX>' + o.x + '</lastX>$4<lastY>' + o.y + '</lastY>'); if (FOOT[o.size]) tk = tk.replace('fwABAc9lFSoFAAAAKgABAQ==', FOOT[o.size]); }
    return (o ? '' : '<?xml version="1.0" encoding="UTF-8"?>\n') + tk.replace('@@ID@@', o ? o.id : U.guid()).replace('@@EXP@@', U.guid()).replace('@@IMG@@', hash).replace('@@NAME@@', function () { return xe(d.name); }).replace('<label></label>', function () { return '<label>' + xe(d.label || '') + '</label>'; })
      .replace(/<width>\d+<\/width>\s*<height>\d+<\/height>\s*<isoWidth>\d+<\/isoWidth>\s*<isoHeight>\d+<\/isoHeight>/, '<width>' + img.w + '</width>\n<height>' + img.h + '</height>\n<isoWidth>' + img.w + '</isoWidth>\n<isoHeight>' + img.h + '</isoHeight>')
      .replace('@@PROPS@@', function () { return props; }).replace('@@MACROS@@', function () { return macros + '\n'; }); }
  var MT_ROLE = { Soldier: '솔져', Brute: '브루트', Artillery: '아틸러리', Skirmisher: '스커미셔', Controller: '컨트롤러', Lurker: '럴커' }, MT_TIER = { Minion: '미니언', Elite: '엘리트', Solo: '솔로' };
  var ROLE_COL = { Skirmisher: '#3f7d4e', Brute: '#93283a', Soldier: '#3d6a8a', Lurker: '#5b4a7a', Controller: '#a8661c', Artillery: '#7a2b6b', Minion: '#6b6b6b' };
  /* 토큰 그림: 몬스터에 넣어 둔 그림이 있으면 원형으로, 없으면 역할 색 원에 이름 첫 글자 */
  function monImage(m) { return new Promise(function (ok) { var cv = document.createElement('canvas'); cv.width = cv.height = 256; var x = cv.getContext('2d');
      var done = function () { x.lineWidth = 10; x.strokeStyle = m.tier === 'Solo' ? '#d4af37' : m.tier === 'Elite' ? '#c0c0c0' : '#222'; x.beginPath(); x.arc(128, 128, 121, 0, 7); x.stroke(); cv.toBlob(function (b) { b.arrayBuffer().then(function (ab) { ok({ bytes: new Uint8Array(ab), w: 256, h: 256 }); }); }, 'image/png'); };
      var blank = function () { x.fillStyle = ROLE_COL[m.role] || '#555'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 120px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(m.n || '?').trim().charAt(0), 128, 136); done(); };
      if (!m.img) return blank(); var im = new Image(); im.onload = function () { var s = Math.min(im.width, im.height); x.save(); x.beginPath(); x.arc(128, 128, 124, 0, 7); x.clip(); x.drawImage(im, (im.width - s) / 2, 0, s, s, 0, 0, 256, 256); x.restore(); done(); }; im.onerror = blank; im.src = m.img; }); }
  /* 토큰 파일 하나의 내용(zip blob). nameAs 를 주면 토큰 이름을 그것으로(조우 판의 「고블린 2」 같은 번호 붙은 이름) */
  /* 맵 파일(.rpmap)에 넣을 토큰 한 개: 자리(x, y) · 쌓이는 순서(z) · 크기(칸 수)를 받아 토큰 글과 그림을 돌려준다 */
  async function monTokenPart(m, nameAs, o) { var U = window.D4EMt; if (!window.D4E_MONT || !U) throw new Error('토큰 본을 읽지 못했어요.'); var mm = nameAs ? Object.assign({}, m, { n: nameAs }) : m, img = await monImage(m), hash = U.md5(img.bytes), id = U.guid();
    return { id: id, hash: hash, bytes: img.bytes, name: mm.n, xml: monTokenXml(mm, img, hash, { id: id, x: o.x, y: o.y, z: o.z, size: o.size }) }; }
  async function monTokenBlob(m, nameAs) { var U = window.D4EMt; if (!window.D4E_MONT || !U) throw new Error('토큰 본을 읽지 못했어요.'); await U.loadZip(); var mm = nameAs ? Object.assign({}, m, { n: nameAs }) : m, img = await monImage(m), hash = U.md5(img.bytes), zip = new window.JSZip(), xe = U.xe;
    zip.file('content.xml', monTokenXml(mm, img, hash)); zip.file('properties.xml', '<map>\n  <entry>\n    <string>version</string>\n    <string>' + window.D4E_MONT.version + '</string>\n  </entry>\n</map>');
    zip.file('assets/' + hash, '<net.rptools.maptool.model.Asset>\n  <id>\n    <id>' + hash + '</id>\n  </id>\n  <name>' + xe(mm.n) + '</name>\n  <extension>png</extension>\n  <type>IMAGE</type>\n</net.rptools.maptool.model.Asset>');
    zip.file('assets/' + hash + '.png', img.bytes); zip.file('thumbnail', img.bytes); zip.file('thumbnail_large', img.bytes);
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }); }
  function fileName(n) { return String(n || 'monster').replace(/[\\/:*?"'<>|\s]+/g, '_'); }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000); }
  async function saveMonToken(m) { download(await monTokenBlob(m), fileName(m.n) + '.rptok'); }
  /* 끌어다 놓은 것에서 그림 얻기: 파일이 먼저, 없으면 다른 창에서 끌어온 그림 주소 */
  function dragOk(ev) { var ts = Array.prototype.slice.call((ev.dataTransfer && ev.dataTransfer.types) || []); return ts.indexOf('Files') >= 0 || ts.indexOf('text/uri-list') >= 0 || ts.indexOf('text/html') >= 0; }
  function dropImg(ev) { var dt = ev.dataTransfer, f = dt && dt.files && Array.prototype.filter.call(dt.files, function (x) { return /^image\//.test(x.type || '') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(x.name || ''); })[0]; if (f) return readImg(f);
    var url = '', html = dt ? dt.getData('text/html') : '', mm = /<img[^>]+src=["']([^"']+)["']/i.exec(html || ''); if (mm) url = mm[1].replace(/&amp;/g, '&'); if (!url && dt) url = (dt.getData('text/uri-list') || '').split(/\r?\n/).filter(function (x) { return x && x.charAt(0) !== '#'; })[0] || '';
    if (!url) return Promise.reject(new Error('그림 파일이 아니에요.'));
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('x'); return r.blob(); }).then(function (b) { if (!/^image\//.test(b.type || '')) throw new Error('x'); return readImg(new File([b], 'drop', { type: b.type })); }).catch(function () { throw new Error('그 사이트가 그림을 바로 가져가지 못하게 막아 두었어요. 그림을 컴퓨터에 저장한 뒤 그 파일을 끌어다 놓아 주세요.'); }); }
  function startBase(m) { editing = JSON.parse(JSON.stringify(clean(shown(m)))); editing.id = ''; delete editing.q; delete editing.src; delete editing.n_en; editing.ko = 1; editing.base = m.n; if (m.role === 'Minion') { editing.tier = 'Minion'; editing.role = 'Skirmisher'; } }
  /* 맵툴 토큰(.rptok) · 맵(.rpmap) 파일을 「만든 것」 몬스터로 불러와 공유 DB에 저장 */
  async function importFiles(files) { var I = window.D4EMonIn, L = (files || []).filter(function (f) { return I && (I.isTok(f) || I.isMap(f)); }); if (!L.length) return false;
    if (ext) { alert('조우 판에서 고치는 중에는 불러올 수 없어요.'); return true; } if (editing && !confirm('고치던 것을 버리고 토큰을 불러올까요?')) return true; editing = null;
    note('토큰을 읽는 중…'); var got = [], bad = [];
    for (var i = 0; i < L.length; i++) { try { if (I.isTok(L[i])) got.push((await I.tokenFile(L[i])).m); else (await I.mapFile(L[i])).mons.forEach(function (m) { got.push(m); }); } catch (e) { bad.push(L[i].name + ': ' + e.message); } }
    for (var j = 0; j < got.length; j++) { try { got[j].ko = 1; got[j].from = 'maptool'; fill(got[j], false); await save(got[j]); sel = got[j].id; } catch (e) { bad.push(got[j].n + ': 저장 실패 (' + e.message + ')'); } }
    renderList(); renderView(); note((got.length ? '토큰 ' + got.length + '마리를 「만든 것」으로 불러왔어요. 수치와 파워는 한 번 훑어봐 주세요.' : '불러온 몬스터가 없어요.') + (bad.length ? ' 실패: ' + bad.join(' / ') : '')); return true; }
  function wireDrop() { var root = $('tab-mon'); if (!root || root._wd) return; root._wd = 1;
    /* 그림을 받을 수 있는 곳: 편집 화면(어디든), 스탯 블록을 보고 있는 칸 */
    var zone = function (ev) { var t = ev.target; if (!t.closest) return null; var f = t.closest('.mform'); if (f && editing) return f; var v = t.closest('#monView'); if (v && !editing && sel && byId(sel)) return v; return null; };
    var mtFile = function (ev) { var dt = ev.dataTransfer, I = window.D4EMonIn; if (!dt || !I || !ev.target.closest || !ev.target.closest('#monListWrap')) return null; var L = Array.prototype.slice.call(dt.files || []).filter(function (f) { return I.isTok(f) || I.isMap(f); }); return L.length ? L : (Array.prototype.indexOf.call(dt.types || [], 'Files') >= 0 && !dt.files.length ? [] : null); };
    root.addEventListener('dragover', function (ev) { var w = ev.target.closest && ev.target.closest('#monListWrap'); if (!w || !ev.dataTransfer || Array.prototype.indexOf.call(ev.dataTransfer.types || [], 'Files') < 0 || zone(ev)) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; w.classList.add('imgdrop'); });
    root.addEventListener('dragleave', function (ev) { var w = ev.target.closest && ev.target.closest('#monListWrap'); if (w && !w.contains(ev.relatedTarget)) w.classList.remove('imgdrop'); });
    root.addEventListener('drop', function (ev) { var L = mtFile(ev); root.querySelectorAll('#monListWrap.imgdrop').forEach(function (x) { x.classList.remove('imgdrop'); }); if (!L || !L.length) return; ev.preventDefault(); ev.stopPropagation(); importFiles(L); }, true);
    root.addEventListener('dragover', function (ev) { var z = zone(ev); if (!z || !dragOk(ev)) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; z.classList.add('imgdrop'); });
    root.addEventListener('dragleave', function (ev) { var z = ev.target.closest && (ev.target.closest('.mform') || ev.target.closest('#monView')); if (z && !z.contains(ev.relatedTarget)) z.classList.remove('imgdrop'); });
    root.addEventListener('drop', function (ev) { var z = zone(ev); if (!z || !dragOk(ev)) return; ev.preventDefault(); root.querySelectorAll('.imgdrop').forEach(function (x) { x.classList.remove('imgdrop'); });
      if (editing) readForm(); var m = !editing && byId(sel);
      dropImg(ev).then(async function (u) {
        if (editing) { editing.img = u; renderView(); return; }
        if (!m) return;
        if (m._pack) { startBase(m); editing.img = u; renderView(); note('자료집 몬스터는 고칠 수 없어서, 그림을 넣은 사본을 열었어요. 「저장」을 누르면 만든 몬스터로 남아요.'); return; }
        m.img = u; try { await save(m); renderList(); renderView(); note('「' + m.n + '」에 그림을 넣었어요.'); } catch (e) { alert('저장하지 못했어요: ' + e.message); } }, function (e) { alert(e.message); }); }); }
  window.D4EMon = { readImg: readImg, importFiles: importFiles, fill: function (m) { return fill(m, false); }, tokenPart: monTokenPart, tplVersion: function () { return (window.D4E_MONT || {}).version || ''; }, dragOk: dragOk, dropImg: dropImg, editIn: editIn, editEnd: editEnd, tokenBlob: monTokenBlob, download: download, fileName: fileName, shown: shown, clean: clean, load: function () { return loaded ? Promise.resolve() : load(); }, gm: gm, XP: XP, ROLE_COL: ROLE_COL, ROLE_KO: ROLE_KO, TIER_KO: TIER_KO, tokenData: monTokenData, tokenXml: monTokenXml, parsePw: parsePw, saveToken: saveMonToken, render: function () { wire(); wireDrop(); render(); }, math: math, dice: dice, block: block, all: all, byId: byId };
})();
