/* 맵툴로 내보내기 — 4판 맵툴 캠페인(PC 기본 토큰, Lib:Initiative 의 능력 제작)에 맞춘 토큰 파일과 붙여 넣기용 글.
 * 틀은 js/mt_tpl.js (tools/extract_maptool.py 로 캠페인에서 뽑음). 캠페인이 바뀌면 그 스크립트를 다시 돌린다. */
(function () {
  'use strict';
  var A = function () { return window.D4EApp; }, T = function () { return window.D4E_MT; };
  var xe = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); };
  var he = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  /* ----- MD5 (바이트 배열) ----- */
  function md5(bytes) {
    var K = [], S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21], i;
    for (i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    var n = bytes.length, len = ((n + 8) >> 6) + 1, buf = new Uint8Array(len * 64); buf.set(bytes); buf[n] = 0x80;
    var dv = new DataView(buf.buffer); dv.setUint32(len * 64 - 8, (n * 8) >>> 0, true); dv.setUint32(len * 64 - 4, Math.floor(n / 536870912), true);
    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (var o = 0; o < buf.length; o += 64) {
      var a = a0, b = b0, c = c0, d = d0;
      for (i = 0; i < 64; i++) {
        var f, g, r = i >> 4;
        if (r === 0) { f = (b & c) | (~b & d); g = i; } else if (r === 1) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; } else if (r === 2) { f = b ^ c ^ d; g = (3 * i + 5) % 16; } else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        var t = d; d = c; c = b; var x = (a + f + K[i] + dv.getUint32(o + g * 4, true)) >>> 0, s = S[r * 4 + (i % 4)];
        b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0; a = t;
      }
      a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
    }
    return [a0, b0, c0, d0].map(function (v) { var h = ''; for (var j = 0; j < 4; j++) h += ('0' + ((v >>> (j * 8)) & 255).toString(16)).slice(-2); return h; }).join('');
  }
  function guid() { var b = new Uint8Array(16); crypto.getRandomValues(b); var s = ''; b.forEach(function (x) { s += String.fromCharCode(x); }); return btoa(s); }
  function uuid() { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); }

  /* ----- 능력 제작(set_ability)이 하는 일을 그대로 옮김 ----- */
  var ACT = { '일반': ['1. 기본 행동', '기본 행동'], '이동': ['2. 이동 행동', '이동 행동'], '간략': ['3. 간략 행동', '간략 행동'], '즉각 반응': ['4. 즉각 행동', '즉시 반응'], '즉각 개입': ['4. 즉각 행동', '즉시 개입'], '기회 행동': ['4. 즉각 행동', '기회 행동'], '자유 행동': ['5. 자유 행동', '자유 행동'], '-': ['6. 행동 없음', '행동 없음'] };
  var USE = { '#407040': ['669966', '상시', '1', 'teal'], '#704040': ['990033', '조우', '2', 'red'], '#404040': ['333333', '일일', '3', 'gray25'] };
  function powerMacro(p) {
    var a = p.args, act = ACT[a.action] || ACT['-'], use = USE[a.usage] || USE['#407040'], range = a.range || '근접 무기';
    var v = { power_table_color: use[0], power_usage: use[1], action_type: act[1], trigger_entry: a.Trigger ? 1 : 0, target_entry: a.Target === '-' ? 0 : 1, effect_entry: a.Effect ? 1 : 0, special_entry: a.Special ? 1 : 0,
      power_name: a.pname, power_kind: a.pkind, power_keywords: a.keyword, attack_type_and_range: range, trigger_description: a.Trigger, target_description: a.Target === '' ? '한 개체' : a.Target, effect_description: a.Effect, special_description: a.Special };
    var tip = [a.Trigger && '트리거: ' + a.Trigger, '사거리: ' + range];
    if (!p.nonatk) {
      var atk = a.Attack !== '-';
      v.attack_entry = atk ? 1 : 0; v.hit_entry = atk ? 1 : 0; v.attack_defense = atk ? a.Attack : 'AC'; v.attack_modifier = a.Amod === '' ? '0' : a.Amod;
      v.no_damage_type = a.Damage ? 0 : 1; v.damage_roll_times = a.Damage ? a.Damage.charAt(0) : '1'; v.damage_roll_dice = a.Damage ? a.Damage.slice(1) : 'W'; v.damage_modifier = a.ADM === '' ? '0' : a.ADM;
      v.miss_entry = a.Miss ? 1 : 0; v.Ahit = a.AHit; v.Dmod = '0'; v.hit_description = a.Description; v.miss_description = a.Miss;
      tip.push(atk && '공격: vs ' + a.Attack);
    }
    tip.push(v.target_description && '대상: ' + v.target_description);
    if (!p.nonatk) tip.push(a.Damage && '피해 주사위: ' + a.Damage, a.Description && '명중시: ' + a.Description, a.Miss && '빗나감: ' + a.Miss);
    tip.push(a.Effect && '효과: ' + a.Effect, a.Special && '특수: ' + a.Special);
    var cmd = T()[p.nonatk ? 'nonatk' : 'attack'].replace(/"\+(\w+)\+"/g, function (m, k) { return v[k] == null ? '' : String(v[k]); });
    return { label: a.pname, group: p.group || act[0], color: p.group && a.usage === '#407040' ? 'silver' : use[3], font: p.group && a.usage === '#407040' ? 'black' : 'white', sort: use[2], command: cmd, tip: tip.filter(Boolean).join('\n').replace(/<br>/g, '\n').replace(/&#(\d+);/g, function (m, c) { return String.fromCharCode(+c); }) };
  }
  function skillMacro(s) {
    var c = T().skill.replace(/\bDex\b/g, s.abil).replace(/is_skill_trained = \d+/, 'is_skill_trained = ' + s.trained).replace(/trained_bonus = \d+/, 'trained_bonus = ' + (s.trained ? 5 : 0))
      .replace(/is_applicable_armor_check_penalty = \d+/, 'is_applicable_armor_check_penalty = ' + s.acp).replace(/misc_bonus = -?\d+/, 'misc_bonus = ' + s.misc).replace(/&nbsp;[^<(]*\(\w+\)<\/b>/, '&nbsp;' + s.name + ' (' + s.abil + ')</b>');
    return { label: s.name + ' (' + (s.total >= 0 ? '+' : '') + s.total + ')', group: 'Skills', color: s.trained ? 'blue' : 'gray', font: 'white', sort: String(s.sort), command: c, tip: '' };
  }
  var want = { item: true, pas: true };
  try { Object.assign(want, JSON.parse(localStorage.getItem('d4e_mtwant') || '{}')); } catch (e) {}
  /* ----- 맞출 캠페인(토큰 꼴). old = 4th-2026-11-17 캠페인(매크로 글이 토큰에 통째로), new = 「Test : 망령 뉴 캠페인」(자료 pw4e + Lib:4E 한 줄 호출) ----- */
  var FMTS = [['old', '4th-2026-11-17 캠페인 (기존)'], ['new', 'Test : 망령 뉴 캠페인']];
  function fmt() { var v = localStorage.getItem('d4e_mtfmt'); return v === 'new' ? 'new' : 'old'; }
  var USE_N = { '#407040': [0, '1', 'teal'], '#704040': [1, '2', 'red'], '#404040': [2, '3', 'gray25'] };
  function newTip(w) {
    var clean = function (x) { return String(x).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').replace(/&#(\d+);/g, function (m, c) { return String.fromCharCode(+c); }).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\[{]/g, '(').replace(/[\]}]/g, ')'); };
    var L = ['<b>' + clean([['상시', '조우', '일일'][w.u], w.act, w.rng, w.vs ? 'vs ' + w.vs : ''].filter(Boolean).join(' / ')) + '</b>'];
    [['trg', '유발'], ['tgt', '대상'], ['hit', '명중'], ['miss', '빗나감'], ['eff', '효과'], ['spc', '특수']].forEach(function (k) { if (w[k[0]]) L.push('<b>' + k[1] + '</b>: ' + clean(w[k[0]])); });
    return "<html><div style='width:340px'>" + L.join('<br>') + '</div></html>';
  }
  function newPower(p, i) {
    var a = p.args, u = USE_N[a.usage] || USE_N['#407040'], act = ACT[a.action] || ACT['-'], tgt = a.Target === '-' ? '' : (a.Target || ''), rng = a.range === '-' ? '' : (a.range || '');
    var w = { n: a.pname, k: a.pkind || '', u: u[0], kw: a.keyword || '', act: act[1], rng: rng, trg: a.Trigger || '', tgt: tgt, eff: a.Effect || '', spc: a.Special || '', hit: a.Description || '', miss: a.Miss || '', vs: '', dm: 0, half: 0, dty: '' };
    if (!p.nonatk && a.Attack && a.Attack !== '-') { w.vs = a.Attack; w.am = parseInt(a.Amod, 10) || 0; w.ah = a.AHit || 'Hit'; if (!tgt) w.tgt = '한 개체';
      var m = /^(\d+)(.*)$/.exec(a.Damage || ''); if (m) { w.dt = +m[1]; w.dd = m[2]; } w.dm = parseInt(a.ADM, 10) || 0; if (/절반/.test(a.Miss || '')) w.half = 1; }
    if (a.pfx) w.pfx = a.pfx;
    if (a.fx && a.fx.length) { w.fx = a.fx; if (a.fx.some(function (x) { return x.k === 'half'; })) w.half = 1; if (!w.vs && a.fx.some(function (x) { return x.to === 't'; })) w.ft = 1; }
    var pas = !!p.group && u[0] === 0, tip = newTip(w);
    return { data: w, macro: { label: a.pname, group: p.group || act[0], color: pas ? 'silver' : u[2], font: pas ? 'black' : 'white', sort: u[1], command: '[macro("pw_use@Lib:4E"): ' + i + ']', tip: tip } };
  }
  function newPack(d) {
    var pw = [], macros = []; chosen(d).forEach(function (p, i) { var x = newPower(p, i); pw.push(x.data); if (!/^패시브/.test(x.macro.label)) macros.push(x.macro); });
    var sk = d.skills.slice().sort(function (x, y) { return x.sort - y.sort; }).map(function (s) { var n = String(s.name).replace(/[",|#]/g, ' '); return [n, s.total, n + ' ' + (s.total >= 0 ? '+' : '') + s.total + (s.trained ? ' ●' : '')]; });
    [['행동판', 'power', 'black', 'yellow', 'HP · 방어 · 파워를 한 창에서'], ['기능', 'skill', 'blue', 'white', '기능 · 능력 판정'], ['상태', 'state', 'maroon', 'white', '피해 · 회복 · 치유 서지 · 내성 · 행동점 · 걸린 효과'], ['패시브', 'passive', 'gray25', 'white', '패시브 모음'], ['설정', 'cfg', 'gray', 'white', '수치 · 이름 · 연출 고치기']].forEach(function (b) {
      macros.push({ label: b[0], group: '0. 행동판', color: b[2], font: b[3], sort: '', command: '[h, macro("sheet@Lib:4E"): currentToken() + "|' + b[1] + '"]', tip: b[4] }); });
    macros.push({ label: '전투 현황판', group: '0. 행동판', color: 'black', font: 'yellow', sort: '', command: '[h, macro("panel@Lib:4E"): ""]', tip: '차례 · HP · 걸린 효과' });
    macros.push({ label: '채팅 열기', group: '0. 채팅', color: 'yellow', font: 'black', sort: '', command: '[h, macro("input_coco@Lib:Coco"): ""]', tip: '코코챗 입력창' });
    macros.push({ label: '컷인', group: '0. 채팅', color: 'red', font: 'white', sort: '', command: '[h, macro("coco_cutin@Lib:Coco"): currentToken()]', tip: '이 토큰의 컷인' });
    var props = Object.assign({}, d.props); props.pw4e = JSON.stringify(pw); props.pw_used = '[]'; props.sk4e = JSON.stringify(sk);
    return { props: props, macros: macros };
  }
  function baseCmd(tok, label, cmd) { var re = new RegExp('<command>((?:(?!</command>)[\\s\\S])*?)</command>(\\s*)<label>' + xe(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</label>'); return tok.replace(re, function (m, c, sp) { return '<command>' + xe(cmd) + '</command>' + sp + '<label>' + xe(label) + '</label>'; }); }
  function chosen(d) { return d.powers.filter(function (p) { return p.src === 'power' || want[p.src]; }); }
  function allMacros(d) { return chosen(d).map(powerMacro).concat(d.skills.map(skillMacro)); }

  /* ----- 토큰 그림: 초상이 있으면 PNG 로, 없으면 이름 첫 글자 동그라미 ----- */
  function tokenImage(d) {
    return new Promise(function (ok) {
      var cv = document.createElement('canvas'), done = function () { cv.toBlob(function (b) { b.arrayBuffer().then(function (ab) { ok({ bytes: new Uint8Array(ab), w: cv.width, h: cv.height }); }); }, 'image/png'); };
      var blank = function () { cv.width = cv.height = 256; var x = cv.getContext('2d'); x.fillStyle = '#5b7aa8'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 130px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((d.name || '?').charAt(0), 128, 138); done(); };
      var src = d.tok || d.port; if (!src) return blank();
      var im = new Image(); im.onload = function () { var k = Math.min(1, 512 / Math.max(im.width, im.height)); cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k)); var x = cv.getContext('2d'); if (d.tok) { var side = Math.max(cv.width, cv.height), w = cv.width, h = cv.height, t = document.createElement('canvas'); t.width = w; t.height = h; var tx = t.getContext('2d'); tx.drawImage(im, 0, 0, w, h);
          var opaque = false; try { opaque = w === h && tx.getImageData(0, 0, 1, 1).data[3] === 255 && tx.getImageData(w - 1, h - 1, 1, 1).data[3] === 255; } catch (e) { }
          cv.width = cv.height = side; x = cv.getContext('2d'); if (opaque) { x.beginPath(); x.arc(side / 2, side / 2, side / 2, 0, 7); x.clip(); } x.drawImage(t, (side - w) / 2, (side - h) / 2); } else x.drawImage(im, 0, 0, cv.width, cv.height); done(); };
      im.onerror = blank; im.src = src;
    });
  }
  function loadZip() { return window.JSZip ? Promise.resolve() : new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; s.onload = ok; s.onerror = function () { no(new Error('압축 도구를 불러오지 못했어요')); }; document.head.appendChild(s); }); }

  function tokenXml(d, img, hash, extra) {
    var isNew = fmt() === 'new', pack = isNew ? newPack(d) : null; if (isNew) d = Object.assign({}, d, { props: pack.props });
    var t = T(), props = '<propertyMapCI>\n<store>\n' + Object.keys(d.props).map(function (k) {
      return '<entry>\n<string>' + xe(k.toLowerCase()) + '</string>\n<net.rptools.CaseInsensitiveHashMap_-KeyValue>\n<key>' + xe(k) + '</key>\n<value class="string">' + xe(d.props[k]) + '</value>\n</net.rptools.CaseInsensitiveHashMap_-KeyValue>\n</entry>'; }).join('\n') + '\n</store>\n</propertyMapCI>';
    var idx = t.nextIndex, macros = (isNew ? pack.macros : allMacros(d)).map(function (m) { var i = idx++;
      return t.entry.replace(/@@INDEX@@/g, i).replace('@@UUID@@', uuid()).replace('@@COLOR@@', m.color).replace('@@FONT@@', m.font).replace('@@SORT@@', xe(m.sort)).replace('@@GROUP@@', function () { return xe(m.group); })
        .replace('@@LABEL@@', function () { return xe(m.label); }).replace('@@TIP@@', function () { return xe(m.tip); }).replace('@@COMMAND@@', function () { return xe(m.command); }); }).join('\n');
    var base = t.token; if (isNew) { base = base.replace(/<entry>\s*<int>\d+<\/int>\s*<net\.rptools\.maptool\.model\.MacroButtonProperties>[\s\S]*?<\/net\.rptools\.maptool\.model\.MacroButtonProperties>\s*<\/entry>\s*/g, function (m) { var g = /<group>([^<]*)<\/group>/.exec(m); return g && (g[1] === '0. 상태' || g[1] === '0. 자원' || g[1] === 'zzz. PC 제작') ? '' : m; }); base = baseCmd(base, '재기의 바람', '[macro("second_wind@Lib:4E"): ""]'); base = baseCmd(base, '턴 종료', '[h, macro("turn_end@Lib:4E"): ""]'); base = baseCmd(base, '행동점 사용', '[h, macro("st_do@Lib:4E"): json.set("{}", "op", "ap")]'); base = baseCmd(base, '일일 아이템 파워 사용', '[h, macro("st_do@Lib:4E"): json.set("{}", "op", "dip")]'); }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + base.replace('@@ID@@', guid()).replace('@@EXP@@', guid()).replace('@@IMG@@', hash).replace('</imageAssetMap>', (extra && extra.cut ? '<entry>\n<string>cut</string>\n<net.rptools.lib.MD5Key>\n<id>' + extra.cut + '</id>\n</net.rptools.lib.MD5Key>\n</entry>\n' : '') + '</imageAssetMap>' + (extra && extra.face ? '\n<portraitImage>\n<id>' + extra.face + '</id>\n</portraitImage>' : '') + (extra && extra.stand ? '\n<charsheetImage>\n<id>' + extra.stand + '</id>\n</charsheetImage>' : '')).replace('@@NAME@@', function () { return xe(d.name); })
      .replace(/<width>\d+<\/width>\s*<height>\d+<\/height>\s*<isoWidth>\d+<\/isoWidth>\s*<isoHeight>\d+<\/isoHeight>/, '<width>' + img.w + '</width>\n<height>' + img.h + '</height>\n<isoWidth>' + img.w + '</isoWidth>\n<isoHeight>' + img.h + '</isoHeight>')
      .replace('@@PROPS@@', function () { return props; }).replace('@@MACROS@@', function () { return macros + '\n'; });
  }
  /* 조우 맵 파일에 넣을 PC 토큰 한 장: { id, name, xml, assets:[{hash,bytes,name}] } */
  async function pcPart(d, o) { await loadZip(); var img = await tokenImage(d), hash = md5(img.bytes), assets = [{ hash: hash, bytes: img.bytes, name: d.name }], extra = {}, kinds = ['face', 'stand', 'cut'];
    for (var ki = 0; ki < kinds.length; ki++) { var by = await pngOf(d[kinds[ki]] || (kinds[ki] === 'stand' ? d.tok : '')); if (!by) continue; var h2 = md5(by); extra[kinds[ki]] = h2; assets.push({ hash: h2, bytes: by, name: d.name + ' ' + kinds[ki] }); }
    if (extra.cut) { d.props = Object.assign({}, d.props); d.props.cut_img = 'asset://' + extra.cut; }
    var xml = tokenXml(d, img, hash, extra).replace(/^<\?xml[^>]*\?>\s*/, ''), id = (/<baGUID>([^<]+)<\/baGUID>/.exec(xml) || [])[1];
    xml = xml.replace(/<x>-?\d+<\/x>(\s*)<y>-?\d+<\/y>(\s*)<z>-?\d+<\/z>(\s*)<lastX>-?\d+<\/lastX>(\s*)<lastY>-?\d+<\/lastY>/, '<x>' + o.x + '</x>$1<y>' + o.y + '</y>$2<z>' + o.z + '</z>$3<lastX>' + o.x + '</lastX>$4<lastY>' + o.y + '</lastY>');
    return { id: id, name: d.name, xml: xml, assets: assets }; }
  async function saveToken() {
    var d = A().mtData(); await loadZip(); var img = await tokenImage(d), hash = md5(img.bytes), zip = new window.JSZip();
    var extra = {}, kinds = ['face', 'stand', 'cut'];
    for (var ki = 0; ki < kinds.length; ki++) { var by = await pngOf(d[kinds[ki]] || (kinds[ki] === 'stand' ? d.tok : '')); /* 스탠딩이 비면 토큰 그림(2026-11-24) */ if (!by) continue; var h2 = md5(by); extra[kinds[ki]] = h2;
      zip.file('assets/' + h2, '<net.rptools.maptool.model.Asset>\n  <id>\n    <id>' + h2 + '</id>\n  </id>\n  <name>' + xe(d.name + ' ' + kinds[ki]) + '</name>\n  <extension>png</extension>\n  <type>IMAGE</type>\n</net.rptools.maptool.model.Asset>'); zip.file('assets/' + h2 + '.png', by); }
    if (extra.cut) { d.props = Object.assign({}, d.props); d.props.cut_img = 'asset://' + extra.cut; }
    zip.file('content.xml', tokenXml(d, img, hash, extra));
    zip.file('properties.xml', '<map>\n  <entry>\n    <string>version</string>\n    <string>' + T().version + '</string>\n  </entry>\n</map>');
    zip.file('assets/' + hash, '<net.rptools.maptool.model.Asset>\n  <id>\n    <id>' + hash + '</id>\n  </id>\n  <name>' + xe(d.name) + '</name>\n  <extension>png</extension>\n  <type>IMAGE</type>\n</net.rptools.maptool.model.Asset>');
    zip.file('assets/' + hash + '.png', img.bytes); zip.file('thumbnail', img.bytes); zip.file('thumbnail_large', img.bytes);
    var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = (d.name || 'token').replace(/[\\/:*?"'<>|\s]+/g, '_') + '.rptok'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    return d;
  }
  /* 붙여 넣기용 글: 맵툴의 decode() 로 풀 수 있게 주소 인코딩 */
  function pasteText() { var d = A().mtData(); return encodeURIComponent(JSON.stringify({ v: 1, name: d.name, props: d.props, powers: chosen(d).filter(function (p) { return !p.group; }).map(function (p) { return { nonatk: p.nonatk, args: p.args }; }), macros: d.skills.map(skillMacro).concat(chosen(d).filter(function (p) { return p.group; }).map(powerMacro).map(function (m) { return { label: m.label, group: m.group, color: m.color, font: m.font, sort: m.sort, command: m.command }; })) })); }

  /* 캠페인에 한 번 넣어 두는 매크로 (캠페인 매크로나 GM 매크로로) */
  var LOADER = [
    '[h: assert(listCount(getSelected()) == 1, "토큰을 하나만 고르고 눌러 주세요.", 0)]',
    '[h: switchToken(getSelected())]',
    '[h: ok = input("d4e||제작기에서 복사한 글|TEXT|WIDTH=50")]',
    '[h: abort(ok)]',
    '[h: d = decode(d4e)]',
    '[h: props = json.get(d, "props")]',
    '[h, foreach(k, json.fields(props)): setProperty(k, json.get(props, k))]',
    '[h: made = 0]',
    '[h, foreach(p, json.get(d, "powers")), code: {',
    '  [h: a = json.get(p, "args")]',
    '  [h, foreach(i, getMacroIndexes(json.get(a, "pname"))): removeMacro(i)]',
    '  [h, if(json.get(p, "nonatk") == 1), code: { [h, macro("set_nonatk_ability@Lib:Initiative"): a] }; { [h, macro("set_ability@Lib:Initiative"): a] }]',
    '  [h: made = made + 1]',
    '}]',
    '[h, foreach(m, json.get(d, "macros")), code: {',
    '  [h: lab = json.get(m, "label")]',
    '  [h: cut = indexOf(lab, " (")]',
    '  [h, if(cut < 0): nm = lab; nm = substring(lab, 0, cut)]',
    '  [h, foreach(i, getMacros()), if(i == lab || startsWith(i, nm + " (")): removeMacro(listGet(getMacroIndexes(i), 0))]',
    '  [h: mp = "autoexec=true;"]',
    '  [h: mp = setStrProp(mp, "group", json.get(m, "group"))]',
    '  [h: mp = setStrProp(mp, "color", json.get(m, "color"))]',
    '  [h: mp = setStrProp(mp, "fontColor", json.get(m, "font"))]',
    '  [h: mp = setStrProp(mp, "sortBy", json.get(m, "sort"))]',
    '  [h: createMacro(lab, json.get(m, "command"), mp)]',
    '}]',
    '<b>[r: getName()]</b> — 시트를 불러왔어요. 능력 [r: made]개.'
  ].join('\n');

  function drawImgs() {
    var el = document.getElementById('mtImgs'); if (!el || !window.D4EImg) return;
    el.innerHTML = [['face', '초상'], ['stand', '스탠딩'], ['cut', '컷신']].map(function (k) { var v = window.D4EImg.get(k[0]);
      return '<span style="display:inline-flex;align-items:center;gap:8px;margin:4px 14px 4px 0">' + (v ? '<img src="' + v + '" alt="" style="width:54px;height:54px;object-fit:contain;border:1px solid #8884;border-radius:8px;background:#8882">' : '<span style="display:inline-block;width:54px;height:54px;line-height:54px;text-align:center;border:1px dashed #8886;border-radius:8px;font-size:11px;opacity:.7">없음</span>') +
        '<span><b>' + k[1] + '</b><br><button type="button" data-mtimg="' + k[0] + '">' + (v ? '바꾸기' : '고르기') + '</button>' + (v ? ' <button type="button" data-mtimgdel="' + k[0] + '">지우기</button>' : '') + '</span></span>'; }).join('');
    el.onclick = function (ev) { var b = ev.target.closest('[data-mtimg]'), x = ev.target.closest('[data-mtimgdel]');
      if (x) { window.D4EImg.del(x.getAttribute('data-mtimgdel'), drawImgs); return; }
      if (b) { var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = function () { window.D4EImg.set(b.getAttribute('data-mtimg'), f.files[0], drawImgs); }; f.click(); } };
  }
  function pngOf(src) { return new Promise(function (ok) { if (!src) return ok(null); var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0);
      c.toBlob(function (b) { b.arrayBuffer().then(function (ab) { ok(new Uint8Array(ab)); }); }, 'image/png'); }; im.onerror = function () { ok(null); }; im.src = src; }); }
  function open() {
    if (!A() || !A().hasChar()) { alert('먼저 데이터를 불러오고 캐릭터를 골라 주세요.'); return; }
    var d = A().mtData(), box = document.getElementById('mtBox');
    if (!box) { box = document.createElement('div'); box.id = 'mtBox'; box.className = 'mtbox'; document.body.appendChild(box); }
    var atk = d.powers.filter(function (p) { return !p.nonatk; }).length, cnt = function (k) { return d.powers.filter(function (p) { return p.src === k; }).length; }, nItem = cnt('item'), nPas = cnt('pas');
    box.innerHTML = '<div class="mtin"><button class="mtx" data-mt="close" title="닫기">×</button><h3>맵툴로 내보내기</h3>' +
      '<p class="hint">' + he(d.name) + ' · 파워 ' + cnt('power') + '개(공격 ' + atk + ') · 기술 ' + d.skills.length + '개 · 맵툴 ' + he(T().version) + ' 기준. 글은 내 번역 → 용어 자동 번역 → 원문 순으로 들어가요.</p>' +
      '<div class="mtwant"><b>맞출 캠페인</b><select data-mtfmt>' + FMTS.map(function (f) { return '<option value="' + f[0] + '"' + (fmt() === f[0] ? ' selected' : '') + '>' + he(f[1]) + '</option>'; }).join('') + '</select><span class="hint">' + (fmt() === 'new' ? '토큰에는 자료와 한 줄 호출만 들어가요. Lib:4E 가 있는 새 캠페인에서만 돌아요. 몬스터 · 조우 내보내기도 이 선택을 따라요.' : '매크로 글이 토큰에 통째로 들어가는 예전 꼴이에요. 몬스터 · 조우 내보내기도 이 선택을 따라요.') + '</span></div>' +
      '<div class="mtwant"><b>버튼으로 더 넣을 것</b>' + [['item', '장비 파워', nItem], ['pas', '패시브 묶음 (재주 · 특성 · 장비 속성 · 홈브류 …)', nPas]].map(function (w) { return '<label><input type="checkbox" data-mtw="' + w[0] + '"' + (want[w[0]] ? ' checked' : '') + '> ' + w[1] + ' <span class="hint">' + w[2] + '개</span></label>'; }).join('') + '<span class="hint">패시브 묶음은 시트의 「패시브 효과」에서 편집해요. 클래스 · 종족 특성이 주는 파워는 파워에 이미 들어 있어요</span></div>' +
      '<p class="hint">초상(토큰 그림) · 스탠딩 · 컷신은 「고르기」 의 「초상 · 스탠딩 · 컷신」 탭에서 넣어요. 넣어 두면 토큰 파일에 같이 들어가요.</p>' +
      '<div class="mtrow"><div><b>가) 토큰 파일</b><p class="hint">.rptok 을 받아 맵 위로 끌어다 놓으면 돼요. 「PC 기본」 토큰의 매크로가 그대로 들어 있어요.</p><button data-mt="tok">토큰 파일 받기</button></div>' +
      '<div><b>나) 있는 토큰에 덮어쓰기</b><p class="hint">캠페인에 「시트 불러오기」 매크로를 한 번 넣어 두고, 토큰을 고른 뒤 그 매크로에 글을 붙여 넣어요. 수치와 능력 버튼만 바뀌어요.</p><button data-mt="copy">시트 글 복사</button> <button data-mt="loader">불러오기 매크로 복사</button></div></div>' +
      '<details><summary>수치 미리 보기</summary><div class="mtprev">' + Object.keys(d.props).map(function (k) { return '<span>' + he(k) + ' <b>' + he(d.props[k]) + '</b></span>'; }).join('') + '</div>' +
      '<table class="mttab"><tr><th>능력</th><th>공격</th><th>피해</th></tr>' + d.powers.filter(function (p) { return p.src === 'power'; }).map(function (p) { var a = p.args; return '<tr><td>' + he(a.pname) + '</td><td>' + (p.nonatk ? '—' : '1d20 + ' + (+a.Amod + d.props[a.AHit === 'Hit' ? 'hit' : 'Hit2']) + ' vs ' + he(a.Attack)) + '</td><td>' + (p.nonatk || !a.Damage ? '—' : he(a.Damage) + ' + ' + he(a.ADM)) + '</td></tr>'; }).join('') + '</table></details>' +
      '<p class="hint" id="mtMsg"></p></div>';
    drawImgs();
    box.style.display = 'flex';
    var msg = function (t) { document.getElementById('mtMsg').textContent = t; }, copy = function (t, okMsg) { navigator.clipboard.writeText(t).then(function () { msg(okMsg); }, function () { var ta = document.createElement('textarea'); ta.value = t; box.firstChild.appendChild(ta); ta.select(); msg('자동 복사가 막혀서 글을 아래에 띄웠어요. 직접 복사해 주세요.'); }); };
    box.onchange = function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-mtfmt')) { localStorage.setItem('d4e_mtfmt', e.target.value); open(); return; } var w = e.target.getAttribute && e.target.getAttribute('data-mtw'); if (w) { want[w] = e.target.checked; localStorage.setItem('d4e_mtwant', JSON.stringify(want)); } };
    box.onclick = function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-mt');
      if (e.target === box || k === 'close') box.style.display = 'none';
      else if (k === 'tok') { msg('만드는 중…'); saveToken().then(function () { msg('토큰 파일을 받았어요. 맵툴 맵 위로 끌어다 놓아 보세요.'); }, function (er) { msg('만들지 못했어요: ' + er.message); }); }
      else if ((k === 'copy' || k === 'loader') && fmt() === 'new') msg('「Test : 망령 뉴 캠페인」 꼴은 토큰 파일로만 내보낼 수 있어요. (있는 토큰에 덮어쓰기는 기존 캠페인 꼴에서만)');
      else if (k === 'copy') copy(pasteText(), '시트 글을 복사했어요. 맵툴에서 토큰을 고르고 「시트 불러오기」에 붙여 넣으세요.');
      else if (k === 'loader') copy(LOADER, '매크로를 복사했어요. 캠페인 매크로 창에서 새 매크로를 만들고 붙여 넣으세요(이름은 「시트 불러오기」).'); };
  }
  window.D4EMt = { pcPart: pcPart, open: open, fmt: fmt, fmts: FMTS, newPack: newPack, guid: guid, uuid: uuid, loadZip: loadZip, xe: xe, md5: md5, powerMacro: powerMacro, skillMacro: skillMacro, tokenXml: tokenXml, pasteText: pasteText, loader: LOADER };
  document.addEventListener('DOMContentLoaded', function () { var b = document.getElementById('chMt'); if (b) b.onclick = open; var o = document.getElementById('chOne'); if (o) o.onclick = function () { window.D4EApp && window.D4EApp.onePage(); }; });
})();
