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
  function apply(db) {
    Object.keys(orig).forEach(function (id) { if (orig[id]) db.put(orig[id]); else db.remove(id); });
    orig = {};
    Object.keys(docs).forEach(function (id) {
      var d = docs[id];
      if (d.off) orig[id] = db.remove(id);
      else if (d.el && d.el.id === id) orig[id] = db.put(d.el) || null;
    });
  }
  async function load(db) {
    var rows = await window.D4EShare.list(KIND);
    docs = {};
    rows.forEach(function (r) { if (r.data) docs[r.id] = r.data; });
    if (db) apply(db);
    return Object.keys(docs).length;
  }

  /* ---------- 목록 ---------- */
  function renderList() {
    var box = $('hList'), ids = Object.keys(docs), app = A();
    ids.sort(function (a, b) { var x = (docs[a].el || {}).n || a, y = (docs[b].el || {}).n || b; return x < y ? -1 : 1; });
    $('hCount').textContent = ids.length + '개';
    box.innerHTML = ids.length ? '' : '<p class="hint">아직 없어요.</p>';
    ids.forEach(function (id) {
      var d = docs[id], e = d.el || orig[id] || { n: id, t: '' }, row = document.createElement('div'); row.className = 'hrow';
      var kind = d.off ? '쓰지 않음' : orig[id] ? '공식 요소를 고침' : '새로 만듦';
      row.innerHTML = '<div class="lab">' + app.esc(e.n) + '<span class="badge">' + kind + '</span><small>' + app.esc(app.typeKo(e.t)) + (d.by ? ' · ' + app.esc(d.by) : '') + '</small></div>';
      if (!d.off) { var b = document.createElement('button'); b.className = 'mini'; b.textContent = '고치기'; b.onclick = function () { edit(JSON.parse(JSON.stringify(d.el)), false); }; row.appendChild(b); }
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
    renderList(); app.houseChanged(); $('cfgPoints').value = app.campaign().points;
  }

  /* ---------- 고치는 칸 ---------- */
  function newId(type) { return 'ID_HOUSE_' + String(type || 'ELEMENT').toUpperCase().replace(/[^A-Z0-9]+/g, '_') + '_' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function blank() { return { id: '', n: '', t: 'Feat', src: ['하우스룰'], sp: {}, r: [], body: '' }; }

  function edit(el, isNew) {
    var app = A(), db = app.db(); editing = el; el.sp = el.sp || {}; el.r = el.r || [];
    var over = !isNew && el.id && (orig[el.id] || (!docs[el.id] && db.byId[el.id]));
    var box = $('hEdit'), types = Object.keys(db.byType).sort();
    var h = '<h3 style="margin-top:0">' + (isNew ? '새 요소' : over ? '공식 요소 고치기' : '고치기') + (el.id ? ' <span class="hint">' + app.esc(el.id) + '</span>' : '') + '</h3><div class="form">';
    h += '<label>이름</label><input type="text" id="hfN">';
    h += '<label>종류</label><input type="text" id="hfT" list="hTypes"><datalist id="hTypes">' + types.map(function (t) { return '<option value="' + app.esc(t) + '">' + app.esc(app.typeKo(t)) + '</option>'; }).join('') + '</datalist>';
    h += '<label>출처 (쉼표로 나눔)</label><input type="text" id="hfS">';
    h += '<label>선행 조건 (글로 보여 주기만 해요)</label><input type="text" id="hfP">';
    h += '<label>분류 꼬리표 (쉼표로 나눔 · 고르기 칸의 필터가 이것을 봐요)</label><input type="text" id="hfC">';
    h += '<label>풍미 글</label><input type="text" id="hfF">';
    h += '<label>설명</label><textarea id="hfB"></textarea>';
    h += '<label>칸 (시트와 고르기 창에 「이름: 내용」으로 보여요)</label><div id="hfSp"></div><button class="mini ghost" id="hfSpAdd">칸 더하기</button>';
    h += '<label>규칙 (시트 계산에 쓰여요)</label><div id="hfR"></div><button class="mini ghost" id="hfRAdd">규칙 더하기</button>';
    h += '<div class="acts"><button id="hfSave">저장해서 팀에 반영</button><button id="hfCancel" class="ghost">그만두기</button></div></div>';
    box.innerHTML = h;
    $('hfN').value = el.n || ''; $('hfT').value = el.t || ''; $('hfS').value = (el.src || []).join(', '); $('hfP').value = el.pp || el.pre || '';
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
    $('hfSave').onclick = async function () {
      var list = function (v) { return v.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
      var out = { id: el.id, n: $('hfN').value.trim(), t: $('hfT').value.trim() };
      if (!out.n || !out.t) { alert('이름과 종류는 꼭 적어 주세요.'); return; }
      if (!out.id) out.id = newId(out.t);
      var src = list($('hfS').value); if (src.length) out.src = src;
      var cat = list($('hfC').value); if (cat.length) out.cat = cat;
      if ($('hfP').value.trim()) { out.pre = $('hfP').value.trim(); out.pp = out.pre; }
      if ($('hfF').value.trim()) out.fl = $('hfF').value.trim();
      var o = {}; sp.forEach(function (kv) { if (kv[0].trim() && String(kv[1]).trim()) o[kv[0].trim()] = String(kv[1]).trim(); });
      if (Object.keys(o).length) out.sp = o;
      var rules = el.r.filter(function (r) { return Object.keys(r[1]).length || r[0] === 'replace'; });
      if (rules.length) out.r = rules;
      if ($('hfB').value.trim()) out.body = $('hfB').value.trim();
      try {
        await window.D4EShare.put(out.id, { el: out, by: (localStorage.getItem('d4e_me') || ''), at: Date.now() }, KIND);
        await refresh(); edit(JSON.parse(JSON.stringify(out)), false);
        app.status('하우스룰을 저장했어요 (' + new Date().toLocaleTimeString() + ')');
      } catch (err) { alert('저장하지 못했어요: ' + err.message); }
    };
  }

  function start() {
    var pi = $('cfgPoints');
    $('cfgSave').onclick = async function () { var n = Math.round(+pi.value); if (!(n >= 0 && n <= 99)) { alert('0~99 사이로 적어 주세요.'); return; }
      try { await A().setPoints(n); $('cfgMsg').textContent = '저장했어요. 팀 모두에게 반영돼요.'; } catch (e) { $('cfgMsg').textContent = '저장하지 못했어요: ' + e.message; } };
    $('hNew').onclick = function () { edit(blank(), true); };
    $('hRefresh').onclick = refresh;
    $('hFrom').onclick = function () {
      A().openSearch('기존 요소에서 시작 — 이름을 두 글자 넘게 적어 주세요', function (e) {
        return [
          { label: '복사해서 새 요소로', fn: function () { var c = JSON.parse(JSON.stringify(e)); c.id = ''; c.n = e.n + ' (자작)'; c.src = ['하우스룰']; edit(c, true); } },
          { label: '이 요소를 고쳐 덮어쓰기', fn: function () { edit(JSON.parse(JSON.stringify(e)), false); } },
          { label: '쓰지 않게 하기', ghost: true, fn: async function () {
              if (!confirm('「' + e.n + '」을(를) 팀 모두의 후보에서 뺄까요?')) return;
              try { await window.D4EShare.put(e.id, { off: true, by: (localStorage.getItem('d4e_me') || ''), at: Date.now() }, KIND); await refresh(); } catch (err) { alert(err.message); } } }
        ];
      });
    };
  }

  window.D4EHouse = { load: load, apply: apply, renderList: renderList, refresh: refresh, start: start, count: function () { return Object.keys(docs).length; } };
})();
