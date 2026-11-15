/* D&D 4판 룰 엔진 (핵심부)
 * 데이터: tools/convert.py 가 만든 JSON 묶음. 요소 꼴 {id,n,t,src,cat,pre,sp,r,body}
 * 규칙 문장 9종 중 grant · select · statadd · statalias · textstring 을 해석한다.
 * modify · replace · drop · suggest 는 다음 단계.
 * 브라우저(window.D4E) · node(module.exports) 둘 다에서 쓴다. 빌드 없음. */
(function (root) {
  'use strict';

  var ABILITIES = ['Strength', 'Constitution', 'Dexterity', 'Intelligence', 'Wisdom', 'Charisma'];
  var lc = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };

  function Db() { this.byId = {}; this.byName = {}; this.byType = {}; this.catName = {}; }
  Db.prototype.add = function (arr) {
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      this.byId[e.id] = e;
      (this.byName[lc(e.n)] = this.byName[lc(e.n)] || []).push(e);
      (this.byType[e.t] = this.byType[e.t] || []).push(e);
      if (e.t === 'Category') this.catName[lc(e.n)] = e.id;
    }
    return this;
  };
  Db.prototype.get = function (ref, type) {
    if (this.byId[ref]) return this.byId[ref];
    var c = this.byName[lc(ref)] || [];
    for (var i = 0; i < c.length; i++) if (!type || c[i].t === type) return c[i];
    return null;
  };

  /* 분류 필터: 쉼표 = 그리고, | = 또는. 토큰은 id · 분류 이름 · 그냥 글자(레벨 숫자 등). */
  function matchCategory(db, el, expr, vars) {
    if (!expr) return true;
    var ands = expr.split(',');
    for (var i = 0; i < ands.length; i++) {
      var ors = ands[i].split('|'), ok = false;
      for (var j = 0; j < ors.length && !ok; j++) {
        var tk = ors[j].trim();
        if (!tk) { ok = true; break; }
        if (tk.charAt(0) === '$') tk = vars[tk] || tk;
        var cats = el.cat || [], k = lc(tk), cid = db.catName[k];
        if (el.id === tk || lc(el.n) === k) ok = true;
        for (var c = 0; c < cats.length && !ok; c++) {
          if (cats[c] === tk || lc(cats[c]) === k || (cid && cats[c] === cid)) ok = true;
        }
      }
      if (!ok) return false;
    }
    return true;
  }

  /* requires: & | ! 와 쉼표(그리고). 토큰 = 가진 요소의 id · 이름, 또는 "11 level". */
  function evalRequires(expr, st) {
    if (!expr) return true;
    var ands = expr.split(/[&,]/);
    for (var i = 0; i < ands.length; i++) {
      var ors = ands[i].split('|'), ok = false;
      for (var j = 0; j < ors.length && !ok; j++) {
        var tk = ors[j].trim().replace(/^\(+|\)+$/g, '').trim(), neg = false;
        while (tk.charAt(0) === '!') { neg = !neg; tk = tk.slice(1).trim(); }
        tk = tk.replace(/^\(+|\)+$/g, '').trim();
        var m = /^(\d+)\s*level$/i.exec(tk), has;
        if (m) has = st.level >= +m[1];
        else has = !!(st.prevIds[tk] || st.prevNames[lc(tk)]);
        if (has !== neg) ok = true;
      }
      if (!ok) return false;
    }
    return true;
  }

  /* 캐릭터 꼴: {level, abilities:{Strength:16,..}, choices:{칸 열쇠:[요소 id,..]}}
   * 반환: {stats, breakdown, owned, selects, text, warnings} */
  function build(db, ch) {
    var prevIds = {}, prevNames = {}, out = null;
    for (var pass = 0; pass < 8; pass++) {
      out = onePass(db, ch, prevIds, prevNames);
      var ids = {}, names = {}, same = true, k;
      for (k in out.owned) { ids[k] = 1; names[lc(out.owned[k].n)] = 1; names[lc(out.owned[k].n + ' ' + out.owned[k].t)] = 1; if (!prevIds[k]) same = false; }
      for (k in prevIds) if (!ids[k]) same = false;
      prevIds = ids; prevNames = names;
      if (same) break;
    }
    out.passes = pass + 1;
    return out;
  }

  function onePass(db, ch, prevIds, prevNames) {
    var st = {
      level: ch.level || 1, prevIds: prevIds, prevNames: prevNames,
      owned: {}, order: [], adds: [], alias: {}, text: {}, selects: [], warnings: [], vars: {}
    };
    var choices = ch.choices || {};

    function apply(el, via) {
      if (!el || st.owned[el.id]) return;
      st.owned[el.id] = el; st.order.push({ id: el.id, via: via || null });
      var rules = el.r || [], selN = 0;
      for (var i = 0; i < rules.length; i++) {
        var tag = rules[i][0], a = rules[i][1];
        if (a.level && st.level < +a.level) { if (tag === 'select') selN++; continue; }
        if (tag === 'select') {
          var key = el.id + '#' + (selN++);
          if (a.requires && !evalRequires(a.requires, st)) continue;
          var picked = (choices[key] || []).slice(0, +a.number || 1);
          st.selects.push({ key: key, from: el.id, type: a.type, name: a.name || null, number: +a.number || 1,
            category: a.category || null, optional: a.optional === 'true', picked: picked });
          for (var p = 0; p < picked.length; p++) {
            var pe = db.get(picked[p], a.type);
            if (!pe) { st.warnings.push('고른 요소를 찾지 못함: ' + picked[p]); continue; }
            apply(pe, key);
          }
          continue;
        }
        if (a.requires && !evalRequires(a.requires, st)) continue;
        if (tag === 'grant') {
          var ge = db.get(a.name, a.type);
          if (!ge) { st.warnings.push('grant 대상 없음: ' + a.name + ' (' + el.id + ')'); continue; }
          apply(ge, el.id);
        } else if (tag === 'statadd') {
          st.adds.push({ stat: a.name, value: a.value, type: a.type || '', src: el.id,
            wearing: a.wearing, notWearing: a['not-wearing'], condition: a.condition });
        } else if (tag === 'statalias') {
          st.alias[lc(a.alias)] = a.name;
        } else if (tag === 'textstring') {
          st.text[a.name] = a.value;
          if (a.name === '_CLASSNAME') st.vars['$$CLASS'] = a.value;
        }
      }
    }

    for (var L = 1; L <= st.level; L++) apply(db.byId['ID_INTERNAL_LEVEL_' + L], 'level');

    /* 수치 계산: 종류(type)가 있는 보너스는 같은 종류끼리 가장 큰 것만, 없는 것 · 벌점은 전부 더함.
     * 능력 수정치(Ability)는 음수여도 둘 중 큰 것 하나만(포티 = 힘/건강 중 높은 쪽). */
    var cache = {}, busy = {}, breakdown = {};
    var canon = function (n) { var k = lc(n); return lc(st.alias[k] || n); };
    var byStat = {};
    st.adds.forEach(function (ad) { (byStat[canon(ad.stat)] = byStat[canon(ad.stat)] || []).push(ad); });
    var base = {};
    ABILITIES.forEach(function (ab) { base[lc(ab)] = (ch.abilities && ch.abilities[ab]) || 10; });

    function stat(name) {
      var k = canon(name);
      if (k in cache) return cache[k];
      if (busy[k]) return 0;
      busy[k] = 1;
      var total = base[k] || 0, typed = {}, rows = [];
      if (base[k]) rows.push({ v: base[k], src: '기본', type: '' });
      (byStat[k] || []).forEach(function (ad) {
        if (ad.condition || ad.wearing) { rows.push({ v: valueOf(ad.value), src: ad.src, type: ad.type, cond: ad.condition || ('착용: ' + ad.wearing), off: true }); return; }
        var v = valueOf(ad.value), t = lc(ad.type), row = { v: v, src: ad.src, type: ad.type };
        if (t && (v > 0 || t === 'ability')) {
          if (!typed[t] || v > typed[t].v) { if (typed[t]) typed[t].off = true; typed[t] = row; } else row.off = true;
        }
        rows.push(row);
      });
      rows.forEach(function (r) { if (!r.off && r.src !== '기본') total += r.v; });
      delete busy[k]; cache[k] = total; breakdown[k] = rows;
      return total;
    }
    function valueOf(expr) {
      var s = String(expr).trim(), sign = 1;
      if (s.charAt(0) === '+') s = s.slice(1); else if (s.charAt(0) === '-' && !/^-\d+$/.test(s)) { sign = -1; s = s.slice(1); }
      if (/^-?\d+$/.test(s)) return sign * +s;
      var m = /^(ABILITYMOD|HALFMOD|MINONEMOD)\((.+)\)$/i.exec(s);
      if (m) {
        var mod = Math.floor((stat(m[2]) - 10) / 2), f = m[1].toUpperCase();
        if (f === 'HALFMOD') mod = Math.floor(mod / 2);
        if (f === 'MINONEMOD') mod = Math.max(1, mod);
        return sign * mod;
      }
      return sign * stat(s);
    }

    var stats = {};
    Object.keys(byStat).forEach(function (k) { stats[k] = stat(k); });
    ABILITIES.forEach(function (ab) { stats[lc(ab)] = stat(ab); });
    return { stats: stats, breakdown: breakdown, owned: st.owned, order: st.order, selects: st.selects,
      text: st.text, vars: st.vars, warnings: st.warnings, stat: function (n) { return stat(n); } };
  }

  /* 고르기 칸의 후보 목록 */
  function options(db, sel, vars) {
    return (db.byType[sel.type] || []).filter(function (e) { return matchCategory(db, e, sel.category, vars || {}); });
  }

  var api = { Db: Db, build: build, options: options, matchCategory: matchCategory, evalRequires: evalRequires, ABILITIES: ABILITIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.D4E = api;
})(typeof window !== 'undefined' ? window : this);
