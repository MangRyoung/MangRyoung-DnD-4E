/* 하우스룰 · 자작 요소.
 * 공유 DB 의 kind dnd4e_house 에 문서 하나 = 요소 하나: {el: 요소, off: 쓰지 않음, by, at}.
 * id 가 공식 요소와 같으면 덮어쓰고, 문서를 지우면 원래 요소로 돌아온다.
 * 여기 들어가는 것은 팀이 직접 적은 내용뿐이다. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var A = function () { return window.D4EApp; };
  var KIND = (window.D4E_CONFIG || {}).houseKind || 'dnd4e_house';
  var docs = {}, orig = {}, editing = null;
  /* 세팅(룰 세트): 캠페인마다 메이킹 룰과 하우스룰이 다를 수 있다. kind dnd4e_cfg 의 set_* 문서 = {name, points, level, memo}.
   * 하우스룰 문서의 set 이 비어 있으면 모든 세팅 공통, 있으면 그 세팅에서만 적용된다. */
  var CFG = 'dnd4e_cfg', PRESETS = window.D4E_PRESETS || {}, sets = presetSets(), glossary = (window.D4E_GLOSSARY || []).slice(), presetIds = {}, viewSet = localStorage.getItem('d4e_set') || 'set_bidan', appliedSet = null;
  function presetSets() { var o = {}; Object.keys(window.D4E_PRESETS || {}).forEach(function (id) { o[id] = JSON.parse(JSON.stringify(window.D4E_PRESETS[id].set)); }); if (!Object.keys(o).length) o.set_bidan = { name: '비단화살 룰', points: 22, level: 1, memo: '' }; return o; }
  var DEFAULT_SETS = presetSets();
  /* 세팅 기본 조정: 공식 요소를 통째로 베끼지 않고 달라지는 부분만 얹는다.
   * patch = {note 하우스룰 글, rAdd 더할 규칙, level 파워 레벨 바꾸기} */
  function applyPatch(o, p) {
    var e = JSON.parse(JSON.stringify(o)); e.sp = e.sp || {};
    if (p.note) e.sp['하우스룰'] = p.note;
    if (p.rAdd) e.r = (e.r || []).concat(JSON.parse(JSON.stringify(p.rAdd)));
    if (p.level) { var lv = String(p.level); e.cat = (e.cat || []).filter(function (c) { return !/^\d+$/.test(c); }).concat([lv]); e.sp['Level'] = lv; if (e.sp['Display']) e.sp['Display'] = e.sp['Display'].replace(/\d+\s*$/, lv); }
    return e;
  }
  function presetTargets(db, m) { return (db.byType[m.t] || []).filter(function (e) { return m.n ? e.n === m.n : e.n.indexOf(m.has) >= 0; }); }
  function setOf(id) { return sets[id] || sets[Object.keys(sets)[0]] || DEFAULT_SETS.set_bidan; }
  function setIds() { return Object.keys(sets).sort(function (a, b) { return sets[a].name < sets[b].name ? -1 : 1; }); }

  var RULE_FIELDS = {
    statadd: [['name', '수치 이름', 'Hit Points'], ['value', '값', '+2'], ['type', '보너스 종류 (같은 종류는 큰 것만)', 'Feat'], ['requires', '조건', 'Paragon Tier']],
    grant: [['name', '줄 요소의 이름 또는 id', ''], ['type', '그 요소의 종류', 'Power'], ['requires', '조건', '']],
    select: [['type', '고를 종류', 'Feat'], ['number', '개수', '1'], ['category', '분류 필터 (쉼표 = 그리고, | = 또는)', '$$CLASS,utility,2'], ['name', '칸 이름', ''], ['optional', '선택 사항이면 true', '']],
    textstring: [['name', '이름', ''], ['value', '글', '']],
    modify: [['name', '고칠 요소 이름', ''], ['type', '그 요소의 종류', 'Power'], ['field', '덧붙일 칸 이름', ''], ['value', '내용', '']],
    replace: [], statalias: [['name', '수치 이름', ''], ['alias', '별칭', '']], drop: [], suggest: [['name', '추천 요소', ''], ['type', '종류', '']]
  };
  var RULE_KO = { statadd: '수치 더하기', grant: '요소 주기', select: '고르게 하기', textstring: '글 값', modify: '다른 요소 고치기', replace: '교체 · 재훈련', statalias: '수치 별칭', drop: '빼기', suggest: '추천' };

  /* ---------- 불러와 얹기 ---------- */
  function apply(db, setId) {
    Object.keys(orig).forEach(function (id) { if (orig[id]) db.put(orig[id]); else db.remove(id); });
    orig = {}; appliedSet = setId || appliedSet || viewSet;
    Object.keys(docs).forEach(function (id) {
      var d = docs[id]; if (d.set && d.set !== appliedSet) return;
      if (d.off) orig[id] = db.remove(id);
      else if (d.el && d.el.id === id) orig[id] = db.put(d.el) || null;
    });
    presetIds = {};
    ((PRESETS[appliedSet] || {}).house || []).forEach(function (h) {
      presetTargets(db, h.m).forEach(function (t) { if (docs[t.id] || presetIds[t.id]) return; presetIds[t.id] = h.patch.note || '조정'; orig[t.id] = db.put(applyPatch(t, h.patch)) || null; });
    });
  }
  async function load(db) {
    var rows = await window.D4EShare.list(KIND);
    docs = {};
    rows.forEach(function (r) { if (r.data) docs[r.id] = r.data; });
    sets = presetSets();
    try { (await window.D4EShare.list(CFG)).forEach(function (r) {
      if (/^set_/.test(r.id) && r.data && r.data.name) sets[r.id] = Object.assign({}, sets[r.id] || {}, r.data);
      if (r.id === 'glossary' && r.data && typeof r.data.text === 'string') glossary = parseGloss(r.data.text);
    }); } catch (e) {}
    if (!sets[viewSet]) viewSet = setIds()[0];
    if (db) apply(db, appliedSet);
    return Object.keys(docs).length;
  }

  /* ---------- 목록 ---------- */
  function renderList() {
    var box = $('hList'), ids = Object.keys(docs).filter(function (id) { return !docs[id].set || docs[id].set === viewSet; }), app = A();
    ids.sort(function (a, b) { var x = (docs[a].el || {}).n || a, y = (docs[b].el || {}).n || b; return x < y ? -1 : 1; });
    var pre = appliedSet === viewSet ? Object.keys(presetIds) : [];
    $('hCount').textContent = (ids.length + pre.length) + '개';
    box.innerHTML = ids.length || pre.length ? '' : '<p class="hint">아직 없어요.</p>';
    pre.forEach(function (id) { var e = app.db().byId[id]; if (!e) return; var row = document.createElement('div'); row.className = 'hrow';
      row.innerHTML = '<div class="lab">' + app.esc(e.n) + '<span class="badge">세팅 기본 조정</span><small>' + app.esc(app.typeKo(e.t)) + ' · ' + app.esc(presetIds[id]) + '</small></div>';
      var b = document.createElement('button'); b.className = 'mini ghost'; b.textContent = '고치기'; b.onclick = function () { edit(JSON.parse(JSON.stringify(e)), false, false); }; row.appendChild(b); box.appendChild(row); });
    ids.forEach(function (id) {
      var d = docs[id], e = d.el || orig[id] || { n: id, t: '' }, row = document.createElement('div'); row.className = 'hrow';
      var kind = (d.off ? '쓰지 않음' : (orig[id] || (app.db().byId[id] && !d.el)) ? '공식 요소를 고침' : d.el && /^ID_HOUSE_/.test(id) ? '새로 만듦' : '공식 요소를 고침') + (d.set ? '' : ' · 공통');
      row.innerHTML = '<div class="lab">' + app.esc(e.n) + '<span class="badge">' + kind + '</span><small>' + app.esc(app.typeKo(e.t)) + (d.by ? ' · ' + app.esc(d.by) : '') + '</small></div>';
      if (!d.off) { var b = document.createElement('button'); b.className = 'mini'; b.textContent = '고치기'; b.onclick = function () { edit(JSON.parse(JSON.stringify(d.el)), false, d.set ? false : true); }; row.appendChild(b); }
      var x = document.createElement('button'); x.className = 'mini ghost'; x.textContent = d.off ? '다시 쓰기' : orig[id] ? '원래대로' : '지우기';
      x.onclick = async function () {
        if (!confirm('「' + e.n + '」: ' + x.textContent + ' 할까요? 팀 모두에게 반영돼요.')) return;
        try { await window.D4EShare.del(id, KIND); await refresh(); } catch (err) { alert('하지 못했어요: ' + err.message); }
      };
      row.appendChild(x); box.appendChild(row);
    });
  }
  async function refresh() {
    var app = A();
    try { await load(app.db()); } catch (e) { $('hList').innerHTML = '<p class="hint">읽지 못했어요: ' + app.esc(e.message) + '</p>'; return; }
    renderSets(); renderList(); app.houseChanged();
  }

  /* ---------- 용어집 ---------- */
  function parseGloss(text) { var out = [], seen = {}; String(text).split(/\n/).forEach(function (l) { var i = l.indexOf('\t'); if (i < 0) i = l.indexOf('='); if (i < 0) return; var en = l.slice(0, i).trim(), ko = l.slice(i + 1).trim(); if (en && ko && !seen[en.toLowerCase()]) { seen[en.toLowerCase()] = 1; out.push([en, ko]); } }); return out; }
  function glossText() { return glossary.map(function (p) { return p[0] + '\t' + p[1]; }).join('\n'); }

  /* ---------- 세팅 ---------- */
  function renderSets() {
    var sel = $('setSel'), cur = setOf(viewSet); sel.innerHTML = '';
    setIds().forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = sets[id].name; if (id === viewSet) o.selected = true; sel.appendChild(o); });
    $('setName').value = cur.name || ''; $('cfgPoints').value = cur.points != null ? cur.points : 22; $('setLevel').value = cur.level || 1; $('setMemo').value = cur.memo || '';
    $('setGold').value = cur.gold || 0; $('setMinEnh').value = cur.minEnh || 0; $('setInh').checked = !!cur.inherent; $('setSpec').checked = !!cur.spec; $('setHide').value = (cur.hide || []).join(', '); $('setBans').value = cur.bans || '';
    $('glossText').value = glossText(); $('glossN').textContent = glossary.length + '개';
  }
  async function saveSet(id) {
    var n = Math.round(+$('cfgPoints').value), lv = Math.round(+$('setLevel').value) || 1, name = $('setName').value.trim();
    if (!name) { alert('세팅 이름을 적어 주세요.'); return; }
    if (!(n >= 0 && n <= 99)) { alert('포인트는 0~99 사이로 적어 주세요.'); return; }
    var data = { name: name, points: n, level: Math.max(1, Math.min(30, lv)), memo: $('setMemo').value, gold: Math.max(0, Math.round(+$('setGold').value) || 0), minEnh: Math.max(0, Math.round(+$('setMinEnh').value) || 0), inherent: $('setInh').checked, spec: $('setSpec').checked,
      hide: $('setHide').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), bans: $('setBans').value, at: Date.now() };
    try { await window.D4EShare.put(id, data, CFG); sets[id] = data; viewSet = id; localStorage.setItem('d4e_set', id); renderSets(); renderList(); A().houseChanged(); $('cfgMsg').textContent = '저장했어요. 팀 모두에게 반영돼요.'; }
    catch (e) { $('cfgMsg').textContent = '저장하지 못했어요: ' + e.message; }
  }

  /* ---------- 고치는 칸 ---------- */
  function newId(type) { return 'ID_HOUSE_' + String(type || 'ELEMENT').toUpperCase().replace(/[^A-Z0-9]+/g, '_') + '_' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function blank() { return { id: '', n: '', t: 'Feat', src: ['하우스룰'], sp: {}, r: [], body: '' }; }

  function edit(el, isNew, common) {
    var app = A(), db = app.db(); editing = el; el.sp = el.sp || {}; el.r = el.r || [];
    var over = !isNew && el.id && (orig[el.id] || (!docs[el.id] && db.byId[el.id]));
    var box = $('hEdit'), types = Object.keys(db.byType).sort();
    var h = '<h3 style="margin-top:0">' + (isNew ? '새 요소' : over ? '공식 요소 고치기' : '고치기') + (el.id ? ' <span class="hint">' + app.esc(el.id) + '</span>' : '') + '</h3><div class="form">';
    h += '<label><input type="checkbox" id="hfAll"> 모든 세팅에 공통으로 적용 <span class="hint">(끄면 「' + app.esc(setOf(viewSet).name) + '」에서만)</span></label>';
    h += '<label>이름</label><input type="text" id="hfN">';
    h += '<label>종류</label><input type="text" id="hfT" list="hTypes"><datalist id="hTypes">' + types.map(function (t) { return '<option value="' + app.esc(t) + '">' + app.esc(app.typeKo(t)) + '</option>'; }).join('') + '</datalist>';
    h += '<div id="hfPw" class="pwhelp" hidden><b>파워 설정</b><div class="rf"><label>클래스<select id="hfPc"></select></label><label>사용<select id="hfPu"><option value="at">무한</option><option value="enc">조우</option><option value="day">일일</option></select></label>' +
      '<label>갈래<select id="hfPk"><option value="attack">공격</option><option value="utility">활용</option></select></label><label>레벨<input type="number" id="hfPl" min="1" max="30" value="1"></label></div>' +
      '<p class="hint">저장할 때 분류 꼬리표와 「Power Usage · Display · Level」 칸이 여기에 맞춰져서, 그 클래스의 해당 레벨 파워 칸 후보에 나와요.</p></div>';
    h += '<label>출처 (쉼표로 나눔)</label><input type="text" id="hfS">';
    h += '<label>선행 조건 (글로 보여 주기만 해요)</label><input type="text" id="hfP">';
    h += '<label>분류 꼬리표 (쉼표로 나눔 · 고르기 칸의 필터가 이것을 봐요)</label><input type="text" id="hfC">';
    h += '<label>풍미 글</label><input type="text" id="hfF">';
    h += '<label>설명</label><textarea id="hfB"></textarea>';
    h += '<label>칸 (시트와 고르기 창에 「이름: 내용」으로 보여요)</label><div id="hfSp"></div><button class="mini ghost" id="hfSpAdd">칸 더하기</button>';
    h += '<label>규칙 (시트 계산에 쓰여요)</label><div id="hfR"></div><button class="mini ghost" id="hfRAdd">규칙 더하기</button>';
    h += '<div class="acts"><button id="hfSave">저장해서 팀에 반영</button><button id="hfPrev" class="ghost">미리 보기</button><button id="hfCancel" class="ghost">그만두기</button></div><div id="hfCard" style="margin-top:10px"></div></div>';
    box.innerHTML = h;
    $('hfAll').checked = !!common;
    var USE = { at: ['ID_INTERNAL_CATEGORY_AT-WILL', 'ID_INTERNAL_CATEGORY_AT-WILL_USAGE', 'At-Will'], enc: ['ID_INTERNAL_CATEGORY_ENCOUNTER', 'ID_INTERNAL_CATEGORY_ENCOUNTER_USAGE', 'Encounter'], day: ['ID_INTERNAL_CATEGORY_DAILY', 'ID_INTERNAL_CATEGORY_DAILY_USAGE', 'Daily'] };
    var pc = $('hfPc'); pc.innerHTML = '<option value="">(정하지 않음)</option>' + (db.byType['Class'] || []).slice().sort(function (a, b) { return a.n < b.n ? -1 : 1; }).map(function (c) { return '<option value="' + app.esc(c.id) + '">' + app.esc(app.nm(c)) + '</option>'; }).join('');
    var cats0 = el.cat || [];
    cats0.forEach(function (c) { if (db.byId[c] && db.byId[c].t === 'Class') pc.value = c; if (/^\d+$/.test(c)) $('hfPl').value = c; });
    $('hfPu').value = cats0.indexOf(USE.day[1]) >= 0 ? 'day' : cats0.indexOf(USE.enc[1]) >= 0 ? 'enc' : 'at';
    $('hfPk').value = cats0.indexOf('ID_INTERNAL_CATEGORY_UTILITY') >= 0 ? 'utility' : 'attack';
    var showPw = function () { $('hfPw').hidden = $('hfT').value.trim() !== 'Power'; }; $('hfT').oninput = showPw;
    $('hfN').value = el.n || ''; $('hfT').value = el.t || ''; showPw(); $('hfS').value = (el.src || []).join(', '); $('hfP').value = el.pp || el.pre || '';
    $('hfC').value = (el.cat || []).join(', '); $('hfF').value = el.fl || ''; $('hfB').value = el.body || '';
    var sp = Object.keys(el.sp).map(function (k) { return [k, el.sp[k]]; });
    function drawSp() {
      var b = $('hfSp'); b.innerHTML = '';
      sp.forEach(function (kv, i) {
        var row = document.createElement('div'); row.className = 'kv';
        var k = document.createElement('input'); k.type = 'text'; k.placeholder = '칸 이름'; k.value = kv[0]; k.oninput = function () { kv[0] = k.value; };
        var v = document.createElement('textarea'); v.style.minHeight = '34px'; v.placeholder = '내용'; v.value = kv[1]; v.oninput = function () { kv[1] = v.value; };
        var x = document.createElement('button'); x.className = 'mini ghost'; x.textContent = '빼기'; x.onclick = function () { sp.splice(i, 1); drawSp(); };
        row.appendChild(k); row.appendChild(v); row.appendChild(x); b.appendChild(row);
      });
    }
    function drawR() {
      var b = $('hfR'); b.innerHTML = '';
      el.r.forEach(function (rule, i) {
        var tag = rule[0], attrs = rule[1], card = document.createElement('div'); card.className = 'rule';
        var head = document.createElement('div'); head.className = 'rh';
        var sel = document.createElement('select');
        Object.keys(RULE_FIELDS).forEach(function (t) { var o = document.createElement('option'); o.value = t; o.textContent = RULE_KO[t] + ' (' + t + ')'; if (t === tag) o.selected = true; sel.appendChild(o); });
        sel.onchange = function () { rule[0] = sel.value; drawR(); };
        var x = document.createElement('button'); x.className = 'mini ghost'; x.textContent = '빼기'; x.onclick = function () { el.r.splice(i, 1); drawR(); };
        head.appendChild(sel); head.appendChild(x); card.appendChild(head);
        var rf = document.createElement('div'), known = {}; rf.className = 'rf';
        (RULE_FIELDS[tag] || []).forEach(function (f) {
          known[f[0]] = 1;
          var l = document.createElement('label'); l.textContent = f[1];
          var inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = f[2]; inp.value = attrs[f[0]] || '';
          inp.oninput = function () { if (inp.value.trim()) attrs[f[0]] = inp.value.trim(); else delete attrs[f[0]]; };
          l.appendChild(inp); rf.appendChild(l);
        });
        var rest = Object.keys(attrs).filter(function (k) { return !known[k]; }).map(function (k) { return k + '=' + attrs[k]; }).join('; ');
        var l2 = document.createElement('label'); l2.textContent = '그 밖의 속성 (이름=값; 이름=값)';
        var inp2 = document.createElement('input'); inp2.type = 'text'; inp2.value = rest;
        inp2.oninput = function () {
          Object.keys(attrs).forEach(function (k) { if (!known[k]) delete attrs[k]; });
          inp2.value.split(';').forEach(function (p) { var j = p.indexOf('='); if (j > 0) attrs[p.slice(0, j).trim().toLowerCase()] = p.slice(j + 1).trim(); });
        };
        l2.appendChild(inp2); rf.appendChild(l2); card.appendChild(rf); b.appendChild(card);
      });
    }
    drawSp(); drawR();
    $('hfSpAdd').onclick = function () { sp.push(['', '']); drawSp(); };
    $('hfRAdd').onclick = function () { el.r.push(['statadd', {}]); drawR(); };
    $('hfCancel').onclick = function () { editing = null; box.innerHTML = '<p class="hint">왼쪽에서 고르거나 위 버튼으로 새로 만들어 주세요.</p>'; };
    function collect() {
      var list = function (v) { return v.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
      var out = { id: el.id, n: $('hfN').value.trim(), t: $('hfT').value.trim() };
      if (!out.n || !out.t) { alert('이름과 종류는 꼭 적어 주세요.'); return null; }
      var src = list($('hfS').value); if (src.length) out.src = src;
      var cat = list($('hfC').value); if (cat.length) out.cat = cat;
      if ($('hfP').value.trim()) { out.pre = $('hfP').value.trim(); out.pp = out.pre; }
      if ($('hfF').value.trim()) out.fl = $('hfF').value.trim();
      var o = {}; sp.forEach(function (kv) { if (kv[0].trim() && String(kv[1]).trim()) o[kv[0].trim()] = String(kv[1]).trim(); });
      if (Object.keys(o).length) out.sp = o;
      var rules = el.r.filter(function (r) { return Object.keys(r[1]).length || r[0] === 'replace'; });
      if (rules.length) out.r = rules;
      if ($('hfB').value.trim()) out.body = $('hfB').value.trim();
      if (out.t === 'Power' && $('hfPc').value) {
        var u = USE[$('hfPu').value], util = $('hfPk').value === 'utility', lv = String(Math.max(1, Math.min(30, Math.round(+$('hfPl').value) || 1))), cls = db.byId[$('hfPc').value];
        var keep = (out.cat || []).filter(function (c) { return !/^\d+$/.test(c) && !/^ID_INTERNAL_CATEGORY_(AT-WILL|ENCOUNTER|DAILY)(_USAGE)?$|^ID_INTERNAL_CATEGORY_(ATTACK|UTILITY)$/.test(c) && !(db.byId[c] && db.byId[c].t === 'Class'); });
        out.cat = [util ? 'ID_INTERNAL_CATEGORY_UTILITY' : 'ID_INTERNAL_CATEGORY_ATTACK'].concat(util ? [u[1]] : [u[0], u[1]], [cls.id], keep, [lv]);
        out.sp = out.sp || {}; out.sp['Power Usage'] = u[2]; out.sp['Level'] = lv; out.sp['Class'] = cls.n; out.sp['Display'] = cls.n + (util ? ' Utility ' : ' Attack ') + lv;
        if (!out.sp['Action Type']) out.sp['Action Type'] = 'Standard Action';
      }
      return out;
    }
    $('hfPrev').onclick = function () { var o = collect(); if (o) $('hfCard').innerHTML = app.card(o); };
    $('hfSave').onclick = async function () {
      var out = collect(); if (!out) return;
      if (!out.id) out.id = newId(out.t);
      try {
        var doc = { el: out, by: (localStorage.getItem('d4e_me') || ''), at: Date.now() }; if (!$('hfAll').checked) doc.set = viewSet;
        await window.D4EShare.put(out.id, doc, KIND);
        await refresh(); edit(JSON.parse(JSON.stringify(out)), false, $('hfAll').checked); $('hfCard').innerHTML = app.card(out);
        app.status('하우스룰을 저장했어요 (' + new Date().toLocaleTimeString() + ')');
      } catch (err) { alert('저장하지 못했어요: ' + err.message); }
    };
  }

  function powerBlank() { return { id: '', n: '', t: 'Power', src: ['하우스룰'], sp: { 'Keywords': '', 'Action Type': 'Standard Action', 'Attack Type': 'Melee weapon', 'Target': 'One creature', 'Attack': '', 'Hit': '', 'Miss': '', 'Effect': '' }, r: [], body: '' }; }
  function start() {
    $('cfgSave').onclick = function () { saveSet(viewSet); };
    $('setNew').onclick = function () { var name = prompt('새 세팅 이름'); if (!name) return; var id = 'set_' + Date.now().toString(36); sets[id] = { name: name.trim(), points: 22, level: 1, memo: '' }; viewSet = id; renderSets(); renderList(); $('cfgMsg').textContent = '내용을 적고 「세팅 저장」을 눌러 주세요.'; };
    $('setSel').onchange = function () { viewSet = $('setSel').value; localStorage.setItem('d4e_set', viewSet); renderSets(); renderList(); };
    $('glossSave').onclick = async function () { var g = parseGloss($('glossText').value);
      try { await window.D4EShare.put('glossary', { text: g.map(function (p) { return p[0] + '\t' + p[1]; }).join('\n'), at: Date.now() }, CFG); glossary = g; $('glossN').textContent = g.length + '개'; $('glossMsg').textContent = '저장했어요.'; A().houseChanged(); }
      catch (e) { $('glossMsg').textContent = '저장하지 못했어요: ' + e.message; } };
    $('hNewPower').onclick = function () { edit(powerBlank(), true); };
    $('hFromPower').onclick = function () { pickExisting('Power'); };
    $('hNew').onclick = function () { edit(blank(), true); };
    $('hRefresh').onclick = refresh;
    $('hFrom').onclick = function () { pickExisting(null); };
  }
  function pickExisting(type) {
    {
      A().openSearch((type === 'Power' ? '기존 파워 고치기' : '기존 요소에서 시작') + ' — 이름을 두 글자 넘게 적어 주세요', function (e) {
        return [
          { label: '복사해서 새 요소로', fn: function () { var c = JSON.parse(JSON.stringify(e)); c.id = ''; c.n = e.n + ' (자작)'; c.src = ['하우스룰']; edit(c, true); } },
          { label: '이 요소를 고쳐 덮어쓰기', fn: function () { edit(JSON.parse(JSON.stringify(e)), false); } },
          { label: '쓰지 않게 하기', ghost: true, fn: async function () {
              if (!confirm('「' + e.n + '」을(를) 팀 모두의 후보에서 뺄까요?')) return;
              try { await window.D4EShare.put(e.id, { off: true, set: viewSet, by: (localStorage.getItem('d4e_me') || ''), at: Date.now() }, KIND); await refresh(); } catch (err) { alert(err.message); } } }
        ];
      }, type ? (A().db().byType[type] || []) : null, true);
    }
  }

  window.D4EHouse = { glossary: function () { return glossary; }, sets: function () { return sets; }, setIds: setIds, setOf: setOf, load: load, apply: apply, renderList: renderList, refresh: refresh, start: start, count: function () { return Object.keys(docs).length; } };
})();
