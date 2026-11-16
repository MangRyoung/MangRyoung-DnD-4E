/* 몬스터 번역 틀: 자료집(영어 원문)을 화면에서 한글로 바꿔 보여 준다. 원문은 그대로 두고, 「원문」 탭에서 본다.
 * 이름은 낱말 사전으로 조합하고, 본문은 4판 스탯 블록에 되풀이되는 꼴을 규칙으로 옮긴 뒤 남은 용어를 용어집으로 바꾼다.
 * 규칙으로 못 옮긴 문장은 영어가 섞여 남는다 — 그 몬스터는 「바탕으로 새로 만들기」로 손봐서 쓴다. */
(function () {
  'use strict';
  /* 낱말 사전 (소문자). 이름 · 파워 이름 조합에 쓴다 */
  var W = {
    aboleth: '아볼레스', lasher: '채찍꾼', overseer: '감독관', servitor: '종복', slime: '점액', mage: '마법사', abyssal: '어비스', ghoul: '구울', hungerer: '굶주린 자', myrmidon: '미르미돈',
    adult: '성체', young: '어린', elder: '고령', ancient: '고대', blue: '푸른', green: '녹색', red: '붉은', white: '흰', black: '검은', gray: '회색', dragon: '용', angel: '천사', battle: '전투', protection: '수호', valor: '용맹',
    legionnaire: '군단병', veteran: '고참', aspect: '화신', orcus: '오르쿠스', astral: '아스트랄', stalker: '추적자', atropal: '아트로팔', azer: '아제르', foot: '보', soldier: '병사', taskmaster: '감독', warrior: '전사',
    balhannoth: '발하노스', balor: '발로르', banshrae: '반슈레', dartswarmer: '독침꾼', guardian: '수호자', wight: '와이트', commander: '지휘관', bearded: '수염', devil: '데빌', barbazu: '바르바주', beholder: '비홀더', eye: '눈', flame: '화염',
    berbalang: '베르발랑', slaad: '슬라드', void: '공허', blackfire: '흑염', dracolich: '드라코리치', blackroot: '검은뿌리', treant: '트린트', blackscale: '검은비늘', bruiser: '싸움꾼', blackspawn: '흑룡족', gloomweb: '암흑거미줄',
    blade: '칼날', spider: '거미', blazing: '타오르는', skeleton: '해골', blood: '피', fiend: '마귀', bloodfire: '혈염', harpy: '하피', bloodspike: '혈극', behemoth: '베헤모스', bloodweb: '혈망', swarm: '무리', talon: '갈퀴',
    bluespawn: '청룡족', godslayer: '신살자', bodak: '보닥', reaver: '약탈자', bog: '늪', hag: '해그', bone: '뼈', osyluth: '오실루스', naga: '나가', boneclaw: '본클로', boneshard: '뼛조각', bralani: '브랄라니', autumn: '가을', winds: '바람',
    briar: '가시', witch: '마녀', dryad: '드라이어드', bugbear: '버그베어', strangler: '교살자', bulette: '불레트', cacklefiend: '낄낄마귀', hyena: '하이에나', cambion: '캠비온', hellfire: '지옥불', magus: '마도사', hellsword: '지옥검',
    carrion: '시체', crawler: '벌레', cave: '동굴', bear: '곰', cavern: '동굴', choker: '초커', chain: '사슬', kyton: '카이톤', chillborn: '냉기', zombie: '좀비', chimera: '키메라', chuul: '추울', juggernaut: '저거너트', clay: '점토', scout: '정찰병',
    corruption: '부패', corpse: '시체', crimson: '진홍', acolyte: '복사', crownwing: '관날개', crushgrip: '조임', constrictor: '구렁이', cyclops: '사이클롭스', battleweaver: '전투 직조사', guard: '경비병', hewer: '벌목꾼', impaler: '꿰뚫는 자',
    rambler: '방랑자', storm: '폭풍', shaman: '주술사', dark: '어둠', creeper: '크리퍼', death: '죽음', giant: '거인', knight: '기사', human: '인간', fighter: '파이터', titan: '타이탄', deathjump: '죽음도약', deathlock: '데스록',
    deathpriest: '죽음의 사제', hierophant: '대사제', deathrattle: '죽음방울', viper: '독사', decrepit: '낡은', demonweb: '데몬웹', terror: '공포', destrachan: '데스트라찬', far: '먼', voice: '목소리', dire: '다이어', boar: '멧돼지', rat: '쥐', wolf: '늑대',
    displacer: '변위', beast: '야수', packlord: '무리 우두머리', doppelganger: '도플갱어', assassin: '암살자', sneak: '잠입자', doresain: '도레사인', king: '왕', dragonborn: '드래곤본', champion: '용사', gladiator: '검투사', raider: '습격자',
    drider: '드라이더', fanglord: '송곳니 군주', shadowspinner: '그림자 방적사', drow: '드로우', arachnomancer: '거미술사', blademaster: '검의 달인', dusk: '황혼', unicorn: '유니콘', dwarf: '드워프', bolter: '석궁병', hammerer: '망치병',
    earthrage: '대지분노', battlebriar: '전투가시나무', earthwind: '흙바람', ravager: '파괴자', efreet: '이프리트', cinderlord: '잿불 군주', fireblade: '화염검', flamestrider: '화염주자', karadjin: '카라진', pyresinger: '화장가수',
    eidolon: '에이돌론', eladrin: '엘라드린', fey: '요정', lich: '리치', twilight: '황혼', incanter: '주문사', elf: '엘프', archer: '궁수', enormous: '거대', ettercap: '에터캡', fang: '송곳니', webspinner: '거미줄 방적사', ettin: '에틴',
    marauder: '약탈자', 'spirit-talker': '영혼 대화자', evistro: '에비스트로', fell: '흉악한', troll: '트롤', wyvern: '와이번', fen: '소택지', hydra: '히드라', panther: '표범', feygrove: '요정숲', feymire: '요정늪', crocodile: '악어',
    fire: '불', archon: '아콘', ash: '재', disciple: '사도', emberguard: '잉걸불 경비병', bat: '박쥐', beetle: '딱정벌레', firelasher: '화염채찍', snake: '뱀', flameskull: '화염해골', flesh: '살점', golem: '골렘', fomorian: '포모리안',
    painbringer: '고통을 주는 자', foulspawn: '파울스폰', berserker: '광전사', grue: '그루', hulk: '거한', mangler: '난도질꾼', seer: '선견자', galeb: '갈렙', duhr: '두르', earthbreaker: '대지파괴자', rockcaller: '바위 부름꾼', gargoyle: '가고일',
    gelatinous: '젤라틴', cube: '큐브', ghaele: '가엘', winter: '겨울', mummy: '미라', gibbering: '지껄이는', abomination: '흉물', mouther: '마우서', orb: '오브', githyanki: '기스양키', gish: '기쉬', mindslicer: '정신절단자', githzerai: '기스제라이',
    cenobite: '수도자', mindmage: '정신마법사', zerth: '제르스', glabrezu: '글라브레주', gnoll: '놀', claw: '발톱', demonic: '악마', scourge: '채찍', huntmaster: '사냥대장', gnome: '노움', arcanist: '비전술사', skulk: '은신꾼', goblin: '고블린',
    blackblade: '검은칼', cutter: '칼잡이', hexer: '저주술사', sharpshooter: '명사수', skullcleaver: '해골쪼개기', underboss: '부두목', godforged: '신이 벼린', colossus: '거상', goristro: '고리스트로', gravehound: '무덤사냥개', rift: '균열',
    great: '대', greater: '상급', helmed: '투구', horror: '공포', curse: '저주', greenscale: '녹색비늘', darter: '독침병', hunter: '사냥꾼', grell: '그렐', philosopher: '철학자', grick: '그릭', alpha: '우두머리', griffon: '그리폰', grimlock: '그림록',
    follower: '추종자', minion: '졸개', drake: '드레이크', guulvorg: '굴보그', halfling: '하플링', prowler: '배회자', slinger: '투석병', stout: '억센', thief: '도둑', hell: '지옥', hound: '사냥개', hellstinger: '지옥침', scorpion: '전갈',
    hezrou: '헤즈로', hill: '언덕', hippogriff: '히포그리프', dreadmount: '공포의 탈것', hobgoblin: '홉고블린', grunt: '졸병', hand: '손', bane: '베인', warcaster: '전투술사', hook: '갈고리', horde: '무리', howling: '울부짖는', bandit: '산적',
    lackey: '하수인', rabble: '오합지졸', ice: '얼음', frostshaper: '서리 조형사', hailscourge: '우박 채찍', rimehammer: '서리망치', imp: '임프', iron: '무쇠', cobra: '코브라', gorgon: '고르곤', kobold: '코볼트', dragonshield: '용방패',
    skirmisher: '척후병', slyblade: '교활한 칼', wyrmpriest: '용사제', kruthik: '크루식', hatchling: '새끼', hive: '군락', lord: '군주', 'kuo-toa': '쿠오토아', harpooner: '작살병', monitor: '감시자', whip: '채찍', lamia: '라미아', larva: '유충',
    legion: '군단', hellguard: '지옥 경비병', wizard: '위저드', vestige: '잔재', macetail: '철퇴꼬리', mad: '미친', wraith: '레이스', magma: '마그마', brute: '맹수', hurler: '투척꾼', strider: '주자', manticore: '만티코어', marilith: '마릴리스',
    marut: '마루트', concordant: '조율자', medusa: '메두사', female: '여성', male: '남성', mezzodemon: '메조데몬', mind: '마인드', flayer: '플레이어', infiltrator: '침투자', mastermind: '주모자', minotaur: '미노타우로스', mordant: '부식',
    nabassu: '나바수', needlefang: '바늘이빨', night: '밤', nightmare: '나이트메어', nightwalker: '나이트워커', ochre: '황토', jelly: '젤리', ogre: '오우거', bludgeoneer: '곤봉꾼', savage: '야만', warhulk: '전쟁 거한', oni: '오니', haunter: '출몰자',
    orc: '오크', bloodrager: '피의 격노자', chieftain: '족장', drudge: '막일꾼', otyugh: '오티유', phane: '페인', phantom: '환영', phoenix: '불사조', pit: '구덩이', primordial: '태고', pseudodragon: '유사용', purple: '보라', worm: '벌레',
    quickling: '퀴클링', runner: '주자', zephyr: '산들바람', rakshasa: '락샤사', dread: '공포', noble: '귀족', razorclaw: '면도날발톱', redspawn: '적룡족', firebelcher: '불 토하는 자', riding: '승용', horse: '말', rimefire: '서리불', roc: '로크',
    rockfire: '바위불', dreadnought: '드레드노트', roper: '로퍼', rot: '부패', harbinger: '전조', rotwing: '썩은날개', sahuagin: '사후아긴', baron: '남작', salamander: '샐러맨더', firetail: '불꼬리', lancer: '창기병', satyr: '사티로스', piper: '피리꾼',
    'shadar-kai': '샤다르카이', chainfighter: '사슬 투사', gloomblade: '암흑검', shadow: '그림자', shadowhunter: '그림자사냥', shadowraven: '그림자까마귀', shield: '방패', skeletal: '해골', tomb: '무덤', skull: '해골', tadpole: '올챙이',
    slaughter: '도살', snaketongue: '뱀혀', initiate: '입문자', zealot: '광신도', sorrowsworn: '슬픔의 맹세자', deathlord: '죽음 군주', soulripper: '영혼 찢는 자', soulspike: '영혼가시', devourer: '포식자', specter: '스펙터', spectral: '유령',
    sphinx: '스핑크스', spined: '가시', spinagon: '스피나곤', spiretop: '첨탑', spirit: '영혼', spitting: '침 뱉는', stirge: '스터지', stone: '돌', 'stone-eye': '돌눈', basilisk: '바실리스크', stormclaw: '폭풍발톱', stormrage: '폭풍분노',
    shambler: '섐블러', succubus: '서큐버스', sword: '검', swordwing: '검날개', tangler: '얽는', tarrasque: '타라스크', thunderblast: '천둥폭발', cyclone: '회오리', thunderfury: '천둥분노', thunderhawk: '천둥매', tiefling: '티플링',
    darkblade: '어둠검', heretic: '이단자', tormenting: '괴롭히는', ghost: '유령', trap: '함정', haunt: '귀신', troglodyte: '트로글로다이트', chanter: '영창자', mauler: '강타꾼', umber: '엄버', vampire: '뱀파이어', rogue: '로그',
    spawn: '권속', bloodhunter: '피 사냥꾼', fleshripper: '살 찢는 자', 'venom-eye': '독눈', vine: '덩굴', viscera: '내장', visejaw: '바이스턱', vrock: '브록', wailing: '통곡하는', war: '전쟁', warforged: '워포지드', captain: '대장',
    warhorse: '군마', warthorn: '전쟁가시', wererat: '쥐인간', werewolf: '늑대인간', winterclaw: '겨울발톱', owlbear: '아울베어', worg: '워그', 'yuan-ti': '유안티', anathema: '아나테마', malison: '말리슨', zehir: '제히르', 'sharp-eye': '예리한 눈',
    rotter: '부패체', kraken: '크라켄', and: '·',
    /* 파워 이름에 자주 나오는 낱말 */
    bite: '물기', claws: '발톱', slam: '후려치기', double: '2연속', attack: '공격', combat: '전투', advantage: '우위', short: '소', breath: '숨결', weapon: '무기', frightful: '무시무시한', presence: '위압', longsword: '롱소드',
    bloodied: '반죽음', greatsword: '그레이트소드', dagger: '단검', greataxe: '그레이트액스', flyby: '스치는', spear: '창', threatening: '위협적인', reach: '간격', scimitar: '시미터', trident: '삼지창', change: '변신', shape: '모습',
    deceptive: '기만의', veil: '장막', step: '걸음', longbow: '롱보우', tentacle: '촉수', tentacles: '촉수', gore: '들이받기', club: '곤봉', trample: '짓밟기', battleaxe: '배틀액스', invisibility: '투명화', second: '재기의', wind: '숨',
    quarterstaff: '쿼터스태프', evil: '사악한', greatclub: '그레이트클럽', pack: '무리', javelin: '투창', shifty: '날쌘 발', sense: '감지', mobile: '기동', melee: '근접', cloud: '구름', darkness: '어둠', frenzy: '광란', slick: '미끄러운',
    maneuver: '기동', warhammer: '워해머', strike: '일격', goring: '들이받는', charge: '돌격', squad: '분대', defense: '방어', fury: '격노', crossbow: '석궁', morningstar: '모닝스타', phalanx: '밀집 대형', rake: '할퀴기', nimble: '날랜',
    reaction: '반응', "warrior's": '전사의', surge: '쇄도', jaunt: '도약', stench: '악취', mucus: '점액', haze: '안개', dominate: '지배', necrotic: '사령', clamping: '조이는', jaws: '턱', glaive: '글레이브', spiked: '가시', draconic: '용의',
    lightning: '번개', burst: '폭발', thunderclap: '뇌성', luring: '유혹하는', glare: '눈빛', "dragon's": '용의', bastard: '바스타드', sting: '쏘기', web: '거미줄', longspear: '롱스피어', dead: '죽은', unarmed: '맨손', handaxe: '손도끼',
    sniper: '저격수', shroud: '장막', sling: '투석구', kick: '발차기', mace: '메이스', 'many-headed': '여러 머리', gnashing: '갈아대는', aura: '오라', ray: '광선', hooves: '발굽', bleak: '황량한', visage: '얼굴', healing: '치유',
    glide: '활공', weakness: '약점', enslave: '노예화', maul: '모울', venomous: '독', gaze: '응시', petrifying: '석화', tail: '꼬리', sweep: '휩쓸기', rays: '광선', agonizing: '고통의', form: '형상', choke: '조르기', chameleon: '카멜레온',
    hide: '가죽', net: '그물', swallow: '삼키기', killing: '죽이는', stunning: '기절시키는', screech: '비명', sound: '음파', pulse: '파동', bellowing: '포효하는', blast: '분사', fear: '공포', freezing: '얼리는', corrupting: '타락의',
    touch: '손길', devour: '삼키기', "beast's": '야수의', displacement: '변위', shapeshifter: '변신체', feint: '속임수', vitriolic: '부식성', spray: '분무', lashing: '후려치는', immolate: '불사르기', foe: '적', icy: '얼음', katar: '카타르',
    of: '의', the: '', cold: '냉기', acid: '산성', poison: '독', psychic: '정신', radiant: '광휘', thunder: '천둥', force: '역장', power: '힘', wave: '파도', bolt: '화살', hammer: '망치', axe: '도끼', bow: '활', staff: '지팡이', rod: '막대',
    wand: '완드', fist: '주먹', fists: '주먹', horn: '뿔', horns: '뿔', wing: '날개', wings: '날개', teeth: '이빨', scream: '비명', howl: '울부짖음', roar: '포효', curse: '저주', hex: '저주', mark: '표식', shot: '사격', throw: '던지기',
    grab: '붙잡기', pounce: '덮치기', rend: '찢기', crush: '으깨기', smash: '강타', lash: '채찍질', stab: '찌르기', slash: '베기', swipe: '휘두르기', rush: '돌진', leap: '도약', teleport: '순간이동', regeneration: '재생', resistance: '저항',
    immunity: '면역', insubstantial: '비실체', swarm: '무리', flight: '비행', storm: '폭풍', flames: '화염', frost: '서리', stone: '돌', earth: '대지', water: '물', air: '공기', soul: '영혼', life: '생명', drain: '흡수', feast: '포식',
    hunger: '굶주림', rage: '분노', wrath: '진노', might: '힘', call: '부름', command: '명령', song: '노래', dance: '춤', kiss: '입맞춤', charm: '매혹', illusion: '환영', mirror: '거울', image: '분신', vanish: '사라지기', ambush: '매복',
    sneak: '암습', tactics: '전술', leadership: '지휘', inspire: '고무', rally: '집결', shout: '외침', word: '말', prayer: '기도', blessing: '축복', ward: '보호', shell: '껍질', armor: '갑옷', skin: '피부', scales: '비늘', spikes: '가시',
    spores: '포자', spit: '침', venom: '독액', blood: '피', bone: '뼈', grasp: '움켜쥠', grip: '쥐기', hold: '붙들기', pull: '끌어당기기', push: '밀치기', slide: '옮기기', trip: '넘어뜨리기', knockdown: '쓰러뜨리기', stomp: '짓밟기'
  };
  /* 통째로 정해 둔 이름 */
  var FULL = { 'Mind Flayer Infiltrator': '마인드 플레이어 침투자', 'Mind Flayer Mastermind': '마인드 플레이어 주모자', 'Doresain, the Ghoul King': '구울 왕 도레사인', 'Stirge and Dire Stirge': '스터지와 다이어 스터지', 'Hobgoblin Hand of Bane': '베인의 손 홉고블린',
    'Yuan-ti Malison Disciple of Zehir': '유안티 말리슨 제히르의 사도', 'Pit Fiend': '핏 핀드', 'Hell Hound': '헬 하운드', 'Gelatinous Cube': '젤라티너스 큐브', 'Ochre Jelly': '오커 젤리', 'Purple Worm': '퍼플 웜', 'Carrion Crawler': '캐리온 크롤러',
    'Enormous Carrion Crawler': '거대 캐리온 크롤러', 'Displacer Beast': '디스플레이서 비스트', 'Displacer Beast Packlord': '디스플레이서 비스트 우두머리', 'Umber Hulk': '엄버 헐크', 'Hook Horror': '훅 호러', 'Helmed Horror': '헬름드 호러',
    'Greater Helmed Horror': '상급 헬름드 호러', 'Shield Guardian': '실드 가디언', 'Iron Cobra': '아이언 코브라', 'Gibbering Mouther': '지버링 마우서', 'Gibbering Abomination': '지버링 어보미네이션', 'Gibbering Orb': '지버링 오브',
    'Dark Creeper': '다크 크리퍼', 'Dark Stalker': '다크 스토커', 'Combat Advantage': '전투 우위', 'Second Wind': '재기의 숨', 'Fey Step': '요정 걸음', 'Breath Weapon': '숨결 무기', 'Bloodied Breath': '반죽음 숨결', 'Frightful Presence': '무시무시한 위압',
    'Double Attack': '2연속 공격', 'Change Shape': '모습 바꾸기', 'Short Sword': '쇼트소드', 'Hand Crossbow': '핸드 크로스보우', 'Spiked Chain': '스파이크드 체인', 'Bastard Sword': '바스타드 소드', 'Threatening Reach': '위협 간격', 'Flyby Attack': '스쳐 지나가는 공격',
    'Mobile Melee Attack': '기동 근접 공격', 'Trap Sense': '함정 감지', 'Evil Eye': '사안', 'Dragon Breath': '용의 숨결', 'Swarm Attack': '무리 공격', 'Pack Attack': '무리 사냥', 'Eye Rays': '눈 광선', 'Unarmed Strike': '맨손 공격', 'Weapon': '무기' };
  function nm(s) { s = String(s || '').trim(); if (!s) return s; if (FULL[s]) return FULL[s];
    var sfx = '', pm = /^(.*?)\s*(\([^)]*\))$/.exec(s); if (pm) { s = pm[1]; var inner = pm[2].slice(1, -1); sfx = /^\d+$/.test(inner) ? ' (' + inner + ')' : ' (' + nm(inner) + ')'; if (FULL[s]) return FULL[s] + sfx; }
    var of = /^(.+?) of (.+)$/i.exec(s); if (of) return nm(of[2]) + '의 ' + nm(of[1]) + sfx;
    var miss = 0, out = s.split(/\s+/).map(function (w) { var k = w.toLowerCase().replace(/[,.]$/, ''), v = W[k]; if (v == null) { miss++; return w; } return v; }).filter(function (x) { return x !== ''; }).join(' ');
    return out + sfx; }
  var SIZE = { tiny: '초소형', small: '소형', medium: '중형', large: '대형', huge: '초대형', gargantuan: '거대형' };
  var TYPEW = { aberrant: '변이', elemental: '원소', fey: '요정', immortal: '불멸', natural: '자연', shadow: '그림자', animate: '생동체', beast: '야수', humanoid: '인간형', magical: '마법', aquatic: '수생', undead: '언데드', angel: '천사', fire: '불', cold: '냉기',
    blind: '눈 없음', reptile: '파충류', plant: '식물', swarm: '무리', mount: '탈것', devil: '데빌', construct: '구조체', demon: '데몬', shapechanger: '변신체', dragon: '용', spider: '거미', eladrin: '엘라드린', earth: '땅', air: '공기', water: '물', giant: '거인',
    homunculus: '호문쿨루스', ooze: '점액체', human: '인간', shifter: '시프터', living: '살아 있는' };
  var KW = { psychic: '정신', charm: '매혹', illusion: '환영', poison: '독', necrotic: '사령', healing: '치유', fear: '공포', weapon: '무기', radiant: '광휘', lightning: '번개', fire: '불', teleportation: '순간이동', cold: '냉기', gaze: '응시', 'see text': '본문 참조',
    thunder: '천둥', force: '역장', zone: '지대', polymorph: '변신', acid: '산성', conjuration: '창조', sleep: '수면', disease: '질병' };
  var SKILL = { Arcana: '비전학', Dungeoneering: '던전 탐험', Insight: '통찰', Stealth: '은신', Religion: '종교', Intimidate: '위협', Athletics: '운동', Endurance: '지구력', Bluff: '허세', Diplomacy: '교섭', Thievery: '도둑질', History: '역사', Nature: '자연',
    Acrobatics: '곡예', Streetwise: '세상 물정', Perception: '지각', Heal: '치료' };
  var LANG = { Common: '공용어', Draconic: '용언', Elven: '엘프어', Primordial: '태고어', 'Deep Speech': '심연어', Abyssal: '어비스어', Giant: '거인어', Supernal: '천상어', Goblin: '고블린어', Dwarven: '드워프어', 'one other': '그 밖 하나', telepathy: '텔레파시' };
  var ALIGN = { Evil: '악', Unaligned: '무성향', 'Chaotic evil': '혼돈 악', Any: '아무거나', 'Lawful good': '질서 선', Good: '선' };
  var DMG = 'acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder';
  var DEFKO = { ac: 'AC', fortitude: '인내', reflex: '반사', will: '의지' };
  function words(s, map) { return String(s || '').replace(/[A-Za-z][A-Za-z\- ]*[A-Za-z]|[A-Za-z]+/g, function (w) { return map[w] != null ? map[w] : (map[w.toLowerCase()] != null ? map[w.toLowerCase()] : w); }); }
  function typeKo(s) { return String(s || '').replace(/[A-Za-z]+/g, function (w) { var k = w.toLowerCase(); return SIZE[k] || TYPEW[k] || w; }); }
  function kwKo(s) { return String(s || '').split(/\s*,\s*/).map(function (k) { return KW[k.toLowerCase()] || k; }).join(', '); }
  function listKo(s, map) { return String(s || '').split(/\s*,\s*/).map(function (x) { var m = /^([A-Za-z ]+?)( [+\-]?\d+.*| \(.*)?$/.exec(x.trim()); return m && map[m[1]] ? map[m[1]] + (m[2] || '') : x; }).join(', '); }
  function sensesKo(s) { return String(s || '').replace(/Perception/g, '지각').replace(/low-light vision/gi, '저조도 시야').replace(/darkvision/gi, '암시야').replace(/truesight/gi, '진시야').replace(/blindsight/gi, '맹시').replace(/tremorsense/gi, '진동 감지').replace(/all-around vision/gi, '전방위 시야'); }
  function speedKo(s) { return String(s || '').replace(/\(hover\)/gi, '(체공)').replace(/\(clumsy\)/gi, '(서투름)').replace(/\bfly\b/gi, '비행').replace(/\bclimb\b/gi, '등반').replace(/\bswim\b/gi, '수영').replace(/\bburrow\b/gi, '굴착').replace(/\bteleport\b/gi, '순간이동')
    .replace(/overland flight/gi, '장거리 비행').replace(/spider climb/gi, '거미 등반').replace(/\bphasing\b/gi, '위상 이동').replace(/see also/gi, '참고:').replace(/\bhover\b/gi, '체공'); }
  function actKo(s) { s = String(s || ''); var m = { standard: '일반', minor: '보조', move: '이동', free: '자유', 'immediate interrupt': '즉시 방해', 'immediate reaction': '즉시 반응', opportunity: '기회', 'no action': '행동 없음' };
    return s.replace(/^(standard|minor|move|free|immediate interrupt|immediate reaction|opportunity|no action)\b( action)?/i, function (x, a) { return m[a.toLowerCase()] || x; }).replace(/(\d)\/round/, '라운드당 $1번')
      .replace(/when first bloodied/i, '처음 반죽음이 될 때').replace(/(usable )?only while bloodied|only usable while bloodied|while bloodied/i, '반죽음일 때만').replace(/not while bloodied/i, '반죽음이 아닐 때만').replace(/when reduced to 0 hit points/i, 'HP가 0이 될 때')
      .replace(/only while flying/i, '비행 중에만').replace(/usable only when charging/i, '돌격할 때만').replace(/^,\s*/, ''); }
  function useKo(s) { return String(s || '').replace(/at-will/gi, '무제한').replace(/encounter/gi, '조우').replace(/daily/gi, '일일').replace(/recharges when first bloodied/gi, '처음 반죽음이 될 때 재충전').replace(/recharges? after/gi, '재충전:').replace(/recharge/gi, '재충전')
      .replace(/⚀/g, '1').replace(/⚁/g, '2').replace(/⚂/g, '3').replace(/⚃/g, '4').replace(/⚄/g, '5').replace(/⚅/g, '6').replace(/sustain (minor|standard|move)/gi, function (x, a) { return '유지 ' + ({ minor: '보조', standard: '일반', move: '이동' })[a.toLowerCase()]; }).replace(/aura (\d+)/i, '오라 $1'); }
  /* 본문 규칙: 스탯 블록에 되풀이되는 꼴 */
  var COND = { dazed: '멍해짐', stunned: '기절', slowed: '둔화', immobilized: '이동 불가', restrained: '속박', weakened: '약화', blinded: '실명', dominated: '지배', prone: '넘어짐', marked: '표식', deafened: '청각 상실', petrified: '석화', unconscious: '의식 불명',
    grabbed: '붙잡힘', helpless: '무력', surprised: '기습당함', invisible: '투명', insubstantial: '비실체', swallowed: '삼켜짐' };
  var CONDRE = Object.keys(COND).join('|');
  var RULES = [
    [/\bReach (\d+)/g, '간격 $1'], [/\bRanged (\d+)\/(\d+)/g, '원거리 $1/$2'], [/\bRanged (\d+)/g, '원거리 $1'], [/\bRanged sight\b/gi, '원거리 시야'], [/\bMelee (\d+)/g, '근접 $1'],
    [/\bClose burst (\d+)/gi, '근거리 폭발 $1'], [/\bClose blast (\d+)/gi, '근거리 분사 $1'], [/\bArea burst (\d+) within (\d+)/gi, '범위 폭발 $1 ($2칸 안)'], [/\bArea wall (\d+) within (\d+)/gi, '범위 장벽 $1 ($2칸 안)'],
    [/\btargets enemies\b/gi, '적만 대상'], [/\btargets? (one|two|three) creatures?\b/gi, function (x, n) { return '대상 ' + ({ one: '하나', two: '둘', three: '셋' })[n.toLowerCase()]; }],
    [/([+\-]\d+) vs\.? (AC|Fortitude|Reflex|Will)/gi, function (x, b, d) { return b + ' vs. ' + DEFKO[d.toLowerCase()]; }],
    [new RegExp('ongoing (\\d+) (' + DMG + ')(?: and (' + DMG + '))? damage \\(save ends\\)', 'gi'), function (x, n, a, b) { return '지속 ' + n + ' ' + KW[a.toLowerCase()] + (b ? ' · ' + KW[b.toLowerCase()] : '') + ' 피해 (내성 굴림으로 끝남)'; }],
    [/ongoing (\d+) damage \(save ends\)/gi, '지속 $1 피해 (내성 굴림으로 끝남)'], [new RegExp('ongoing (\\d+) (' + DMG + ') damage', 'gi'), function (x, n, a) { return '지속 ' + n + ' ' + KW[a.toLowerCase()] + ' 피해'; }], [/ongoing (\d+) damage/gi, '지속 $1 피해'],
    [new RegExp('(\\d+d\\d+(?: ?[+\\-] ?\\d+)?|\\d+) (' + DMG + ')(?: and (' + DMG + '))? damage', 'gi'), function (x, d, a, b) { return d + ' ' + KW[a.toLowerCase()] + (b ? ' · ' + KW[b.toLowerCase()] : '') + ' 피해'; }],
    [/(\d+d\d+(?: ?[+\-] ?\d+)?|\d+) extra damage/gi, '추가 피해 $1'], [/(\d+d\d+(?: ?[+\-] ?\d+)?|\d+) damage/gi, '$1 피해'],
    [/\(save ends both\)/gi, '(둘 다 내성 굴림으로 끝남)'], [/\(save ends all\)/gi, '(모두 내성 굴림으로 끝남)'], [/\(save ends\)/gi, '(내성 굴림으로 끝남)'],
    [new RegExp(',? and the target is (' + CONDRE + ') and (' + CONDRE + ')', 'gi'), function (x, a, b) { return ', 대상은 ' + COND[a.toLowerCase()] + ' · ' + COND[b.toLowerCase()] + ' 상태가 된다'; }],
    [new RegExp(',? and the target is (' + CONDRE + ')', 'gi'), function (x, a) { return ', 대상은 ' + COND[a.toLowerCase()] + ' 상태가 된다'; }],
    [new RegExp('\\bthe target is (' + CONDRE + ')', 'gi'), function (x, a) { return '대상은 ' + COND[a.toLowerCase()] + ' 상태가 된다'; }],
    [/,? and the target is knocked prone/gi, ', 대상은 넘어진다'], [/\bthe target is knocked prone/gi, '대상은 넘어진다'], [/,? and the target is pushed (\d+) squares?/gi, ', 대상을 $1칸 민다'], [/,? and the target is pulled (\d+) squares?/gi, ', 대상을 $1칸 끌어당긴다'],
    [/,? and the target slides (\d+) squares?/gi, ', 대상을 $1칸 옮긴다'], [/\bpush(?:es)? the target (\d+) squares?/gi, '대상을 $1칸 민다'], [/\bslides? the target (\d+) squares?/gi, '대상을 $1칸 옮긴다'], [/\bpulls? the target (\d+) squares?/gi, '대상을 $1칸 끌어당긴다'],
    [/until the end of (?:its|the [a-z' \-]+?'s) next turn/gi, '자신의 다음 턴 끝까지'], [/until the start of (?:its|the [a-z' \-]+?'s) next turn/gi, '자신의 다음 턴 시작까지'], [/until the end of the encounter/gi, '조우가 끝날 때까지'],
    [/until the end of the target's next turn/gi, '대상의 다음 턴 끝까지'], [/at the start of its turn/gi, '자신의 턴 시작에'], [/at the end of its turn/gi, '자신의 턴 끝에'],
    [/\bMiss: Half damage\.?/gi, '빗나감: 절반 피해.'], [/\bMiss:/g, '빗나감:'], [/\bHit:/g, '명중:'], [/\bEffect:/g, '효과:'], [/\bAftereffect:/g, '후속 효과:'], [/\bFirst Failed Save(?:ing Throw)?:/gi, '첫 내성 실패:'], [/\bSecond Failed Save(?:ing Throw)?:/gi, '둘째 내성 실패:'],
    [/\bSecondary Attack:/gi, '2차 공격:'], [/\bSustain (Minor|Standard|Move):/gi, function (x, a) { return '유지 ' + ({ minor: '보조', standard: '일반', move: '이동' })[a.toLowerCase()] + ':'; }],
    [/\bRequires? combat advantage\b/gi, '전투 우위 필요'], [/\bcombat advantage\b/gi, '전투 우위'], [/\bopportunity attacks?\b/gi, '기회 공격'], [/\bbasic attacks?\b/gi, '기본 공격'], [/\bhealing surges?\b/gi, '치유력'], [/\bsaving throws?\b/gi, '내성 굴림'],
    [/\btemporary hit points\b/gi, '임시 HP'], [/\bhit points\b/gi, 'HP'], [/\bdifficult terrain\b/gi, '험한 지형'], [/\bline of sight\b/gi, '시선'], [/\bline of effect\b/gi, '효과선'], [/\battack rolls?\b/gi, '공격 굴림'], [/\bdamage rolls?\b/gi, '피해 굴림'],
    [/\ball defenses\b/gi, '모든 방어'], [/\bshifts? (\d+) squares?/gi, '$1칸 시프트'], [/\bteleports? (\d+) squares?/gi, '$1칸 순간이동'], [/\bflies (\d+) squares?/gi, '$1칸 비행'], [/\bmoves? (\d+) squares?/gi, '$1칸 이동'], [/\bwithin (\d+) squares?/gi, '$1칸 안'],
    [/(\d+) squares?\b/gi, '$1칸'], [/\bbloodied\b/gi, '반죽음'], [/\badjacent\b/gi, '인접한'], [/\benemies\b/gi, '적들'], [/\benemy\b/gi, '적'], [/\ballies\b/gi, '아군들'], [/\bally\b/gi, '아군'], [/\bthe target\b/gi, '대상'], [/\btargets\b/gi, '대상'],
    [new RegExp('\\b(' + CONDRE + ')\\b', 'gi'), function (x, a) { return COND[a.toLowerCase()]; }], [/\bresist (\d+) (\w+)/gi, function (x, n, t) { return '저항 ' + n + ' ' + (KW[t.toLowerCase()] || t); }], [/\bvulnerable (\d+) (\w+)/gi, function (x, n, t) { return '취약 ' + n + ' ' + (KW[t.toLowerCase()] || t); }],
    [/\bregeneration (\d+)/gi, '재생 $1'], [/\bstandard action\b/gi, '일반 행동'], [/\bminor action\b/gi, '보조 행동'], [/\bmove action\b/gi, '이동 행동'], [/\bfree action\b/gi, '자유 행동'], [/\bimmediate reaction\b/gi, '즉시 반응'], [/\bimmediate interrupt\b/gi, '즉시 방해']
  ];
  function body(s) { s = String(s || ''); RULES.forEach(function (r) { s = s.replace(r[0], r[1]); }); return s; }
  function resKo(s) { return String(s || '').replace(/\b(acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder|disease|fear|charm|sleep|illusion|petrification|gaze)\b/gi, function (x) { return KW[x.toLowerCase()] || ({ petrification: '석화' })[x.toLowerCase()] || x; }).replace(/\binsubstantial\b/gi, '비실체').replace(/\bvariable\b/gi, '가변').replace(/\bsee\b/gi, '참고:'); }
  /* 몬스터 한 마리를 번역한 사본으로 */
  function mon(m) { var o = {}; Object.keys(m).forEach(function (k) { o[k] = m[k]; });
    o.n = nm(m.n); o.n_en = m.n; o.type = typeKo(m.type); o.senses = sensesKo(m.senses); o.speed = speedKo(m.speed); o.align = ALIGN[m.align] || m.align; o.lang = listKo(m.lang, LANG); o.skills = listKo(m.skills, SKILL);
    o.immune = resKo(m.immune); o.resist = resKo(m.resist); o.vuln = resKo(m.vuln); o.hpnote = m.hpnote ? '빗나간 공격은 졸개에게 피해를 주지 못한다.' : '';
    o.pw = (m.pw || []).map(function (p) { return { n: nm(p.n), k: p.k, act: actKo(p.act), use: useKo(p.use), kw: kwKo(p.kw), t: body(p.t) }; }); o._ko = 1; return o; }
  window.D4E_MONKO = { name: nm, mon: mon, body: body };
})();
