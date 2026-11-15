// 사용: node test/fighter.js <데이터 폴더>
const fs = require('fs'), path = require('path');
const D = require('../js/engine.js');
const dir = process.argv[2];
const db = new D.Db();
for (const g of JSON.parse(fs.readFileSync(path.join(dir, 'index.json'))).groups ? Object.keys(JSON.parse(fs.readFileSync(path.join(dir, 'index.json'))).groups) : [])
  db.add(JSON.parse(fs.readFileSync(path.join(dir, g + '.json'))));
const ch = { level: 1, abilities: { Strength: 16, Constitution: 14, Dexterity: 13, Intelligence: 10, Wisdom: 12, Charisma: 8 }, choices: {} };
let r = D.build(db, ch);
const pick = (pred, ids) => { const s = r.selects.find(pred); if (!s) throw new Error('칸 없음'); ch.choices[s.key] = ids; r = D.build(db, ch); return s; };
pick(s => s.type === 'Race', ['ID_FMP_RACE_7']);                 // 인간
pick(s => s.type === 'Class', ['ID_FMP_CLASS_3']);               // 파이터
pick(s => s.type === 'Race Ability Bonus', ['ID_INTERNAL_RACE_ABILITY_BONUS_STRENGTH']);
pick(s => s.type === 'Skill Training' && s.from === 'ID_FMP_CLASS_3', ['ID_INTERNAL_SKILL_TRAINING_ATHLETICS', 'ID_INTERNAL_SKILL_TRAINING_ENDURANCE', 'ID_INTERNAL_SKILL_TRAINING_INTIMIDATE']);
const aw = r.selects.find(s => s.type === 'Power' && s.from === 'ID_FMP_CLASS_3');
const awOpts = D.options(db, aw, r.vars);
ch.choices[aw.key] = [db.get('Cleave', 'Power').id, db.get('Reaping Strike', 'Power').id]; r = D.build(db, ch);
const feat = r.selects.find(s => s.type === 'Feat' && s.from === 'ID_INTERNAL_LEVEL_1');
ch.choices[feat.key] = ['ID_FMP_FEAT_171']; r = D.build(db, ch);  // Toughness
const enc = r.selects.find(s => s.name === 'Power Encounter 1'), encOpts = D.options(db, enc, r.vars);

const want = { 'strength': 18, 'hit points': 15 + 14 + 5, 'healing surges': 9 + 2, 'fortitude defense': 10 + 4 + 2 + 1, 'reflex defense': 10 + 1 + 1, 'will defense': 10 + 1 + 1, 'ac': 10 + 1, 'speed': 6, 'initiative': 1, 'athletics': 4 + 5, 'endurance': 2 + 5, 'intimidate': -1 + 5, 'acrobatics': 1 };
let bad = 0;
for (const k in want) { const got = r.stats[k]; const ok = got === want[k]; if (!ok) bad++; console.log((ok ? '맞음 ' : '틀림 ') + k.padEnd(20) + String(got).padStart(4) + '  (기대 ' + want[k] + ')'); }
console.log('가진 요소', Object.keys(r.owned).length, '· 고르기 칸', r.selects.length, '· 계산 바퀴', r.passes, '· 경고', r.warnings.length);
console.log('파이터 1레벨 무한 파워 후보', awOpts.length, '· 조우 파워 후보', encOpts.length, encOpts.slice(0, 5).map(e => e.n).join(', '));
console.log('남은 칸:', r.selects.filter(s => !s.picked.length).map(s => s.type + (s.name ? '(' + s.name + ')' : '') + (s.optional ? '?' : '')).join(', '));
r.warnings.slice(0, 5).forEach(w => console.log('경고:', w));
ch.level = 11; r = D.build(db, ch);
console.log('11레벨: HP', r.stats['hit points'], '(기대', 15 + 15 + 60 + 10, ') 힘', r.stats['strength'], '포티', r.stats['fortitude defense'], '티어', !!r.owned['ID_INTERNAL_TIER_PARAGON']);
process.exit(bad ? 1 : 0);
