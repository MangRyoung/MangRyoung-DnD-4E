/* 맵툴 토큰(.rptok) · 맵(.rpmap) 파일을 읽어 제작기 몬스터 · 조우로 되돌린다.
   캠페인(4th) Monster 속성 구조를 거꾸로 읽는다: Level · MaxHP · AC · Fort · Reflex · Will · Mov · IniBonus · save · AP · Role · Memo1 · Memo2 · at1~at8(공격 JSON),
   비공격 버튼(특수 제작 꼴)은 매크로 본문에서 이름 · 효과를 읽는다. 제작기가 내보낸 토큰은 D4E 속성(원본 JSON)이 있어 그대로 되돌린다. */
(function () {
  'use strict';
  var ROLE = { '솔져': 'Soldier', '브루트': 'Brute', '아틸러리': 'Artillery', '스커미셔': 'Skirmisher', '컨트롤러': 'Controller', '럴커': 'Lurker', soldier: 'Soldier', brute: 'Brute', artillery: 'Artillery', skirmisher: 'Skirmisher', controller: 'Controller', lurker: 'Lurker', '병사': 'Soldier', '맹수': 'Brute', '포격': 'Artillery', '척후': 'Skirmisher', '제어': 'Controller', '잠복': 'Lurker' };
  var TIER = { '미니언': 'Minion', '엘리트': 'Elite', '솔로': 'Solo', minion: 'Minion', elite: 'Elite', solo: 'Solo', '졸개': 'Minion', '정예': 'Elite', '단독': 'Solo' };
  var FOOT = { 'fwABAc9lFSoFAAAAKgABAQ==': 1, 'fwABAdBlFSoGAAAAKgABAA==': 2, 'fwABAdBlFSoHAAAAKgABAA==': 3, 'fwABAdFlFSoIAAAAKgABAQ==': 4 };
  var SIZE_KO = { 2: '대형', 3: '초대형', 4: '거대형' };
  var ACT = { '일반': '일반', '이동': '이동', '간략': '보조', '보조': '보조', '자유 행동': '자유', '자유': '자유', '즉각 개입': '즉시 방해', '즉시 방해': '즉시 방해', '즉각 반응': '즉시 반응', '즉시 반응': '즉시 반응', '기회 행동': '기회', '기회': '기회', '-': '', '': '' };
  var VS = { AC: 'AC', Fort: '인내', Fortitude: '인내', Ref: '반사', Reflex: '반사', Will: '의지' };
  function unesc(s) { return String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&#(\d+);/g, function (x, n) { return String.fromCharCode(+n); }).replace(/&amp;/g, '&'); }
  function tag(x, t) { var m = new RegExp('<' + t + '>([\\s\\S]*?)</' + t + '>').exec(x); return m ? unesc(m[1]) : ''; }
  function text(html) { return String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ').trim(); }
  function num(v, d) { var m = /-?\d+/.exec(String(v == null ? '' : v)); return m ? m[0] : (d == null ? '' : d); }
  /* 토큰 XML 한 덩이 → { m: 몬스터, x, y, size, img: 그림 해시 } */
  function token(x) {
    var o = { m: null, x: +tag(x, 'x') || 0, y: +tag(x, 'y') || 0, size: 1, img: '' };
    var fm = /<sizeMap>[\s\S]*?<baGUID>([^<]+)<\/baGUID>/.exec(x); if (fm && FOOT[fm[1]]) o.size = FOOT[fm[1]];
    var im = /<imageAssetMap>[\s\S]*?<id>([0-9a-f]{32})<\/id>/.exec(x); if (im) o.img = im[1];
    var P = {}; x.replace(/<key>([^<]*)<\/key>\s*<value class="string">([\s\S]*?)<\/value>/g, function (a, k, v) { P[unesc(k).toLowerCase()] = unesc(v); return a; });
    var props = new Proxy(P, { get: function (o, k) { return typeof k === 'string' ? o[k.toLowerCase()] : o[k]; } });
    var name = tag(x, 'name'), label = tag(x, 'label');
    if (props.D4E) { try { var d = JSON.parse(props.D4E); if (d && d.n) { d.n = name || d.n; o.m = d; return o; } } catch (e) {} }
    var m = { id: '', n: name || '이름 없음', lv: +num(props.Level, 1) || 1, role: 'Skirmisher', tier: 'Standard', leader: false, type: '중형 자연 인간형', senses: '', speed: String(num(props.Mov, 6)), align: '무성향', lang: '', skills: '', eq: '', immune: '', resist: '', vuln: '', note: '', pw: [],
      hp: num(props.MaxHP || props.HP, ''), ac: num(props.AC || props.MaxAC), fort: num(props.Fort || props.MaxFort), ref: num(props.Reflex || props.MaxReflex), will: num(props.Will || props.MaxWill), init: num(props.IniBonus, 0), saves: '', ap: '', xp: '' };
    if (!m.fort && props.DisplayNAD) { var nd = String(props.DisplayNAD).split('/'); m.fort = num(nd[0]); m.ref = num(nd[1]); m.will = num(nd[2]); }
    var rl = String(props.Role || '').trim(), tr = TIER[label.trim()] || TIER[label.trim().toLowerCase()] || '';
    rl.split(/\s+/).forEach(function (w) { if (ROLE[w] || ROLE[w.toLowerCase()]) m.role = ROLE[w] || ROLE[w.toLowerCase()]; else if (TIER[w] || TIER[w.toLowerCase()]) tr = tr || TIER[w] || TIER[w.toLowerCase()]; if (/지휘|leader/i.test(w)) m.leader = true; });
    if (tr) m.tier = tr; if (num(props.MaxHP || props.HP, '') === '1' && !tr) m.tier = 'Minion';
    var sv = num(props.save || props.Save, ''), ap = num(props.AP, ''); if (sv && sv !== '0') m.saves = '+' + sv.replace(/^\+/, ''); if (ap && ap !== '0') m.ap = ap;
    if (o.size > 1) m.type = SIZE_KO[o.size] + ' 자연 인간형';
    String(props.Memo1 || '').split(/\s*\/\s*/).forEach(function (s) { s = s.trim(); if (!s) return; if (/^지휘$/.test(s)) m.leader = true; else if (/^감각\s/.test(s)) m.senses = s.replace(/^감각\s*/, ''); else if (/^이동\s/.test(s)) m.speed = s.replace(/^이동\s*/, ''); else m.note = (m.note ? m.note + '\n' : '') + s; });
    String(props.Memo2 || '').split(/\s*\/\s*/).forEach(function (s) { s = s.trim(); if (!s) return; if (/^면역\s/.test(s)) m.immune = s.replace(/^면역\s*/, ''); else if (/^저항\s/.test(s)) m.resist = s.replace(/^저항\s*/, ''); else if (/^취약\s/.test(s)) m.vuln = s.replace(/^취약\s*/, ''); else m.note = (m.note ? m.note + '\n' : '') + s; });
    /* 공격: at1~at8 */
    for (var i = 1; i <= 8; i++) { var raw = props['at' + i]; if (!raw) continue; var a; try { a = JSON.parse(raw); } catch (e) { continue; } if (!a || !a.AA_name) continue;
      var rg = String(a.AA_range || '').trim(), k = /원거리|ranged/i.test(rg) ? 'R' : /근거리|close/i.test(rg) ? 'C' : /범위|area/i.test(rg) ? 'A' : 'M', use = a.AA_usage === '#404040' ? '일일' : a.AA_usage === '#704040' ? (a.Recharge ? '재충전 ' + String(a.Recharge).replace(/^재충전\s*/, '') : '조우') : '무제한';
      if (!rg && (a.AA_bonus === '' || a.AA_bonus == null)) k = ''; else if (use === '무제한' && /기본|basic/i.test(a.AA_name) && (k === 'M' || k === 'R')) k = k.toLowerCase();
      var tgt = String(a.AA_target || '').trim(), head = [rg === '-' ? '' : rg, tgt && tgt !== '한 개체' && tgt !== '-' ? '대상: ' + tgt : ''].filter(Boolean); if (a.AA_bonus !== '' && a.AA_bonus != null) head.push((/^[+\-]/.test(String(a.AA_bonus)) ? '' : '+') + a.AA_bonus + ' vs. ' + (VS[a.AA_vs] || a.AA_vs || 'AC'));
      var dt = String(a.AA_dtype || '').replace(/피해\.?$/, '').trim(), dmg = a.AA_Dice ? String(a.AA_Dice) + ' ' + (dt ? dt + ' ' : '') + '피해' : '', hit = text(a.AA_hit).replace(/^[\s,;.]+/, ''), line = head.join('; ') + (dmg || hit ? (head.length ? '; ' : '') + (dmg && hit ? dmg + ', ' + hit : dmg || hit) : ''); if (line && !/[.!?)]$/.test(line)) line += '.';
      m.pw.push({ n: a.AA_name, k: k, act: ACT[String(a.AA_action || '').trim()] != null ? ACT[String(a.AA_action || '').trim()] : String(a.AA_action || ''), use: use, kw: String(a.AA_trait || ''), t: [a.AA_trigger && a.AA_trigger !== '-' ? '발동: ' + text(a.AA_trigger).replace(/^(발동|발동 조건|트리거)\s*:\s*/, '') : '', line, a.AA_effect ? '효과: ' + text(a.AA_effect).replace(/^효과\s*:\s*/, '') : ''].filter(Boolean).join('\n') }); }
    /* 비공격: 특수 제작 꼴(제목 칸 + 본문 칸) 또는 툴팁 */
    x.replace(/<net\.rptools\.maptool\.model\.MacroButtonProperties>([\s\S]*?)<\/net\.rptools\.maptool\.model\.MacroButtonProperties>/g, function (all, b) {
      var g = tag(b, 'group'), lab = tag(b, 'label'), cmd = tag(b, 'command'); if (!/^1-/.test(g) || /json\.toVars\(at/.test(cmd) || !lab || / 수정$/.test(lab)) return all;
      var eff = '', mm = /<td>\s*(?:&nbsp;)?\s*([\s\S]*?)<\/td>\s*<\/tr>\s*<\/table>/i.exec(cmd); if (mm) eff = text(mm[1]); else eff = text(tag(b, 'toolTip')) || text(cmd.replace(/\[[^\]]*\]/g, ''));
      if (m.pw.some(function (p) { return p.n === lab; })) return all;
      var au = /^오라\s*(\d+)\s*[;:,.]?\s*/.exec(eff); if (au) m.pw.push({ n: lab, k: 'aura', act: '', use: '오라 ' + au[1], kw: '', t: eff.slice(au[0].length) }); else m.pw.push({ n: lab, k: '', act: '', use: '', kw: '', t: eff }); return all; });
    o.m = m; return o; }
  async function unzip(file) { var U = window.D4EMt; await U.loadZip(); var z = await window.JSZip.loadAsync(file), c = z.file('content.xml'); if (!c) throw new Error('맵툴 파일이 아니에요 (content.xml 없음).'); return { zip: z, xml: await c.async('string') }; }
  function assetFile(zip, hash) { if (!hash) return null; var f = null; zip.forEach(function (p, e) { if (!f && !e.dir && new RegExp('^assets/' + hash + '\\.(png|jpe?g|webp|gif|bmp)$', 'i').test(p)) f = e; }); return f; }
  async function assetAsFile(zip, hash, name) { var f = assetFile(zip, hash); if (!f) return null; var ext = (/\.(\w+)$/.exec(f.name) || [])[1].toLowerCase(), b = await f.async('blob'); return new File([b], (name || 'asset') + '.' + ext, { type: 'image/' + (ext === 'jpg' ? 'jpeg' : ext) }); }
  /* .rptok → { m, x, y, size } (그림은 m.img 에 넣어 둠) */
  async function tokenFile(file) { var r = await unzip(file), o = token(r.xml); if (!o.m) throw new Error('토큰을 읽지 못했어요.');
    var im = await assetAsFile(r.zip, o.img, 'tok'); if (im && !o.m.img) { try { o.m.img = await window.D4EMon.readImg(im); } catch (e) {} }
    delete o.m.id; return o; }
  /* .rpmap → { name, cell, ox, oy, mapFile, mons: [몬스터], toks: [{ m: 몬스터 번호, x, y, s }] } — 같은 이름(번호 뗀)의 토큰은 한 몬스터로 묶는다 */
  async function mapFile(file) { var r = await unzip(file), x = r.xml, out = { name: String(file.name || '').replace(/\.rpmap$/i, ''), cell: +tag(/<grid[\s\S]*?<\/grid>/.exec(x) ? /<grid[\s\S]*?<\/grid>/.exec(x)[0] : '', 'size') || 50, ox: 0, oy: 0, mapFile: null, mons: [], toks: [] };
    var gd = /<grid[\s\S]*?<\/grid>/.exec(x); if (gd) { out.ox = +tag(gd[0], 'offsetX') || 0; out.oy = +tag(gd[0], 'offsetY') || 0; }
    var mh = /<mapAsset>\s*<id>([0-9a-f]{32})<\/id>/.exec(x); if (mh) out.mapFile = await assetAsFile(r.zip, mh[1], out.name || 'map');
    var tm = /<tokenMap>([\s\S]*?)<\/tokenMap>/.exec(x), byKey = {}, c = out.cell;
    if (tm) { var parts = tm[1].match(/<net\.rptools\.maptool\.model\.Token>[\s\S]*?<\/net\.rptools\.maptool\.model\.Token>/g) || [];
      for (var i = 0; i < parts.length; i++) { if (!/<propertyType>Monster<\/propertyType>/.test(parts[i]) || /<tokenType>PC<\/tokenType>/.test(parts[i])) continue; var o = token(parts[i]); if (!o.m) continue;
        var base = o.m.n.replace(/\s+\d+$/, ''), key = base + '|' + o.img + '|' + o.m.lv, mi = byKey[key];
        if (mi == null) { o.m.n = base; delete o.m.id; var im = await assetAsFile(r.zip, o.img, 'tok'); if (im && !o.m.img) { try { o.m.img = await window.D4EMon.readImg(im); } catch (e) {} } mi = byKey[key] = out.mons.length; out.mons.push(o.m); }
        out.toks.push({ m: mi, x: Math.round((o.x - out.ox) / c), y: Math.round((o.y - out.oy) / c), s: o.size }); } }
    /* 맵툴 격자 밀기는 0~칸 크기 사이의 값. 토큰이 음수 자리면 판 안으로 끌어온다 */
    var minx = Math.min.apply(null, out.toks.map(function (t) { return t.x; }).concat([0])), miny = Math.min.apply(null, out.toks.map(function (t) { return t.y; }).concat([0]));
    out.toks.forEach(function (t) { t.x -= minx; t.y -= miny; });
    return out; }
  function isTok(f) { return /\.rptok$/i.test((f && f.name) || ''); } function isMap(f) { return /\.rpmap$/i.test((f && f.name) || ''); }
  window.D4EMonIn = { tokenFile: tokenFile, mapFile: mapFile, token: token, isTok: isTok, isMap: isMap };
})();
