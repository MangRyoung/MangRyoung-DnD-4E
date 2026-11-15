/* 룰 데이터 불러오기 · 보관.
 * 순서: 브라우저 보관함(IndexedDB) → 사이트의 data/ 폴더(있으면) → 사용자가 고른 merged.xml.
 * 룰 데이터는 저장소에 넣지 않는다. 각자 가진 Character Builder 의
 * Cache/combined.dnd40.merged.xml 을 한 번 불러오면 이 브라우저에 남는다. */
(function () {
  'use strict';
  var GROUPS = {
    power: ['Power'], item: ['Magic Item', 'Item Set', 'Item Set Benefit'],
    feature: ['Class Feature', 'Racial Trait'], feat: ['Feat'],
    companion: ['Companion', 'Familiar', 'Associate'],
    background: ['Background', 'Background Choice', 'Background Association', 'Theme'],
    path: ['Paragon Path', 'Epic Destiny'], ritual: ['Ritual', 'Ritual Scroll'],
    gear: ['Weapon', 'Armor', 'Gear', 'Superior Implement']
  };
  var T2G = {};
  Object.keys(GROUPS).forEach(function (g) { GROUPS[g].forEach(function (t) { T2G[t] = g; }); });
  var NAMES = ['core'].concat(Object.keys(GROUPS));
  var ws = function (s) { return String(s || '').trim().replace(/[ \t]+\n/g, '\n'); };

  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('d4e_data', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('groups'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(key) {
    return idb().then(function (d) {
      return new Promise(function (res, rej) {
        var q = d.transaction('groups', 'readonly').objectStore('groups').get(key);
        q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
      });
    });
  }
  function idbPut(key, val) {
    return idb().then(function (d) {
      return new Promise(function (res, rej) {
        var tx = d.transaction('groups', 'readwrite');
        tx.objectStore('groups').put(val, key);
        tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbClear() {
    return idb().then(function (d) {
      return new Promise(function (res) {
        var tx = d.transaction('groups', 'readwrite'); tx.objectStore('groups').clear();
        tx.oncomplete = function () { res(); };
      });
    });
  }

  /* tools/convert.py 와 같은 꼴로 바꾼다 */
  function conv(el) {
    var o = { id: el.getAttribute('internal-id'), n: el.getAttribute('name'), t: el.getAttribute('type') };
    var src = el.getAttribute('source');
    if (src) o.src = src.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var sp = {}, rules = [], cats = [], body = [], hasSp = false;
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3 || c.nodeType === 4) { body.push(c.nodeValue); continue; }
      if (c.nodeType !== 1) continue;
      var tag = c.tagName.toLowerCase(), txt = ws(c.textContent);
      if (tag === 'specific') { if (txt) { sp[(c.getAttribute('name') || '').trim()] = txt; hasSp = true; } }
      else if (tag === 'rules') {
        for (var r = c.firstElementChild; r; r = r.nextElementSibling) {
          var a = {};
          for (var i = 0; i < r.attributes.length; i++) a[r.attributes[i].name.toLowerCase()] = r.attributes[i].value;
          rules.push([r.tagName.toLowerCase(), a]);
        }
      }
      else if (tag === 'category') cats = cats.concat(txt.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
      else if (tag === 'prereqs') { if (txt) o.pre = txt; }
      else if (tag === 'print-prereqs') { if (txt) o.pp = txt; }
      else if (tag === 'flavor') { if (txt) o.fl = txt; }
    }
    if (cats.length) o.cat = cats;
    if (hasSp) o.sp = sp;
    if (rules.length) o.r = rules;
    var b = ws(body.join(''));
    if (b) o.body = b;
    return o;
  }

  function importXml(file, onProgress) {
    var tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };
    return file.text().then(async function (text) {
      if (text.indexOf('<RulesElement') < 0) throw new Error('룰 요소가 없는 파일이에요. Cache 폴더의 combined.dnd40.merged.xml 을 골라 주세요.');
      var re = /<RulesElement\b[^>]*?(?:\/>|>[\s\S]*?<\/RulesElement>)/g, m, n = 0, bad = 0;
      var parser = new DOMParser(), groups = {};
      NAMES.forEach(function (g) { groups[g] = []; });
      while ((m = re.exec(text))) {
        var doc = parser.parseFromString(m[0], 'text/xml'), el = doc.documentElement;
        if (!el || el.tagName !== 'RulesElement' || !el.getAttribute('internal-id')) { bad++; continue; }
        var o = conv(el);
        groups[T2G[o.t] || 'core'].push(o);
        if (++n % 1000 === 0) { if (onProgress) onProgress(n, re.lastIndex / text.length); await tick(); }
      }
      if (!n) throw new Error('읽을 수 있는 룰 요소가 없었어요.');
      for (var i = 0; i < NAMES.length; i++) await idbPut(NAMES[i], groups[NAMES[i]]);
      await idbPut('meta', { total: n, bad: bad, at: Date.now(), file: file.name });
      return { groups: groups, total: n, bad: bad };
    });
  }

  async function loadStored() {
    try {
      var meta = await idbGet('meta');
      if (!meta) return null;
      var groups = {};
      for (var i = 0; i < NAMES.length; i++) groups[NAMES[i]] = (await idbGet(NAMES[i])) || [];
      return { groups: groups, total: meta.total, meta: meta };
    } catch (e) { return null; }
  }

  /* 묶음 파일(d4e-data.json.gz): 종류별 묶음을 한 파일로. 팀에 건네거나 사이트의 data/ 폴더에 둘 수 있다. */
  var PACK = 'd4e-data.json.gz';
  async function gunzip(blob) {
    var st = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(st).text());
  }
  async function exportPack() {
    var d = await loadStored();
    if (!d) throw new Error('이 브라우저에 보관한 룰 데이터가 없어요.');
    var st = new Blob([JSON.stringify({ v: 1, groups: d.groups })]).stream().pipeThrough(new CompressionStream('gzip'));
    var blob = await new Response(st).blob();
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = PACK;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
    return blob.size;
  }
  async function storePack(pack, name) {
    if (!pack || !pack.groups || !pack.groups.core) throw new Error('묶음 파일 꼴이 아니에요.');
    var total = 0;
    for (var i = 0; i < NAMES.length; i++) { var arr = pack.groups[NAMES[i]] || []; total += arr.length; await idbPut(NAMES[i], arr); }
    await idbPut('meta', { total: total, bad: 0, at: Date.now(), file: name });
    return { groups: pack.groups, total: total, bad: 0 };
  }
  async function importAny(file, onProgress) {
    if (/\.gz$/i.test(file.name)) return storePack(await gunzip(file), file.name);
    if (/\.json$/i.test(file.name)) return storePack(JSON.parse(await file.text()), file.name);
    return importXml(file, onProgress);
  }

  async function loadSite() {
    try {
      var rp = await fetch('data/' + PACK, { cache: 'no-cache' });
      if (rp.ok) {
        var pack = await gunzip(await rp.blob()), tot = 0;
        Object.keys(pack.groups).forEach(function (g) { tot += pack.groups[g].length; });
        return { groups: pack.groups, total: tot, meta: { site: true } };
      }
    } catch (e) {}
    try {
      var r = await fetch('data/index.json', { cache: 'no-cache' });
      if (!r.ok) return null;
      var idx = await r.json(), groups = {}, total = 0;
      for (var g in idx.groups) { groups[g] = await (await fetch('data/' + g + '.json')).json(); total += groups[g].length; }
      return { groups: groups, total: total, meta: { site: true } };
    } catch (e) { return null; }
  }

  window.D4EData = { importXml: importXml, importAny: importAny, exportPack: exportPack, loadStored: loadStored, loadSite: loadSite, clear: idbClear, NAMES: NAMES };
})();
