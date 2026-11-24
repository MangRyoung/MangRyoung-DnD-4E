/* 4판 자동화 구문 (2026-11-24 1단계: 파워의 명중 · 빗나감 · 효과 줄)
 * 한 줄 = 효과 하나.  [때:] 동작 인자 [대상] [지속]
 *   때   : 명중 | 빗나감 | 효과 | 치명타   (안 적으면 공격 파워는 명중, 아니면 효과)
 *   동작 : 상태 멍함,감속 | 지속피해 5 화염 | 반감 | 임시HP 식 | 회복 식 · 회복 서지+식
 *          기타 글 (걸어 두고 지속이 끝나면 풀리는 글 효과: 저항 · 보정 등)
 *          보정 명중+2,피해+4 (굴림에 실제로 더해짐. AC 인내 반사 의지 모든방어 · 내명중 내피해 = 이 대상에게 내가 칠 때)
 *          내성굴림 [+N] (바로 내성 굴림을 한 번 굴린다. 기본 자신)
 *          밀기 N | 당기기 N | 미끄러뜨리기 N | 순간이동 N | 시프트 N | 넘어뜨리기 | 메모 글
 *   대상 : 대상(기본) | 자신
 *   지속 : 내성 | 내다음턴끝 | 내다음턴시작 | 대상다음턴끝 | 대상다음턴시작 | 내턴끝 | 조우
 *   식   : 숫자 · 주사위 · 능력 이름(근력 건강 민첩 지능 지혜 매력) · 레벨 · 반레벨 을 + - 로 이은 것
 * 글을 읽는 곳은 여기 한 곳. 내보낼 때 compile() 이 맵툴이 실행할 JSON 으로 풀어 준다. */
