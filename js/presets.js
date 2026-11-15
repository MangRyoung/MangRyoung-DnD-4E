/* 세팅 기본값과 용어집. 팀이 직접 정한 내용이다(비단화살 메이킹 가이드 · 조정 목록 26/11/12, 팀 용어집).
 * 공유 DB 에 같은 세팅 · 용어집이 저장돼 있으면 그쪽이 먼저다. */
window.D4E_PRESETS = {
 "set_bidan": {
  "set": {
   "name": "비단화살 룰",
   "points": 20,
   "level": 10,
   "gold": 4200,
   "minEnh": 2,
   "inherent": true,
   "spec": true,
   "hide": [
    "Background",
    "Background Choice"
   ],
   "bans": "종류=Class; 이름=Binder|Blackguard|Bladesinger|Cavalier|Executioner|Hexblade|Hunter|Knight|Mage|Scout|Sentinel|Slayer|Thief|Warpriest\n종류=Hybrid Class; 출처=Player Essentials\n종류=Class; 이름=Seeker\n종류=Hybrid Class; 이름=Hybrid Seeker\n종류=Familiar\n종류=Feat; 이름=Arcane Familiar\n종류=Magic Item; 물품=Dragonshard\n종류=Magic Item; 물품=Boon\n종류=Magic Item; 물품=Grandmaster Training\n이름=Pacifist Healer\n이름=Wrist Razors\n이름=Helm of Seven Deaths\n종류=Feat; 조건=DRAGONMARK",
   "memo": "[금지 및 제한]\n에센셜 출전의 서브클래스, Seeker 클래스, Familiar, Dragonshard · Boon · Grandmaster training 카테고리의 모든 물품, Pacifist Healer, Wrist Razors, Helm of Seven Deaths, Dragonmark Feat\n\n[기본 사항]\n① 10레벨, 20포인트, 4,200골드. 비마법 무기 / 갑옷 / 방패 / 매개는 무료. 골드로는 마법 장비를 사며, 무기 / 갑옷 / 목은 최소 +2 이상. 이번 구매가 처음이자 마지막 골드 구매.\n② 리츄얼 능력은 쓰지 않음.\n③ Inherent Bonuses 사용: 2/7/12/17/22/27레벨에 공격 · 피해 굴림 +1 향상 보너스(치명타는 보너스마다 +1d6), 4/9/14/19/24/29레벨에 모든 방어 +1 향상 보너스.\n\n[하우스룰]\n① Background 대신 기술 하나에 특화. 직업 기술 목록 밖이어도 됨. 그 기술에 훈련되고, (1) 가장 높은 능력치를 그 기술의 능력치 대신 쓰거나 (2) 그 기술 판정에 +3 중 하나를 고름.\n② 기본 사망 룰 없음. 조우 중 죽음을 피하는 굴림에 3회 이상 실패하면 그로기 상태가 되어 조우가 끝날 때까지 싸울 수 없음.\n③ 숨돌리기(짧은 휴식보다 아래 단계): 마스터가 선언하면 힐링 서지를 하나까지 써서 회복하고, 직업의 공격 조우 파워 하나와 그 밖의 조우 파워 하나를 골라 충전(여러 번 쓰는 조우 파워는 한 번만 회복). 파워 포인트 클래스는 공격 조우 파워 대신 PP 2점 회복.\n\n출처: 캐릭터 메이킹 가이드(26/11/12) · 파워 / 능력 등의 변경 및 조정 목록(26/11/12), 창조의 회랑, 비단화살"
  },
  "house": [
   {
    "m": {
     "t": "Class",
     "n": "Ardent"
    },
    "patch": {
     "rAdd": [
      [
       "select",
       {
        "type": "Power",
        "name": "추가 무제한 파워 (하우스룰)",
        "number": "1",
        "category": "$$CLASS,at-will,1"
       }
      ]
     ],
     "note": "1레벨에 무제한 공격 파워를 하나 더 고른다. 이 파워는 증강될 수 없고 테크닉으로 다른 행동에 쓸 수 없다."
    }
   },
   {
    "m": {
     "t": "Class",
     "n": "Battlemind"
    },
    "patch": {
     "rAdd": [
      [
       "select",
       {
        "type": "Power",
        "name": "추가 무제한 파워 (하우스룰)",
        "number": "1",
        "category": "$$CLASS,at-will,1"
       }
      ]
     ],
     "note": "1레벨에 무제한 공격 파워를 하나 더 고른다. 이 파워는 증강될 수 없고 테크닉으로 다른 행동에 쓸 수 없다."
    }
   },
   {
    "m": {
     "t": "Class",
     "n": "Psion"
    },
    "patch": {
     "rAdd": [
      [
       "select",
       {
        "type": "Power",
        "name": "추가 무제한 파워 (하우스룰)",
        "number": "1",
        "category": "$$CLASS,at-will,1"
       }
      ]
     ],
     "note": "1레벨에 무제한 공격 파워를 하나 더 고른다. 이 파워는 증강될 수 없고 테크닉으로 다른 행동에 쓸 수 없다."
    }
   },
   {
    "m": {
     "t": "Power",
     "n": "Disruptive Strike"
    },
    "patch": {
     "note": "활 · 석궁을 들고 이 파워를 쓰려면 레인저 조우 7 공격 파워로 선택해야 한다."
    }
   },
   {
    "m": {
     "t": "Power",
     "n": "Attacks on the Run"
    },
    "patch": {
     "note": "이제 매 공격당 2[W] 피해를 입힌다."
    }
   },
   {
    "m": {
     "t": "Power",
     "n": "Oath of Enmity"
    },
    "patch": {
     "note": "적이 자신과 인접한 유일한 적이 아니어도 공격 굴림을 2회 굴릴 수 있다."
    }
   },
   {
    "m": {
     "t": "Class Feature",
     "n": "Oath of Enmity"
    },
    "patch": {
     "note": "적이 자신과 인접한 유일한 적이 아니어도 공격 굴림을 2회 굴릴 수 있다."
    }
   },
   {
    "m": {
     "t": "Class",
     "n": "Avenger"
    },
    "patch": {
     "rAdd": [
      [
       "grant",
       {
        "name": "ID_INTERNAL_FEAT_MELEE_TRAINING_(WISDOM)",
        "type": "Feat"
       }
      ]
     ],
     "note": "1레벨에 Melee Training (Wisdom) 재주를 얻는다."
    }
   },
   {
    "m": {
     "t": "Power",
     "n": "Charm Beast"
    },
    "patch": {
     "level": 13,
     "note": "드루이드 조우 13 공격 파워로 변경."
    }
   },
   {
    "m": {
     "t": "Power",
     "has": "Flurry of Blows"
    },
    "patch": {
     "note": "한 라운드에 한 번이 아니라 매 턴에 한 번씩 쓸 수 있다."
    }
   },
   {
    "m": {
     "t": "Class Feature",
     "n": "Swordmage Aegis"
    },
    "patch": {
     "note": "적에게 간략 행동으로 이지스를 부여하는 효과는 Teleportation 파워로 보지 않는다. Aegis of Assault 나 Ensnarement 의 마크 위반 효과가 발동했을 때에는 그 파워를 Teleportation 파워로 본다."
    }
   },
   {
    "m": {
     "t": "Power",
     "n": "Aegis of Assault"
    },
    "patch": {
     "note": "부여할 때는 Teleportation 파워로 보지 않는다. 마크 위반 효과가 발동했을 때에는 Teleportation 파워로 본다."
    }
   },
   {
    "m": {
     "t": "Power",
     "n": "Aegis of Ensnarement"
    },
    "patch": {
     "note": "부여할 때는 Teleportation 파워로 보지 않는다. 마크 위반 효과가 발동했을 때에는 Teleportation 파워로 본다."
    }
   }
  ]
 }
};
window.D4E_GLOSSARY = [["Action","행동"],["Action Type","행동 유형"],["Standard Action","표준 행동"],["Move Action","이동 행동"],["Minor Action","보조 행동"],["Free Action","자유 행동"],["No Action","행동 없음"],["Immediate Action","즉각 행동"],["Immediate Interrupt","즉각 개입"],["Immediate Reaction","즉각 반응"],["Opportunity Action","기회 행동"],["Triggered Action","유발 행동"],["Power Usage","사용 빈도"],["At-Will","무제한"],["At-Will Power","무제한 파워"],["Encounter","조우"],["Encounter Power","조우 파워"],["Daily","일일"],["Daily Power","일일 파워"],["Recharge","재충전"],["Recharge 6","재충전 6"],["Recharge 5–6","재충전 5–6"],["Recharge 4–6","재충전 4–6"],["Special","특별"],["Power","파워"],["Attack Power","공격 파워"],["Utility Power","활용 파워"],["Feature Power","특성 파워"],["Class Feature","클래스 특성"],["Racial Power","종족 파워"],["Item Power","아이템 파워"],["Basic Attack","기본 공격"],["Melee Basic Attack","근접 기본 공격"],["Ranged Basic Attack","원거리 기본 공격"],["Opportunity Attack","기회 공격"],["Prerequisite","선행 조건"],["Requirement","요구 조건"],["Trigger","유발 조건"],["Target","대상"],["Targets","대상"],["Attack","공격"],["Hit","명중"],["Miss","빗나감"],["Effect","효과"],["Sustain","유지"],["Aftereffect","후속 효과"],["Secondary Attack","2차 공격"],["Secondary Target","2차 대상"],["Melee","근접"],["Ranged","원거리"],["Close","근거리"],["Area","범위"],["Personal","개인"],["Burst","폭발"],["Blast","분사"],["Wall","벽"],["Shield","방패"],["Strength","STR"],["Constitution","CON"],["Dexterity","DEX"],["Intelligence","INT"],["Wisdom","WIS"],["Charisma","CHA"],["Ability","능력치"],["Ability Score","능력치"],["Ability Modifier","능력 수정치"],["Ability Check","능력 판정"],["Ability Increase","능력치 증가"],["Ability Score Increase","능력치 상승"],["Ability Score Penalty","능력치 페널티"],["Ability Score Array","능력치 배열"],["Primary Ability","주 능력치"],["Secondary Ability","부 능력치"],["Key Ability","핵심 능력치"],["Highest Ability Score","가장 높은 능력치"],["Strength Modifier","근력 수정치"],["Constitution Modifier","건강 수정치"],["Dexterity Modifier","민첩 수정치"],["Intelligence Modifier","지능 수정치"],["Wisdom Modifier","지혜 수정치"],["Charisma Modifier","매력 수정치"],["Strength Check","근력 판정"],["Constitution Check","건강 판정"],["Dexterity Check","민첩 판정"],["Intelligence Check","지능 판정"],["Wisdom Check","지혜 판정"],["Charisma Check","매력 판정"],["Armor Class","AC"],["Fortitude","Fort"],["Reflex","Ref"],["Will","Will"],["Hit Points","HP"],["Maximum Hit Points","최대 HP"],["Current Hit Points","현재 HP"],["Temporary Hit Points","임시 HP"],["Bloodied","반죽음"],["Bloodied Value","반죽음 수치"],["Healing Surge","원기"],["Healing Surges","원기 횟수"],["Surge Uses","원기 횟수"],["Healing Surge Value","원기 수치"],["Surge Value","원기 수치"],["Healing Amount","회복량"],["Additional Healing","추가 회복량"],["Surges per Day","일일 원기 횟수"],["Attack Roll","공격 굴림"],["Attack Bonus","공격 보너스"],["Damage","피해"],["Damage Roll","피해 굴림"],["Damage Bonus","피해 보너스"],["Critical Hit","치명타"],["Critical Damage","치명타 피해"],["Weapon Damage","무기 피해"],["Extra Damage","추가 피해"],["Ongoing Damage","지속 피해"],["Half Damage","절반 피해"],["No Damage","피해 없음"],["Save Ends","내성 종료"],["Combat Advantage","전투 우위"],["Acid","산성"],["Cold","냉기"],["Fire","화염"],["Force","역장"],["Lightning","전기"],["Necrotic","사령"],["Poison","독성"],["Psychic","염동"],["Radiant","광휘"],["Thunder","천둥"],["Modifier","수정치"],["Bonus","보너스"],["Bonus Type","보너스 유형"],["Penalty","페널티"],["Half Level","레벨 절반"],["Armor Bonus","방어구 보너스"],["Enhancement Bonus","강화 보너스"],["Feat Bonus","재주 보너스"],["Item Bonus","아이템 보너스"],["Power Bonus","파워 보너스"],["Proficiency Bonus","숙련 보너스"],["Racial Bonus","종족 보너스"],["Shield Bonus","방패 보너스"],["Untyped Bonus","무유형 보너스"],["Turn","차례"],["Round","라운드"],["Square","칸"],["Speed","이동 속도"],["Initiative","우선권"],["Initiative Roll","우선권 굴림"],["Initiative Modifier","우선권 수정치"],["Initiative Order","우선권 순서"],["Movement","이동"],["Move","이동한다"],["Forced Movement","강제 이동"],["Pull","당기기"],["Push","밀기"],["Slide","옮기기"],["Forced Movement Distance","강제 이동 거리"],["Specified Distance","지정 거리"],["Specific Destination","특정 목적지"],["Destination Space","목적지 공간"],["Swap Places","위치 교환"],["Shift","순보"],["Shift Distance","순보 거리"],["Teleport","순간이동"],["Forced Teleportation","비자발적 순간이동"],["Line of Effect","효과선"],["Blocking Terrain","차단 지형"],["Difficult Terrain","험난한 지형"],["Hindering Terrain","위험 지형"],["Catching Oneself","추락 저지"],["Mark","견제"],["Marked","견제됨"],["Creature","크리처"],["Enemy","적"],["Ally","아군"],["Arcane","비전"],["Augmentable","증강"],["Martial","무예"],["Divine","신성"],["Enchantment","환혹"],["Channel","발현"],["Channel Divinity","신성 발현"],["Psionic","초상"],["Elemental","원소"],["Primal","원시"],["Weapon","무기"],["Implement","도구"],["Implement or Weapon","도구 혹은 무기"],["Fire or Lightning","화염 혹은 전기"],["Cold or Radiant","냉기 혹은 광휘"],["Force or Lightning","역장 혹은 전기"],["Acid or Radiant","산성 혹은 광휘"],["Radiant or Thunder","광휘 혹은 천둥"],["Poison or Thunder","독성 혹은 천둥"],["Reach Weapon","도달 무기"],["Polearm","폴암"],["Short Sword","숏소드"],["Longsword","롱소드"],["Improvised Weapon","즉석 무기"],["Healing","치유"],["Spirit","정령"],["Soul","영혼"],["Necromancy","사령"],["Reliable","신뢰"],["Rattling","압박"],["Conjuration","생성"],["Zone","구역"],["Teleportation","순간이동"],["Shadow","그림자"],["Stance","자세"],["Fear","공포"],["Charm","매혹"],["Polymorph","변신"],["Illusion","환영"],["Evocation","방출"],["Beast Form","야수 형상"],["Full Discipline","완전 수련"],["Summoning","소환"],["Rage","격노"],["Beast","야수"],["Aura","오라"],["Varies","다양"],["Runic","룬"],["Invigorating","활력"],["Nethermancy","네더맨시"],["Transmutation","변환"],["Bladespell","칼날 주문"],["Light Blade","경량 날붙이"],["Crossbow","쇠뇌"],["Sling","슬링"],["Simple Weapon","단순 무기"],["Saving Throw","내성 굴림"],["Dazed","멍함"],["Prone","넘어짐"],["Slowed","둔화"],["Immobilized","고정"],["Weakened","약화"],["Blinded","실명"],["Stunned","기절"],["Restrained","구속"],["Dominated","지배"],["Unconscious","의식불명"],["Grabbed","붙잡힘"],["Dying","빈사"],["Deafened","실청"],["Surprised","기습당함"],["Petrified","석화"],["Helpless","무방비"],["Perception","지각"],["Insight","통찰"],["Passive Perception","상시 지각"],["Passive Insight","상시 통찰"],["Vision","시야"],["Normal Vision","일반 시야"],["Low-Light Vision","저광 시야"],["Darkvision","암흑시야"],["Rest","휴식"],["Short Rest","짧은 휴식"],["Extended Rest","긴 휴식"],["Regain","회복한다"],["Regain the Use of a Power","파워의 사용 횟수를 회복한다"],["Expend","소비한다"],["Expend a Healing Surge","원기를 하나 소비한다"],["Use","사용"],["Use of a Power","파워 사용"],["Used","사용됨"],["Expended","소비됨"],["Available","사용 가능"],["Ardent","아덴트"],["Artificer","아티피서"],["Assassin","어쌔신"],["Avenger","어벤저"],["Barbarian","바바리안"],["Bard","바드"],["Battlemind","배틀마인드"],["Blackguard","블랙가드"],["Cavalier","카발리어"],["Cleric","클레릭"],["Druid","드루이드"],["Elementalist","엘리멘탈리스트"],["Executioner","익스큐셔너"],["Fighter","파이터"],["Hexblade","헥스블레이드"],["Hunter","헌터"],["Invoker","인보커"],["Knight","나이트"],["Monk","몽크"],["Paladin","팔라딘"],["Psion","사이언"],["Ranger","레인저"],["Rogue","로그"],["Runepriest","룬프리스트"],["Scout","스카우트"],["Seeker","시커"],["Shaman","샤먼"],["Slayer","슬레이어"],["Sorcerer","소서러"],["Swordmage","소드메이지"],["Thief","시프"],["Vampire","뱀파이어"],["Warden","워든"],["Warlock","워락"],["Warlord","워로드"],["Wizard","위저드"],["Feature","특성"]];
