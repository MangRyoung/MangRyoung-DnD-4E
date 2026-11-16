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
  var CATS = [
    { id: 'power', n: '파워', t: ['Power'], lv: true, f: [['사용', function (e) { var u = lc((e.sp || {})['Power Usage']); return u.indexOf('daily') >= 0 ? '일일' : u.indexOf('encounter') >= 0 ? '조우' : u ? '무제한' : ''; }], ['갈래', function (e) { return ({ Attack: '공격', Utility: '활용', Feature: '특성' })[(e.sp || {})['Power Type']] || '그 밖'; }], ['클래스 · 출처', cls]] },
    { id: 'feat', n: '재주', t: ['Feat'], f: [['등급', function (e) { return ({ heroic: '영웅', paragon: '패러곤', epic: '에픽' })[lc((e.sp || {})['Tier'])] || ''; }]] },
    { id: 'cf', n: '클래스 특성', t: ['Class Feature'], lv: true, f: [] },
    { id: 'rt', n: '종족 특성', t: ['Racial Trait'], f: [] },
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
  function pool(c) { if (cache[c.id]) return cache[c.id]; var d = db(), out = []; c.t.forEach(function (t) { (d.byType[t] || []).forEach(function (e) { if ((e.sp || {})['InternalOnly']) return; if (t === 'Power' && !(e.sp || {})['Power Usage']) return; out.push(e); }); });
    out.forEach(function (e) { e._lv = +String((e.sp || {})['Level'] || '').replace(/\D.*$/, '') || 0; });
    out.sort(function (a, b) { return (c.lv ? a._lv - b._lv : 0) || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0); }); return (cache[c.id] = out); }
  function name(e) { var k = A().nm ? A().nm(e) : e.n; return k || e.n; }
  function list() { var c = C(), ql = lc(q.trim()); return pool(c).filter(function (e) {
      if (c.lv && lo && e._lv < +lo) return false; if (c.lv && hi && e._lv > +hi) return false;
      for (var i = 0; i < c.f.length; i++) { var v = fv[c.id + ':' + i]; if (v && c.f[i][1](e) !== v) return false; }
      if (src && (e.src || []).indexOf(src) < 0) return false;
      if (ql && lc(e.n).indexOf(ql) < 0 && lc(name(e)).indexOf(ql) < 0 && lc((e.sp || {})['Display']).indexOf(ql) < 0 && lc((e.sp || {})['Keywords']).indexOf(ql) < 0) return false; return true; }); }
  function opts(c, i) { var m = {}; pool(c).forEach(function (e) { var v = c.f[i][1](e); if (v) m[v] = (m[v] || 0) + 1; }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a] || (a < b ? -1 : 1); }).slice(0, 300).map(function (k) { return [k, m[k]]; }); }
  function sub(e) { var s = e.sp || {}, a = []; if (e.t === 'Power') { a.push(s['Display'] || ''); } else if (e.t === 'Magic Item') { if (s['Level']) a.push(s['Level'] + '레벨'); a.push(s['Magic Item Type'] || ''); } else if (e.t === 'Feat') a.push(({ heroic: '영웅', paragon: '패러곤', epic: '에픽' })[lc(s['Tier'])] || '');
    else if (e.t === 'Weapon') a.push((s['Damage'] || '') + ' ' + (s['Group'] || '')); else if (e.t === 'Ritual') a.push((s['Level'] || '') + '레벨 ' + (s['Category'] || '')); else if (s['Level']) a.push(s['Level'] + '레벨'); else a.push((e.src || [])[0] || '');
    return a.filter(Boolean).join(' · '); }
  function renderBar() { var c = C(), bar = $('dexFilter'); if (!bar) return;
    $('dexCats').innerHTML = CATS.map(function (x) { var n = pool(x).length; return n ? '<button class="tchip' + (x.id === cat ? ' on' : '') + '" data-dcat="' + x.id + '">' + x.n + ' <small>' + n.toLocaleString() + '</small></button>' : ''; }).join('');
    var h = '<input type="text" id="dexQ" placeholder="이름 · 키워드 검색 (영어 · 한글)" value="' + esc(q) + '">';
    if (c.lv) h += '<label>레벨 <input type="number" id="dexLo" min="0" max="30" placeholder="부터" value="' + esc(lo) + '"> ~ <input type="number" id="dexHi" min="0" max="30" placeholder="까지" value="' + esc(hi) + '"></label>';
    c.f.forEach(function (f, i) { var cur = fv[c.id + ':' + i] || ''; h += '<select data-dfi="' + i + '"><option value="">' + f[0] + ' 전체</option>' + opts(c, i).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[0]) + ' (' + o[1] + ')</option>'; }).join('') + '</select>'; });
    var sm = {}; pool(c).forEach(function (e) { (e.src || []).forEach(function (s) { sm[s] = (sm[s] || 0) + 1; }); });
    h += '<select id="dexSrc"><option value="">출처 전체</option>' + Object.keys(sm).sort().map(function (s) { return '<option value="' + esc(s) + '"' + (src === s ? ' selected' : '') + '>' + esc(s) + ' (' + sm[s] + ')</option>'; }).join('') + '</select>';
    bar.innerHTML = h; }
  var MAX = 300;
  function renderList() { var box = $('dexList'); if (!box) return; var L = list();
    $('dexCount').textContent = L.length.toLocaleString() + '개' + (L.length > MAX ? ' · 앞의 ' + MAX + '개만 보여요. 검색이나 걸러 보기로 좁혀 주세요.' : '');
    box.innerHTML = L.length ? L.slice(0, MAX).map(function (e) { var k = name(e), u = e.t === 'Power' ? lc((e.sp || {})['Power Usage']) : '', uc = u.indexOf('daily') >= 0 ? ' u-day' : u.indexOf('encounter') >= 0 ? ' u-enc' : u ? ' u-at' : '', tier = e.t === 'Feat' ? ' t-' + lc((e.sp || {})['Tier'] || 'heroic') : '';
      return '<div class="drow' + uc + tier + (sel === e.id ? ' on' : '') + '" data-did="' + esc(e.id) + '">' + (C().lv ? '<i>' + (e._lv || '') + '</i>' : '') + '<b>' + esc(k) + '</b><span>' + esc(sub(e)) + '</span></div>'; }).join('') : '<p class="hint">조건에 맞는 것이 없어요.</p>'; }
  function renderView() { var box = $('dexView'); if (!box) return; var e = sel && db().byId[sel];
    box.innerHTML = e ? A().cardIn(e) + '<p class="hint dexid">' + esc(e.t) + ' · ' + esc(e.id) + ((e.src || []).length ? ' · ' + esc(e.src.join(', ')) : '') + '</p>' : '<p class="hint">왼쪽에서 하나를 고르면 내용이 여기에 나와요. 「번역 / 원문」 탭으로 바꿔 볼 수 있어요.</p>'; }
  var lastDb = null;
  function render() { var root = $('dexBody'); if (!root) return; if (db() !== lastDb) { cache = {}; lastDb = db(); sel = null; } if (!db()) { root.hidden = true; $('dexNone').hidden = false; return; } root.hidden = false; $('dexNone').hidden = true; if (!pool(C()).length) cat = 'power'; renderBar(); renderList(); renderView(); }
  function wire() { var root = $('dexCard'); if (!root || root._w) return; root._w = 1;
    root.addEventListener('click', function (ev) { var c = ev.target.closest('[data-dcat]'), r = ev.target.closest('[data-did]');
      if (c) { cat = c.getAttribute('data-dcat'); localStorage.setItem('d4e_dexcat', cat); sel = null; lo = hi = ''; src = ''; renderBar(); renderList(); renderView(); }
      else if (r) { sel = r.getAttribute('data-did'); root.querySelectorAll('.drow.on').forEach(function (x) { x.classList.remove('on'); }); r.classList.add('on'); renderView(); if (window.innerWidth < 820) $('dexView').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    root.addEventListener('input', function (ev) { var t = ev.target; if (t.id === 'dexQ') { q = t.value; renderList(); } else if (t.id === 'dexLo') { lo = t.value; renderList(); } else if (t.id === 'dexHi') { hi = t.value; renderList(); } });
    root.addEventListener('change', function (ev) { var t = ev.target, i = t.getAttribute && t.getAttribute('data-dfi'); if (i != null) { fv[C().id + ':' + i] = t.value; renderList(); } else if (t.id === 'dexSrc') { src = t.value; renderList(); } }); }
  window.D4EDex = { render: function () { wire(); render(); }, reset: function () { cache = {}; } };
})();