(function (root) {
  'use strict';
  var WHEN = { '명중': 'h', '빗나감': 'm', '효과': 'e', '치명타': 'c' }, WHEN_KO = { h: '명중', m: '빗나감', e: '효과', c: '치명타' };
  /* 맵툴 상태 이름 = Lib:4E fx_add 의 목록 */
  var ST = [['실명', 'Blinded'], ['멍함', 'Dazed'], ['실청', 'Deafened'], ['지배됨', 'Dominated'], ['붙잡힘', 'Grabbed'], ['고정', 'Immobilized'], ['마크', 'Mark'], ['석화', 'PETRIFIED'], ['넘어짐', 'Prone'], ['구속', 'Restrained'], ['감속', 'Slowed'], ['기절', 'Stunned'], ['기습당함', 'Surprised'], ['무의식', 'Unconscious'], ['약화', 'Weakened'], ['전투불리', 'Disadvantage']];
  var ST_ALIAS = { '멍해짐': '멍함', '눈멈': '실명', '귀먹음': '실청', '지배': '지배됨', '잡힘': '붙잡힘', '이동불가': '고정', '표식': '마크', '엎어짐': '넘어짐', '속박': '구속', '둔화': '감속', '놀람': '기습당함', '기습': '기습당함', '전투 불리': '전투불리', '전투우위허용': '전투불리' };
  var ST_KEY = {}; ST.forEach(function (x) { ST_KEY[x[0]] = x[1]; });
  var DUR = { '내성': ['save', '', 0], '내다음턴끝': ['eot', 'me', 0], '내다음턴시작': ['sot', 'me', 0], '대상다음턴끝': ['eot', 't', 0], '대상다음턴시작': ['sot', 't', 0], '내턴끝': ['eot', 'me', 1], '조우': ['enc', '', 0] };
  var DUR_ALIAS = { '내성끝': '내성', '조우끝': '조우', '다음턴끝': '내다음턴끝', '다음턴시작': '내다음턴시작' };
  var MOVE = { '밀기': 1, '당기기': 1, '미끄러뜨리기': 1, '순간이동': 1, '시프트': 1 };
  var AB = { '근력': 'str', '힘': 'str', '건강': 'con', '체질': 'con', '민첩': 'dex', '지능': 'int', '지혜': 'wis', '매력': 'cha' };
  var TO = { '대상': 't', '자신': 's', '나': 's' };
  /* 보정: 맵툴 굴림에 실제로 더해지는 수치. 내명중 · 내피해 = 「이 대상에게 내가 칠 때」(대상에게 건다) */
  var MODK = { '명중': 'hit', '피해': 'dmg', 'AC': 'AC', 'ac': 'AC', '인내': 'Fort', '반사': 'Reflex', '의지': 'Will', '모든방어': 'all', '내명중': 'ahit', '내피해': 'admg' };
  var MODL = { hit: '명중', dmg: '피해', AC: 'AC', Fort: '인내', Reflex: '반사', Will: '의지', all: '모든 방어', ahit: '이 대상에게 내 명중', admg: '이 대상에게 내 피해' };
  function parseMods(t) { var out = [], bad = ''; String(t).split(/[,，]/).filter(Boolean).forEach(function (x) { var m = /^(.+?)([+\-]\d+)$/.exec(x); if (!m || !MODK[m[1]]) { bad = bad || x; return; } out.push([m[1] === 'ac' ? 'AC' : m[1], parseInt(m[2], 10)]); }); return bad ? { bad: bad } : { list: out }; }

  function isExpr(s) { return /^[+\-]?(\d+d\d+|\d+|근력|힘|건강|체질|민첩|지능|지혜|매력|레벨|반레벨)([+\-](\d+d\d+|\d+|근력|힘|건강|체질|민첩|지능|지혜|매력|레벨|반레벨))*$/.test(s); }
  /* 식 → 맵툴이 굴릴 글(숫자 · 주사위만). ctx = { str,con,dex,int,wis,cha (수정치), lv } */
  function calc(expr, ctx) { ctx = ctx || {}; var out = String(expr).replace(/근력|힘|건강|체질|민첩|지능|지혜|매력|반레벨|레벨/g, function (w) { var v = w === '레벨' ? (ctx.lv || 1) : w === '반레벨' ? Math.floor((ctx.lv || 1) / 2) : (ctx[AB[w]] || 0); return '(' + v + ')'; });
    out = out.replace(/\+\(-(\d+)\)/g, '-$1').replace(/-\(-(\d+)\)/g, '+$1').replace(/\((\d+)\)/g, '$1').replace(/^\(-(\d+)\)/, '-$1');
    if (!/d/i.test(out)) { try { var n = 0; out.replace(/[+\-]?\d+/g, function (t) { n += parseInt(t, 10); return t; }); return String(n); } catch (e) {} } return out; }

  function parseLine(raw, isAtk) {
    var line = String(raw).trim(); if (!line || line.charAt(0) === '#') return null;
    var w = isAtk === false ? 'e' : 'h', m = /^(명중|빗나감|효과|치명타)\s*[:：]\s*/.exec(line); if (m) { w = WHEN[m[1]]; line = line.slice(m[0].length); }
    var tk = line.split(/\s+/), head = tk.shift(), op = { w: w, k: '', to: 't' }, err = function (t) { return { err: t, raw: raw }; };
    if (head === '메모') { op.k = 'note'; op.t = tk.join(' '); return op.t ? op : err('메모 뒤에 글이 없어요'); }
    /* 뒤에서부터 대상 · 지속 낱말을 떼어 낸다 */
    var dur = null, to = null, cnd = ''; for (var guard = 0; guard < 3 && tk.length; guard++) { var last = tk[tk.length - 1], d = DUR_ALIAS[last] || last; if (DUR[d] && !dur) { dur = d; tk.pop(); } else if (TO[last] && !to) { to = TO[last]; tk.pop(); } else if (head === '보정' && (last === '근접' || last === '원거리') && !cnd) { cnd = last === '근접' ? 'm' : 'r'; tk.pop(); } else break; }
    if (head === '기타') { if (!tk.length) return err('기타 뒤에 글이 없어요'); op.k = 'etc'; op.t = tk.join(' '); op.to = to || 't'; op.d = dur || '내다음턴끝'; return op; }
    if (head === '내성굴림') { var sb = tk.join(''); if (sb && !/^[+\-]\d+$/.test(sb)) return err('내성굴림 뒤에는 +2 같은 보정만 와요'); op.k = 'sv'; op.b = sb ? parseInt(sb, 10) : 0; op.to = to || 's'; return op; }
    if (head === '보정') { var pm = parseMods(tk.join('')); if (pm.bad || !pm.list.length) return err('보정을 못 읽었어요' + (pm.bad ? ': ' + pm.bad : '') + ' (명중 피해 AC 인내 반사 의지 모든방어 내명중 내피해 뒤에 +2 같은 수)'); op.k = 'mod'; op.m = pm.list; if (cnd) op.c = cnd; op.to = to || 't'; op.d = dur || '내다음턴끝'; return op; }
    if (head === '반감') { if (tk.length) return err('반감 뒤에는 아무것도 안 붙어요'); op.w = 'm'; op.k = 'half'; return op; }
    if (head === '넘어뜨리기') { head = '상태'; tk = ['넘어짐']; dur = dur || '_man'; }
    if (head === '상태') { if (!tk.length) return err('상태 이름이 없어요'); var names = tk.join('').split(/[,，]/).filter(Boolean), bad = [];
      names = names.map(function (n) { n = ST_ALIAS[n] || n; if (!ST_KEY[n]) bad.push(n); return n; }); if (bad.length) return err('모르는 상태: ' + bad.join(', '));
      op.k = 'st'; op.s = names; op.to = to || 't'; op.d = dur || '내다음턴끝'; return op; }
    if (head === '지속피해') { if (!/^\d+$/.test(tk[0] || '')) return err('지속피해 뒤에 숫자가 있어야 해요'); op.k = 'og'; op.n = +tk[0]; op.ty = tk.slice(1).join(' '); op.to = to || 't'; op.d = dur || '내성'; return op; }
    if (head === '임시HP' || head === '임시hp') { if (!isExpr(tk.join(''))) return err('임시HP 뒤 식을 못 읽었어요'); op.k = 'thp'; op.v = tk.join(''); op.to = to || 's'; return op; }
    if (head === '회복') { var v = tk.join(''), sg = 0; if (/^서지/.test(v)) { sg = 1; v = v.slice(2).replace(/^\+/, ''); } if (v && !isExpr(v)) return err('회복 뒤 식을 못 읽었어요'); if (!v && !sg) return err('회복 뒤에 양이 없어요'); op.k = 'heal'; op.v = v; if (sg) op.sg = 1; op.to = to || 's'; return op; }
    if (MOVE[head]) { var n = tk.join(''); if (n && !isExpr(n)) return err(head + ' 뒤 칸 수를 못 읽었어요'); op.k = 'mv'; op.m = head; op.v = n; op.to = to || 't'; return op; }
    return err('모르는 동작: ' + head);
  }
  function parse(text, isAtk) { var ops = [], errs = []; String(text || '').split(/\n/).forEach(function (l, i) { var o = parseLine(l, isAtk); if (!o) return; if (o.err) errs.push({ line: i + 1, msg: o.err, raw: l }); else ops.push(o); }); return { ops: ops, errs: errs }; }
  function strOp(o, isAtk) { var def = isAtk === false ? 'e' : 'h', pre = o.k === 'half' ? '빗나감: ' : (o.w === def ? '' : WHEN_KO[o.w] + ': '), t = '';
    if (o.k === 'note') return pre + '메모 ' + o.t; if (o.k === 'half') return pre + '반감';
    if (o.k === 'st') { if (o.d === '_man' && o.s.length === 1 && o.s[0] === '넘어짐') return pre + '넘어뜨리기' + (o.to === 's' ? ' 자신' : ''); t = '상태 ' + o.s.join(',') + (o.to === 's' ? ' 자신' : '') + (o.d !== '내다음턴끝' ? ' ' + o.d : ''); }
    else if (o.k === 'etc') t = '기타 ' + o.t + (o.to === 's' ? ' 자신' : '') + (o.d !== '내다음턴끝' ? ' ' + o.d : '');
    else if (o.k === 'sv') t = '내성굴림' + (o.b ? ' ' + (o.b > 0 ? '+' : '') + o.b : '') + (o.to === 't' ? ' 대상' : '');
    else if (o.k === 'mod') t = '보정 ' + o.m.map(function (x) { return x[0] + (x[1] >= 0 ? '+' : '') + x[1]; }).join(',') + (o.c ? (o.c === 'm' ? ' 근접' : ' 원거리') : '') + (o.to === 's' ? ' 자신' : '') + (o.d !== '내다음턴끝' ? ' ' + o.d : '');
    else if (o.k === 'og') t = '지속피해 ' + o.n + (o.ty ? ' ' + o.ty : '') + (o.to === 's' ? ' 자신' : '') + (o.d !== '내성' ? ' ' + o.d : '');
    else if (o.k === 'thp') t = '임시HP ' + o.v + (o.to === 't' ? ' 대상' : '');
    else if (o.k === 'heal') t = '회복 ' + (o.sg ? '서지' + (o.v ? '+' + o.v : '') : o.v) + (o.to === 't' ? ' 대상' : '');
    else if (o.k === 'mv') t = o.m + (o.v ? ' ' + o.v : '') + (o.to === 's' ? ' 자신' : '');
    return pre + t; }
  function str(ops, isAtk) { return ops.map(function (o) { return strOp(o, isAtk); }).join('\n'); }

  /* 맵툴이 실행할 꼴로. 상태는 하나씩 나눈다. */
  function compile(ops, ctx) { var out = [];
    ops.forEach(function (o) { var b = { w: o.w, to: o.to === 's' ? 's' : 't' }, dd = DUR[o.d] || null, D = function (x) { if (o.d === '_man') { x.end = 'man'; x.endl = '일어날 때까지'; } else if (dd) { x.end = dd[0]; x.es = dd[1]; if (dd[2]) x.ns = 1; } return x; };
      if (o.k === 'half') out.push({ w: 'm', to: 't', k: 'half' });
      else if (o.k === 'note') out.push(Object.assign(b, { k: 'note', t: o.t }));
      else if (o.k === 'st') o.s.forEach(function (n) { out.push(D(Object.assign({}, b, { k: 'fx', lab: n === '전투불리' ? '전투 불리' : n, st: ST_KEY[n], og: 0, ogt: '' }))); });
      else if (o.k === 'etc') out.push(D(Object.assign(b, { k: 'fx', lab: o.t, st: '', og: 0, ogt: '' })));
      else if (o.k === 'sv') out.push(Object.assign(b, { k: 'sv', b: o.b || 0 }));
      else if (o.k === 'mod') { var md = { hit: 0, dmg: 0, AC: 0, Fort: 0, Reflex: 0, Will: 0, ahit: 0, admg: 0 }, lab = []; o.m.forEach(function (x) { var k = MODK[x[0]]; if (k === 'all') ['AC', 'Fort', 'Reflex', 'Will'].forEach(function (q) { md[q] += x[1]; }); else md[k] += x[1]; lab.push(MODL[k] + ' ' + (x[1] >= 0 ? '+' : '') + x[1]); }); if (o.c) md.c = o.c; out.push(D(Object.assign(b, { k: 'fx', lab: (o.c ? (o.c === 'm' ? '근접 ' : '원거리 ') : '') + lab.join(' · '), st: '', og: 0, ogt: '', mod: md }))); }
      else if (o.k === 'og') out.push(D(Object.assign(b, { k: 'fx', lab: '', st: '', og: o.n, ogt: o.ty || '' })));
      else if (o.k === 'thp') out.push(Object.assign(b, { k: 'thp', v: calc(o.v, ctx) }));
      else if (o.k === 'heal') out.push(Object.assign(b, { k: 'heal', v: o.v ? calc(o.v, ctx) : '0', sg: o.sg ? 1 : 0 }));
      else if (o.k === 'mv') out.push(Object.assign(b, { k: 'note', t: o.m + (o.v ? ' ' + calc(o.v, ctx) + '칸' : '') })); });
    return out; }

  /* ---------- 추천기: 영어 원문(Hit · Miss · Effect)을 읽어 구문 줄을 추천 ---------- */
  var EN_ST = [['blinded', '실명'], ['dazed', '멍함'], ['deafened', '실청'], ['dominated', '지배됨'], ['grabbed', '붙잡힘'], ['immobilized', '고정'], ['marked', '마크'], ['petrified', '석화'], ['restrained', '구속'], ['slowed', '감속'], ['stunned', '기절'], ['surprised', '기습당함'], ['unconscious', '무의식'], ['weakened', '약화']];
  var EN_AB = { strength: '근력', constitution: '건강', dexterity: '민첩', intelligence: '지능', wisdom: '지혜', charisma: '매력' };
  var EN_TY = { fire: '화염', cold: '냉기', acid: '산성', lightning: '번개', thunder: '천둥', poison: '독', necrotic: '사령', radiant: '광휘', psychic: '정신', force: '역장' };
  function enDur(s) { if (/save ends/.test(s)) return '내성'; if (/until the end of your next turn/.test(s)) return '내다음턴끝'; if (/until the start of your next turn/.test(s)) return '내다음턴시작';
    if (/until the end of (its|the target.s|his or her|their) next turn/.test(s)) return '대상다음턴끝'; if (/until the start of (its|the target.s|his or her|their) next turn/.test(s)) return '대상다음턴시작'; if (/until the end of the encounter/.test(s)) return '조우'; if (/until the end of your (current )?turn/.test(s)) return '내턴끝'; return ''; }
  function enExpr(s) { /* "5", "your Wisdom modifier", "3 + your Constitution modifier", "one-half your level" */
    var t = String(s).toLowerCase().trim().replace(/\bone-half your level\b/g, '반레벨').replace(/\byour level\b/g, '레벨').replace(/\b(?:your )?(strength|constitution|dexterity|intelligence|wisdom|charisma) modifier\b/g, function (a, b) { return EN_AB[b]; }).replace(/\s+/g, '');
    return isExpr(t) ? t : ''; }
  function suggestField(text, when, isAtk) { var out = [], pre = (when === (isAtk ? 'h' : 'e')) ? '' : WHEN_KO[when] + ': ', push = function (l) { l = pre + l; if (out.indexOf(l) < 0) out.push(l); };
    String(text || '').replace(/\s+/g, ' ').split(/(?<=[.;])\s+|\.\s*$/).forEach(function (sen0) { var sen = sen0.toLowerCase().trim(); if (!sen) return;
      if (/^(level \d+|aftereffect|first failed|second failed|each failed|sustain|augment)/.test(sen)) return; /* 레벨별 피해 · 후속 효과 · 유지는 다음 단계 */
      if (/\b(if|when|whenever|unless|instead|one of the following|choose)\b/.test(sen) && !/\bif the attack hits\b/.test(sen)) return; /* 조건이 붙은 문장은 추천하지 않는다 */
      var dur = enDur(sen), self = /^(you|until[^,]*, you)\b/.test(sen) && !/\byou (push|pull|slide|knock)\b/.test(sen), tgt = /\b(the|each|that|primary|secondary) target\b|\bit (is|takes|falls)\b|\bthe target\b/.test(sen), who = self ? ' 자신' : '';
      if (/\ba target hit (once|twice|three)|\b(ally|allies|each enemy|enemies|creature)\b/.test(sen) && !tgt) return; /* 여러 번 맞은 대상 · 아군 · 다른 크리처 이야기는 손으로 */
      if (when !== 'e' && !self) tgt = true; /* 명중 · 빗나감 줄은 주어가 없으면 대상 */
      if (!self && !tgt && !/\byou (push|pull|slide|knock)\b/.test(sen)) return;
      /* 상태: 「주어 is 상태[, 상태 and 상태]」 꼴만. 주어가 you 면 자신, 아니면 대상. 주어 없이 and is … 로 이어지면 앞 주어를 따른다 */
      var ST_RE = '(?:' + EN_ST.map(function (x) { return x[0]; }).join('|') + ')', lastSub = self ? 's' : (tgt ? 't' : ''), by = { t: [], s: [] };
      sen.replace(new RegExp('(?:\\b(you|the target|each target|that target|the primary target|the secondary target|it|the enemy)\\s+(?:is|are|becomes?)|(?:\\band|,)\\s+(?:is|are))\\s+(?:also\\s+)?((?:' + ST_RE + '(?:,\\s*(?:and\\s+)?|\\s+and\\s+|\\s+or\\s+)?)+)', 'g'), function (all, sub, list) {
        if (sub) lastSub = sub === 'you' ? 's' : 't'; if (!lastSub || /\bor\b/.test(list)) return all; EN_ST.forEach(function (x) { if (new RegExp('\\b' + x[0] + '\\b').test(list) && by[lastSub].indexOf(x[1]) < 0) by[lastSub].push(x[1]); }); return all; });
      if (/\b(the|each|that) target grants? combat advantage|\bit grants? combat advantage|and grants? combat advantage/.test(sen)) by.t.push('전투불리');
      ['t', 's'].forEach(function (k) { if (by[k].length) push('상태 ' + by[k].join(',') + (k === 's' ? ' 자신' : '') + (dur && dur !== '내다음턴끝' ? ' ' + dur : '')); });
      var og = /ongoing (\d+)( [a-z]+)?( and [a-z]+)? damage/.exec(sen); if (og) { var ty = [og[2], og[3]].filter(Boolean).map(function (x) { x = x.replace(/ and /, '').trim(); return EN_TY[x] || ''; }).filter(Boolean).join(','); push('지속피해 ' + og[1] + (ty ? ' ' + ty : '') + who + (dur && dur !== '내성' ? ' ' + dur : '')); }
      if (/knock(s|ed)?( the target| it)? prone|falls? prone|is knocked prone|and (it is |is )?prone\b/.test(sen)) push('넘어뜨리기' + who);
      var mv = /\b(push|pull|slide)(?:es|s)? (?:the|each|that) target(?: up to)? (\d+|a number of squares equal to [^.,;]+?modifier)(?: squares?)?/.exec(sen);
      if (mv) { var n = /^\d+$/.test(mv[2]) ? mv[2] : enExpr(mv[2].replace(/a number of squares equal to/, '')); if (n) push({ push: '밀기', pull: '당기기', slide: '미끄러뜨리기' }[mv[1]] + ' ' + n); }
      /* 글 효과: 저항 · 보정 · 벌점. 「against … / when … / while …」 같은 꼬리가 붙으면 추천하지 않는다 */
      var rs = /\b(you|the target) gains? resist (\d+) to all damage\b/.exec(sen); if (rs) push('기타 저항 ' + rs[2] + (rs[1] === 'you' ? ' 자신' : '') + (dur && dur !== '내다음턴끝' ? ' ' + dur : ''));
      var bn = /\b(you gain|the target gains|the target takes|each target takes|it takes) an? ([+\-–]\d+) (?:power |racial |feat |item |untyped )?(bonus|penalty) to (melee |ranged |weapon )?(attack rolls|damage rolls|all defenses|ac|fortitude|reflex|will|speed|saving throws)(?: defense)?(.*)$/.exec(sen);
      if (bn && !/\b(against|when|whenever|while)\b/.test(bn[6]) && !/^\s*(with|of|for|on)\b/.test(bn[6])) { var what = { 'attack rolls': '명중', 'damage rolls': '피해', 'all defenses': '모든 방어', ac: 'AC', fortitude: '인내', reflex: '반사', will: '의지', speed: '속도', 'saving throws': '내성 굴림' }[bn[5]], mr = bn[4] === 'melee ' ? ' 근접' : bn[4] === 'ranged ' ? ' 원거리' : ''; var mk = { '명중': '명중', '피해': '피해', 'AC': 'AC', '인내': '인내', '반사': '반사', '의지': '의지', '모든 방어': '모든방어' }[what], tail = (/^you/.test(bn[1]) ? ' 자신' : '') + (dur && dur !== '내다음턴끝' ? ' ' + dur : ''); push(mk ? '보정 ' + mk + bn[2].replace('–', '-') + mr + tail : '기타 ' + what + ' ' + bn[2].replace('–', '-') + tail); }
      var th = /\b(you|the target) gains? (\d+|temporary hit points equal to [^.,;]+?(?:modifier|level))( temporary hit points)?/.exec(sen); if (th && /temporary hit points/.test(sen)) { var e = /^\d+$/.test(th[2]) ? th[2] : enExpr(th[2].replace(/temporary hit points equal to/, '')); if (e) push('임시HP ' + e + (th[1] === 'you' ? '' : ' 대상')); }
      var shf = /^you (?:can |may )?shift (\d+) squares?/.exec(sen); if (shf) push('시프트 ' + shf[1] + ' 자신');
      var sv = /\b(you|the target|each target|that ally|the ally)(?: can| may)? makes? a saving throw(?: with a ([+\-–]\d+) (?:power |racial |feat )?bonus)?/.exec(sen); if (sv) push('내성굴림' + (sv[2] ? ' ' + sv[2].replace('–', '-') : '') + (sv[1] === 'you' ? '' : ' 대상'));
      if (/^you (can |may )?spend a healing surge\b/.test(sen) || /^you regain hit points as if you had spent a healing surge/.test(sen)) push('회복 서지');
    });
    return out; }
  function suggest(sp, isAtk) { sp = sp || {}; var out = []; if (isAtk == null) isAtk = !!(sp['Attack'] || sp['Primary Attack']);
    if (isAtk) { out = out.concat(suggestField(sp['Hit'], 'h', true)); if (/half damage/i.test(String(sp['Miss'] || ''))) out.push('빗나감: 반감'); out = out.concat(suggestField(String(sp['Miss'] || '').replace(/half damage( per attack)?(, and)?/i, ''), 'm', true)); }
    out = out.concat(suggestField(sp['Effect'], 'e', isAtk)); if (sp['Power'] && !sp['Power Usage']) out = out.concat(suggestField(String(sp['Power']).replace(/^[^.]*\.\s*(?:(?:Minor|Standard|Move|Free|No|Immediate \w+) Action\.\s*)?/i, ''), 'e', false)); return out; }

  root.D4EFx = { parse: parse, str: str, compile: compile, suggest: suggest, calc: calc, states: ST.map(function (x) { return x[0]; }), durs: Object.keys(DUR) };
  if (typeof module !== 'undefined') module.exports = root.D4EFx;
})(typeof window !== 'undefined' ? window : globalThis);
