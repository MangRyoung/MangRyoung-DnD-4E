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
    /* 몬스터 매뉴얼 2 */
    abolethic: '아볼레스의', acamar: '아카마르', adamantine: '아다만틴', ankheg: '앵크헥', anvilpriest: '모루 사제', arbalester: '쇠뇌병', arcane: '비전', arctide: '아크타이드', artist: '예술가', authority: '권위', baleful: '불길한', barghest: '바게스트',
    bebilith: '베빌리스', behir: '베히르', blackguard: '블랙가드', blacksoul: '검은 영혼', bladerager: '칼날 광분자', bladesinger: '검의 가수', blasphemer: '신성모독자', blinder: '눈멀게 하는 자', bloodbear: '피곰', bloodseeker: '피 추적자', bloodthorn: '피가시',
    bonecrusher: '뼈 분쇄자', broodling: '새끼', broodswarm: '새끼 무리', bullywug: '불리워그', butcher: '도살자', canker: '종양', castigator: '징벌자', cavalier: '기병', centaur: '켄타우로스', centipede: '지네', chaos: '혼돈', charger: '돌격병',
    chillfire: '냉염', cockatrice: '코카트리스', collector: '수집가', con: '사기꾼', copper: '구리', couatl: '코아틀', croaker: '개굴이', crusher: '분쇄자', cultist: '광신도', dagon: '다곤', dancer: '무희', darkmantle: '다크맨틀',
    dawnkiller: '새벽 살해자', deathpledged: '죽음을 맹세한', deepscourge: '심층 채찍', defender: '방어자', demogorgon: '데모고르곤', demon: '데몬', dervish: '수도 무희', destroyer: '파괴자', deva: '데바', diabolist: '악마술사', diamondhide: '금강가죽',
    dimensional: '차원', direguard: '다이어가드', djinn: '진', doom: '파멸', drakkoth: '드라코스', dretch: '드레치', duergar: '듀에르가', dust: '먼지', dweomer: '주문', eater: '먹는 자', eldritch: '섬뜩한', elemental: '정령', entropist: '엔트로피술사',
    enveloper: '감싸는 자', erinyes: '에리니에스', eviscerator: '내장 가르는 자', executioner: '처형자', fallen: '타락한', 'fey-knight': '요정 기사', firbolg: '퍼볼그', flamespiker: '불꽃가시', fleshcarver: '살 저미는 자', fleshtearer: '살 찢는 자',
    flux: '유동', funnelcloud: '깔때기구름', gauth: '가우스', genasi: '제나시', geonid: '지오니드', ghostraven: '유령까마귀', giantsoul: '거인혼', gibbeth: '기베스', gloom: '암흑', gnaw: '갉아먹는', gold: '황금', goliath: '골리아스',
    gorechain: '피사슬', gorger: '탐식자', greenvise: '녹색 바이스', ground: '땅', hadar: '하다르', 'half-elf': '하프엘프', 'half-orc': '하프오크', hawk: '매', hellcaller: '지옥 부름꾼', herald: '전령', heroslayer: '영웅살해', horned: '뿔 달린',
    hounder: '몰이꾼', hunt: '사냥', hydromancer: '수술사', infernal: '지옥의', kazrith: '카즈리스', kazuul: '카주울', kenku: '켄쿠', 'knight-errant': '편력 기사', krenshar: '크렌샤', light: '빛', lingerer: '미련자', maglubiyet: '마글루비옛',
    mammoth: '매머드', master: '달인', maw: '아가리', mindblight: '정신 마름병', mistwalker: '안개걷는 자', monster: '괴물', moon: '달', mucker: '진흙꾼', mud: '진흙', myconid: '마이코니드', mystagogue: '비의 사제', needle: '바늘',
    neldrazu: '넬드라주', neogi: '네오기', nothic: '노식', nycademon: '니카데몬', nyfellar: '니펠라', old: '늙은', ooze: '점액체', overlord: '대군주', phase: '위상', phoelarch: '포엘라크', phoera: '포에라', pirate: '해적', pod: '꼬투리',
    poisonscale: '독비늘', powrie: '파우리', predator: '포식자', prelate: '고위 성직자', prismatic: '무지갯빛', prosecutor: '심문관', pudding: '푸딩', pulsar: '펄서', queen: '여왕', rager: '격노자', razor: '면도날', remorhaz: '레모라즈',
    render: '찢는 자', resounder: '울림꾼', retrieval: '회수', retriever: '회수자', rime: '서리', ringleader: '주모자', rockfist: '바위주먹', rotfiend: '부패 마귀', rotpriest: '부패 사제', ruffian: '불한당', rumbler: '울림꾼', runecarver: '룬 새기는 자',
    runespiral: '룬나선', rupture: '파열', rust: '녹', scarthane: '흉터 영주', scion: '후예', scuttler: '종종걸음꾼', scytheclaw: '낫발톱', seismic: '지진', serpent: '뱀', shard: '파편', shardstorm: '파편폭풍', shark: '상어', shoal: '떼',
    shock: '충격', shocktroop: '돌격대', shoot: '싹', shrieking: '비명 지르는', silver: '은', skum: '스컴', skylord: '하늘 군주', skyspy: '하늘 정찰자', slaughterstone: '도살석', slaver: '노예상', slavering: '침 흘리는', slayer: '살해자',
    slicer: '절단자', slitherer: '미끄러지는 자', smasher: '분쇄자', snowfang: '눈송곳니', son: '아들', sovereign: '군주', spriggan: '스프리건', sprite: '스프라이트', squallshield: '돌풍방패', star: '별', steed: '준마', steel: '강철',
    stonefist: '돌주먹', stoneshield: '돌방패', stormsteed: '폭풍마', stormstone: '폭풍석', stormsword: '폭풍검', striker: '타격자', sunspeaker: '태양 화자', supremacy: '지배', taint: '오염', tempest: '폭풍우', tempter: '유혹자',
    thaumaturge: '기적술사', theurge: '신술사', thorn: '가시', thought: '생각', thrarak: '스라라크', thrasher: '난타꾼', thunderer: '천둥꾼', tide: '조류', tiger: '호랑이', totemist: '토템술사', trooper: '기병', twitcher: '경련꾼',
    tyrant: '폭군', ultimate: '궁극의', umbral: '암영', vecna: '베크나', venomshot: '독탄', vinespeaker: '덩굴 화자', vortex: '소용돌이', wardancer: '전투 무희', warp: '뒤틀림', weaver: '직조사', wender: '방랑자', wereboar: '멧돼지인간',
    weretiger: '호랑이인간', whelp: '새끼', whirlwind: '회오리바람', wild: '야생', "will-o'-wisp": '도깨비불', windstriker: '바람 타격자', wisp: '도깨비불', witherer: '시들게 하는 자', withering: '시드는', witherling: '위더링', woad: '대청',
    wolverine: '울버린', wood: '숲', worker: '일꾼', xorn: '조른', yochlol: '요클롤', iron: '무쇠', bronze: '청동', brass: '황동', hive: '군락', drone: '수벌', winged: '날개 달린', giant: '거인', ant: '개미', winter: '겨울', frost: '서리',
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
    var miss = 0, out = s.split(/\s+/).map(function (w) { var k = w.toLowerCase().replace(/[,.]$/, ''), v = W[k]; if (v == null && window.D4E_MONKO_W) v = window.D4E_MONKO_W[k]; if (v == null) { miss++; return w; } return v; }).filter(function (x) { return x !== ''; }).join(' ');
    return out + sfx; }
  var SIZE = { tiny: '초소형', small: '소형', medium: '중형', large: '대형', huge: '초대형', gargantuan: '거대형' };
  var TYPEW = { trap: '함정', hazard: '위험 요소', terrain: '지형', object: '사물', 'single-use': '일회성', fantastic: '기묘한', aberrant: '변이', elemental: '원소', fey: '요정', immortal: '불멸', natural: '자연', shadow: '그림자', animate: '생동체', beast: '야수', humanoid: '인간형', magical: '마법', aquatic: '수생', undead: '언데드', angel: '천사', fire: '불', cold: '냉기',
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
  function body0(s) { s = String(s || ''); RULES.forEach(function (r) { s = s.replace(r[0], r[1]); });
    return s.replace(/\(until escape\)/gi, '(탈출할 때까지)').replace(/\(no save\)/gi, '(내성 굴림 없음)').replace(/\(([+\-]\d+) while 반죽음\)/g, '(반죽음일 때 $1)').replace(/\(([+\-]\d+) against an? (\S+) (?:target|creature)\)/gi, '($2 상태인 대상에게는 $1)').replace(/\bFortitude\b/g, '인내').replace(/\bRefl ?ex\b/g, '반사').replace(/\bWill (?=\d)/g, '의지 ').replace(/^Initiative /, '우선권 ').replace(/^Range (\d+)$/, '사거리 $1').replace(/\bon a hit, /gi, '명중하면, ').replace(/\bon a critical hit, /gi, '치명타가 나면, ').replace(/\bon a miss, /gi, '빗나가면, ').replace(/\bwhen charging\b/gi, '돌격할 때').replace(/\bwhile 반죽음\b/g, '반죽음일 때').replace(/\bThe zone is 험한 지형/g, '영역은 험한 지형이다'); }
  /* ---------- 문장 단위 번역 ----------
   * 4판 몬스터 글은 틀이 정해져 있다. 절(;) · 문장(.)으로 나눠 「주어 + 서술 + 기간」 꼴을 읽어 한국어 어순으로 다시 쓴다.
   * 틀에 안 맞는 절은 예전의 낱말 바꾸기(body0)로 넘긴다. */
  var DICE = '\\d+d\\d+(?:\\s*[+\\-]\\s*\\d+)?|\\d+', TYPES = '(?:' + DMG + ')(?:(?:,| and|, and) (?:' + DMG + '))*';
  function latin(s) { return /[A-Za-z]{2,}/.test(String(s).replace(/\b(AC|HP|XP|vs)\b/g, '').replace(/\d+d\d+/g, '')); }
  function types(t) { return String(t || '').split(/,? and |, /).map(function (x) { return KW[x.trim().toLowerCase()] || x.trim(); }).filter(Boolean).join(' · '); }
  function dmgKo(d, t) { return d.replace(/\s*([+\-])\s*/, ' $1 ') + (t ? ' ' + types(t) : '') + ' 피해'; }
  var NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }, TIMES = { 1: '한 번', 2: '두 번', 3: '세 번', 4: '네 번', 5: '다섯 번', 6: '여섯 번' }, CNT = { 1: '하나', 2: '둘', 3: '셋', 4: '넷' };
  var STAT = { 'attack rolls': '공격 굴림', 'attack roll': '공격 굴림', 'attacks': '공격', 'all defenses': '모든 방어', 'all attack rolls': '모든 공격 굴림', 'attack rolls and damage rolls': '공격 굴림 · 피해 굴림', 'checks': '판정', 'defenses': '방어', 'ac': 'AC', 'fortitude': '인내', 'reflex': '반사', 'will': '의지', 'saving throws': '내성 굴림', 'damage rolls': '피해 굴림', 'damage': '피해', 'speed': '이동 속도', 'melee attacks': '근접 공격', 'ranged attacks': '원거리 공격', 'melee attack rolls': '근접 공격 굴림', 'ranged attack rolls': '원거리 공격 굴림', 'all attacks': '모든 공격', 'initiative': '우선권', 'initiative checks': '우선권 판정', 'skill checks': '기술 판정', 'ability checks': '능력 판정', 'perception checks': '지각 판정', 'stealth checks': '은신 판정', 'fortitude defense': '인내', 'reflex defense': '반사', 'will defense': '의지', 'ac and reflex': 'AC와 반사', 'all damage': '모든 피해', 'opportunity attacks': '기회 공격', 'next attack roll': '다음 공격 굴림', 'its next attack roll': '다음 공격 굴림', 'melee damage rolls': '근접 피해 굴림' };
  function statKo(x) { var parts = String(x).trim().replace(/^(?:its|their|the) /i, '').split(/,? and |, /).map(function (y) { var k = y.trim().toLowerCase().replace(/^(?:its|their|the) /, ''); return STAT[k] || (DEFKO[k.replace(/ defense$/, '')]) || null; }); return parts.indexOf(null) >= 0 ? null : parts.join(' · '); }
  function who(x) { x = String(x || '').trim().toLowerCase(); if (!x || x === 'its' || x === 'his' || x === 'her' || x === 'their') return '자신의'; if (/^the target'?s?$/.test(x) || x === "the target's") return '대상의'; return '자신의'; }
  /* 기간 · 조건 꼬리 떼기 → [앞글, 앞에 붙일 말, 뒤에 붙일 말] */
  function tailOf(s) { var pre = '', post = '', m, go = true;
    while (go) { go = false;
      if ((m = /\s*\(save ends( both| all)?\)$/i.exec(s))) { post = ' (' + (m[1] ? (/both/i.test(m[1]) ? '둘 다 ' : '모두 ') : '') + '내성 굴림으로 끝남)' + post; s = s.slice(0, m.index); go = true; }
      else if ((m = /\s*\(until escape\)$/i.exec(s))) { post = ' (탈출할 때까지)' + post; s = s.slice(0, m.index); go = true; }
      else if ((m = /\s*,?\s*until the (end|start) of (its|his|her|the target's|the [a-z' \-]+?'s?) next turn$/i.exec(s))) { pre = who(m[2]) + ' 다음 턴 ' + (/end/i.test(m[1]) ? '끝' : '시작') + '까지 ' + pre; s = s.slice(0, m.index); go = true; }
      else if ((m = /\s*,?\s*until the end of the encounter$/i.exec(s))) { pre = '조우가 끝날 때까지 ' + pre; s = s.slice(0, m.index); go = true; }
      else if ((m = /\s*,?\s*until the (end|start) of (?:its|the [a-z' \-]+?'s) turn$/i.exec(s))) { pre = '자신의 턴 ' + (/end/i.test(m[1]) ? '끝' : '시작') + '까지 ' + pre; s = s.slice(0, m.index); go = true; } }
    if ((m = /\s*\(save ends( both| all)?\)(?=,? and )/i.exec(s))) { post = ' (' + (m[1] ? (/both/i.test(m[1]) ? '둘 다 ' : '모두 ') : '') + '내성 굴림으로 끝남)' + post; s = s.slice(0, m.index) + s.slice(m.index + m[0].length); }
    return [s.trim(), pre, post]; }
  /* 서술 하나 → [맺는 꼴, 잇는 꼴] (못 읽으면 null) */
  function vp(v) { var m; v = v.trim();
    if ((m = new RegExp('^(?:is|are|becomes?|remains?) (' + CONDRE + ')$', 'i').exec(v))) { var c = COND[m[1].toLowerCase()]; return [c + ' 상태가 된다', c + ' 상태가 되고']; }
    if ((m = new RegExp('^(?:is|are) (' + CONDRE + ') and (' + CONDRE + ')$', 'i').exec(v))) { var c2 = COND[m[1].toLowerCase()] + ' · ' + COND[m[2].toLowerCase()]; return [c2 + ' 상태가 된다', c2 + ' 상태가 되고']; }
    if ((m = new RegExp('^(?:is|are) (' + CONDRE + ') instead of (' + CONDRE + ')$', 'i').exec(v))) return [COND[m[2].toLowerCase()] + ' 대신 ' + COND[m[1].toLowerCase()] + ' 상태가 된다', COND[m[2].toLowerCase()] + ' 대신 ' + COND[m[1].toLowerCase()] + ' 상태가 되고'];
    if ((m = new RegExp('^(?:is|are) (?:not|no longer) (' + CONDRE + ')$', 'i').exec(v))) return [COND[m[1].toLowerCase()] + ' 상태가 ' + (/no longer/i.test(v) ? '풀린다' : '되지 않는다'), COND[m[1].toLowerCase()] + ' 상태가 ' + (/no longer/i.test(v) ? '풀리고' : '되지 않고')];
    if (/^(?:is|are) not knocked prone$/i.test(v)) return ['넘어지지 않는다', '넘어지지 않고'];
    if (/^(?:is|are) also knocked prone$/i.test(v)) return ['넘어지기도 한다', '넘어지고'];
    if ((m = new RegExp('^gains? (vulnerable|resist) (\\d+) (?:to )?(all damage|all|' + TYPES + ')(?: damage)?$', 'i').exec(v))) { var vr = (/vuln/i.test(m[1]) ? '취약 ' : '저항 ') + m[2] + ' (' + (/^all/i.test(m[3]) ? '모든 피해' : types(m[3])) + ')'; return [vr + '을 얻는다', vr + '을 얻고']; }
    if ((m = /^(?:is|are) (?:pushed|pulled|slid) (\d+) squares? and knocked prone$/i.exec(v))) { var w0 = /pushed/i.test(v) ? '밀려나' : /pulled/i.test(v) ? '끌려오' : '옮겨지'; return [m[1] + '칸 ' + w0 + '고 넘어진다', m[1] + '칸 ' + w0 + '고 넘어지고']; }
    if (/^(?:is|are) knocked prone$|^falls? prone$|^knocked prone$/i.test(v)) return ['넘어진다', '넘어지고'];
    if ((m = /^(?:is |are )?pushed (\d+) squares?$/i.exec(v))) return [m[1] + '칸 밀려난다', m[1] + '칸 밀려나고'];
    if ((m = /^(?:is |are )?pulled (\d+) squares?$/i.exec(v))) return [m[1] + '칸 끌려온다', m[1] + '칸 끌려오고'];
    if ((m = /^(?:is slid|are slid|slides|slid) (\d+) squares?$/i.exec(v))) return [m[1] + '칸 옮겨진다', m[1] + '칸 옮겨지고'];
    if ((m = new RegExp('^takes? ongoing (\\d+) ?(' + TYPES + ')? ?damage$', 'i').exec(v))) return ['지속 ' + m[1] + (m[2] ? ' ' + types(m[2]) : '') + ' 피해를 받는다', '지속 ' + m[1] + (m[2] ? ' ' + types(m[2]) : '') + ' 피해를 받고'];
    if ((m = new RegExp('^takes? (' + DICE + ') ?(' + TYPES + ')? ?damage$', 'i').exec(v))) return [dmgKo(m[1], m[2]) + '를 받는다', dmgKo(m[1], m[2]) + '를 받고'];
    if ((m = new RegExp('^takes? (' + DICE + ') extra ?(' + TYPES + ')? ?damage$', 'i').exec(v))) return ['추가로 ' + dmgKo(m[1], m[2]) + '를 받는다', '추가로 ' + dmgKo(m[1], m[2]) + '를 받고'];
    if ((m = /^(?:takes?|has|have|suffers?|gains?|receives?|gets?) an? (?:cumulative )?([\-–+]\d+) (?:[a-z]+ )?(penalty|bonus) to (.+?) (?:against|versus|on attacks against) (.+)$/i.exec(v))) { var s1 = statKo(m[3]), AG = { 'opportunity attacks': '기회 공격', traps: '함정', 'ranged attacks': '원거리 공격', 'melee attacks': '근접 공격', 'area attacks': '범위 공격', 'close attacks': '근거리 공격', 'ranged and area attacks': '원거리 · 범위 공격', 'fear effects': '공포 효과', 'charm effects': '매혹 효과', 'bloodied enemies': '반죽음 상태인 적', 'bloodied targets': '반죽음 상태인 대상', 'a bloodied target': '반죽음 상태인 대상', 'prone targets': '넘어진 대상', 'a prone target': '넘어진 대상', 'that target': '그 대상', 'that enemy': '그 적', 'that creature': '그 개체', 'the same target': '같은 대상', it: '그 개체', 'marked enemies': '표식을 남긴 적', 'poison': '독', 'fear': '공포' }, a1 = AG[m[4].toLowerCase()] || subj(m[4], true), wd = /bonus/i.test(m[2]) ? ' 보너스' : ' 페널티'; if (s1 && a1) return [a1 + '에 대한 ' + s1 + '에 ' + m[1].replace('–', '-') + wd + '를 받는다', a1 + '에 대한 ' + s1 + '에 ' + m[1].replace('–', '-') + wd + '를 받고']; }
    if (/^shifts?$/i.test(v)) return ['시프트한다', '시프트하고'];
    if ((m = /^(slides|pushes|pulls) the target (?:up to )?(\d+) squares?$/i.exec(v))) { var w1 = /slides/i.test(m[1]) ? ['옮긴다', '옮기고'] : /pushes/i.test(m[1]) ? ['민다', '밀고'] : ['끌어온다', '끌어오고']; return ['대상을 ' + m[2] + '칸 ' + w1[0], '대상을 ' + m[2] + '칸 ' + w1[1]]; }
    if (/^knocks (?:the target|it) prone$/i.test(v)) return ['대상을 넘어뜨린다', '대상을 넘어뜨리고'];
    if (/^grabs the target$/i.test(v)) return ['대상을 붙잡는다', '대상을 붙잡고'];
    if ((m = /^can make opportunity attacks against all enemies within its reach(?: \((\d+) squares?\))?$/i.exec(v))) return ['간격' + (m[1] ? '(' + m[1] + '칸)' : '') + ' 안의 모든 적에게 기회 공격을 할 수 있다', '간격 안의 모든 적에게 기회 공격을 할 수 있고'];
    if (/^(?:doesn't|does not) provoke opportunity attacks when moving away from (?:the|its) target(?: of (?:the|its) attack)?$/i.test(v)) return ['공격 대상에게서 멀어질 때 기회 공격을 유발하지 않는다', '공격 대상에게서 멀어질 때 기회 공격을 유발하지 않고'];
    if (/^(?:doesn't|does not) provoke opportunity attacks$/i.test(v)) return ['기회 공격을 유발하지 않는다', '기회 공격을 유발하지 않고'];
    if (/^provokes opportunity attacks$/i.test(v)) return ['기회 공격을 유발한다', '기회 공격을 유발하고'];
    if ((m = new RegExp('^deals an? extra (' + DICE + ') ?(' + TYPES + ')? ?damage (on melee and ranged attacks |on melee attacks |on ranged attacks |on attacks )?against any (?:target|creature|enemy) (?:it has combat advantage against|granting combat advantage to it)$', 'i').exec(v))) { var on = m[3] ? (/melee and ranged/i.test(m[3]) ? '근접 · 원거리 공격으로 ' : /melee/i.test(m[3]) ? '근접 공격으로 ' : /ranged/i.test(m[3]) ? '원거리 공격으로 ' : '') : ''; return ['전투 우위를 가진 대상에게 ' + on + '추가로 ' + dmgKo(m[1], m[2]) + '를 준다', '전투 우위를 가진 대상에게 ' + on + '추가로 ' + dmgKo(m[1], m[2]) + '를 주고']; }
    if ((m = new RegExp('^deals an? extra (' + DICE + ') ?(' + TYPES + ')? ?damage(?: to (?:the target|it))?$', 'i').exec(v))) return ['추가로 ' + dmgKo(m[1], m[2]) + '를 준다', '추가로 ' + dmgKo(m[1], m[2]) + '를 주고'];
    if ((m = new RegExp('^deals (' + DICE + ') ?(' + TYPES + ')? ?damage(?: to (?:the target|it))?$', 'i').exec(v))) return [dmgKo(m[1], m[2]) + '를 준다', dmgKo(m[1], m[2]) + '를 주고'];
    if ((m = /^(moves?|flies|shifts?) up to (\d+ squares?|its speed|half its speed) and makes? (one|a|two) (melee )?basic attacks? at any point during (?:that|the|its) (?:movement|move)$/i.exec(v))) { var ds = /half/i.test(m[2]) ? '이동 속도의 절반까지' : /speed/i.test(m[2]) ? '이동 속도만큼' : '최대 ' + parseInt(m[2], 10) + '칸', mw = /fl/i.test(m[1]) ? '비행' : /shift/i.test(m[1]) ? '시프트' : '이동'; return [ds + ' ' + mw + '하며 그 이동 중 아무 때나 ' + (m[4] ? '근접 ' : '') + '기본 공격을 ' + TIMES[NUMW[m[3].toLowerCase()]] + ' 한다', ds + ' ' + mw + '하며 그 이동 중 기본 공격을 하고']; }
    if (/^can move up to its speed and enter enemies' spaces$/i.test(v)) return ['이동 속도만큼 이동하며 적이 있는 칸에 들어갈 수 있다', '이동 속도만큼 이동하며 적이 있는 칸에 들어갈 수 있고'];
    if (/^must end its (?:move|movement) in an unoccupied (?:space|square)$/i.test(v)) return ['빈 칸에서 이동을 끝내야 한다', '빈 칸에서 이동을 끝내야 하고'];
    if (/^makes? an? (?:melee )?basic attack as a free action against each enemy that (?:begins|starts) its turn in the aura$/i.test(v)) return ['오라 안에서 턴을 시작하는 각 적에게 자유 행동으로 기본 공격을 한다', '오라 안에서 턴을 시작하는 각 적에게 자유 행동으로 기본 공격을 하고'];
    if ((m = /^makes? an? ([a-z' \-]+?) attack against each (enemy|creature) within (?:its )?reach$/i.exec(v))) { var a2 = nm(cap(m[1])); if (!latin(a2)) return ['간격 안의 각 ' + (/enemy/i.test(m[2]) ? '적' : '개체') + '에게 ' + a2 + ' 공격을 한다', '간격 안의 각 적에게 ' + a2 + ' 공격을 하고']; }
    if ((m = /^can disguise itself to appear as any medium( or large)? humanoid(?:, usually [^.]+)?$/i.exec(v))) return ['중형' + (m[1] ? ' · 대형' : '') + ' 인간형으로 변장할 수 있다', '중형 인간형으로 변장할 수 있고'];
    if (/^persists$/i.test(v)) return ['유지된다', '유지되고'];
    if (/^blocks line of sight$/i.test(v)) return ['시선을 막는다', '시선을 막고'];
    if (/^(?:can ?not|can't|cannot) delay or ready actions$/i.test(v)) return ['지연하거나 대기 행동을 할 수 없다', '지연하거나 대기 행동을 할 수 없고'];
    if (/^can use one immediate action between each pair of turns$/i.test(v)) return ['턴과 턴 사이마다 즉시 행동을 한 번 쓸 수 있다', '턴과 턴 사이마다 즉시 행동을 한 번 쓸 수 있고'];
    if ((m = /^gains? (concealment|total concealment|cover)$/i.exec(v))) { var cc = /total/i.test(m[1]) ? '완전 은폐' : /cover/i.test(m[1]) ? '엄폐' : '은폐'; return [cc + '를 얻는다', cc + '를 얻고']; }
    if ((m = new RegExp('^gains? (' + DICE + ') temporary hit points$', 'i').exec(v))) return ['임시 HP ' + m[1] + '을 얻는다', '임시 HP ' + m[1] + '을 얻고'];
    if ((m = new RegExp('^regains? (' + DICE + ') hit points$', 'i').exec(v))) return ['HP ' + m[1] + '을 회복한다', 'HP ' + m[1] + '을 회복하고'];
    if (/^can make a saving throw(?: against (?:an|one) (?:ongoing damage )?effect)?$/i.test(v)) return ['내성 굴림을 한 번 할 수 있다', '내성 굴림을 한 번 할 수 있고'];
    if (/^makes? a saving throw$/i.test(v)) return ['내성 굴림을 한다', '내성 굴림을 하고'];
    if ((m = /^gains? resist (\d+) to all damage (?:of|against|from) the triggering attack$/i.exec(v))) return ['발동시킨 공격의 모든 피해에 저항 ' + m[1] + '을 얻는다', '발동시킨 공격의 모든 피해에 저항 ' + m[1] + '을 얻고'];
    if ((m = /^makes? an? (melee |ranged )?basic attack against (the enemy|the attacker|that enemy|that creature|the triggering attacker)$/i.exec(v))) { var bt = /attacker/i.test(m[2]) ? '공격자' : /creature/i.test(m[2]) ? '그 개체' : '그 적'; return [bt + '에게 ' + (m[1] ? (/melee/i.test(m[1]) ? '근접 ' : '원거리 ') : '') + '기본 공격을 한다', bt + '에게 기본 공격을 하고']; }
    if (/^attacks$/i.test(v)) return ['공격한다', '공격하고'];
    if (/^ignores difficult terrain$/i.test(v)) return ['험한 지형을 무시한다', '험한 지형을 무시하고'];
    if (/^spends? a healing surge$/i.test(v)) return ['치유력을 한 번 쓴다', '치유력을 한 번 쓰고'];
    if (/^lasts$|^remains in place$/i.test(v)) return ['지속된다', '지속되고'];
    if (/^(?:is|are) knocked unconscious$|^falls? unconscious$/i.test(v)) return ['의식 불명 상태가 된다', '의식 불명 상태가 되고'];
    if ((m = new RegExp('^(?:is|are) also (' + CONDRE + ')$', 'i').exec(v))) return [COND[m[1].toLowerCase()] + ' 상태도 된다', COND[m[1].toLowerCase()] + ' 상태도 되고'];
    if ((m = /^teleports? (\d+) squares?(?:,? to an unoccupied (?:space|square)[^,.]*)?$/i.exec(v))) return [m[1] + '칸 순간이동한다', m[1] + '칸 순간이동하고'];
    if ((m = /^(?:is|are) reduced to 0 hit points$/i.exec(v))) return ['HP가 0이 된다', 'HP가 0이 되고'];
    if ((m = /^charges$/i.exec(v))) return ['돌격한다', '돌격하고'];
    if ((m = /^recharges$/i.exec(v))) return ['재충전된다', '재충전되고'];
    if ((m = /^ends$/i.exec(v))) return ['끝난다', '끝나고'];
    if ((m = /^(?:is|are) dispelled$/i.exec(v))) return ['해제된다', '해제되고'];
    if (/^makes? a secondary attack against the same target$/i.test(v)) return ['같은 대상에게 2차 공격을 한다', '같은 대상에게 2차 공격을 하고'];
    if (/^makes? a secondary attack(?: against (?:it|the target))?$/i.test(v)) return ['2차 공격을 한다', '2차 공격을 하고'];
    if ((m = /^(?:takes?|has|have|suffers?) an? (?:cumulative )?([\-–]\d+) penalty to (.+)$/i.exec(v))) { var st = statKo(m[2]); if (st) return [st + '에 ' + m[1].replace('–', '-') + ' 페널티를 받는다', st + '에 ' + m[1].replace('–', '-') + ' 페널티를 받고']; }
    if ((m = /^(?:gains?|receives?|has|have|gets?) an? (\+\d+) (?:[a-z]+ )?bonus to (.+)$/i.exec(v))) { var sb = statKo(m[2]); if (sb) return [sb + '에 ' + m[1] + ' 보너스를 받는다', sb + '에 ' + m[1] + ' 보너스를 받고']; }
    if ((m = /^shifts? (?:up to )?(\d+) squares?$/i.exec(v))) return [m[1] + '칸 시프트한다', m[1] + '칸 시프트하고'];
    if ((m = /^(moves?|flies|fly|teleports?|jumps?|swims?|climbs?|burrows?) (up to )?(\d+) squares?$/i.exec(v))) { var mv = { move: '이동', moves: '이동', flies: '비행', fly: '비행', teleport: '순간이동', teleports: '순간이동', jump: '도약', jumps: '도약', swim: '수영', swims: '수영', climb: '등반', climbs: '등반', burrow: '굴착', burrows: '굴착' }[m[1].toLowerCase()]; return [(m[2] ? '최대 ' : '') + m[3] + '칸 ' + mv + '한다', (m[2] ? '최대 ' : '') + m[3] + '칸 ' + mv + '하고']; }
    if ((m = /^(?:moves?|shifts?) (?:up to )?(?:its|their) speed$/i.exec(v))) return [/shift/i.test(v) ? '이동 속도만큼 시프트한다' : '이동 속도만큼 이동한다', /shift/i.test(v) ? '이동 속도만큼 시프트하고' : '이동 속도만큼 이동하고'];
    if ((m = /^regains? (\d+) hit points$/i.exec(v))) return ['HP ' + m[1] + '을 회복한다', 'HP ' + m[1] + '을 회복하고'];
    if ((m = /^gains? (\d+) temporary hit points$/i.exec(v))) return ['임시 HP ' + m[1] + '을 얻는다', '임시 HP ' + m[1] + '을 얻고'];
    if ((m = /^loses? (a|one|two|\d+) healing surges?$/i.exec(v))) { var hn = NUMW[m[1].toLowerCase()] || m[1]; return ['치유력 ' + hn + '회를 잃는다', '치유력 ' + hn + '회를 잃고']; }
    if ((m = /^grants? combat advantage(?: to (.+))?$/i.exec(v))) { var to = m[1] ? subj(m[1], true) : ''; if (!m[1] || to) return [(to ? to + '에게 ' : '') + '전투 우위를 내준다', (to ? to + '에게 ' : '') + '전투 우위를 내주고']; }
    if ((m = /^gains? combat advantage(?: against (.+))?$/i.exec(v))) { var ag = m[1] ? subj(m[1], true) : ''; if (!m[1] || ag) return [(ag ? ag + '에게 ' : '') + '전투 우위를 얻는다', (ag ? ag + '에게 ' : '') + '전투 우위를 얻고']; }
    if ((m = /^makes? (a|an|one|two|three|four) (melee|ranged)? ?basic attacks?(?: as a free action)?( against (?:it|the target|the triggering (?:enemy|creature)))?$/i.exec(v))) { var bn = NUMW[m[1].toLowerCase()], bk = (m[2] ? (/melee/i.test(m[2]) ? '근접 ' : '원거리 ') : '') + '기본 공격을 ' + (m[3] ? (/target/.test(m[3]) ? '대상에게 ' : /it$/.test(m[3]) ? '그 개체에게 ' : '발동시킨 개체에게 ') : '') + (bn > 1 ? TIMES[bn] + ' ' : ''); return [bk + '한다', bk + '하고']; }
    if ((m = /^makes? (a|an|one|two|three|four) ([a-z' \-]+?) attacks?$/i.exec(v))) { var an = NUMW[m[1].toLowerCase()], aw = nm(cap(m[2])); if (!latin(aw)) return [aw + ' 공격을 ' + (an > 1 ? TIMES[an] + ' ' : '') + '한다', aw + ' 공격을 ' + (an > 1 ? TIMES[an] + ' ' : '') + '하고']; }
    if (/^(?:can ?not|can't|cannot) (?:take|make) opportunity attacks$/i.test(v)) return ['기회 공격을 할 수 없다', '기회 공격을 할 수 없고'];
    if (/^(?:can ?not|can't|cannot) shift$/i.test(v)) return ['시프트할 수 없다', '시프트할 수 없고'];
    if (/^(?:can ?not|can't|cannot) (?:use|spend) (?:a )?healing surges?$|^cannot regain hit points$|^can't regain hit points$/i.test(v)) return [/regain/i.test(v) ? 'HP를 회복할 수 없다' : '치유력을 쓸 수 없다', /regain/i.test(v) ? 'HP를 회복할 수 없고' : '치유력을 쓸 수 없고'];
    if (/^(?:can ?not|can't|cannot) (?:take|make) immediate actions$/i.test(v)) return ['즉시 행동을 할 수 없다', '즉시 행동을 할 수 없고'];
    if (/^(?:is|are) immune$/i.test(v)) return ['면역이다', '면역이고'];
    if (/^(?:is|becomes) invisible$/i.test(v)) return ['투명해진다', '투명해지고'];
    if (/^(?:is|becomes) insubstantial$/i.test(v)) return ['비실체가 된다', '비실체가 되고'];
    if (/^(?:is|are) destroyed$|^dies$|^die$/i.test(v)) return [/destroy/i.test(v) ? '파괴된다' : '죽는다', /destroy/i.test(v) ? '파괴되고' : '죽고'];
    if (/^(?:is|are) removed from play$/i.test(v)) return ['게임에서 제외된다', '게임에서 제외되고'];
    if (/^stands? up$/i.test(v)) return ['일어선다', '일어서고'];
    if ((m = /^can (.+)$/i.exec(v))) { var cv = vp(m[1]); if (cv) return [cv[0].replace(/한다$/, '할 수 있다').replace(/는다$/, '을 수 있다'), cv[1]]; }
    return null; }
  function cap(s) { return String(s).replace(/(^|[\s\-])([a-z])/g, function (x, a, b) { return a + b.toUpperCase(); }); }
  /* 주어. bare 면 조사 없이 */
  function subj(x, bare) { var m, ko = null, p = bare ? '' : '은'; x = String(x).trim();
    var AREA = { aura: '오라', burst: '폭발', blast: '분사', zone: '영역', area: '범위', cloud: '구름', wall: '벽' }, KIND1 = { enemy: '적', enemies: '적', ally: '아군', allies: '아군', creature: '개체', creatures: '개체', target: '대상', targets: '대상' };
    var THING = { zone: '영역', mark: '표식', grab: '붙잡기', darkness: '어둠', duplicate: '분신',  burst: '폭발 범위', blast: '분사 범위', aura: '오라', cloud: '구름', wall: '벽', attack: '공격', effect: '효과', power: '파워', movement: '이동', 'attack roll': '공격 굴림' };
    if (/^the target$/i.test(x)) ko = '대상';
    else if ((m = /^(?:the|this) (zone|burst|blast|aura|cloud|wall|attack|effect|power|movement|mark|grab|darkness|duplicate)$/i.exec(x))) ko = (/^this/i.test(x) ? '이 ' : '') + THING[m[1].toLowerCase()];
    else if (/^(it|he|she|they)$/i.test(x)) return bare ? '그 개체' : '';
    else if (/^the triggering (enemy|creature|attacker)$/i.test(x)) ko = '발동시킨 ' + (/enemy/i.test(x) ? '적' : /attacker/i.test(x) ? '공격자' : '개체');
    else if (/^the attacker$/i.test(x)) ko = '공격자';
    else if ((m = /^(?:each|every|all|any|an|the)? ?(living |bloodied |adjacent |prone |marked )?(enem(?:y|ies)|all(?:y|ies)|creatures?|targets?)$/i.exec(x))) ko = (/^(each|every)/i.test(x) ? '각 ' : /^all/i.test(x) ? '모든 ' : '') + ({ 'living ': '살아 있는 ', 'bloodied ': '반죽음 상태인 ', 'adjacent ': '인접한 ', 'prone ': '넘어진 ', 'marked ': '표식이 찍힌 ' }[(m[1] || '').toLowerCase()] || '') + KIND1[m[2].toLowerCase()];
    else if ((m = /^(?:each|every|all|any|an)? ?(living |bloodied )?(enem(?:y|ies)|all(?:y|ies)|creatures?) (?:in|within|inside) the (aura|burst|blast|zone|area|cloud)$/i.exec(x))) ko = AREA[m[3].toLowerCase()] + ' 안의 ' + (/^(each|every)/i.test(x) ? '각 ' : /^all/i.test(x) ? '모든 ' : '') + (m[1] ? (/living/i.test(m[1]) ? '살아 있는 ' : '반죽음 상태인 ') : '') + KIND1[m[2].toLowerCase()];
    else if ((m = /^(?:each|every|all|any|an)? ?(enem(?:y|ies)|all(?:y|ies)|creatures?) (?:within|in) (\d+) squares?(?: of (?:it|the [a-z' \-]+))?$/i.exec(x))) ko = m[2] + '칸 안의 ' + (/^(each|every)/i.test(x) ? '각 ' : /^all/i.test(x) ? '모든 ' : '') + KIND1[m[1].toLowerCase()];
    else if ((m = /^(one|an?|each|every|all|any)? ?(enem(?:y|ies)|all(?:y|ies)|creatures?) adjacent to the target$/i.exec(x))) ko = '대상에 인접한 ' + (/^(each|every)/i.test(x) ? '각 ' : /^all/i.test(x) ? '모든 ' : '') + KIND1[m[2].toLowerCase()] + (/^(one|an?)$/i.test(m[1] || '') ? ' 하나' : '');
    else if ((m = /^(?:each|every|all|any|an)? ?(enem(?:y|ies)|all(?:y|ies)|creatures?) adjacent to (?:it|the [a-z' \-]+)$/i.exec(x))) ko = '인접한 ' + (/^(each|every)/i.test(x) ? '각 ' : /^all/i.test(x) ? '모든 ' : '') + KIND1[m[1].toLowerCase()];
    else if ((m = /^(?:each|every|all|any|an)? ?(living )?(enem(?:y|ies)|all(?:y|ies)|creatures?) that (starts?|begins?|ends?) (?:its|their) turns? (?:in|within|inside) the (aura|zone|area|cloud)$/i.exec(x))) ko = AREA[m[4].toLowerCase()] + ' 안에서 턴을 ' + (/end/i.test(m[3]) ? '끝내는 ' : '시작하는 ') + KIND1[m[2].toLowerCase()];
    else if ((m = /^(?:each|every|all|any|an)? ?(?:living )?(enem(?:y|ies)|all(?:y|ies)|creatures?) that (?:enters?|moves? into)(?: the (aura|zone|area|cloud))? or (?:starts?|begins?) (?:its|their) turns? (?:in|within|there|inside)(?: the (aura|zone|area|cloud)| it)?$/i.exec(x))) ko = AREA[(m[2] || m[3] || 'area').toLowerCase()] + '에 들어오거나 그 안에서 턴을 시작하는 ' + KIND1[m[1].toLowerCase()];
    else if ((m = /^(?:each|every|all|any|an)? ?(enem(?:y|ies)|all(?:y|ies)|creatures?) that (?:starts?|begins?) (?:its|their) turns? (?:in|within)(?: the (aura|zone|area|cloud))? or (?:enters?|moves? into)(?: the (aura|zone|area|cloud)| it)?$/i.exec(x))) ko = AREA[(m[2] || m[3] || 'area').toLowerCase()] + '에 들어오거나 그 안에서 턴을 시작하는 ' + KIND1[m[1].toLowerCase()];
    else if ((m = /^(?:each|every|all|any|an)? ?(enem(?:y|ies)|all(?:y|ies)|creatures?) that (?:starts?|begins?) (?:its|their) turns? adjacent to (?:it|the [a-z' \-]+)$/i.exec(x))) ko = '인접한 칸에서 턴을 시작하는 ' + KIND1[m[1].toLowerCase()];
    else if ((m = /^(?:the|an?|this) ([a-z][a-z' \-]{1,40})$/i.exec(x)) && !/ (that|who|which|in|within|of|with|and|or|is|to) /i.test(' ' + m[1] + ' ')) { var n0 = nm(cap(m[1].replace(/'s$/, ''))); ko = latin(n0) ? '이 개체' : n0; }
    if (ko == null) return null; if (bare) return ko;
    var last = ko.charCodeAt(ko.length - 1), jong = last >= 0xac00 && last <= 0xd7a3 ? (last - 0xac00) % 28 : 0; return ko + (jong ? '은' : '는'); }
  /* 서술 여러 개를 「~하고 ~한다」로 */
  function vps(v) { var parts = v.split(/,? and (?:it |then |also |it also )?(?=[a-z\-–+])|, (?=(?:is|takes|gains|shifts|pushed|pulled|knocked|slides|falls) )/i), list = [], ok = true;
    var whole = vp(v); if (whole) return whole[0];
    parts.forEach(function (x, i) { x = x.trim(); var r = vp(x) || (i ? vp('is ' + x) || vp('takes ' + x) || vp('gains ' + x) || vp('makes ' + x) : null); if (!r) ok = false; else list.push(r); });
    if (!ok || !list.length) return null; return list.map(function (r, i) { return i < list.length - 1 ? r[1] : r[0]; }).join(' '); }
  /* 조건절: 「if the target is bloodied」 → 「대상이 반죽음 상태라면」. 못 읽으면 null */
  function condKo(c, kw) { var m, t = c.trim(), end = kw === 'while' || kw === 'as long as' ? '인 동안' : kw === 'when' || kw === 'whenever' || kw === 'once' || kw === 'after' ? '때' : '면';
    var be = function (who, st) { return kw === 'while' || kw === 'as long as' ? who + ' ' + st + ' 상태인 동안' : kw === 'if' ? who + ' ' + st + ' 상태라면' : who + ' ' + st + ' 상태가 될 때'; };
    if ((m = new RegExp('^the target is (?:already )?(' + CONDRE + '|bloodied)$', 'i').exec(t))) return be('대상이', COND[m[1].toLowerCase()] || '반죽음');
    if ((m = new RegExp('^(?:it|the [a-z\' \\-]+?) is (' + CONDRE + '|bloodied)$', 'i').exec(t))) return be('자신이', COND[m[1].toLowerCase()] || '반죽음');
    if (/^(?:it is |the [a-z' \-]+? is )?first bloodied$/i.test(t)) return '처음 반죽음이 될 때';
    if (/^(?:the attack|it|this attack|the [a-z' \-]+?) hits$/i.test(t)) return kw === 'if' ? '명중하면' : '명중할 때';
    if (/^(?:the attack|it|this attack|the [a-z' \-]+?) misses$/i.test(t)) return kw === 'if' ? '빗나가면' : '빗나갈 때';
    if (/^(?:it|the [a-z' \-]+?) (?:is reduced|drops) to 0 hit points(?: or fewer)?$|^slain$|^(?:it|the [a-z' \-]+?) dies$/i.test(t)) return kw === 'if' ? 'HP가 0이 되면' : 'HP가 0이 될 때';
    if (/^the target (?:is reduced|drops) to 0 hit points(?: or fewer)?$/i.test(t)) return kw === 'if' ? '대상의 HP가 0이 되면' : '대상의 HP가 0이 될 때';
    if (/^(?:it|the [a-z' \-]+?) charges$|^charging$/i.test(t)) return '돌격할 때';
    if (/^(?:it|the [a-z' \-]+?) is hit by an attack$/i.test(t)) return kw === 'if' ? '공격에 맞으면' : '공격에 맞을 때';
    if (/^(?:it|the [a-z' \-]+?) is hit by a (melee|ranged) attack$/i.test(t)) return (/melee/i.test(t) ? '근접' : '원거리') + ' 공격에 맞을 때';
    if (/^(?:it|the [a-z' \-]+?) is missed by an? (?:melee )?attack$/i.test(t)) return '공격이 자신을 빗나갈 때';
    if (/^(?:it|the [a-z' \-]+?) takes damage$|^damaged$/i.test(t)) return '피해를 받을 때';
    if ((m = new RegExp('^(?:it|the [a-z\' \\-]+?) takes (' + TYPES + ') damage$', 'i').exec(t))) return types(m[1]) + ' 피해를 받을 때';
    if (/^both (?:[a-z]+ )?(?:attacks )?hit(?: the same target| a single target)?$/i.test(t)) return '둘 다 같은 대상에게 명중하면';
    if (/^the (?:attack|power) (?:hits|is successful)$/i.test(t)) return '명중하면';
    if (/^the target fails? (?:its|the) (?:first )?saving throw$/i.test(t)) return '대상이 내성 굴림에 실패하면';
    if (/^the target saves$/i.test(t)) return '대상이 내성 굴림에 성공하면';
    if (/^an? (enemy|creature) (?:moves|shifts) adjacent to (?:it|the [a-z' \-]+?)$/i.test(t)) return '적이 인접한 칸으로 들어올 때';
    if (/^an? (?:adjacent )?(enemy|creature) (?:moves|shifts)(?: away)?$/i.test(t)) return '인접한 적이 움직일 때';
    if (/^(?:it|the [a-z' \-]+?) has combat advantage(?: against the target)?$/i.test(t)) return '전투 우위가 있으면';
    if (/^the target is granting combat advantage(?: to (?:it|the [a-z' \-]+?))?$/i.test(t)) return '대상이 전투 우위를 내주고 있으면';
    if (/^bloodied$/i.test(t)) return kw === 'while' ? '반죽음인 동안' : '반죽음일 때';
    if (/^(?:it|the [a-z' \-]+?) is grabbing (?:a|the) (?:creature|target)$/i.test(t)) return '개체를 붙잡고 있는 동안';
    return null; }
  var PREFIX = [[/^miss$/i, '빗나감'], [/^hit$/i, '명중'], [/^effect$/i, '효과'], [/^aftereffect$/i, '후속 효과'], [/^secondary attack$/i, '2차 공격'], [/^tertiary attack$/i, '3차 공격'], [/^secondary target$/i, '2차 대상'], [/^primary target$/i, '1차 대상'], [/^first failed sav(?:e|ing throw)$/i, '첫 내성 실패'], [/^second failed sav(?:e|ing throw)$/i, '두 번째 내성 실패'], [/^third failed sav(?:e|ing throw)$/i, '세 번째 내성 실패'], [/^each failed sav(?:e|ing throw)$/i, '내성 실패마다'], [/^failed sav(?:e|ing throw)$/i, '내성 실패'], [/^special$/i, '특수'], [/^trigger$/i, '발동'], [/^requirements?$/i, '필요 조건'], [/^sustain minor$/i, '유지(보조)'], [/^sustain standard$/i, '유지(일반)'], [/^sustain move$/i, '유지(이동)'], [/^target$/i, '대상'], [/^attack$/i, '공격']];
  var SENSE = { darkvision: '암시야', 'low-light vision': '저조도 시야', truesight: '진시야', blindsight: '맹시', tremorsense: '진동 감지' };
  /* 대상 글귀: 「one creature」「enemies in the burst」「the triggering enemy」 … 못 읽으면 null */
  var RNG1 = { melee: '근접', ranged: '원거리', 'melee or ranged': '근접 또는 원거리', 'immediate reaction melee': '즉시 반응 근접', personal: '자신', 'close burst': '근거리 폭발', 'close blast': '근거리 분사' };
  var TQ = { one: '하나', two: '둘', three: '셋', four: '넷', five: '다섯', 'one or two': '하나 또는 둘', 'one, two, or three': '하나에서 셋', 'two or three': '둘 또는 셋', 'up to two': '최대 둘', 'up to three': '최대 셋', 'up to four': '최대 넷', 'up to five': '최대 다섯', each: '각각', all: '모두', any: '아무나' };
  var TN = { creature: '개체', creatures: '개체', enemy: '적', enemies: '적', ally: '아군', allies: '아군', target: '대상', targets: '대상', object: '사물', objects: '사물', square: '칸', squares: '칸', 'living creature': '살아 있는 개체', 'living creatures': '살아 있는 개체', 'nonminion creature': '졸개가 아닌 개체', 'nonminion enemy': '졸개가 아닌 적', 'nonminion enemies': '졸개가 아닌 적' };
  var TA = { prone: '넘어진 ', bloodied: '반죽음 상태인 ', dazed: '멍해진 ', stunned: '기절한 ', grabbed: '붙잡힌 ', immobilized: '이동 불가 상태인 ', restrained: '속박된 ', slowed: '둔화된 ', weakened: '약화된 ', blinded: '눈이 먼 ', dominated: '지배된 ', helpless: '무력한 ', unconscious: '의식 없는 ', marked: '표식된 ', surprised: '기습당한 ', deafened: '귀가 먹은 ', petrified: '석화된 ', dying: '빈사 상태인 ', flying: '날고 있는 ', other: '다른 ', adjacent: '인접한 ', nonadjacent: '인접하지 않은 ', visible: '보이는 ', willing: '동의한 ', Medium: '중형 이하 ', Large: '대형 이하 ' };
  var TZ = { burst: '폭발', blast: '분사', wall: '벽', zone: '영역', aura: '오라', area: '범위', cloud: '구름', line: '선' };
  function tgtKo(x) { var t = String(x || '').trim().replace(/\.$/, ''), m, area = '', tail = '';
    if ((m = /^(?:the )?triggering (creature|enemy|ally|attacker)(?: in the (burst|blast|aura))?$/i.exec(t))) return (m[2] ? TZ[m[2].toLowerCase()] + ' 안의 ' : '') + '유발한 ' + ({ creature: '개체', enemy: '적', ally: '아군', attacker: '공격자' })[m[1].toLowerCase()];
    if ((m = /^(.*?) in (?:the )?(burst|blast|wall|zone|aura|area|cloud|line)$/i.exec(t))) { area = TZ[m[2].toLowerCase()] + ' 안의 '; t = m[1]; }
    if ((m = /^(.*?) (?:it is grabbing|grabbed by (?:it|the [a-z' \-]+))$/i.exec(t))) { tail = '자신이 붙잡은 '; t = m[1]; }
    else if ((m = /^(.*?) (?:it can see|the [a-z' \-]+? can see)$/i.exec(t))) { tail = '보이는 '; t = m[1]; }
    else if ((m = /^(.*?) (?:marked by (?:it|the [a-z' \-]+))$/i.exec(t))) { tail = '자신이 표식한 '; t = m[1]; }
    else if ((m = /^(.*?) adjacent to (?:it|the [a-z' \-]+)$/i.exec(t))) { tail = '자신과 인접한 '; t = m[1]; }
    var q = '', qm = /^(one, two, or three|one or two|two or three|up to (?:two|three|four|five)|one|two|three|four|five|each|all|any)\s+(.*)$/i.exec(t); if (qm) { q = TQ[qm[1].toLowerCase()]; t = qm[2]; }
    var adj = ''; while ((m = /^(prone|bloodied|dazed|stunned|grabbed|immobilized|restrained|slowed|weakened|blinded|dominated|helpless|unconscious|marked|surprised|deafened|petrified|dying|flying|other|adjacent|nonadjacent|visible|willing|Medium or smaller|Large or smaller)\s+(.*)$/i.exec(t))) { adj += TA[m[1].split(' ')[0]] || TA[m[1].toLowerCase()] || ''; t = m[2]; }
    var n = TN[t.toLowerCase()]; if (!n) return null;
    if (!q) q = /s$/i.test(t) || /^(enemies|allies|creatures)$/i.test(t) ? '모두' : '하나';
    return area + tail + adj + n + ' ' + q; }
  function clause(s) { var m, t = s.trim(), i; if (!t) return s; if (!latin(t)) return t;
    /* 손으로 옮긴 문장(자료집 만들 때만 씀 — 사이트에서는 자료집의 tk 칸을 쓴다) */
    var DK = window.D4E_MONKO_DICT; if (DK && DK[t]) return DK[t];
    /* 「Attack (No Action): …」「Trigger (Immediate Reaction): …」 */
    if ((m = /^(Attack|Effect|Trigger|Secondary Attack|Hit|Miss)\s*\(([^()]+)\):\s*(.+)$/i.exec(t))) return ({ attack: '공격', effect: '효과', trigger: '발동', 'secondary attack': '2차 공격', hit: '명중', miss: '빗나감' })[m[1].toLowerCase()] + ' (' + actKo(m[2]) + '): ' + clause(m[3]);
    /* 새 꼴(MM3 이후) 사거리 줄: 「Melee 1 (one creature)」「Close burst 2 (enemies in the burst)」 */
    if ((m = /^((?:Immediate (?:Reaction|Interrupt) )?(?:Melee|Ranged|Close|Area|Reach|Personal)[^()]*?)\s*\(([^()]+)\)$/i.exec(t))) { var tg0 = tgtKo(m[2]); if (tg0) return clause(m[1]) + ' (' + tg0 + ')'; }
    if ((m = /^targets?:\s*(.+)$/i.exec(t))) { var tg1 = tgtKo(m[1]); if (tg1) return '대상: ' + tg1; }
    if (RNG1[t.toLowerCase()]) return RNG1[t.toLowerCase()];
    if ((m = /^reach (\d+)$/i.exec(t))) return '간격 ' + m[1];
    if ((m = /^(one|two|three) targets?$/i.exec(t))) return '대상 ' + ({ one: '하나', two: '둘', three: '셋' })[m[1].toLowerCase()];
    /* 머리말: 「Miss: …」 */
    if ((m = /^([A-Za-z][A-Za-z ]{2,26}):\s*(.+)$/.exec(t))) for (i = 0; i < PREFIX.length; i++) if (PREFIX[i][0].test(m[1].trim())) return PREFIX[i][1] + ': ' + clause(m[2]);
    if ((m = /^if both (?:[a-z]+ )?(?:attacks )?hit(?: the same target)?, (.+)$/i.exec(t))) return '둘 다 같은 대상에게 명중하면, ' + clause(m[1]);
    if ((m = /^(on a hit|on a critical hit|on a miss), (.+)$/i.exec(t))) return ({ 'on a hit': '명중하면', 'on a critical hit': '치명타가 나면', 'on a miss': '빗나가면' })[m[1].toLowerCase()] + ', ' + clause(m[2]);
    if ((m = new RegExp('^against an? (' + CONDRE + '|bloodied) (?:target|creature|enemy), (?:this attack|it|the [a-z\' \\-]+?) deals (?:an extra )?(' + DICE + ') (?:extra )?(' + TYPES + ')? ?damage$', 'i').exec(t))) return (COND[m[1].toLowerCase()] || '반죽음') + ' 상태인 대상에게는 추가로 ' + dmgKo(m[2], m[3]) + '를 준다';
    if ((m = /^requires? (?:an? )?([a-z][a-z' \-]+)$/i.exec(t))) { var rq = nm(cap(m[1])); return rq + ' 필요'; }
    if (/^multiple such effects stack$/i.test(t)) return '이런 효과는 여러 번 겹친다';
    if ((m = /^the (?:[a-z' \-]+?)'s breath weapon recharges(?: automatically)?,? and (?:the [a-z' \-]+?|it) uses it(?: immediately)?$/i.exec(t))) return '브레스 무기가 재충전되고, 즉시 사용한다';
    if ((m = /^hit or miss: (.+)$/i.exec(t))) return '명중하든 빗나가든: ' + clause(m[1]);
    if ((m = /^(in addition|otherwise|also|then|additionally), (.+)$/i.exec(t))) return ({ 'in addition': '또한', otherwise: '그렇지 않으면', also: '또한', then: '그런 다음', additionally: '또한' })[m[1].toLowerCase()] + ', ' + clause(m[2]);
    if ((m = /^each time (?:it|the [a-z' \-]+?) hits, (.+)$/i.exec(t))) return '명중할 때마다, ' + clause(m[1]);
    if ((m = /^at the (start|beginning|end) of (its|the target's|the [a-z' \-]+?'s|each of its|each) turns?, (.+)$/i.exec(t))) return (/target/i.test(m[2]) || /^the target/i.test(m[3]) ? '대상의' : /^(its|each)/i.test(m[2]) ? '자기' : '자신의') + ' 턴 ' + (/end/i.test(m[1]) ? '끝' : '시작') + '에, ' + clause(m[3]);
    if ((m = /^(until the (?:end|start) of (?:its|the target's|the [a-z' \-]+?'s) next turn|until the end of the encounter), (.+)$/i.exec(t))) { var du2 = tailOf('x ' + m[1])[1]; if (du2) return du2.trim() + ', ' + clause(m[2]); }
    if ((m = /^(if|when|whenever|while|as long as|once|after) ([^,]+), (.+)$/i.exec(t))) { var cd = condKo(m[2], m[1].toLowerCase()); if (cd) return cd + ', ' + clause(m[3]); }
    if ((m = /^targets? an? (creature|enemy|target) grabbed by (?:the [a-z' \-]+?|it)$/i.exec(t))) return '대상: 자신이 붙잡은 ' + (/enemy/i.test(m[1]) ? '적' : '개체');
    if (/^target must be bloodied$/i.test(t)) return '대상이 반죽음 상태여야 한다';
    if (/^miss: half damage, and no (?:secondary attack|ongoing damage)$/i.test(t)) return '절반 피해, ' + (/secondary/i.test(t) ? '2차 공격 없음' : '지속 피해 없음');
    if ((m = /^critical hit: (.+)$/i.exec(t))) return '치명타: ' + clause(m[1]);
    if (/^half damage, and no ongoing damage$/i.test(t)) return '절반 피해, 지속 피해 없음';
    if (/^targets? one, two, or three (creatures|enemies)$/i.test(t)) return '대상: ' + (/enem/i.test(t) ? '적' : '개체') + ' 하나에서 셋';
    if ((m = new RegExp('^targets? an? (' + CONDRE + '|living|bloodied|helpless or unconscious) (creature|humanoid|enemy|target)$', 'i').exec(t))) { var tq = m[1].toLowerCase(); return '대상: ' + (tq === 'living' ? '살아 있는 ' : tq === 'bloodied' ? '반죽음 상태인 ' : tq === 'helpless or unconscious' ? '무력 또는 의식 불명 상태인 ' : COND[tq] + ' 상태인 ') + (/humanoid/i.test(m[2]) ? '인간형' : /enemy/i.test(m[2]) ? '적' : '개체') + ' 하나'; }
    if (/^when charging, (?:the [a-z' \-]+?|it) can use this power in place of a melee basic attack$/i.test(t)) return '돌격할 때 근접 기본 공격 대신 이 파워를 쓸 수 있다';
    if ((m = /^if it uses this power while bloodied, it also regains (\d+) hit points$/i.exec(t))) return '반죽음일 때 이 파워를 쓰면 HP ' + m[1] + '도 회복한다';
    if ((m = /^when it enters an enemy's space, (?:the [a-z' \-]+?|it) makes a trample attack: (.+)$/i.exec(t))) return '적의 칸에 들어갈 때 짓밟기 공격을 한다: ' + body0(m[1]);
    if ((m = /^(?:the [a-z' \-]+?|it) makes an? ([a-z' \-]+?) attack: (.+)$/i.exec(t))) { var a3 = nm(cap(m[1])); if (!latin(a3)) return a3 + ' 공격을 한다: ' + body0(m[2]); }
    if ((m = /^(?:effect: )?(?:the burst|this power|the attack|the blast) creates a (zone|cloud) of ([a-z ]+?) that (?:lasts|remains in place) (until .+)$/i.exec(t))) { var zk = ({ fire: '불', darkness: '어둠', ice: '얼음', poison: '독', fog: '안개', mist: '안개', acid: '산성', lightning: '번개', 'necrotic energy': '사령 기운', 'poisonous gas': '독 가스', thorns: '가시', webs: '거미줄', smoke: '연기' })[m[2].toLowerCase()], du = tailOf('x ' + m[3])[1]; if (zk && du) return zk + ' ' + (/zone/i.test(m[1]) ? '영역' : '구름') + '이 생겨 ' + du.trim() + ' 유지된다'; }
    if (/^the zone is difficult terrain$/i.test(t)) return '영역은 험한 지형이다';
    if (/^half damage$/i.test(t)) return '절반 피해';
    if ((m = /^half damage, and (.+)$/i.exec(t))) return '절반 피해, ' + clause(m[1]);
    if (/^no attack roll( required)?$/i.test(t)) return '공격 굴림 없음'; if (/^automatic hit$/i.test(t)) return '자동 명중'; if (/^(?:requires|must have) combat advantage$/i.test(t)) return '전투 우위 필요';
    if (/^grabbed targets? only$/i.test(t)) return '붙잡은 대상만'; if (/^(?:targets? )?(?:a |one )?bloodied (?:enemy|creature|target)s?(?: only)?$/i.test(t)) return '반죽음 상태인 대상만';
    if ((m = /^targets? the triggering (enemy|creature|attacker)$/i.exec(t))) return '대상: 발동시킨 ' + (/enemy/i.test(m[1]) ? '적' : /attacker/i.test(m[1]) ? '공격자' : '개체');
    if ((m = /^targets? (one|two|three|four|\d+|each|all)? ?(enem(?:y|ies)|creatures?|all(?:y|ies))(?: (?:in|within) (?:the )?(burst|blast|range|area))?$/i.exec(t))) { var tn = (m[1] || '').toLowerCase(), tk = /enem/i.test(m[2]) ? '적' : /all/i.test(m[2]) ? '아군' : '개체'; return '대상: ' + (m[3] ? '범위 내 ' : '') + (tn === 'each' || tn === 'all' ? '모든 ' + tk : tk + ' ' + (CNT[NUMW[tn] || +tn] || '하나')); }
    if (/^this attack does not provoke opportunity attacks?$/i.test(t)) return '이 공격은 기회 공격을 유발하지 않는다';
    if ((m = /^this (?:movement|power|attack) does(?: not|n't) provoke(?: opportunity attacks?)?$/i.exec(t))) return '기회 공격을 유발하지 않는다';
    if ((m = /^(enemies|creatures) treat the area within the aura as difficult terrain$/i.exec(t))) return (/enem/i.test(m[1]) ? '적' : '다른 개체') + '은 오라 안을 험한 지형으로 취급한다';
    if ((m = /^the (?:[a-z' \-]+?)'s breath weapon recharges,? and (?:the [a-z' \-]+?|it) uses it immediately$/i.exec(t))) return '브레스 무기가 재충전되고, 즉시 사용한다';
    if ((m = /^see(?: also)? (?:the )?([a-z][a-z' \-]+?)(?: below| above)?$/i.exec(t))) { var sn = nm(cap(m[1])); return '「' + sn + '」 참조'; }
    if ((m = new RegExp('^(' + CONDRE + '|blind) creatures are immune$', 'i').exec(t))) return (COND[m[1].toLowerCase()] || '실명') + ' 상태인 개체는 면역';
    if ((m = /^(darkvision|low-light vision|truesight|blindsight|tremorsense)(?: (\d+))?$/i.exec(t))) return SENSE[m[1].toLowerCase()] + (m[2] ? ' ' + m[2] : '');
    if ((m = /^(ac|fortitude|reflex|will) \((\d+) while bloodied\)$/i.exec(t))) return DEFKO[m[1].toLowerCase()] + ' (반죽음일 때 ' + m[2] + ')';
    if ((m = /^a successful insight check \(opposed by (?:the [a-z' \-]+?'s|its) bluff check\) pierces the disguise$/i.exec(t))) return '통찰 판정(허세 판정과 대항)에 성공하면 변장을 간파할 수 있다';
    /* 피해 줄 */
    var D = '(' + DICE + ')', TY = '(' + TYPES + ')';
    if ((m = new RegExp('^' + D + ' ?' + TY + '? ?damage(?: \\(crit (' + DICE + ')\\))?$', 'i').exec(t))) return dmgKo(m[1], m[2]) + (m[3] ? ' (치명타 ' + m[3] + ')' : '');
    if ((m = new RegExp('^' + D + ' ?' + TY + '? ?damage plus ' + D + ' ' + TY + ' damage$', 'i').exec(t))) return dmgKo(m[1], m[2]) + ' + ' + dmgKo(m[3], m[4]);
    if ((m = new RegExp('^' + D + ' plus ' + D + ' ' + TY + ' damage$', 'i').exec(t))) return dmgKo(m[1], '') + ' + ' + dmgKo(m[2], m[3]);
    if ((m = new RegExp('^' + D + ' ?' + TY + '? ?damage, or ' + D + '(?: ?' + TY + '? ?damage)? (?:against|to) an? (' + CONDRE + '|bloodied|grabbed) (?:target|creature|enemy)$', 'i').exec(t))) return dmgKo(m[1], m[2]) + ' (' + (COND[m[5].toLowerCase()] || (/bloodied/i.test(m[5]) ? '반죽음' : '붙잡힘')) + ' 상태인 대상에게는 ' + dmgKo(m[3], m[4] || m[2]) + ')';
    if ((m = new RegExp('^' + D + ' ?' + TY + '? ?damage, or ' + D + '(?: ?' + TY + '? ?damage)? (?:while|if) (?:the [a-z\' \\-]+? is |it is )?bloodied$', 'i').exec(t))) return dmgKo(m[1], m[2]) + ' (자신이 반죽음일 때는 ' + dmgKo(m[3], m[4] || m[2]) + ')';
    if ((m = new RegExp('^(?:and )?ongoing (\\d+) ?' + TY + '? ?damage( \\(save ends\\))?$', 'i').exec(t))) return '지속 ' + m[1] + (m[2] ? ' ' + types(m[2]) : '') + ' 피해' + (m[3] ? ' (내성 굴림으로 끝남)' : '');
    /* 「피해, and 나머지」 */
    if ((m = new RegExp('^(' + D + ' ?' + TY + '? ?damage(?: \\(crit (?:' + DICE + ')\\))?(?: plus ' + D + ' ' + TY + ' damage)?),? (?:and|plus) (.+)$', 'i').exec(t))) { var a1 = clause(m[1]), b1 = clause(m[m.length - 1]); if (!latin(a1)) return a1 + ', ' + b1; }
    /* 주어 + 서술 + 기간 */
    var tl = tailOf(t), core = tl[0];
    if ((m = /^(the target|it|the triggering (?:enemy|creature)|(?:each|every|all|any|an?|the|this)? ?[a-z][a-z' \-]*?(?: (?:in|within|inside|adjacent to) [a-z0-9' \-]+?| that [a-z' \-]+?)?) ((?:is|are|becomes?|takes?|gains?|shifts?|moves?|flies|teleports?|regains?|loses?|grants?|makes?|falls?|slides?|can(?:not|'t)?|has|have|suffers?|receives?|dies?|stands?|remains?|jumps?|swims?|climbs?|burrows?|lasts|spends?|deals?|pushes|pulls|knocks|grabs|ignores|doesn't|does|provokes|must|attacks|blocks|charges|recharges|persists|ends)(?: .+)?|dies|falls prone)$/i.exec(core))) {
      var sj = subj(m[1]), pr = vps(m[2]); if (sj != null && pr) return (sj ? sj + ' ' : '') + tl[1] + pr + tl[2]; }
    /* 주어 없는 서술 (「and the target is …」에서 잘린 것 따위) */
    var pr2 = vps(core); if (pr2) return tl[1] + pr2 + tl[2];
    if (/^and /i.test(t)) return clause(t.slice(4));
    /* 「A, and B」: 둘 다 읽히면 이어 붙인다 */
    var cut = t.search(/, and (?=the |it |each |all |any |an? |ongoing )/i); if (cut > 0) { var x1 = clause(t.slice(0, cut)), x2 = clause(t.slice(cut + 6)); if (!latin(x1) && !latin(x2)) return x1 + ', ' + x2; }
    return body0(t); }
  function body(s) { s = String(s || ''); if (!s) return s;
    return s.split(/\n/).map(function (line) { var out = '', re = /(;\s*|(?<!vs)\.\s+(?=[A-Z(])|\.$)/g, last = 0, m; while ((m = re.exec(line))) { out += clause(line.slice(last, m.index)) + m[0]; last = m.index + m[0].length; } out += clause(line.slice(last)); return out; }).join('\n'); }
  function resKo(s) { return String(s || '').replace(/\b(acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder|disease|fear|charm|sleep|illusion|petrification|gaze)\b/gi, function (x) { return KW[x.toLowerCase()] || ({ petrification: '석화' })[x.toLowerCase()] || x; }).replace(/\binsubstantial\b/gi, '비실체').replace(/\bvariable\b/gi, '가변').replace(/\bsee\b/gi, '참고:'); }
  /* 몬스터 한 마리를 번역한 사본으로 */
  function mon(m) { var o = {}; Object.keys(m).forEach(function (k) { o[k] = m[k]; });
    o.n = m.nko || nm(m.n); o.n_en = m.n; o.type = typeKo(m.type); o.senses = sensesKo(m.senses); o.speed = speedKo(m.speed); o.align = ALIGN[m.align] || m.align; o.lang = listKo(m.lang, LANG); o.skills = listKo(m.skills, SKILL);
    o.immune = resKo(m.immune); o.resist = resKo(m.resist); o.vuln = resKo(m.vuln); o.hpnote = !m.hpnote ? '' : /missed attack never damages/i.test(m.hpnote) ? '빗나간 공격은 졸개에게 피해를 주지 못한다.' : body(m.hpnote);
    if (m.trap) { o.flavor = m.flk || m.flavor || ''; }
    o.pw = (m.pw || []).map(function (p) { return { n: p.nk || (m.trap && !p.k ? secKo(p.n) : nm(p.n)), k: p.k, act: p.ak || actKo(p.act), use: p.uk || useKo(p.use), kw: p.kk || kwKo(p.kw), t: p.tk || body(p.t) }; });
    /* 손으로 옮긴 칸(자료집의 fk) */ if (m.fk) Object.keys(m.fk).forEach(function (k) { o[k] = m.fk[k]; }); o._ko = 1; return o; }
  /* 함정 · 위험 요소의 덩어리 이름 */
  var TRAPSEC = { Perception: '지각(발견)', Countermeasures: '대응책', Countermeasure: '대응책', Trigger: '발동', 'Trigger 1': '발동 1', 'Trigger 2': '발동 2', Attack: '공격', 'Secondary Attack': '2차 공격', 'Primary Attack': '1차 공격', Special: '특수', Effect: '효과', Hazard: '위험 요소', Trap: '함정', Terrain: '지형', 'Single-Use Terrain': '일회성 지형', 'Fantastic Terrain': '기묘한 지형', 'Terrain Power': '지형 파워', Object: '사물', Initiative: '우선권', Upgrade: '강화', Note: '메모', Usage: '쓰임',
    Arcana: '비전학', Nature: '자연', Religion: '종교', Dungeoneering: '던전 탐험', Insight: '통찰', Thievery: '도둑질', Athletics: '운동', Acrobatics: '곡예', History: '역사', Heal: '치료', Endurance: '지구력', Stealth: '은신', Bluff: '허세', Diplomacy: '교섭', Intimidate: '위협', Streetwise: '뒷골목' };
  function secKo(n) { n = String(n || '').trim(); if (TRAPSEC[n]) return TRAPSEC[n]; var m = /^(Attack|Secondary Attack|Primary Attack)\s*[•*✦]\s*(.*)$/.exec(n); if (m) return TRAPSEC[m[1]] + ' ✦ ' + kwKo(m[2]); return n.replace(/\b(Perception|Arcana|Nature|Religion|Dungeoneering|Insight|Thievery|Athletics|Acrobatics|History|Heal|Endurance|Stealth)\b/g, function (w) { return TRAPSEC[w]; }).replace(/\(trained only\)/, '(숙련자만)').replace(/\bor\b/g, '또는'); }
  window.D4E_MONKO = { name: nm, mon: mon, body: body, type: typeKo, sec: secKo };
})();
