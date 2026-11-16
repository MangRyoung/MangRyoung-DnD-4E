/* 조우 판 (GM용): 맵 그림을 올리고 격자를 맞춘 뒤 몬스터를 올려 조우를 짠다. XP 합계와 난이도를 보여 주고, 올린 몬스터를 맵툴 토큰 묶음으로 받는다.
 * 조우는 공유 DB(kind = dnd4e_enc)에, 맵 그림은 따로(kind = dnd4e_encmap) 둔다 — 목록을 읽을 때 그림까지 내려받지 않게.
 * 조우에는 몬스터 수치의 사본이 들어간다(자료집이 바뀌거나 없어도 조우는 그대로). */
(function () {
  'use strict';
  var KIND = 'dnd4e_enc', MAPKIND = 'dnd4e_encmap';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var M = function () { return window.D4EMon; };
  var list = [], enc = null, mapUrl = '', mapDirty = false, selTok = -1, zoom = 1, loaded = false, view = localStorage.getItem('d4e_monview') || 'list', pickQ = '', pickLo = '', pickHi = '', pickRole = '', pickSrc = '', pickAuto = true, wide = false, dirty = false;
  function blank() { return { id: '', name: '새 조우', plv: 10, pn: 4, cell: 50, ox: 0, oy: 0, w: 1000, h: 700, mons: [], toks: [], note: '', hasMap: false }; }
  function sizeOf(m) { var t = String((m && m.type) || ''); return /Gargantuan|거대형/i.test(t) ? 4 : /Huge|초대형/i.test(t) ? 3 : /Large|대형/i.test(t) ? 2 : 1; }
  function xpOf(m) { return +String(m.xp || '').replace(/[^\d]/g, '') || 0; }
  /* 조우 XP 합계 · 조우 레벨(일행 인원으로 나눈 몫이 표준 몬스터 XP 의 어느 레벨에 닿는지) · 난이도 */
  function budget() { var XP = M().XP, tot = enc.toks.reduce(function (a, t) { return a + xpOf(enc.mons[t.m] || {}); }, 0), n = Math.max(1, +enc.pn || 4), per = tot / n, lv = 0; for (var i = 1; i <= 30; i++) if (XP[i] <= per) lv = i;
    var d = lv - (+enc.plv || 1), lab = !tot ? '' : d <= -2 ? '쉬움' : d <= 1 ? '보통' : d <= 3 ? '어려움' : '매우 위험'; return { tot: tot, lv: lv, diff: d, lab: lab, target: (XP[Math.min(30, Math.max(1, +enc.plv || 1))] || 0) * n }; }
  function label(i) { var t = enc.toks[i], m = enc.mons[t.m] || {}, same = enc.toks.filter(function (x) { return x.m === t.m; }); return same.length > 1 ? m.n + ' ' + (same.indexOf(t) + 1) : m.n; }
  function pickDefault() { var l = +enc.plv || 1; pickLo = String(Math.max(1, l - 2)); pickHi = String(l + 4); pickAuto = true; }
  function touch() { dirty = true; var b = $('encSave'); if (b) b.classList.add('need'); }

  /* ---------- 읽기 · 쓰기 ---------- */
  async function load() { try { list = (await D4EShare.list(KIND)).map(function (r) { var d = r.data || {}; d.id = r.id; return d; }); } catch (e) { list = []; msg('조우 목록을 읽지 못했어요: ' + e.message); } loaded = true; }
  function msg(t) { var n = $('encMsg'); if (n) n.textContent = t || ''; }
  async function open(id) { var e = list.filter(function (x) { return x.id === id; })[0]; if (!e) return; enc = JSON.parse(JSON.stringify(e)); mapUrl = ''; mapDirty = false; selTok = -1; dirty = false; pickDefault(); render();
    if (enc.hasMap) { try { var r = await D4EShare.get(id, MAPKIND); if (r && r.data && r.data.img && enc && enc.id === id) { mapUrl = r.data.img; drawBoard(); fit(false); } } catch (er) { msg('맵 그림을 읽지 못했어요: ' + er.message); } } }
  async function save() { var me = (window.D4EApp && D4EApp.me()) || {}; if (!enc.id) enc.id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    enc.hasMap = !!mapUrl; enc.by = enc.by || me.name || ''; enc.at = Date.now(); var d = JSON.parse(JSON.stringify(enc));
    await D4EShare.put(enc.id, d, KIND); if (mapDirty) { if (mapUrl) await D4EShare.put(enc.id, { img: mapUrl, at: Date.now() }, MAPKIND); else await D4EShare.del(enc.id, MAPKIND).catch(function () {}); mapDirty = false; }
    var i = list.findIndex(function (x) { return x.id === enc.id; }); if (i >= 0) list[i] = d; else list.unshift(d); dirty = false; }
  /* 맵 그림: 긴 변 2000px 까지 줄여 JPEG 로(공유 DB에 넣을 크기) */
  function readMap(file) { return new Promise(function (ok, no) { var fr = new FileReader(); fr.onerror = no; fr.onload = function () { var im = new Image(); im.onerror = function () { no(new Error('그림 파일을 읽지 못했어요.')); };
      im.onload = function () { var k = Math.min(1, 2000 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok({ url: cv.toDataURL('image/jpeg', 0.82), w: cv.width, h: cv.height, k: k }); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }

  /* ---------- 화면 ---------- */
  function sync() { var root = $('tab-mon'); if (!root) return; wire(); var gm = M().gm();
    root.querySelectorAll('[data-mview]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mview') === view); });
    $('monListWrap').hidden = view !== 'list'; $('encWrap').hidden = view !== 'enc' || !gm; if (view === 'enc' && gm) { if (!loaded) { $('encBody').innerHTML = '<p class="hint">읽는 중이에요.</p>'; Promise.all([load(), M().load()]).then(render); } else render(); } }
  function render() { var box = $('encBody'); if (!box) return;
    if (!enc) { box.innerHTML = '<div class="mbar"><button id="encNew">+ 새 조우</button><span class="hint" id="encMsg"></span></div>' + (list.length ? '<div class="enclist">' + list.map(function (e) { var n = (e.toks || []).length; return '<div class="encrow" data-eid="' + esc(e.id) + '"><b>' + esc(e.name || '이름 없음') + '</b><span>일행 ' + (e.pn || 4) + '명 · ' + (e.plv || 1) + '레벨 · 몬스터 ' + n + '마리' + (e.hasMap ? ' · 맵 있음' : '') + (e.by ? ' · ' + esc(e.by) : '') + '</span></div>'; }).join('') + '</div>' : '<p class="hint">아직 저장한 조우가 없어요. 「+ 새 조우」로 시작해 보세요.</p>'); return; }
    var h = '<div class="mbar"><button class="ghost" id="encBack">← 목록</button><input type="text" id="encName" value="' + esc(enc.name) + '" placeholder="조우 이름"><label>일행 <input type="number" id="encPn" min="1" max="10" value="' + esc(enc.pn) + '">명</label><label><input type="number" id="encPlv" min="1" max="30" value="' + esc(enc.plv) + '">레벨</label>' +
      '<span class="sp"></span><button id="encSave"' + (dirty ? ' class="need"' : '') + '>저장</button><button class="ghost" id="encTok" title="올린 몬스터를 맵툴 토큰(.rptok) 묶음으로 받아요">토큰 묶음 받기</button>' + (enc.id ? '<button class="ghost" id="encDel">지우기</button>' : '') + '</div>' +
      '<div id="encXp" class="encxp"></div><p class="hint" id="encMsg"></p>' +
      '<div class="encgrid"><div class="encside"><div class="encmap"><b>맵</b><button class="mini" id="encMapPick">그림 올리기</button>' + '<button class="mini ghost" id="encMapDel">빼기</button><input type="file" id="encMapFile" accept="image/*" hidden>' +
      '<label>한 칸 <input type="number" id="encCell" min="8" max="400" value="' + esc(enc.cell) + '">px</label><label>가로 밀기 <input type="number" id="encOx" value="' + esc(enc.ox) + '"></label><label>세로 밀기 <input type="number" id="encOy" value="' + esc(enc.oy) + '"></label>' +
      '</div>' +
      '<div class="encadd"><b>몬스터 올리기</b> <span class="hint" id="encPickN"></span><input type="text" id="encQ" placeholder="이름 검색 (비워 두면 목록)" value="' + esc(pickQ) + '">' +
      '<div class="encfil"><label>레벨 <input type="number" id="encLo" min="1" max="35" placeholder="부터" value="' + esc(pickLo) + '">~<input type="number" id="encHi" min="1" max="35" placeholder="까지" value="' + esc(pickHi) + '"></label>' +
      '<select id="encRole">' + [['', '역할 전체'], ['Skirmisher', '척후'], ['Brute', '맹수'], ['Soldier', '병사'], ['Lurker', '잠복'], ['Controller', '제어'], ['Artillery', '포격'], ['Minion', '졸개'], ['Elite', '정예'], ['Solo', '단독']].map(function (o) { return '<option value="' + o[0] + '"' + (pickRole === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<select id="encSrc">' + [['', '전체'], ['mine', '만든 것'], ['pack', '자료집']].map(function (o) { return '<option value="' + o[0] + '"' + (pickSrc === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div><div id="encPick" class="encpick"></div></div><div id="encRoster" class="encroster"></div><div id="encSel"></div></div>' +
      '<div class="encmain"><div class="enczoom"><button class="mini ghost" id="encWide" title="옆 칸을 접고 판을 넓게">' + (wide ? '옆 칸 펴기' : '넓게 보기') + '</button><span class="sp"></span><button class="mini ghost" id="encZo" title="작게">−</button><input type="range" id="encZoom" min="0.1" max="3" step="0.05" value="' + zoom + '"><button class="mini ghost" id="encZi" title="크게">+</button><b id="encZv"></b><button class="mini ghost" id="encFit" title="판 너비에 맞추기">너비 맞춤</button><button class="mini ghost" id="encFitAll" title="맵 전체가 한눈에 보이게">전체 보기</button><button class="mini ghost" id="encZ1" title="원래 크기">100%</button></div>' +
      '<div class="encboardwrap"><div id="encBoard" class="encboard"></div></div><p class="hint">Ctrl + 휠(터치패드는 두 손가락 벌리기)로도 크기를 바꿀 수 있어요. 휠만 굴리면 위아래로 움직여요.</p></div></div>';
    box.innerHTML = h; var gr = box.querySelector('.encgrid'); if (gr) gr.classList.toggle('wide', wide); drawXp(); drawPick(); drawRoster(); drawBoard(); drawSel(); }
  function drawXp() { var b = budget(), box = $('encXp'); if (!box) return; box.innerHTML = '<span><small>XP 합계</small><b>' + b.tot.toLocaleString() + '</b></span><span><small>기준 (일행 레벨 × 인원)</small><b>' + b.target.toLocaleString() + '</b></span><span><small>조우 레벨</small><b>' + (b.lv || '-') + '</b></span>' +
      (b.lab ? '<span class="d' + (b.diff <= -2 ? ' easy' : b.diff <= 1 ? ' std' : b.diff <= 3 ? ' hard' : ' dead') + '"><small>난이도</small><b>' + b.lab + ' (' + (b.diff >= 0 ? '+' : '') + b.diff + ')</b></span>' : '') + '<span><small>몬스터</small><b>' + enc.toks.length + '마리</b></span>'; }
  function drawPick() { var box = $('encPick'); if (!box) return; var q = pickQ.trim().toLowerCase(), all = M().all(), L = [], MAXP = 150;
    for (var i = 0; i < all.length; i++) { var m = all[i]; if (pickSrc === 'mine' && m._pack) continue; if (pickSrc === 'pack' && !m._pack) continue;
      if (!q) { if (pickLo && +m.lv < +pickLo) continue; if (pickHi && +m.lv > +pickHi) continue; } /* 이름으로 찾을 때는 레벨 범위를 보지 않는다 */
      if (pickRole) { if (pickRole === 'Elite' || pickRole === 'Solo') { if (m.tier !== pickRole) continue; } else if (pickRole === 'Minion') { if (m.tier !== 'Minion' && m.role !== 'Minion') continue; } else if (m.role !== pickRole) continue; }
      var s = M().shown(m); if (q && (m.n + ' ' + s.n).toLowerCase().indexOf(q) < 0) continue; L.push([m, s]); }
    L.sort(function (a, b) { return (+a[0].lv - +b[0].lv) || (a[1].n < b[1].n ? -1 : 1); });
    var nn = $('encPickN'); if (nn) nn.textContent = L.length + '마리' + (L.length > MAXP ? ' · 앞의 ' + MAXP + '마리만' : '') + (q && (pickLo || pickHi) ? ' · 이름 검색은 모든 레벨에서' : '');
    box.innerHTML = L.length ? L.slice(0, MAXP).map(function (x) { var s = x[1]; return '<div class="mrow r-' + esc(String(s.role || '').toLowerCase()) + '" data-addm="' + esc(x[0].id) + '" title="눌러서 판에 올리기"><i>' + (s.lv || 1) + '</i><b>' + esc(s.n) + '</b><span>' + (s.tier && s.tier !== 'Standard' ? M().TIER_KO[s.tier] + ' ' : '') + (s.role === 'Minion' ? '' : (M().ROLE_KO[s.role] || '')) + ' · ' + xpOf(s).toLocaleString() + '</span></div>'; }).join('') : '<p class="hint">' + (all.length ? '조건에 맞는 몬스터가 없어요. 레벨 범위를 넓혀 보세요.' : '아직 몬스터가 없어요. 「몬스터 목록」에서 만들거나 자료집을 불러와 주세요.') + '</p>'; }
  function drawRoster() { var box = $('encRoster'); if (!box) return; var cnt = {}; enc.toks.forEach(function (t) { cnt[t.m] = (cnt[t.m] || 0) + 1; });
    var ks = Object.keys(cnt); box.innerHTML = ks.length ? '<b>올린 몬스터</b>' + ks.map(function (k) { var m = enc.mons[k]; return '<div class="encr"><span>' + esc(m.n) + ' <small>' + (m.lv || 1) + '레벨 · XP ' + xpOf(m).toLocaleString() + '</small></span><i>×' + cnt[k] + '</i><button class="mini ghost" data-more="' + k + '" title="한 마리 더">+</button></div>'; }).join('') : ''; }
  function drawSel() { var box = $('encSel'); if (!box) return; var t = enc.toks[selTok]; if (!t) { box.innerHTML = ''; return; } var m = enc.mons[t.m];
    box.innerHTML = '<div class="mbar"><b>' + esc(label(selTok)) + '</b><span class="sp"></span><button class="mini ghost" data-tdel="1">판에서 빼기</button></div>' + M().block(m); }
  function drawBoard() { var bd = $('encBoard'); if (!bd) return; var c = Math.max(8, +enc.cell || 50), W = enc.w || 1000, H = enc.h || 700;
    bd.style.width = W + 'px'; bd.style.height = H + 'px'; bd.style.transform = 'scale(' + zoom + ')'; bd.style.marginRight = (W * zoom - W) + 'px'; bd.style.marginBottom = (H * zoom - H) + 'px'; bd.parentNode.style.height = Math.min(window.innerHeight * (wide ? 0.86 : 0.78), H * zoom + 4) + 'px';
    var zv = $('encZv'); if (zv) zv.textContent = Math.round(zoom * 100) + '%'; var zr = $('encZoom'); if (zr && +zr.value !== zoom) zr.value = zoom;
    bd.style.backgroundImage = 'linear-gradient(to right, rgba(0,0,0,.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.28) 1px, transparent 1px)' + (mapUrl ? ', url(' + mapUrl + ')' : '');
    bd.style.backgroundSize = c + 'px ' + c + 'px, ' + c + 'px ' + c + 'px' + (mapUrl ? ', ' + W + 'px ' + H + 'px' : ''); bd.style.backgroundPosition = (enc.ox || 0) + 'px ' + (enc.oy || 0) + 'px, ' + (enc.ox || 0) + 'px ' + (enc.oy || 0) + 'px' + (mapUrl ? ', 0 0' : ''); bd.style.backgroundRepeat = 'repeat, repeat' + (mapUrl ? ', no-repeat' : '');
    bd.innerHTML = (mapUrl ? '' : '<div class="encdrophint">맵 그림을 여기로 끌어다 놓거나 「그림 올리기」를 눌러 주세요</div>') + enc.toks.map(function (t, i) { var m = enc.mons[t.m] || {}, s = t.s || 1, col = M().ROLE_COL[m.role] || '#555';
      return '<div class="etok' + (i === selTok ? ' on' : '') + (m.tier === 'Elite' ? ' elite' : m.tier === 'Solo' ? ' solo' : m.tier === 'Minion' || m.role === 'Minion' ? ' minion' : '') + '" data-ti="' + i + '" style="left:' + ((enc.ox || 0) + t.x * c) + 'px;top:' + ((enc.oy || 0) + t.y * c) + 'px;width:' + (s * c) + 'px;height:' + (s * c) + 'px;background:' + (m.img ? 'url(' + m.img + ') center/cover ' : '') + col + ';font-size:' + Math.max(9, Math.round(c * 0.26)) + 'px" title="' + esc(label(i)) + '"><span' + (m.img ? ' class="cap"' : '') + '>' + esc(label(i)) + '</span></div>'; }).join(''); }
  function setZoom(z, keep) { var w = document.querySelector('.encboardwrap'), old = zoom; zoom = Math.max(0.1, Math.min(3, Math.round(z * 100) / 100)); if (zoom === old) return;
    /* 보고 있던 자리(가운데 또는 마우스 아래)가 그대로 있게 스크롤을 맞춘다 */
    var fx = keep ? keep.x : (w ? w.clientWidth / 2 : 0), fy = keep ? keep.y : (w ? w.clientHeight / 2 : 0), px = w ? (w.scrollLeft + fx) / old : 0, py = w ? (w.scrollTop + fy) / old : 0; drawBoard(); if (w) { w.scrollLeft = px * zoom - fx; w.scrollTop = py * zoom - fy; } }
  function fit(all) { var w = document.querySelector('.encboardwrap'); if (!w || !enc) return; var zw = (w.clientWidth - 4) / (enc.w || 1000), zh = (window.innerHeight * (wide ? 0.86 : 0.78) - 4) / (enc.h || 700); zoom = 0; setZoom(Math.floor((all ? Math.min(zw, zh) : zw) * 100) / 100); w.scrollLeft = w.scrollTop = 0; }
  function addMon(mid, like) { var mi; if (like != null) mi = +like; else { var m = M().all().filter(function (x) { return x.id === mid; })[0]; if (!m) return; var snap = M().clean(M().shown(m)); delete snap.id; var key = JSON.stringify([snap.n, snap.lv, snap.hp, snap.xp]);
      mi = enc.mons.findIndex(function (x) { return JSON.stringify([x.n, x.lv, x.hp, x.xp]) === key; }); if (mi < 0) { enc.mons.push(snap); mi = enc.mons.length - 1; } }
    var s = sizeOf(enc.mons[mi]), c = Math.max(8, +enc.cell || 50), cols = Math.max(1, Math.floor(((enc.w || 1000) - (enc.ox || 0)) / c)), rows = Math.max(1, Math.floor(((enc.h || 700) - (enc.oy || 0)) / c)), occ = {};
    enc.toks.forEach(function (t) { for (var a = 0; a < (t.s || 1); a++) for (var b = 0; b < (t.s || 1); b++) occ[(t.x + a) + ',' + (t.y + b)] = 1; });
    var free = function (x, y) { for (var a = 0; a < s; a++) for (var b = 0; b < s; b++) if (occ[(x + a) + ',' + (y + b)]) return false; return true; }, px = 1, py = 1, found = false;
    for (var y = 1; y < rows - s && !found; y++) for (var x = 1; x < cols - s && !found; x++) if (free(x, y)) { px = x; py = y; found = true; }
    enc.toks.push({ m: mi, x: px, y: py, s: s }); selTok = enc.toks.length - 1; touch(); drawXp(); drawRoster(); drawBoard(); drawSel(); }
  /* 끌어서 옮기기(마우스 · 손가락) */
  var drag = null;
  function wire() { var root = $('tab-mon'); if (!root || root._ew) return; root._ew = 1;
    root.addEventListener('click', async function (ev) { var t = ev.target, mv = t.closest('[data-mview]');
      if (mv) { view = mv.getAttribute('data-mview'); localStorage.setItem('d4e_monview', view); sync(); return; }
      if (!t.closest('#encWrap')) return;
      var row = t.closest('[data-eid]'), am = t.closest('[data-addm]'), more = t.closest('[data-more]');
      if (t.id === 'encNew') { enc = blank(); mapUrl = ''; mapDirty = false; selTok = -1; dirty = false; pickDefault(); render(); }
      else if (row) open(row.getAttribute('data-eid'));
      else if (t.id === 'encBack') { if (dirty && !confirm('저장하지 않은 것이 있어요. 목록으로 갈까요?')) return; enc = null; render(); }
      else if (am) addMon(am.getAttribute('data-addm'));
      else if (more) addMon(null, more.getAttribute('data-more'));
      else if (t.closest('[data-tdel]')) { if (enc.toks[selTok]) { enc.toks.splice(selTok, 1); selTok = -1; touch(); drawXp(); drawRoster(); drawBoard(); drawSel(); } }
      else if (t.id === 'encMapPick') $('encMapFile').click();
      else if (t.id === 'encZi') setZoom(zoom * 1.2); else if (t.id === 'encZo') setZoom(zoom / 1.2); else if (t.id === 'encZ1') setZoom(1); else if (t.id === 'encFit') fit(false); else if (t.id === 'encFitAll') fit(true)
      else if (t.id === 'encWide') { wide = !wide; render(); fit(false); }
      else if (t.id === 'encMapDel') { mapUrl = ''; mapDirty = true; touch(); drawBoard(); }
      else if (t.id === 'encSave') { t.disabled = true; try { await save(); render(); msg('저장했어요.'); } catch (e) { t.disabled = false; alert('저장하지 못했어요: ' + e.message + (mapUrl ? '\n맵 그림이 너무 크면 저장이 안 될 수 있어요.' : '')); } }
      else if (t.id === 'encDel') { if (!confirm('이 조우를 지울까요? 되돌릴 수 없어요.')) return; try { await D4EShare.del(enc.id, KIND); await D4EShare.del(enc.id, MAPKIND).catch(function () {}); list = list.filter(function (x) { return x.id !== enc.id; }); enc = null; render(); } catch (e) { alert('지우지 못했어요: ' + e.message); } }
      else if (t.id === 'encTok') { if (!enc.toks.length) { msg('판에 올린 몬스터가 없어요.'); return; } t.disabled = true; msg('토큰을 만드는 중…');
        try { await window.D4EMt.loadZip(); var zip = new window.JSZip(), used = {}; for (var i = 0; i < enc.toks.length; i++) { var nm = label(i), fn = M().fileName(nm), k = fn, c = 2; while (used[k]) k = fn + '_' + (c++); used[k] = 1; zip.file(k + '.rptok', await M().tokenBlob(enc.mons[enc.toks[i].m], nm)); }
          M().download(await zip.generateAsync({ type: 'blob' }), M().fileName(enc.name || 'encounter') + '_tokens.zip'); msg('토큰 ' + enc.toks.length + '개를 묶어서 받았어요. 압축을 풀어 맵 위로 끌어다 놓으면 돼요.'); } catch (e) { msg('만들지 못했어요: ' + e.message); } t.disabled = false; } });
    root.addEventListener('input', function (ev) { var t = ev.target; if (!enc || !t.closest('#encWrap')) return;
      if (t.id === 'encName') { enc.name = t.value; touch(); } else if (t.id === 'encPn') { enc.pn = +t.value || 4; touch(); drawXp(); } else if (t.id === 'encPlv') { enc.plv = +t.value || 1; touch(); drawXp(); if (pickAuto) { pickDefault(); if ($('encLo')) $('encLo').value = pickLo; if ($('encHi')) $('encHi').value = pickHi; drawPick(); } }
      else if (t.id === 'encCell') { enc.cell = Math.max(8, +t.value || 50); touch(); drawBoard(); } else if (t.id === 'encOx') { enc.ox = +t.value || 0; touch(); drawBoard(); } else if (t.id === 'encOy') { enc.oy = +t.value || 0; touch(); drawBoard(); }
      else if (t.id === 'encZoom') { setZoom(+t.value || 1); } else if (t.id === 'encQ') { pickQ = t.value; drawPick(); } else if (t.id === 'encLo') { pickLo = t.value; pickAuto = false; drawPick(); } else if (t.id === 'encHi') { pickHi = t.value; pickAuto = false; drawPick(); } });
    var useMap = function (f) { if (!f || !enc) return; if (!/^image\//.test(f.type || '') && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name || '')) { msg('그림 파일만 올릴 수 있어요.'); return; } msg('그림을 읽는 중…');
      readMap(f).then(function (r) { mapUrl = r.url; enc.w = r.w; enc.h = r.h; mapDirty = true; touch(); drawBoard(); fit(false); msg('맵을 올렸어요 (' + r.w + '×' + r.h + (r.k < 1 ? ', 줄임' : '') + '). 「한 칸」 크기와 밀기로 격자를 그림에 맞춰 주세요.'); }, function (e) { msg('그림을 읽지 못했어요: ' + e.message); }); };
    root.addEventListener('change', function (ev) { var t = ev.target; if (!enc) return;
      if (t.id === 'encMapFile') { useMap(t.files && t.files[0]); t.value = ''; } else if (t.id === 'encRole') { pickRole = t.value; drawPick(); } else if (t.id === 'encSrc') { pickSrc = t.value; drawPick(); } });
    /* 맵 그림을 판 위로 끌어다 놓기 */
    var overBoard = function (ev) { return enc && ev.target.closest && ev.target.closest('.encboardwrap'); }, hasFile = function (ev) { var dt = ev.dataTransfer; return dt && Array.prototype.indexOf.call(dt.types || [], 'Files') >= 0; };
    root.addEventListener('dragover', function (ev) { var w = overBoard(ev); if (!w || !hasFile(ev)) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; w.classList.add('drop'); });
    root.addEventListener('dragleave', function (ev) { var w = ev.target.closest && ev.target.closest('.encboardwrap'); if (w && !w.contains(ev.relatedTarget)) w.classList.remove('drop'); });
    root.addEventListener('drop', function (ev) { var w = overBoard(ev); if (!w || !hasFile(ev)) return; ev.preventDefault(); w.classList.remove('drop'); useMap(ev.dataTransfer.files && ev.dataTransfer.files[0]); });
    root.addEventListener('pointerdown', function (ev) { var el = ev.target.closest('.etok'); if (!el || !enc) return; var i = +el.getAttribute('data-ti'), t = enc.toks[i]; if (!t) return; ev.preventDefault();
      selTok = i; drag = { i: i, sx: ev.clientX, sy: ev.clientY, x0: t.x, y0: t.y, el: el, moved: false }; try { el.setPointerCapture(ev.pointerId); } catch (e) {} root.querySelectorAll('.etok.on').forEach(function (x) { x.classList.remove('on'); }); el.classList.add('on'); });
    root.addEventListener('pointermove', function (ev) { if (!drag) return; var c = Math.max(8, +enc.cell || 50), dx = (ev.clientX - drag.sx) / zoom, dy = (ev.clientY - drag.sy) / zoom, t = enc.toks[drag.i]; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      var nx = drag.x0 + Math.round(dx / c), ny = drag.y0 + Math.round(dy / c); if (nx !== t.x || ny !== t.y) { t.x = nx; t.y = ny; drag.el.style.left = ((enc.ox || 0) + nx * c) + 'px'; drag.el.style.top = ((enc.oy || 0) + ny * c) + 'px'; } });
    root.addEventListener('wheel', function (ev) { var w = ev.target.closest && ev.target.closest('.encboardwrap'); if (!w || !enc || !(ev.ctrlKey || ev.metaKey)) return; ev.preventDefault(); var r = w.getBoundingClientRect(); setZoom(zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12), { x: ev.clientX - r.left, y: ev.clientY - r.top }); }, { passive: false });
    var up = function () { if (!drag) return; if (drag.moved) touch(); drag = null; drawSel(); };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); }
  window.D4EEnc = { sync: sync };
})();
