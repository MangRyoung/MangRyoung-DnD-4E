/* 도감: 「데이터」 탭에서 룰 요소(파워 · 재주 · 클래스 특성 · 마법 물품 …)를 종류별로 찾아보고 걸러 본다. 고르는 창과 달리 캐릭터와 상관없이 전체를 본다. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var lc = function (s) { return String(s == null ? '' : s).toLowerCase(); };
  /* 종류: [데이터의 type 들], 이름, 걸러 보기 칸([이름, 값을 꺼내는 함수]) */
  var cls = function (e) { var d = (e.sp || {})['Display'] || ''; var m = /^(.*?) (?:Attack|Utility|Feature|Racial Power|Racial Utility|Pact Boon)\b/.exec(d); return m ? m[1] : (d || ''); };
  var sp = function (k) { return function (e) { return (e.sp || {})[k] || ''; }; };
  var first = function (k) { return function (e) { return String((e.sp || {})[k] || '').split(',')[0].trim(); }; };
  /* 특성의 주인(클래스 · 종족 · 패러곤 패스 …) 찾기: 주는 규칙(grant) · 고르는 규칙(select 의 category) · 종족의 Racial Traits 칸을 따라 내려간다. 데이터가 바뀌면 다시 만든다. */
  var FT = { 'Class Feature': 1, 'Racial Trait': 1 }, OWNT = { 'Class': '클래스', 'Hybrid Class': '하이브리드 클래스', 'Race': '종족', 'Paragon Path': '패러곤 패스', 'Epic Destiny': '에픽 데스티니', 'Theme': '테마' }, THRU = { 'Grants': 1, 'Trait Package': 1, 'Build': 1, 'Level1Rules': 1, 'Internal': 1 };
  var ownMap = null, ownDb = null, preRx = null;
  function owners() { var d = db(); if (ownMap && ownDb === d) return ownMap; ownDb = d; ownMap = {}; preRx = null; var bycat = {};
    Object.keys(FT).forEach(function (t) { (d.byType[t] || []).forEach(function (e) { (e.cat || []).forEach(function (c) { (bycat[c] = bycat[c] || []).push(e.id); }); }); });
    function kids(e) { var out = []; (e.r || []).forEach(function (r) { var a = r[1] || {}; if (r[0] === 'grant' && a.name) out.push(a.name); else if (r[0] === 'select' && FT[a.type] && a.category) String(a.category).split('|').forEach(function (alt) { var ks = alt.split(',').map(function (c) { return c.trim(); }).filter(function (c) { return c && c.indexOf('$$') < 0; }); if (!ks.length || !/^ID_/.test(ks[0]) && !bycat[ks[0]]) return; var L = bycat[ks[0]] || [], x = d.byId[ks[0]]; if (x && FT[x.t]) out.push(ks[0]); if (/^\d+$/.test(ks[0]) && ks.length < 2) return; L.forEach(function (i) { var cs = d.byId[i].cat || []; if (ks.every(function (k) { return cs.indexOf(k) >= 0; })) out.push(i); }); }); });
      var s = e.sp || {}; ['Racial Traits', '_PARSED_SUB_FEATURES', '_PARSED_CHILD_FEATURES', '_PARSED_CLASS_FEATURE'].forEach(function (k) { String(s[k] || '').split(',').forEach(function (i) { i = i.trim(); if (i.indexOf('ID_') === 0) out.push(i); }); }); return out; }
    function walk(e, root, seen, dep) { if (dep > 6) return; kids(e).forEach(function (i) { var x = d.byId[i]; if (!x || seen[i]) return; seen[i] = 1; if (FT[x.t]) { (ownMap[i] = ownMap[i] || []).push(root); walk(x, root, seen, dep + 1); } else if (THRU[x.t]) walk(x, root, seen, dep + 1); }); }
    Object.keys(OWNT).forEach(function (t) { (d.byType[t] || []).forEach(function (e) { walk(e, e, {}, 0); }); });
    /* 「아무 특성이나 하나」 식으로 수백 개를 건드리는 주인은 주인으로 치지 않는다 */
    var cnt = {}; Object.keys(ownMap).forEach(function (i) { ownMap[i].forEach(function (x) { cnt[x.id] = (cnt[x.id] || 0) + 1; }); });
    Object.keys(ownMap).forEach(function (i) { ownMap[i] = ownMap[i].filter(function (x) { return cnt[x.id] <= 200; }); if (!ownMap[i].length) delete ownMap[i]; });
    /* 남은 것: 받쳐 주는 특성(_SupportsID)의 주인을 물려받거나, 필요한 클래스(_RequiresID)를 주인으로 */
    Object.keys(FT).forEach(function (t) { (d.byType[t] || []).forEach(function (e) { if (ownMap[e.id]) return; var s = e.sp || {}, got = [];
      [s['_RequiresID'], s['Class'], s['_SupportsID']].forEach(function (v) { String(v || '').split(',').forEach(function (i) { i = i.trim(); var x = d.byId[i]; if (!x) return; if (OWNT[x.t]) got.push(x); else if (ownMap[i]) got = got.concat(ownMap[i]); }); });
      if (got.length) ownMap[e.id] = got.filter(function (x, k) { return got.indexOf(x) === k; }); }); });
    return ownMap; }
  function onm(x) { return (A().nm ? A().nm(x) : x.n) || x.n; }
  var ownKind = function (e) { var o = owners()[e.id]; if (!o) return '그 밖'; var m = {}; o.forEach(function (x) { m[OWNT[x.t]] = 1; }); return Object.keys(m); };
  var ownName = function (e) { var o = owners()[e.id]; return o ? o.map(onm) : ''; };
  var ownRace = function (e) { var o = (owners()[e.id] || []).filter(function (x) { return x.t === 'Race'; }); return o.length ? o.map(onm) : (owners()[e.id] || []).length ? owners()[e.id].map(onm) : '그 밖'; };
  var featKind = function (e) { var s = e.sp || {}; return s['type'] || s['Type'] || '일반'; };
  /* 재주 조건 글에서 종족 · 클래스 이름을 찾는다 (half-elf 안의 elf 는 세지 않는다) */
  function preOf(e, t) { var d = db(); owners(); preRx = preRx || {}; if (!preRx[t]) preRx[t] = (d.byType[t] || []).filter(function (x) { return !(x.sp || {})['InternalOnly']; }).map(function (x) { return [new RegExp('(^|[^a-z-])' + lc(x.n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z-])'), x]; });
    var p = lc(e.pp || e.pre || ''); if (!p) return ''; var out = []; preRx[t].forEach(function (r) { if (r[0].test(p)) { var k = onm(r[1]); if (out.indexOf(k) < 0) out.push(k); } }); return out.length ? out : ''; }
  var preRace = function (e) { return preOf(e, 'Race'); }, preClass = function (e) { return preOf(e, 'Class'); };
  var hasPow = function (e) { var s = e.sp || {}; return (s['Powers'] || s['_DisplayPowers']) ? '파워를 줌' : '파워 없음'; };
  var CATS = [
    { id: 'power', n: '파워', t: ['Power'], lv: true, f: [['사용', function (e) { var u = lc((e.sp || {})['Power Usage']); return u.indexOf('daily') >= 0 ? '일일' : u.indexOf('encounter') >= 0 ? '조우' : u ? '무제한' : ''; }], ['갈래', function (e) { return ({ Attack: '공격', Utility: '활용', Feature: '특성' })[(e.sp || {})['Power Type']] || '그 밖'; }], ['클래스 · 출처', cls]] },
    { id: 'feat', n: '재주', t: ['Feat'], f: [['등급', function (e) { return ({ heroic: '영웅', paragon: '패러곤', epic: '에픽' })[lc((e.sp || {})['Tier'])] || ''; }], ['갈래', featKind], ['조건 종족', preRace], ['조건 클래스', preClass]] },
    { id: 'cf', n: '클래스 특성', t: ['Class Feature'], lv: true, f: [['갈래', ownKind], ['주인', ownName], ['파워', hasPow]] },
    { id: 'rt', n: '종족 특성', t: ['Racial Trait'], f: [['종족', ownRace], ['파워', hasPow]] },
    { id: 'item', n: '마법 물품', t: ['Magic Item'], lv: true, f: [['종류', sp('Magic Item Type')], ['희귀도', sp('Rarity')]] },
    { id: 'weapon', n: '무기', t: ['Weapon'], f: [['분류', sp('Weapon Category')], ['그룹', first('Group')]] },
    { id: 'armor', n: '갑옷 · 방패', t: ['Armor'], f: [['분류', sp('Armor Type')]] },
    { id: 'impl', n: '상급 도구', t: ['Superior Implement'], f: [['그룹', sp('Group')]] },
    { id: 'gear', n: '장비', t: ['Gear'], f: [['분류', sp('Category')]] },
    { id: 'ritual', n: '의식', t: ['Ritual'], lv: true, f: [['분류', sp('Category')], ['핵심 기술', sp('Key Skill')]] },
    { id: 'race', n: '종족', t: ['Race'], f: [] }, { id: 'class', n: '클래스', t: ['Class', 'Hybrid Class'], f: [] },
    { id: 'pp', n: '패러곤 패스', t: ['Paragon Path'], f: [] }, { id: 'ed', n: '에픽 데스티니', t: ['Epic Destiny'], f: [] },
    { id: 'theme', n: '테마', t: ['Theme'], f: [] }, { id: 'bg', n: '배경', t: ['Background'], f: [['캠페인', sp('Campaign')]] }, { id: 'deity', n: '신', t: ['Deity'], f: [['성향', sp('Alignment')]] },
    { id: 'pet', n: '동료 · 사역마', t: ['Companion', 'Familiar'], f: [] }
  ];
  var cat = localStorage.getItem('d4e_dexcat') || 'power', q = '', lo = '', hi = '', fv = {}, sel = null, cache = {}, src = '';
  function A() { return window.D4EApp; }
  function db() { return A() && A().db(); }
  function C() { return CATS.filter(function (c) { return c.id === cat; })[0] || CATS[0]; }
  var showEmpty = localStorage.getItem('d4e_dexempty') === '1';
  function blank(e) { if (e.body || e.fl) return false; var s = e.sp || {}, calc = /^Tivaan/.test((e.src || [])[0] || ''); /* 팬 자료의 계산용 조각은 짧은 설명만 있어도 글 없는 것으로 */ for (var k in s) { if (k.charAt(0) !== '_' && (k !== 'Short Description' || !calc) && k !== 'Level' && k !== 'type' && k !== 'Type' && String(s[k]).trim()) return false; } return true; }
  function pool(c) { if (cache[c.id]) return cache[c.id]; var d = db(), out = []; c.t.forEach(function (t) { (d.byType[t] || []).forEach(function (e) { if ((e.sp || {})['InternalOnly']) return; if (t === 'Power' && !(e.sp || {})['Power Usage']) return; out.push(e); }); });
    out.forEach(function (e) { e._lv = +String((e.sp || {})['Level'] || '').replace(/\D.*$/, '') || 0; });
    out.sort(function (a, b) { return (c.lv ? a._lv - b._lv : 0) || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0); }); return (cache[c.id] = out); }
  function name(e) { var sh = A().shName && A().shName(e.id); if (sh) return sh + ' (' + e.n + ')'; var k = A().nm ? A().nm(e) : e.n; return k || e.n; }
  function list() { var c = C(), ql = lc(q.trim()); return pool(c).filter(function (e) {
      if (c.lv && lo && e._lv < +lo) return false; if (c.lv && hi && e._lv > +hi) return false;
      for (var i = 0; i < c.f.length; i++) { var v = fv[c.id + ':' + i]; if (v) { var g = c.f[i][1](e); if (Array.isArray(g) ? g.indexOf(v) < 0 : g !== v) return false; } }
      if (!showEmpty && blank(e)) return false;
      if (src && (e.src || []).indexOf(src) < 0) return false;
      if (ql && lc(e.n).indexOf(ql) < 0 && lc(name(e)).indexOf(ql) < 0 && lc((e.sp || {})['Display']).indexOf(ql) < 0 && lc((e.sp || {})['Keywords']).indexOf(ql) < 0) return false; return true; }); }
  function opts(c, i) { var m = {}; pool(c).forEach(function (e) { var v = c.f[i][1](e); (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x) m[x] = (m[x] || 0) + 1; }); }); var ks = Object.keys(m).sort(function (a, b) { return m[b] - m[a] || (a < b ? -1 : 1); }).slice(0, 300); if (ks.length > 40) ks.sort(function (a, b) { return a === '그 밖' ? 1 : b === '그 밖' ? -1 : a.localeCompare(b, 'ko'); }); return ks.map(function (k) { return [k, m[k]]; }); }
  function sub(e) { var s = e.sp || {}, a = []; if (e.t === 'Power') { a.push(s['Display'] || ''); } else if (e.t === 'Magic Item') { if (s['Level']) a.push(s['Level'] + '레벨'); a.push(s['Magic Item Type'] || ''); } else if (e.t === 'Feat') a.push(({ heroic: '영웅', paragon: '패러곤', epic: '에픽' })[lc(s['Tier'])] || '');
    else if (e.t === 'Weapon') a.push((s['Damage'] || '') + ' ' + (s['Group'] || '')); else if (e.t === 'Ritual') a.push((s['Level'] || '') + '레벨 ' + (s['Category'] || '')); else if (FT[e.t]) { var ow = owners()[e.id]; a.push(ow ? onm(ow[0]) + (ow.length > 1 ? ' 외 ' + (ow.length - 1) : '') : (e.src || [])[0] || ''); } else if (s['Level']) a.push(s['Level'] + '레벨'); else a.push((e.src || [])[0] || '');
    return a.filter(Boolean).join(' · '); }
  function renderBar() { var c = C(), bar = $('dexFilter'); if (!bar) return;
    $('dexCats').innerHTML = CATS.map(function (x) { var n = pool(x).length, nv = showEmpty ? n : n - pool(x).filter(blank).length; return n ? '<button class="tchip' + (x.id === cat ? ' on' : '') + '" data-dcat="' + x.id + '">' + x.n + ' <small>' + nv.toLocaleString() + '</small></button>' : ''; }).join('');
    var h = '<input type="text" id="dexQ" placeholder="이름 · 키워드 검색 (영어 · 한글)" value="' + esc(q) + '">';
    if (c.lv) h += '<label>레벨 <input type="number" id="dexLo" min="0" max="30" placeholder="부터" value="' + esc(lo) + '"> ~ <input type="number" id="dexHi" min="0" max="30" placeholder="까지" value="' + esc(hi) + '"></label>';
    c.f.forEach(function (f, i) { var cur = fv[c.id + ':' + i] || ''; h += '<select data-dfi="' + i + '"><option value="">' + f[0] + ' 전체</option>' + opts(c, i).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[0]) + ' (' + o[1] + ')</option>'; }).join('') + '</select>'; });
    var sm = {}; pool(c).forEach(function (e) { (e.src || []).forEach(function (s) { sm[s] = (sm[s] || 0) + 1; }); });
    h += '<select id="dexSrc"><option value="">출처 전체</option>' + Object.keys(sm).sort().map(function (s) { return '<option value="' + esc(s) + '"' + (src === s ? ' selected' : '') + '>' + esc(s) + ' (' + sm[s] + ')</option>'; }).join('') + '</select>';
    var nb = pool(c).filter(blank).length; if (nb) h += '<label class="dexempty"><input type="checkbox" id="dexEmpty"' + (showEmpty ? ' checked' : '') + '> 글 없는 것도 보기 <small>(' + nb.toLocaleString() + ')</small></label>';
    bar.innerHTML = h; }
  var MAX = 300;
  function renderList() { var box = $('dexList'); if (!box) return; var L = list();
    $('dexCount').textContent = L.length.toLocaleString() + '개' + (L.length > MAX ? ' · 앞의 ' + MAX + '개만 보여요. 검색이나 걸러 보기로 좁혀 주세요.' : '');
    box.innerHTML = L.length ? L.slice(0, MAX).map(function (e) { var k = name(e), u = e.t === 'Power' ? lc((e.sp || {})['Power Usage']) : '', uc = u.indexOf('daily') >= 0 ? ' u-day' : u.indexOf('encounter') >= 0 ? ' u-enc' : u ? ' u-at' : '', tier = e.t === 'Feat' ? ' t-' + lc((e.sp || {})['Tier'] || 'heroic') : '';
      return '<div class="drow' + uc + tier + (sel === e.id ? ' on' : '') + '" data-did="' + esc(e.id) + '">' + (C().lv ? '<i>' + (e._lv || '') + '</i>' : '') + '<b>' + esc(k) + '</b><span>' + esc(sub(e)) + '</span></div>'; }).join('') : '<p class="hint">조건에 맞는 것이 없어요.</p>'; }
  function renderView() { var box = $('dexView'); if (!box) return; var e = sel && db().byId[sel];
    box.innerHTML = e ? A().cardIn(e) + '<p class="hint dexid">' + esc(e.t) + ' · ' + esc(e.id) + ((e.src || []).length ? ' · ' + esc(e.src.join(', ')) : '') + '</p>' : '<p class="hint">왼쪽에서 하나를 고르면 내용이 여기에 나와요. 「번역 / 원문」 탭으로 바꿔 볼 수 있고, 서명한 팀원은 「공용 번역 쓰기」로 모두가 같이 보는 번역을 적을 수 있어요.</p>'; }
  var lastDb = null;
  function render() { var root = $('dexBody'); if (!root) return; if (db() !== lastDb) { cache = {}; lastDb = db(); sel = null; } if (!db()) { root.hidden = true; $('dexNone').hidden = false; return; } root.hidden = false; $('dexNone').hidden = true; if (!pool(C()).length) cat = 'power'; renderBar(); renderList(); renderView(); }
  function wire() { var root = $('dexCard'); if (!root || root._w) return; root._w = 1;
    root.addEventListener('click', function (ev) { var c = ev.target.closest('[data-dcat]'), r = ev.target.closest('[data-did]');
      if (ev.target.closest('#dexView [data-tr=save], #dexView [data-tr=del]')) { setTimeout(renderList, 80); return; }
      if (c) { cat = c.getAttribute('data-dcat'); localStorage.setItem('d4e_dexcat', cat); sel = null; lo = hi = ''; src = ''; renderBar(); renderList(); renderView(); }
      else if (r) { sel = r.getAttribute('data-did'); root.querySelectorAll('.drow.on').forEach(function (x) { x.classList.remove('on'); }); r.classList.add('on'); renderView(); if (window.innerWidth < 820) $('dexView').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    root.addEventListener('input', function (ev) { var t = ev.target; if (t.id === 'dexQ') { q = t.value; renderList(); } else if (t.id === 'dexLo') { lo = t.value; renderList(); } else if (t.id === 'dexHi') { hi = t.value; renderList(); } });
    root.addEventListener('change', function (ev) { var t = ev.target, i = t.getAttribute && t.getAttribute('data-dfi'); if (i != null) { fv[C().id + ':' + i] = t.value; renderList(); } else if (t.id === 'dexSrc') { src = t.value; renderList(); } else if (t.id === 'dexEmpty') { showEmpty = t.checked; localStorage.setItem('d4e_dexempty', showEmpty ? '1' : '0'); renderList(); } }); }
  /* 카드 안에서 번역을 쓰거나 탭을 바꾼 뒤: 고른 요소를 다시 그리되, 펼쳐 둔 것은 그대로 */
  function redraw() { var box = $('dexView'); if (!box) return; var open = Array.prototype.map.call(box.querySelectorAll('details'), function (d) { return d.open; }); renderView(); Array.prototype.forEach.call(box.querySelectorAll('details'), function (d, i) { if (open[i]) d.open = true; }); renderList(); }
  window.D4EDex = { redraw: redraw, render: function () { wire(); render(); }, reset: function () { cache = {}; ownMap = null; } };
})();
